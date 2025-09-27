import {AbstractAiModelService} from './AbstractAiModelService';
import {AiAssistantMessage} from '../../interfaces/types';
import {UserAP} from '../../models/UserAP';
import {Adminizer} from '../Adminizer';
import {ActionType, ModelConfig} from '../../interfaces/adminpanelConfig';
import {Entity} from '../../interfaces/types';
import {AccessibleFieldDescriptor, DataAccessor} from '../DataAccessor';

type AgentAction = 'create' | 'fields';

interface AgentInstruction {
    action: AgentAction;
    entity: string;
    payload?: Record<string, unknown>;
    criteria?: Record<string, unknown>;
}

type DataAccessorFactory = (entity: Entity, user: UserAP, action: ActionType) => DataAccessor;

const ACTION_TOKENS: Record<ActionType, 'create' | 'read' | 'update' | 'delete'> = {
    add: 'create',
    edit: 'update',
    list: 'read',
    view: 'read',
    remove: 'delete',
};

export class OpenAiModelService extends AbstractAiModelService {
    private readonly createAccessor: DataAccessorFactory;

    public constructor(adminizer: Adminizer, accessorFactory?: DataAccessorFactory) {
        super(adminizer, {
            id: 'openai',
            name: 'OpenAI fixture agent',
            description: 'Executes structured commands with DataAccessor using the current user permissions.',
        });
        this.createAccessor = accessorFactory ?? ((entity, user, action) => new DataAccessor(adminizer, user, entity, action));
    }

    public async generateReply(prompt: string, _history: AiAssistantMessage[], user: UserAP): Promise<string> {
        const instruction = this.parseInstruction(prompt);

        if (!instruction) {
            return this.usageMessage();
        }

        switch (instruction.action) {
            case 'create':
                return this.handleCreate(instruction, user);
            case 'fields':
                return this.handleDescribe(instruction, user);
            default:
                return `Unsupported action "${instruction.action}". The OpenAI agent currently supports the "create" action and the "fields" schema lookup.`;
        }
    }

    private async handleCreate(instruction: AgentInstruction, user: UserAP): Promise<string> {
        const entity = this.resolveEntity(instruction.entity);
        if (!entity || !entity.model) {
            return `Model "${instruction.entity}" is not available in this project.`;
        }

        if (!this.userHasPermission(entity, user, 'add')) {
            return `User "${user.login}" does not have permission to create ${entity.name} records.`;
        }

        if (!instruction.payload || typeof instruction.payload !== 'object') {
            return 'The "create" action requires a "data" object with field values.';
        }

        try {
            const accessor = this.createAccessor(entity, user, 'add');
            const descriptors = this.indexDescriptors(accessor.describeAccessibleFields());

            const {sanitizedPayload, skippedFields} = this.filterPayload(instruction.payload, descriptors);
            const missingRequired = this.findMissingRequiredFields(sanitizedPayload, descriptors);

            if (missingRequired.length > 0) {
                return `Cannot create ${entity.name} record. Please provide values for: ${missingRequired.join(', ')}.`;
            }

            const created = await entity.model.create(sanitizedPayload as any, accessor);
            const preview = JSON.stringify(created, null, 2);
            const recordId = this.extractPrimaryKey(created, entity);
            const idMessage = recordId !== undefined ? ` (id: ${recordId})` : '';
            const skippedMessage = skippedFields.length > 0
                ? `\nThe following fields were ignored because they are not available for creation: ${skippedFields.join(', ')}.`
                : '';
            return `Record created in ${entity.name}${idMessage}:\n${preview}${skippedMessage}`;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            Adminizer.log.error('OpenAI agent failed to create record', error);
            return `Failed to create ${entity.name} record: ${message}`;
        }
    }

    private async handleDescribe(instruction: AgentInstruction, user: UserAP): Promise<string> {
        const entity = this.resolveEntity(instruction.entity);
        if (!entity || !entity.model) {
            return `Model "${instruction.entity}" is not available in this project.`;
        }

        if (!this.userHasPermission(entity, user, 'add')) {
            return `User "${user.login}" does not have permission to view the creation schema for ${entity.name}.`;
        }

        const accessor = this.createAccessor(entity, user, 'add');
        const descriptors = accessor.describeAccessibleFields();

        if (descriptors.length === 0) {
            return `No fields are available for creating ${entity.name} records.`;
        }

        const formatted = descriptors
            .filter((descriptor) => !descriptor.disabled)
            .map((descriptor) => this.formatFieldDescriptor(descriptor))
            .join('\n');

        return [`Fields available for creating ${entity.name} records:`, formatted].join('\n');
    }

    private indexDescriptors(descriptors: AccessibleFieldDescriptor[]): Map<string, AccessibleFieldDescriptor> {
        return new Map(descriptors.map((descriptor) => [descriptor.key, descriptor]));
    }

    private filterPayload(
        payload: Record<string, unknown>,
        descriptors: Map<string, AccessibleFieldDescriptor>,
    ): {sanitizedPayload: Record<string, unknown>; skippedFields: string[]} {
        const sanitizedPayload: Record<string, unknown> = {};
        const skippedFields: string[] = [];

        for (const [key, value] of Object.entries(payload)) {
            const descriptor = descriptors.get(key);

            if (!descriptor || descriptor.disabled) {
                skippedFields.push(key);
                continue;
            }

            sanitizedPayload[key] = value;
        }

        return {sanitizedPayload, skippedFields};
    }

