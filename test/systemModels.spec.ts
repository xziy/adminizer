import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import Waterline from 'waterline';
// @ts-ignore
import sailsDisk from 'sails-disk';
import { Sequelize } from 'sequelize-typescript';
import {
  WaterlineAdapter,
  SequelizeAdapter
} from '../src';

// Helper to init Waterline ORM
async function initWaterline() {
  const orm = new Waterline();
  await WaterlineAdapter.registerSystemModels(orm);
  const config = {
    adapters: { disk: sailsDisk },
    datastores: {
      default: { adapter: 'disk', inMemoryOnly: true }
    }
  };
  const ontology = await new Promise<any>((resolve, reject) => {
    orm.initialize(config as any, (err, ontology) => {
      if (err) return reject(err);
      resolve(ontology);
    });
  });
  return { orm, ontology };
}

describe('System models registration', () => {
  describe('Waterline', () => {
    let orm: Waterline.Waterline;
    let ontology: any;

    beforeAll(async () => {
      ({ orm, ontology } = await initWaterline());
    });

    afterAll(async () => {
      await orm.teardown();
    });

    it('registers all system models', () => {
      expect(ontology.collections).toHaveProperty('groupap');
      expect(ontology.collections).toHaveProperty('userap');
      expect(ontology.collections).toHaveProperty('mediamanagerap');
      expect(ontology.collections).toHaveProperty('mediamanagerassociationsap');
      expect(ontology.collections).toHaveProperty('mediamanagermetaap');
      expect(ontology.collections).toHaveProperty('navigationap');
    });

    it('creates records for system models', async () => {
      const group = await ontology.collections.groupap.create({ name: 'g1' }).fetch();
      const user = await ontology.collections.userap.create({ login: 'u1', fullName: 'User One' }).fetch();
      const nav = await ontology.collections.navigationap.create({ label: 'main', tree: {} }).fetch();
      const file = await ontology.collections.mediamanagerap.create({ id: 'file-1' }).fetch();
      const assoc = await ontology.collections.mediamanagerassociationsap.create({ id: 'assoc-1' }).fetch();
      const meta = await ontology.collections.mediamanagermetaap.create({ id: 'meta-1' }).fetch();

      expect(group).toHaveProperty('id');
      expect(user).toHaveProperty('id');
      expect(nav).toHaveProperty('id');
      expect(file).toHaveProperty('id');
      expect(assoc).toHaveProperty('id');
      expect(meta).toHaveProperty('id');
    });
  });

  describe.skip('Sequelize', () => {
    let orm: Sequelize;

    beforeAll(async () => {
      orm = new Sequelize('sqlite::memory:', { logging: false });
      await SequelizeAdapter.registerSystemModels(orm);
    });

    afterAll(async () => {
      await orm.close();
    });

    it('registers all system models', () => {
      expect(orm.models).toHaveProperty('GroupAP');
      expect(orm.models).toHaveProperty('UserAP');
      expect(orm.models).toHaveProperty('MediaManagerAP');
      expect(orm.models).toHaveProperty('MediaManagerAssociationsAP');
      expect(orm.models).toHaveProperty('MediaManagerMetaAP');
      expect(orm.models).toHaveProperty('NavigationAP');
    });

    it('creates records for system models', async () => {
      const { GroupAP, UserAP, NavigationAP, MediaManagerAP, MediaManagerAssociationsAP, MediaManagerMetaAP } = orm.models as any;
      const group = await GroupAP.create({ name: 'g2' });
      const user = await UserAP.create({ login: 'u2', fullName: 'User Two' });
      const nav = await NavigationAP.create({ label: 'nav', tree: {} });
      const file = await MediaManagerAP.create({ id: 'file-2' });
      const assoc = await MediaManagerAssociationsAP.create({ id: 'assoc-2' });
      const meta = await MediaManagerMetaAP.create({ id: 'meta-2' });

      expect(group.id).toBeDefined();
      expect(user.id).toBeDefined();
      expect(nav.id).toBeDefined();
      expect(file.id).toBeDefined();
      expect(assoc.id).toBeDefined();
      expect(meta.id).toBeDefined();
    });
  });
});
