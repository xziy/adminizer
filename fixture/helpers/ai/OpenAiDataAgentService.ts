import {
    Agent,
    AgentInputItem,
    run,
    tool,
    setDefaultOpenAIKey,
    RunContext,
} from '@openai/agents';
import {AbstractAiModelService} from '../../../dist/lib/ai-assistant/AbstractAiModelService';
import {AiAssistantMessage, Entity} from '../../../dist/interfaces/types';
import {ModelConfig} from '../../../dist/interfaces/adminpanelConfig';
import {Adminizer} from '../../../dist/lib/Adminizer';
import {DataAccessor, FieldMetadata} from '../../../dist/lib/DataAccessor';
import {isObject} from '../../../dist/helpers/JsUtils';
import {UserAP} from '../../../dist/models/UserAP';

interface AgentContext {
    user: UserAP;
}

export class OpenAiDataAgentService extends AbstractAiModelService {
    private readonly apiKey?: string;
    private readonly model: string;

    constructor(adminizer: Adminizer) {
        super(adminizer, {
            id: 'openai-data',
            name: 'OpenAI data explorer',
            description: 'Answers questions with live data retrieved via Adminizer models.',
        });

        this.apiKey = process.env.OPENAI_API_KEY ?? process.env.ADMINIZER_OPENAI_KEY;
        this.model = process.env.OPENAI_AGENT_MODEL ?? 'gpt-4.1-mini';

        if (this.apiKey) {
            setDefaultOpenAIKey(this.apiKey);
        } else {
            Adminizer.log.warn('[OpenAiDataAgentService] OPENAI_API_KEY is not configured; the agent will remain inactive.');
        }
    }

    public isEnabled(): boolean {
        return Boolean(this.apiKey);
    }

    public async generateReply(
        prompt: string,
        history: AiAssistantMessage[],
        user: UserAP,
    ): Promise<string> {
        if (!this.isEnabled()) {
            return 'The OpenAI data agent is not configured. Please set the OPENAI_API_KEY environment variable.';
        }

        try {
            const agent = this.createAgent(user);
            const conversation = this.toAgentInput(history);
            const result = await run(agent, conversation.length > 0 ? conversation : prompt, {
                context: {user},
                maxTurns: 6,
            });

            return typeof result.finalOutput === 'string'
                ? result.finalOutput
                : 'The agent finished without returning a message.';
        } catch (error) {
            Adminizer.log.error('[OpenAiDataAgentService] Failed to generate reply', error);
            return 'I encountered an error while generating a response. Please try again later.';
        }
    }