    private findMissingRequiredFields(
        payload: Record<string, unknown>,
        descriptors: Map<string, AccessibleFieldDescriptor>,
    ): string[] {
        const missing: string[] = [];

        descriptors.forEach((descriptor, key) => {
            if (!descriptor.required || descriptor.disabled) {
                return;
            }

            if (payload[key] !== undefined && payload[key] !== null) {
                return;
            }

            if (descriptor.defaultValue !== undefined) {
                return;
            }

            missing.push(key);
        });

        return missing;
    }

    private formatFieldDescriptor(descriptor: AccessibleFieldDescriptor): string {
        const parts = [
            `• ${descriptor.key} (${descriptor.type})${descriptor.required ? ' – required' : ''}`,
        ];

        if (descriptor.description) {
            parts.push(`  Description: ${descriptor.description}`);
        }

        if (descriptor.placeholder) {
            parts.push(`  Placeholder: ${descriptor.placeholder}`);
        }

        if (descriptor.allowedValues && descriptor.allowedValues.length > 0) {
            const values = descriptor.allowedValues
                .map((value) => typeof value === 'object' ? JSON.stringify(value) : String(value))
                .join(', ');
            parts.push(`  Allowed values: ${values}`);
        }

        if (descriptor.association) {
            parts.push(`  Links to: ${descriptor.association.model}${descriptor.association.multiple ? ' (multiple)' : ''}`);
        }

        return parts.join('\n');
    }

    private parseInstruction(prompt: string): AgentInstruction | null {
        try {
            const parsed = JSON.parse(prompt);
            if (!parsed || typeof parsed !== 'object') {
                return null;
            }

            const rawAction = this.extractString(parsed, ['action', 'type']);
            if (!rawAction) {
                return null;
            }

            const action = rawAction.toLowerCase();
            const normalizedAction = this.normalizeAction(action);

            if (!normalizedAction) {
                return null;
            }

            const entity = this.extractString(parsed, ['entity', 'model']);
            if (!entity) {
                return null;
            }

            const payload = this.extractObject(parsed, ['data', 'payload', 'record']);
            const criteria = this.extractObject(parsed, ['criteria', 'where', 'filter']);

            return {
                action: normalizedAction,
                entity,
                payload,
                criteria,
            };
        } catch {
            return null;
        }
    }

    private normalizeAction(action: string): AgentAction | null {
        switch (action) {
            case 'create':
            case 'add':
                return 'create';
            case 'fields':
            case 'describe':
            case 'schema':
            case 'help':
                return 'fields';
            default:
                return null;
        }
    }

    private usageMessage(): string {
        return [
            'Provide JSON instructions so the OpenAI agent can execute them with your permissions.',
            'Example:',
            '```json',
            '{',
            '  "action": "create",',
            '  "entity": "Example",',
            '  "data": { "title": "Hello from the agent" }',
            '}',
            '```',
            'To inspect allowed fields before creating a record, send:',
            '```json',
            '{',
            '  "action": "fields",',
            '  "entity": "Example"',
            '}',
            '```',
            'The agent uses DataAccessor, so any field-level restrictions from your account are respected.',
        ].join('\n');
    }

    private resolveEntity(modelName: string): Entity | null {
        const models = this.adminizer.config.models;
        if (!models) {
            return null;
        }

        const loweredName = modelName.toLowerCase();
        const match = Object.entries(models).find(([key, config]) => {
            if (key.toLowerCase() === loweredName) {
                return true;
            }
            if (typeof config === 'object' && config && 'model' in config && typeof config.model === 'string') {
                return config.model.toLowerCase() === loweredName;
            }
            return false;
        });

        if (!match) {
            return null;
        }

        const [configName, configValue] = match as [string, ModelConfig | boolean];
        const normalizedConfig = this.normalizeModelConfig(configName, configValue);
        const model = this.adminizer.modelHandler.model.get(normalizedConfig.model);

        if (!model) {
            return null;
        }

        return {
            name: configName,
            uri: `${this.adminizer.config.routePrefix}/model/${configName}`,
            type: 'model',
            config: normalizedConfig,
            model,
        };
    }

    private normalizeModelConfig(name: string, config: ModelConfig | boolean): ModelConfig {
        const baseConfig: ModelConfig = {
            model: name,
            icon: 'description',
            title: name,
            list: true,
            add: true,
            edit: true,
            remove: true,
            view: true,
        } as ModelConfig;

        if (typeof config === 'boolean') {
            return config ? baseConfig : {...baseConfig, list: false, add: false, edit: false, remove: false, view: false};
        }

        return {...baseConfig, ...config};
    }

    private userHasPermission(entity: Entity, user: UserAP, action: ActionType): boolean {
        const token = this.getPermissionToken(entity, action);
        return this.adminizer.accessRightsHelper.hasPermission(token, user);
    }

    private getPermissionToken(entity: Entity, action: ActionType): string {
        const verb = ACTION_TOKENS[action];
        const modelName = entity.model?.modelname ?? entity.config?.model ?? entity.name;
        return `${verb}-${modelName}-${entity.type}`.toLowerCase();
    }

    private extractPrimaryKey(record: Partial<Record<string, unknown>>, entity: Entity): unknown {
        if (!record) {
            return undefined;
        }
        const primaryKey = (entity.model as any)?.primaryKey ?? 'id';
        return (record as Record<string, unknown>)[primaryKey];
    }

    private extractString(source: any, keys: string[]): string | undefined {
        for (const key of keys) {
            const value = source?.[key];
            if (typeof value === 'string' && value.trim().length > 0) {
                return value.trim();
            }
        }
        return undefined;
    }

    private extractObject(source: any, keys: string[]): Record<string, unknown> | undefined {
        for (const key of keys) {
            const value = source?.[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return value as Record<string, unknown>;
            }
        }
        return undefined;
    }
}
