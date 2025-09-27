import {describe, expect, it, vi} from 'vitest';
import {OpenAiModelService} from '../src/lib/ai-assistant/OpenAiModelService';
import {UserAP} from '../src/models/UserAP';
import {Adminizer} from '../src/lib/Adminizer';
import {ActionType, ModelConfig} from '../src/interfaces/adminpanelConfig';
import {Entity} from '../src/interfaces/types';
import {DataAccessor} from '../src/lib/DataAccessor';

describe('OpenAiModelService', () => {
    const createAdminizerStub = () => {
        const modelCreate = vi.fn(async (data: Record<string, unknown>) => ({id: 42, ...data}));
        const stubModel = {
            modelname: 'example',
            primaryKey: 'id',
            create: modelCreate,
        };

        const accessRightsHelper = {
            registerToken: vi.fn(),
            hasPermission: vi.fn().mockReturnValue(true),
        };

        const config = {
            routePrefix: '/adminizer',
            models: {
                Example: {
                    model: 'example',
                    title: 'Example',
                    add: true,
                    edit: true,
                    list: true,
                    remove: true,
                    view: true,
                } satisfies ModelConfig,
            },
        } as Adminizer['config'];

        const adminizer = {
            config,
            accessRightsHelper,
            modelHandler: {
                model: {
                    get: vi.fn(() => stubModel),
                },
            },
        } as unknown as Adminizer;

        const user: UserAP = {
            id: 1,
            login: 'openai',
            groups: [],
            isAdministrator: false,
        } as unknown as UserAP;

        return {adminizer, accessRightsHelper, stubModel, modelCreate, user};
    };

    it('returns usage instructions when the prompt is not JSON', async () => {
        const {adminizer, user} = createAdminizerStub();
        const service = new OpenAiModelService(adminizer, vi.fn());

        const reply = await service.generateReply('hello world', [], user);

        expect(reply).toContain('Provide JSON instructions');
    });

    it('creates a record using DataAccessor when JSON command is provided', async () => {
        const {adminizer, user, modelCreate} = createAdminizerStub();
        const accessorStub = {} as DataAccessor;
        const accessorFactory = vi.fn((entity: Entity, currentUser: UserAP, action: ActionType) => {
            expect(entity.name).toBe('Example');
            expect(currentUser).toBe(user);
            expect(action).toBe('add');
            return accessorStub;
        });

        const service = new OpenAiModelService(adminizer, accessorFactory);
        const payload = {
            action: 'create',
            entity: 'Example',
            data: {title: 'AI title'},
        };

        const reply = await service.generateReply(JSON.stringify(payload), [], user);

        expect(accessorFactory).toHaveBeenCalledTimes(1);
        expect(modelCreate).toHaveBeenCalledWith(payload.data, accessorStub);
        expect(reply).toContain('Record created in Example');
        expect(reply).toContain('AI title');
    });

    it('blocks creation when the user lacks permissions', async () => {
        const {adminizer, user, accessRightsHelper} = createAdminizerStub();
        accessRightsHelper.hasPermission.mockReturnValue(false);

        const service = new OpenAiModelService(adminizer, vi.fn());
        const payload = {
            action: 'create',
            entity: 'Example',
            data: {title: 'Restricted'},
        };

        const reply = await service.generateReply(JSON.stringify(payload), [], user);

        expect(reply).toContain('does not have permission');
    });
});