    private createAgent(user: UserAP): Agent<AgentContext> {
        const accessibleModels = this.listReadableModels(user);
        const modelSummary = accessibleModels.length > 0
            ? accessibleModels.map(({name, config}) => `• ${name} (model key: ${config.model})`).join('\n')
            : 'No models are currently accessible.';

        const dataQueryTool = tool({
            name: 'query_model_records',
            description: 'Query Adminizer models using DataAccessor. Provide the model name from the admin panel configuration.',
            parameters: {
                type: 'object',
                properties: {
                    model: {
                        type: 'string',
                        description: 'Model name as defined in the Adminizer configuration',
                        minLength: 1
                    },
                    filter: {
                        type: 'string',
                        description: 'Optional filter as a JSON string matching the model criteria'
                    },
                    fields: {
                        type: 'array',
                        items: { type: 'string', minLength: 1 },
                        description: 'Optional list of fields to include in the response'
                    },
                    limit: {
                        type: 'number',
                        minimum: 1,
                        maximum: 50,
                        description: 'Maximum number of records to return (default 10).'
                    }
                },
                required: ['model'],
                additionalProperties: false
            },
            execute: async (input: any, runContext?: RunContext<AgentContext>) => {
                const activeUser = runContext?.context?.user ?? user;
                
                if (!input.model) {
                    throw new Error('Model name is required');
                }
                
                const entity = this.resolveEntity(input.model);
                if (!entity.model) {
                    throw new Error(`Model "${input.model}" is not registered in Adminizer.`);
                }

                const accessor = new DataAccessor(this.adminizer, activeUser, entity, 'list');
                let criteria = {};
                if (input.filter && input.filter.trim()) {
                    try {
                        criteria = JSON.parse(input.filter);
                    } catch (e) {
                        throw new Error('Invalid filter JSON');
                    }
                }
                const records = await entity.model.find(criteria, accessor);
                const limited = records.slice(0, input.limit ?? 10);
                const projected = input.fields && input.fields.length > 0
                    ? limited.map((record) => this.pickFields(record, input.fields ?? []))
                    : limited;

                return JSON.stringify({
                    model: entity.name,
                    count: projected.length,
                    records: projected,
                }, null, 2);
            },
        });

        const describeFieldsTool = tool({
            name: 'describe_model_fields',
            description: 'List fields available for a given action, including descriptions and association details.',
            parameters: {
                type: 'object',
                properties: {
                    model: {
                        type: 'string',
                        description: 'Model name as defined in the Adminizer configuration',
                        minLength: 1,
                    },
                    action: {
                        type: 'string',
                        enum: ['list', 'view', 'add', 'edit'],
                        description: 'Action to describe (defaults to "add" to assist with record creation).',
                    },
                },
                required: ['model'],
                additionalProperties: false,
            },
            execute: async (input: any, runContext?: RunContext<AgentContext>) => {
                const activeUser = runContext?.context?.user ?? user;
                const action = (input.action ?? 'add') as 'list' | 'view' | 'add' | 'edit';

                const entity = this.resolveEntity(input.model);
                if (!entity.model) {
                    throw new Error(`Model "${input.model}" is not registered in Adminizer.`);
                }

                const accessor = new DataAccessor(this.adminizer, activeUser, entity, action);
                const metadata = accessor.listFieldMetadata();

                if (metadata.length === 0) {
                    return JSON.stringify({
                        model: entity.name,
                        action,
                        fields: [],
                        message: 'No fields are accessible for this action with the current permissions.',
                    }, null, 2);
                }

                return JSON.stringify({
                    model: entity.name,
                    action,
                    fields: metadata,
                }, null, 2);
            },
        });

        const createRecordTool = tool({
            name: 'create_model_record',
            description: 'Create a new record in an Adminizer model using DataAccessor and the current user permissions.',
            parameters: {
                type: 'object',
                properties: {
                    model: {
                        type: 'string',
                        description: 'Model name as defined in the Adminizer configuration',
                        minLength: 1,
                    },
                    data: {
                        description: 'JSON object describing the fields for the new record.',
                        anyOf: [
                            {type: 'string', minLength: 2},
                            {type: 'object'},
                        ],
                    },
                },
                required: ['model', 'data'],
                additionalProperties: false,
            },
            execute: async (input: any, runContext?: RunContext<AgentContext>) => {
                const activeUser = runContext?.context?.user ?? user;

                const entity = this.resolveEntity(input.model);
                if (!entity.model) {
                    throw new Error(`Model "${input.model}" is not registered in Adminizer.`);
                }

                const accessor = new DataAccessor(this.adminizer, activeUser, entity, 'add');
                const metadata = accessor.listFieldMetadata();
                if (metadata.length === 0) {
                    throw new Error('You do not have permission to create records for this model.');
                }

                const payload = this.parsePayload(input.data);
                const filteredData = this.restrictPayloadToAccessibleFields(payload, metadata);

                if (Object.keys(filteredData).length === 0) {
                    throw new Error('None of the provided fields are allowed for creation.');
                }

                const created = await entity.model.create(filteredData, accessor);
                return JSON.stringify({
                    model: entity.name,
                    record: created,
                }, null, 2);
            },
        });

        return new Agent<AgentContext>({
            name: 'Adminizer data agent',
            instructions: [
                'You are an assistant that answers questions using Adminizer data.',
                'Always rely on the provided tools to inspect database records or modify them.',
                'Use `describe_model_fields` before creating data to learn which fields are required and what they mean.',
                'Only include fields that are relevant to the question or action.',
                'Summaries should explain how the answer was derived from the data.',
                '',
                'Accessible models:',
                modelSummary,
            ].join('\n'),
            handoffDescription: 'Retrieves Adminizer records using DataAccessor with full permission checks.',
            tools: [describeFieldsTool, dataQueryTool, createRecordTool],
            model: this.model,
        });
    }

