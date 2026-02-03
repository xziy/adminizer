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

describe('FilterAP and FilterColumnAP models', () => {
  describe('Waterline', () => {
    let orm: Waterline.Waterline;
    let ontology: any;
    let testUser: any;

    beforeAll(async () => {
      ({ orm, ontology } = await initWaterline());
      // Create test user for filter owner
      testUser = await ontology.collections.userap.create({
        login: 'filtertest',
        fullName: 'Filter Test User'
      }).fetch();
    });

    afterAll(async () => {
      await orm.teardown();
    });

    describe('FilterAP', () => {
      it('registers filterap model', () => {
        expect(ontology.collections).toHaveProperty('filterap');
      });

      it('creates filter with required fields', async () => {
        const filter = await ontology.collections.filterap.create({
          id: 'test-filter-1',
          name: 'Test Filter',
          modelName: 'UserAP',
          slug: 'test-filter-1',
          owner: testUser.id
        }).fetch();

        expect(filter).toHaveProperty('id', 'test-filter-1');
        expect(filter).toHaveProperty('name', 'Test Filter');
        expect(filter).toHaveProperty('modelName', 'UserAP');
        expect(filter).toHaveProperty('slug', 'test-filter-1');
      });

      it('stores JSON conditions correctly', async () => {
        const conditions = [
          { id: 'cond1', field: 'status', operator: 'eq', value: 'active' },
          {
            id: 'group1',
            logic: 'OR',
            children: [
              { id: 'cond2', field: 'role', operator: 'eq', value: 'admin' },
              { id: 'cond3', field: 'role', operator: 'eq', value: 'moderator' }
            ]
          }
        ];

        const filter = await ontology.collections.filterap.create({
          id: 'test-filter-json',
          name: 'JSON Test',
          modelName: 'UserAP',
          slug: 'test-filter-json',
          owner: testUser.id,
          conditions
        }).fetch();

        expect(filter.conditions).toEqual(conditions);
      });

      it('stores groupIds as JSON array', async () => {
        const groupIds = [1, 2, 3];

        const filter = await ontology.collections.filterap.create({
          id: 'test-filter-groups',
          name: 'Groups Test',
          modelName: 'UserAP',
          slug: 'test-filter-groups',
          owner: testUser.id,
          groupIds,
          visibility: 'groups'
        }).fetch();

        expect(filter.groupIds).toEqual(groupIds);
      });

      it('enforces unique slug constraint', async () => {
        await ontology.collections.filterap.create({
          id: 'test-filter-unique',
          name: 'First Filter',
          modelName: 'UserAP',
          slug: 'unique-slug',
          owner: testUser.id
        }).fetch();

        await expect(
          ontology.collections.filterap.create({
            id: 'test-filter-unique-2',
            name: 'Second Filter',
            modelName: 'UserAP',
            slug: 'unique-slug', // duplicate slug
            owner: testUser.id
          }).fetch()
        ).rejects.toThrow();
      });

      it('finds filter by slug', async () => {
        await ontology.collections.filterap.create({
          id: 'test-filter-find',
          name: 'Find Test',
          modelName: 'OrderAP',
          slug: 'find-by-slug',
          owner: testUser.id
        }).fetch();

        const found = await ontology.collections.filterap.findOne({ slug: 'find-by-slug' });
        expect(found).toBeDefined();
        expect(found.name).toBe('Find Test');
      });

      it('updates filter fields', async () => {
        const filter = await ontology.collections.filterap.create({
          id: 'test-filter-update',
          name: 'Update Test',
          modelName: 'UserAP',
          slug: 'update-test',
          owner: testUser.id
        }).fetch();

        await ontology.collections.filterap.updateOne({ id: filter.id })
          .set({ name: 'Updated Name', isPinned: true });

        const updated = await ontology.collections.filterap.findOne({ id: filter.id });
        expect(updated.name).toBe('Updated Name');
        expect(updated.isPinned).toBe(true);
      });

      it('deletes filter', async () => {
        const filter = await ontology.collections.filterap.create({
          id: 'test-filter-delete',
          name: 'Delete Test',
          modelName: 'UserAP',
          slug: 'delete-test',
          owner: testUser.id
        }).fetch();

        await ontology.collections.filterap.destroyOne({ id: filter.id });

        const found = await ontology.collections.filterap.findOne({ id: filter.id });
        expect(found).toBeUndefined();
      });
    });

    describe('FilterColumnAP', () => {
      let testFilter: any;

      beforeAll(async () => {
        testFilter = await ontology.collections.filterap.create({
          id: 'column-test-filter',
          name: 'Column Test Filter',
          modelName: 'UserAP',
          slug: 'column-test-filter',
          owner: testUser.id
        }).fetch();
      });

      it('registers filtercolumnap model', () => {
        expect(ontology.collections).toHaveProperty('filtercolumnap');
      });

      it('creates column with required fields', async () => {
        const column = await ontology.collections.filtercolumnap.create({
          filter: testFilter.id,
          fieldName: 'name',
          order: 0
        }).fetch();

        expect(column).toHaveProperty('id');
        expect(column).toHaveProperty('fieldName', 'name');
        expect(column).toHaveProperty('order', 0);
      });

      it('creates multiple columns with order', async () => {
        // Create a separate filter for this test to avoid conflicts
        const orderTestFilter = await ontology.collections.filterap.create({
          id: 'order-test-filter',
          name: 'Order Test Filter',
          modelName: 'UserAP',
          slug: 'order-test-filter',
          owner: testUser.id
        }).fetch();

        await ontology.collections.filtercolumnap.create({
          filter: orderTestFilter.id,
          fieldName: 'col_id',
          order: 0,
          isVisible: true
        }).fetch();

        await ontology.collections.filtercolumnap.create({
          filter: orderTestFilter.id,
          fieldName: 'col_email',
          order: 1,
          isVisible: true
        }).fetch();

        await ontology.collections.filtercolumnap.create({
          filter: orderTestFilter.id,
          fieldName: 'col_status',
          order: 2,
          isVisible: false
        }).fetch();

        const columns = await ontology.collections.filtercolumnap.find({
          filter: orderTestFilter.id
        }).sort('order ASC');

        expect(columns.length).toBe(3);
        expect(columns[0].fieldName).toBe('col_id');
        expect(columns[1].fieldName).toBe('col_email');
        expect(columns[2].fieldName).toBe('col_status');
      });

      it('updates column visibility and width', async () => {
        const column = await ontology.collections.filtercolumnap.create({
          filter: testFilter.id,
          fieldName: 'createdAt',
          order: 10,
          isVisible: true,
          width: 100
        }).fetch();

        await ontology.collections.filtercolumnap.updateOne({ id: column.id })
          .set({ isVisible: false, width: 200 });

        const updated = await ontology.collections.filtercolumnap.findOne({ id: column.id });
        expect(updated.isVisible).toBe(false);
        expect(updated.width).toBe(200);
      });

      it('sets editable flag', async () => {
        const column = await ontology.collections.filtercolumnap.create({
          filter: testFilter.id,
          fieldName: 'status_editable',
          order: 20,
          isEditable: true
        }).fetch();

        expect(column.isEditable).toBe(true);
      });
    });
  });

  describe('Sequelize', () => {
    let orm: Sequelize;
    let testUser: any;

    beforeAll(async () => {
      orm = new Sequelize('sqlite::memory:', { logging: false });
      await SequelizeAdapter.registerSystemModels(orm);

      // Create test user
      const { UserAP } = orm.models as any;
      testUser = await UserAP.create({ login: 'filtertest', fullName: 'Filter Test User' });
    });

    afterAll(async () => {
      await orm.close();
    });

    describe('FilterAP', () => {
      it('registers FilterAP model', () => {
        expect(orm.models).toHaveProperty('FilterAP');
      });

      it('creates filter with required fields', async () => {
        const { FilterAP } = orm.models as any;

        const filter = await FilterAP.create({
          id: 'seq-filter-1',
          name: 'Sequelize Filter',
          modelName: 'UserAP',
          slug: 'seq-filter-1',
          owner: testUser.id
        });

        expect(filter.id).toBe('seq-filter-1');
        expect(filter.name).toBe('Sequelize Filter');
        expect(filter.modelName).toBe('UserAP');
      });

      it('stores JSON conditions correctly', async () => {
        const { FilterAP } = orm.models as any;

        const conditions = [
          { id: 'c1', field: 'active', operator: 'eq', value: true }
        ];

        const filter = await FilterAP.create({
          id: 'seq-filter-json',
          name: 'JSON Test',
          modelName: 'UserAP',
          slug: 'seq-filter-json',
          owner: testUser.id,
          conditions
        });

        expect(filter.conditions).toEqual(conditions);
      });

      it('enforces unique slug constraint', async () => {
        const { FilterAP } = orm.models as any;

        await FilterAP.create({
          id: 'seq-filter-unique-1',
          name: 'First',
          modelName: 'UserAP',
          slug: 'seq-unique-slug',
          owner: testUser.id
        });

        await expect(
          FilterAP.create({
            id: 'seq-filter-unique-2',
            name: 'Second',
            modelName: 'UserAP',
            slug: 'seq-unique-slug',
            owner: testUser.id
          })
        ).rejects.toThrow();
      });

      it('finds filter by slug', async () => {
        const { FilterAP } = orm.models as any;

        await FilterAP.create({
          id: 'seq-filter-find',
          name: 'Find Test',
          modelName: 'OrderAP',
          slug: 'seq-find-slug',
          owner: testUser.id
        });

        const found = await FilterAP.findOne({ where: { slug: 'seq-find-slug' } });
        expect(found).toBeDefined();
        expect(found.name).toBe('Find Test');
      });

      it('updates filter', async () => {
        const { FilterAP } = orm.models as any;

        const filter = await FilterAP.create({
          id: 'seq-filter-update',
          name: 'Update Test',
          modelName: 'UserAP',
          slug: 'seq-update-slug',
          owner: testUser.id
        });

        await filter.update({ name: 'Updated', isPinned: true });

        const updated = await FilterAP.findOne({ where: { id: filter.id } });
        expect(updated.name).toBe('Updated');
        expect(updated.isPinned).toBe(true);
      });

      it('deletes filter', async () => {
        const { FilterAP } = orm.models as any;

        const filter = await FilterAP.create({
          id: 'seq-filter-delete',
          name: 'Delete Test',
          modelName: 'UserAP',
          slug: 'seq-delete-slug',
          owner: testUser.id
        });

        await filter.destroy();

        const found = await FilterAP.findOne({ where: { id: filter.id } });
        expect(found).toBeNull();
      });
    });

    describe('FilterColumnAP', () => {
      let testFilter: any;

      beforeAll(async () => {
        const { FilterAP } = orm.models as any;
        testFilter = await FilterAP.create({
          id: 'seq-column-filter',
          name: 'Column Test',
          modelName: 'UserAP',
          slug: 'seq-column-filter',
          owner: testUser.id
        });
      });

      it('registers FilterColumnAP model', () => {
        expect(orm.models).toHaveProperty('FilterColumnAP');
      });

      it('creates column with required fields', async () => {
        const { FilterColumnAP } = orm.models as any;

        const column = await FilterColumnAP.create({
          filterId: testFilter.id,
          fieldName: 'name',
          order: 0
        });

        expect(column.id).toBeDefined();
        expect(column.fieldName).toBe('name');
        expect(column.order).toBe(0);
      });

      it('creates columns with order and visibility', async () => {
        const { FilterAP, FilterColumnAP } = orm.models as any;

        // Create separate filter for this test
        const orderFilter = await FilterAP.create({
          id: 'seq-order-filter',
          name: 'Order Test',
          modelName: 'UserAP',
          slug: 'seq-order-filter',
          owner: testUser.id
        });

        await FilterColumnAP.create({
          filterId: orderFilter.id,
          fieldName: 'seq_col_id',
          order: 0,
          isVisible: true
        });

        await FilterColumnAP.create({
          filterId: orderFilter.id,
          fieldName: 'seq_col_email',
          order: 1,
          isVisible: true
        });

        await FilterColumnAP.create({
          filterId: orderFilter.id,
          fieldName: 'seq_col_hidden',
          order: 2,
          isVisible: false
        });

        const columns = await FilterColumnAP.findAll({
          where: { filterId: orderFilter.id },
          order: [['order', 'ASC']]
        });

        const colNames = columns.map((c: any) => c.fieldName);
        expect(colNames).toContain('seq_col_id');
        expect(colNames).toContain('seq_col_email');
        expect(colNames).toContain('seq_col_hidden');
      });

      it('updates column properties', async () => {
        const { FilterColumnAP } = orm.models as any;

        const column = await FilterColumnAP.create({
          filterId: testFilter.id,
          fieldName: 'updatable',
          order: 10,
          width: 100,
          isEditable: false
        });

        await column.update({ width: 200, isEditable: true });

        expect(column.width).toBe(200);
        expect(column.isEditable).toBe(true);
      });
    });
  });
});
