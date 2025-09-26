import {Agent, assistant as assistantMessage, run, tool, user as userMessage} from '@openai/agents';
import {z} from 'zod';

import {AbstractAiModelService} from '../../src/lib/ai-assistant/AbstractAiModelService';
import {AiAssistantMessage, Entity} from '../../src/interfaces/types';
import {ModelConfig, ActionType} from '../../src/interfaces/adminpanelConfig';
import {Adminizer} from '../../src/lib/Adminizer';
import {DataAccessor} from '../../src/lib/DataAccessor';
import {UserAP} from '../../src/models/UserAP';
import type {Field, Fields} from '../../src/helpers/fieldsHelper';
import {ModelAnyInstance} from '../../src/lib/model/AbstractModel';

const DEFAULT_ACTION_FLAGS: Pick<ModelConfig, 'list' | 'add' | 'edit' | 'remove' | 'view'> = {
    list: true,
    add: true,
    edit: true,
    remove: true,
    view: true,
};

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_AGENT_MODEL ?? 'gpt-4.1-mini';
const AGENT_ID = 'openai-data';

function normalizeBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') {
            return true;
        }
        if (value.toLowerCase() === 'false') {
            return false;
        }
    }
    return undefined;
}

export class OpenAiDatabaseAgentService extends AbstractAiModelService {
    private readonly modelName: string;

    constructor(adminizer: Adminizer) {
        super(adminizer, {
            id: AGENT_ID,
            name: 'OpenAI data assistant',
            description: 'Answers questions using Adminizer data by delegating to OpenAI Agents tools.',
        });
        this.modelName = DEFAULT_OPENAI_MODEL;
    }

    public async generateReply(prompt: string, history: AiAssistantMessage[], user: UserAP): Promise<string> {
        if (!process.env.OPENAI_API_KEY) {
            return 'OpenAI API key is not configured. Set the OPENAI_API_KEY environment variable to use this assistant.';
        }

        const conversation = this.buildConversation(history);
        const agent = this.createAgent(user);

        try {
            const result = await run(agent, conversation, {
                maxTurns: 6,
            });

            if (typeof result.finalOutput === 'string' && result.finalOutput.trim().length > 0) {
                return result.finalOutput;
            }

            return 'The agent did not return a response. Please try asking your question again.';
        } catch (error) {
            Adminizer.log.error('OpenAI data agent failed to generate a reply', error);
            return 'The OpenAI data assistant encountered an error while processing your request.';
        }
    }

    private createAgent(user: UserAP): Agent {
        return Agent.create({
            name: 'Adminizer OpenAI data agent',
            instructions:
                'You are an assistant that helps administrators explore the Adminizer database. ' +
                'Use the provided tools to fetch only the data that is explicitly requested. ' +
                'Summarize large datasets concisely and highlight any relevant insights. ' +
                'If the user asks for information you cannot access, explain the limitation.',
            handoffDescription: 'Provides detailed answers using Adminizer database records.',
            model: this.modelName,
            tools: this.buildTools(user),
        });
    }

    private buildTools(user: UserAP) {
        const listRecordsTool = tool({
            name: 'list_records',
            description: 'Retrieve multiple records from an Adminizer model with optional filters.',
            parameters: z.object({
                model: z.string().describe('Name of the model as defined in the Adminizer configuration.'),
                limit: z
                    .number()
                    .int()
                    .min(1)
                    .max(50)
                    .default(5)
                    .describe('Maximum number of records to return (default 5, maximum 50).'),
                filters: z
                    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
                    .optional()
                    .describe('Optional equality filters keyed by field name.'),
            }).strict(),
            execute: async ({model, limit, filters}) => {
                return this.handleListRecords({model, limit, filters: filters ?? {}}, user);
            },
        });

        const getRecordTool = tool({
            name: 'get_record',
            description: 'Retrieve a single record from an Adminizer model by its primary identifier.',
            parameters: z.object({
                model: z.string().describe('Name of the model as defined in the Adminizer configuration.'),
                id: z.union([z.string(), z.number()]).describe('Primary key value of the record.'),
            }).strict(),
            execute: async ({model, id}) => this.handleGetRecord(model, id, user),
        });

        return [listRecordsTool, getRecordTool];
    }

    private buildConversation(history: AiAssistantMessage[]) {
        const recentMessages = history.slice(-20);
        return recentMessages.map((message) =>
            message.role === 'assistant'
                ? assistantMessage(message.content)
                : userMessage(message.content),
        );
    }

    private async handleListRecords(
        {model, limit, filters}: {model: string; limit: number; filters: Record<string, string | number | boolean>},
        user: UserAP,
    ): Promise<string> {
        try {
            const access = this.createAccessor(model, user, 'list');
            if (!access) {
                return `Model "${model}" is not available or you do not have access to list it.`;
            }

            const {entity, accessor} = access;
            const fields = accessor.getFieldsConfig();
            if (!fields) {
                return `You do not have permission to list records for model "${entity.name}".`;
            }

            const normalizedFilters = this.normalizeFilters(filters, fields);
            const records = await entity.model.find(normalizedFilters, accessor);
            const limitedRecords = records.slice(0, limit);

            if (limitedRecords.length === 0) {
                return `No records found for model "${entity.name}" with the provided criteria.`;
            }

            return this.formatRecords(limitedRecords, entity, normalizedFilters);
        } catch (error) {
            Adminizer.log.error('OpenAI data agent list_records tool failed', error);
            return 'Failed to list records. Please adjust the filters or try again later.';
        }
    }

