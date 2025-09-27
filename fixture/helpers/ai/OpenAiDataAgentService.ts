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
import {DataAccessor} from '../../../dist/lib/DataAccessor';
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
                        type: 'object',
                        description: 'Optional filter expressed as JSON using Adminizer criteria operators.',
                        additionalProperties: true
                    },
                    fields: {
                        type: 'array',
                        items: { type: 'string', minLength: 1 },
                        description: 'Optional list of fields to include in the response',
                    },
                    limit: {
                        type: 'number',
                        minimum: 1,
                        maximum: 50,
                        description: 'Maximum number of records to return (default 10).',
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
                const filter = this.ensurePlainObject(input.filter ?? {});
                const records = await entity.model.find(filter, accessor);
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

        const dataMutationTool = tool({
            name: 'mutate_model_records',
            description: 'Create, update, or delete Adminizer model records with DataAccessor permissions.',
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['create', 'update', 'delete'],
                        description: 'Mutation type to perform on the target model.'
                    },
                    model: {
                        type: 'string',
                        description: 'Model name as defined in the Adminizer configuration',
                        minLength: 1
                    },
                    data: {
                        type: 'object',
                        description: 'Field values to apply when creating or updating a record.',
                        additionalProperties: true
                    },
                    criteria: {
                        type: 'object',
                        description: 'Optional criteria object used to select a record for update/delete.',
                        additionalProperties: true
                    },
                    id: {
                        description: 'Optional identifier helper used when targeting a specific record.',
                        anyOf: [
                            {type: 'string', minLength: 1},
                            {type: 'number'}
                        ]
                    }
                },
                required: ['action', 'model'],
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

                const action = String(input.action);

                switch (action) {
                    case 'create': {
                        const accessor = new DataAccessor(this.adminizer, activeUser, entity, 'add');
                        const payload = this.filterWritableData(input.data, accessor);
                        if (Object.keys(payload).length === 0) {
                            throw new Error('Provide at least one writable field in "data" to create a record.');
                        }
                        const created = await entity.model.create(payload, accessor);
                        return JSON.stringify({
                            model: entity.name,
                            record: created,
                        }, null, 2);
                    }
                    case 'update': {
                        const accessor = new DataAccessor(this.adminizer, activeUser, entity, 'edit');
                        const payload = this.filterWritableData(input.data, accessor);
                        if (Object.keys(payload).length === 0) {
                            throw new Error('Provide at least one writable field in "data" to update a record.');
                        }
                        const criteria = this.buildCriteria(input.criteria, input.id);
                        const updated = await entity.model.updateOne(criteria, payload, accessor);
                        if (!updated) {
                            throw new Error('No matching record was found or you do not have permission to update it.');
                        }
                        return JSON.stringify({
                            model: entity.name,
                            record: updated,
                        }, null, 2);
                    }
                    case 'delete': {
                        const accessor = new DataAccessor(this.adminizer, activeUser, entity, 'remove');
                        const criteria = this.buildCriteria(input.criteria, input.id);
                        const removed = await entity.model.destroyOne(criteria, accessor);
                        if (!removed) {
                            throw new Error('No matching record was found or you do not have permission to delete it.');
                        }
                        return JSON.stringify({
                            model: entity.name,
                            record: removed,
                        }, null, 2);
                    }
                    default:
                        throw new Error('Unsupported action. Use "create", "update", or "delete".');
                }
            },
        });

        return new Agent<AgentContext>({
            name: 'Adminizer data agent',
            instructions: [
                'You are an assistant that answers questions using Adminizer data.',
                'Always rely on the provided tools to inspect or change database records.',
                'All tool calls must be expressed as JSON instructions, e.g. {"action":"create","model":"Example","data":{...}}.',
                'Only include fields that are relevant to the question and respect user permissions.',
                'Summaries should explain how the answer was derived from the data.',
                '',
                'Accessible models:',
                modelSummary,
            ].join('\n'),
            handoffDescription: 'Retrieves Adminizer records using DataAccessor with full permission checks.',
            tools: [dataQueryTool, dataMutationTool],
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

    private ensurePlainObject<T = Record<string, unknown>>(value: unknown): T {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Expected a JSON object.');
        }

        return value as T;
    }

    private filterWritableData(
        rawData: unknown,
        accessor: DataAccessor,
    ): Record<string, unknown> {
        const data = rawData ? this.ensurePlainObject<Record<string, unknown>>(rawData) : {};
        const fieldsConfig = accessor.getFieldsConfig();

        if (!fieldsConfig) {
            throw new Error('You do not have permission to modify this model.');
        }

        const writableEntries = Object.entries(data)
            .filter(([key]) => Boolean(fieldsConfig[key]));

        return Object.fromEntries(writableEntries);
    }

    private buildCriteria(criteriaInput: unknown, id: unknown): Record<string, unknown> {
        const criteria = criteriaInput ? this.ensurePlainObject<Record<string, unknown>>(criteriaInput) : {};

        if (id !== undefined) {
            criteria.id = id;
        }

        if (Object.keys(criteria).length === 0) {
            throw new Error('Provide either "id" or "criteria" to target a record.');
        }

        return criteria;
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
}