    private pickFields<T extends Record<string, unknown>>(record: T, fields: string[]): Partial<T> {
        return fields.reduce<Partial<T>>((acc, field) => {
            if (field in record) {
                acc[field as keyof T] = record[field] as T[keyof T];
            }
            return acc;
        }, {});
    }

    private toAgentInput(history: AiAssistantMessage[]): AgentInputItem[] {
        return history.map<AgentInputItem>((message) => {
            if (message.role === 'user') {
                return {
                    type: 'message',
                    role: 'user',
                    content: [
                        {
                            type: 'input_text',
                            text: message.content,
                        },
                    ],
                };
            }

            return {
                type: 'message',
                role: 'assistant',
                status: 'completed',
                content: [
                    {
                        type: 'output_text',
                        text: message.content,
                    },
                ],
            };
        });
    }

    private listReadableModels(user: UserAP): Array<{name: string; config: ModelConfig}> {
        const readable: Array<{name: string; config: ModelConfig}> = [];

        for (const [entityName, rawConfig] of Object.entries(this.adminizer.config.models ?? {})) {
            const config = this.ensureModelConfig(entityName, rawConfig);
            const modelInstance = config.model
                ? this.adminizer.modelHandler.model.get(config.model.toLowerCase())
                : undefined;

            if (!modelInstance) {
                continue;
            }

            const token = `read-${modelInstance.modelname}-model`;
            if (this.adminizer.accessRightsHelper.hasPermission(token, user)) {
                readable.push({name: entityName, config});
            }
        }

        return readable;
    }

    private resolveEntity(modelName: string): Entity {
        const normalized = modelName.trim().toLowerCase();
        const models = this.adminizer.config.models ?? {};

        for (const [entityName, rawConfig] of Object.entries(models)) {
            const config = this.ensureModelConfig(entityName, rawConfig);
            const candidateNames = new Set([
                entityName.toLowerCase(),
                config.model?.toLowerCase(),
            ]);

            if (!candidateNames.has(normalized)) {
                continue;
            }

            const modelInstance = this.adminizer.modelHandler.model.get(config.model?.toLowerCase());
            if (!modelInstance) {
                throw new Error(`Model adapter is not initialized for "${config.model}".`);
            }

            return {
                name: entityName,
                config,
                model: modelInstance,
                type: 'model',
                uri: `${this.adminizer.config.routePrefix}/model/${entityName}`,
            };
        }

        throw new Error(`Unknown model "${modelName}".`);
    }

    private ensureModelConfig(entityName: string, config: ModelConfig | boolean): ModelConfig {
        if (typeof config === 'boolean') {
            const modelId = entityName.toLowerCase();
            return {
                model: modelId,
                title: entityName,
                icon: 'description',
                list: true,
                add: true,
                edit: true,
                remove: true,
                view: true,
            } as ModelConfig;
        }

        return config;
    }

    private parsePayload(data: unknown): Record<string, unknown> {
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (error) {
                throw new Error('Unable to parse the provided JSON payload.');
            }
        }

        if (isObject(data)) {
            return data as Record<string, unknown>;
        }

        throw new Error('Payload must be either a JSON string or an object.');
    }

    private restrictPayloadToAccessibleFields(
        payload: Record<string, unknown>,
        metadata: FieldMetadata[],
    ): Record<string, unknown> {
        const allowedFields = new Set(metadata.map((field) => field.name));
        return Object.fromEntries(
            Object.entries(payload).filter(([key]) => allowedFields.has(key)),
        );
    }
}