    private async handleGetRecord(model: string, id: string | number, user: UserAP): Promise<string> {
        try {
            const access = this.createAccessor(model, user, 'view');
            if (!access) {
                return `Model "${model}" is not available or you do not have access to view it.`;
            }

            const {entity, accessor} = access;
            const fields = accessor.getFieldsConfig();
            if (!fields) {
                return `You do not have permission to view records for model "${entity.name}".`;
            }

            const primaryKey = entity.model?.primaryKey ?? 'id';
            const fieldDefinition = fields[primaryKey];
            const normalizedId = this.coerceValue(id, fieldDefinition);

            const record = await entity.model.findOne({[primaryKey]: normalizedId} as Record<string, unknown>, accessor);
            if (!record) {
                return `Record with ${primaryKey}=${id} was not found in model "${entity.name}".`;
            }

            return this.formatRecord(record, entity);
        } catch (error) {
            Adminizer.log.error('OpenAI data agent get_record tool failed', error);
            return 'Failed to fetch the requested record.';
        }
    }

    private createAccessor(modelName: string, user: UserAP, action: ActionType): {entity: Entity; accessor: DataAccessor} | null {
        const entity = this.findEntity(modelName);
        if (!entity || !entity.model) {
            return null;
        }

        return {
            entity,
            accessor: new DataAccessor(this.adminizer, user, entity, action),
        };
    }

    private findEntity(modelName: string): Entity | null {
        const modelsConfig = this.adminizer.config.models ?? {};
        const entry = Object.entries(modelsConfig).find(([key, config]) => {
            if (key.toLowerCase() === modelName.toLowerCase()) {
                return true;
            }

            if (typeof config === 'object' && config && 'model' in config && typeof (config as ModelConfig).model === 'string') {
                return (config as ModelConfig).model.toLowerCase() === modelName.toLowerCase();
            }

            return false;
        });

        if (!entry) {
            return null;
        }

        const [entityName, rawConfig] = entry as [string, ModelConfig | boolean];
        const normalizedConfig = this.normalizeModelConfig(entityName, rawConfig);
        const modelInstance = this.adminizer.modelHandler.model.get(normalizedConfig.model);

        if (!modelInstance) {
            Adminizer.log.warn(`OpenAI data agent could not find model instance for "${normalizedConfig.model}".`);
            return null;
        }

        return {
            name: entityName,
            uri: `${this.adminizer.config.routePrefix}/model/${entityName}`,
            type: 'model',
            config: normalizedConfig,
            model: modelInstance,
        };
    }

    private normalizeModelConfig(entityName: string, config: ModelConfig | boolean): ModelConfig {
        let normalized: ModelConfig;

        if (typeof config === 'boolean') {
            normalized = {
                model: entityName,
                title: entityName,
                icon: 'description',
            } as ModelConfig;
        } else if (!config || typeof config !== 'object' || typeof config.model !== 'string') {
            normalized = {
                model: entityName,
                title: entityName,
                icon: 'description',
            } as ModelConfig;
        } else {
            normalized = {...config};
            if (!normalized.title) {
                normalized.title = entityName;
            }
            if (!normalized.icon) {
                normalized.icon = 'description';
            }
        }

        return {
            ...DEFAULT_ACTION_FLAGS,
            ...normalized,
        };
    }

    private normalizeFilters(filters: Record<string, string | number | boolean>, fields: Fields): Record<string, unknown> {
        const normalized: Record<string, unknown> = {};

        for (const [key, rawValue] of Object.entries(filters)) {
            if (!Object.prototype.hasOwnProperty.call(fields, key)) {
                continue;
            }

            const fieldDefinition = fields[key];
            const value = this.coerceValue(rawValue, fieldDefinition);
            if (value !== undefined) {
                normalized[key] = value;
            }
        }

        return normalized;
    }

    private coerceValue(value: string | number | boolean, field?: Field): unknown {
        const fieldType = field?.config && typeof field.config === 'object' ? (field.config as {type?: string}).type : undefined;

        if (fieldType === 'number') {
            if (typeof value === 'number') {
                return value;
            }
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : undefined;
        }

        if (fieldType === 'boolean') {
            const normalized = normalizeBoolean(value);
            return normalized ?? undefined;
        }

        if (fieldType === 'json') {
            if (typeof value === 'object' && value !== null) {
                return value;
            }
            if (typeof value === 'string') {
                try {
                    return JSON.parse(value);
                } catch (error) {
                    Adminizer.log.warn('Failed to parse JSON filter value', {value});
                    return undefined;
                }
            }
        }

        return value;
    }

    private formatRecords(records: Partial<ModelAnyInstance>[], entity: Entity, filters: Record<string, unknown>): string {
        const previewCount = Math.min(records.length, 3);
        const preview = records.slice(0, previewCount).map((record, index) => `Record ${index + 1}: ${JSON.stringify(record)}`);

        const summaryParts = [
            `${records.length} record(s) matched in model "${entity.name}".`,
            preview.join('\n'),
        ];

        if (Object.keys(filters).length > 0) {
            summaryParts.splice(1, 0, `Applied filters: ${JSON.stringify(filters)}`);
        }

        if (records.length > previewCount) {
            summaryParts.push(`Showing ${previewCount} of ${records.length} records. Refine your filters for more details.`);
        }

        return summaryParts.filter(Boolean).join('\n');
    }

    private formatRecord(record: Partial<ModelAnyInstance>, entity: Entity): string {
        return `Model "${entity.name}" record:\n${JSON.stringify(record, null, 2)}`;
    }
}

