
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import entityMock from './datamocks/entityExample';
import { UserAP } from '../src/models/UserAP';
import { DataAccessor } from '../src/lib/v4/DataAccessor';

import { Config } from "waterline";

// @ts-ignore
import sailsDisk from "sails-disk";
import { Adminizer, WaterlineAdapter } from '../src';
import { Entity } from '../src/interfaces/types';
import { config } from "./datamocks/adminizerConfig"
import Test  from './datamocks/Test';
import Waterline from 'waterline';
import Example from './datamocks/Example';

describe('DataAccessor test', () => {
  let adminUser: UserAP;
  let editorUser: UserAP;
  let managerUser: UserAP;
  let defaultUser: UserAP;
  let entity: Entity;
  let instance: DataAccessor;
  let adminizer!: Adminizer;
  let orm: Waterline.Waterline;

  function makeReq(user: UserAP): ReqType {
    return { adminizer, user } as ReqType;
  }

  beforeAll(async () => {
    orm = new Waterline(); 
    
    // @ts-ignore
    await WaterlineAdapter.registerSystemModels(orm);
    await sleep(1000)
    orm.registerModel(Test);
    orm.registerModel(Example);
    const waterlineConfig: Config = {
      adapters: {
        disk: sailsDisk,
      },
      datastores: {
        default: {
          adapter: "disk",
          // @ts-ignore
          inMemoryOnly: true,
        }
      }
    };
  
    const ontology = await new Promise<any>((resolve, reject) => {
      orm.initialize(waterlineConfig, (err, ontology) => {
        if (err) return reject(err);
        resolve(ontology);
      });
    });
  
    console.log("Waterline ORM initialized!");

    const waterlineAdapter = new WaterlineAdapter({ orm, ontology });
    adminizer = new Adminizer([waterlineAdapter]);
  
    try {
      // @ts-ignore
      await adminizer.init(config);
    } catch (error) {
      console.error("adminizer init error:", error);
    }
  });
  

  beforeEach(() => {
    adminUser = {
      id: 0,
      login: 'adminUser',
      isAdministrator: true,
      groups: [{ name: 'admin', id: 0 }]
    };

    editorUser = {
      id: 1,
      login: 'editorUser',
      groups: [{ name: 'editor', id: 1 }]
    };

    managerUser = {
      id: 2,
      login: 'managerUser',
      groups: [{ name: 'manager', id: 2 }]
    };

    defaultUser = {
      id: 3,
      login: 'defaultUser',
      groups: [{ name: 'default user group', id: 3 }]
    };

    entity = structuredClone(entityMock);
  });

  it('`guardedField` should only be accessible for admin and editor in `add`', () => {
    instance = new DataAccessor(makeReq(adminUser), entity, 'add');
    expect(instance.getFieldsConfig()).toHaveProperty('guardedField');

    instance = new DataAccessor(makeReq(editorUser), entity, 'add');
    expect(instance.getFieldsConfig()).toHaveProperty('guardedField');

    instance = new DataAccessor(makeReq(managerUser), entity, 'add');
    expect(instance.getFieldsConfig()).not.toHaveProperty('guardedField');

    instance = new DataAccessor(makeReq(defaultUser), entity, 'add');
    expect(instance.getFieldsConfig()).not.toHaveProperty('guardedField');
  });

  it('`guardedField` should only be accessible for admin and manager in `edit`', () => {
    instance = new DataAccessor(makeReq(adminUser), entity, 'edit');
    expect(instance.getFieldsConfig()).toHaveProperty('guardedField');

    instance = new DataAccessor(makeReq(managerUser), entity, 'edit');
    expect(instance.getFieldsConfig()).toHaveProperty('guardedField');

    instance = new DataAccessor(makeReq(editorUser), entity, 'edit');
    expect(instance.getFieldsConfig()).not.toHaveProperty('guardedField');

    instance = new DataAccessor(makeReq(defaultUser), entity, 'edit');
    expect(instance.getFieldsConfig()).not.toHaveProperty('guardedField');
  });

  it('`color` field should have type `color` in `edit` config', () => {
    instance = new DataAccessor(makeReq(adminUser), entity, 'edit');
    const result = instance.getFieldsConfig();
    expect(result.color.config.type).toBe('color');
  });

  it('`title` is present in `edit`, but ignored in `add`', () => {
    instance = new DataAccessor(makeReq(adminUser), entity, 'edit');
    expect(instance.getFieldsConfig()).toHaveProperty('title');

    instance = new DataAccessor(makeReq(adminUser), entity, 'add');
    expect(instance.getFieldsConfig()).not.toHaveProperty('title');
  });

  it('Populated selfAssociation has guardedField for admin', () => {
    instance = new DataAccessor(makeReq(adminUser), entity, 'edit');
    expect(instance.getFieldsConfig().selfAssociation.populated).toHaveProperty('guardedField');
  });

  it('Populated selfAssociation does not expose guardedField to manager (if not allowed)', () => {
    instance = new DataAccessor(makeReq(managerUser), entity, 'edit');
    const populated = instance.getFieldsConfig().selfAssociation.populated;
    expect(populated).not.toHaveProperty('guardedField');
  });

  it('`process()` filters fields based on user access', () => {
    const record = {
      id: 1,
      title: 'Test Title',
      guardedField: 'secret',
      color: '#000'
    };

    instance = new DataAccessor(makeReq(managerUser), entity, 'edit');
    const result = instance.process(record);
    expect(result).not.toHaveProperty('guardedField');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('color');
  });

  it('`processMany()` filters multiple records', () => {
    const records = [
      { id: 1, title: 'One', guardedField: 'X' },
      { id: 2, title: 'Two', guardedField: 'Y' }
    ];

    instance = new DataAccessor(makeReq(editorUser), entity, 'add');
    const result = instance.processMany(records);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('guardedField');
  });

  it('`sanitizeUserRelationAccess()` includes user ID in criteria', async () => {
    if (entity.config && entity.config.userAccessRelation) {
      entity.config.userAccessRelation = {
        field: 'userField'
      };
    }
    instance = new DataAccessor(makeReq(managerUser), entity, 'add');
    const result = await instance.sanitizeUserRelationAccess({});
    expect(result).toEqual({ userField: 2 });
  });

  it('`sanitizeUserRelationAccess()` throws error on invalid config', async () => {
    entity.config.userAccessRelation = 'invalidField';
    instance = new DataAccessor(makeReq(managerUser), entity, 'add');
    await expect(instance.sanitizeUserRelationAccess({})).rejects.toThrow(
      /Invalid userAccessRelation configuration/
    );
  });

  it('`setUserRelationAccess()` assigns user to field if userap', async () => {
    entity.config.userAccessRelation = 'userField';
    entity.model.attributes.userField = { model: 'UserAP' };

    const record = { title: 'Sample' };
    instance = new DataAccessor(makeReq(editorUser), entity, 'add');
    const result = await instance.setUserRelationAccess(record);
    expect(result).toHaveProperty('userField', 1);
  });

  it('`setUserRelationAccess()` assigns group if groupap and one group', async () => {
    entity.config.userAccessRelation = 'groupField';
    entity.model.attributes.groupField = { model: 'GroupAP' };

    const record = { title: 'With group' };
    instance = new DataAccessor(makeReq(managerUser), entity, 'add');
    const result = await instance.setUserRelationAccess(record);
    expect(result).toHaveProperty('groupField', 2);
  });

  it('`setUserRelationAccess()` throws error if multiple groups and groupap', async () => {
    const multiGroupUser = {
      ...managerUser,
      groups: [{ name: 'one', id: 10 }, { name: 'two', id: 20 }]
    };
    entity.config.userAccessRelation = 'groupField';
    entity.model.attributes.groupField = { model: 'GroupAP' };

    instance = new DataAccessor(makeReq(multiGroupUser), entity, 'add');
    await expect(instance.setUserRelationAccess({})).rejects.toThrow(
      /associated with none or multiple groups/
    );
  });
});


function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}