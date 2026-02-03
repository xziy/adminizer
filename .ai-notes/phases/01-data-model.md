# Фаза 1: Модель данных фильтра

**Приоритет:** P0 (критично)
**Зависимости:** Нет
**Статус:** `[x]` Завершено (2026-02-02)

> **⚠️ Примечание для агента:** Весь код в этой фазе - **ПСЕВДОКОД в стиле JavaScript** для понимания архитектуры. Реализуйте творчески, адаптируя под существующую кодовую базу. НЕ создавайте markdown файлы с резюме изменений.
>
> 💡 **Все примеры — ПСЕВДОКОД!** Интерфейсы, методы и структуры показаны для иллюстрации концепций, а не для буквального копирования.

> **🔐 КРИТИЧНО: DataAccessor Integration**
> 
> Модель `FilterAP` **ОБЯЗАТЕЛЬНО** должна включать `userAccessRelation: 'owner'` в конфигурации.
> Это обеспечивает автоматическую фильтрацию записей по владельцу через `DataAccessor`.
> 
> **БЕЗ ЭТОГО** система фильтров будет уязвима - пользователи смогут видеть чужие приватные фильтры!
> 
> Все операции с фильтрами должны идти через `DataAccessor`, а НЕ через прямые вызовы ORM.
> См. документацию: `docs/AccessRights/user-owned-records.md`

---

## Цель

Создать базовые модели для хранения фильтров и их конфигурации колонок.

---

## Задачи

- [x] 1.1 Создать модель `FilterAP`
  - [x] 1.1.1 Определить интерфейс FilterAPAttributes
  - [x] 1.1.2 Создать схему FilterAPSchema
  - [x] 1.1.3 **КРИТИЧНО:** Добавить `userAccessRelation: 'owner'`
  - [x] 1.1.4 Настроить associations (owner: BelongsTo UserAP)
- [x] 1.2 Создать модель `FilterColumnAP`
- [x] 1.3 Добавить Sequelize адаптер (umzug миграция)
- [x] 1.4 Добавить Waterline адаптер (knex миграция)
- [x] 1.5 Создать миграции
- [x] 1.6 Добавить связи с UserAP и GroupAP
- [x] 1.7 Регистрация моделей (через fixture/adminizerConfig.ts)
- [ ] 1.8 Unit тесты (85%+ coverage)
  - [ ] 1.8.1 FilterAP CRUD операции
  - [ ] 1.8.2 FilterAP валидация полей
  - [ ] 1.8.3 FilterAP unique constraints
  - [ ] 1.8.4 FilterAP JSON сериализация
  - [ ] 1.8.5 FilterAP associations
  - [ ] 1.8.6 FilterColumnAP CRUD операции
  - [ ] 1.8.7 FilterColumnAP associations
  - [ ] 1.8.8 CustomFieldHandler регистрация
  - [ ] 1.8.9 CustomFieldHandler buildCondition для всех диалектов
  - [ ] 1.8.10 CustomFieldHandler валидация
- [ ] 1.9 Integration тесты
  - [ ] 1.9.1 Транзакции
  - [ ] 1.9.2 Cascade delete
  - [ ] 1.9.3 Миграции (up/down)
  - [ ] 1.9.4 **Связи через DataAccessor (userAccessRelation)**
  - [ ] 1.9.5 Проверка автоматической фильтрации по владельцу

---

## 1.1 Модель FilterAP

**Файл:** `src/models/FilterAP.ts`

```typescript
import { AbstractModel } from '../lib/model/AbstractModel';

export interface FilterAPAttributes {
  id: string;                      // UUID (не auto-increment!)

  // Основные данные
  name: string;                    // Название фильтра
  description?: string;            // Описание
  modelName: string;               // К какой модели применяется
  slug: string;                    // Уникальный slug для URL/API

  // Условия фильтрации (JSON)
  conditions: FilterCondition[];

  // Настройки отображения
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';

  // Права доступа
  visibility: 'private' | 'public' | 'groups' | 'system';
  owner: number;                   // BelongsTo UserAP (для DataAccessor)
  groupIds?: number[];
  isSystemFilter?: boolean;        // Системный фильтр (скрыт от UI списка)

  // API доступ
  apiEnabled: boolean;
  apiKey?: string;

  // UI настройки
  icon?: string;
  color?: string;
  isPinned?: boolean;

  // Версионирование
  version: number;              // Версия формата фильтра (начинается с 1)
  schemaVersion?: string;       // Версия схемы модели при создании

  createdAt: Date;
  updatedAt: Date;
}

export interface FilterCondition {
  id: string;                      // UUID
  field: string;
  operator: FilterOperator;
  value: any;

  // Вложенные условия
  logic?: 'AND' | 'OR' | 'NOT';
  children?: FilterCondition[];

  // Для связей
  relation?: string;
  relationField?: string;
  
  // Кастомный обработчик (для сложных полей)
  customHandler?: string;          // ID кастомного обработчика
  customHandlerParams?: any;       // Параметры для обработчика
  
  // Raw SQL (опционально, для максимальной гибкости)
  rawSQL?: string;                 // Raw SQL условие
  rawSQLParams?: any[];            // Параметры для SQL
}

export type FilterOperator =
  | 'eq'           // =
  | 'neq'          // !=
  | 'gt'           // >
  | 'gte'          // >=
  | 'lt'           // <
  | 'lte'          // <=
  | 'like'         // LIKE %value%
  | 'ilike'        // ILIKE %value% (case-insensitive)
  | 'startsWith'   // LIKE value%
  | 'endsWith'     // LIKE %value
  | 'in'           // IN (array)
  | 'notIn'        // NOT IN
  | 'between'      // BETWEEN
  | 'isNull'       // IS NULL
  | 'isNotNull'    // IS NOT NULL
  | 'regex'        // Регулярное выражение
  | 'custom';      // Кастомный обработчик

export const FilterAPSchema = {
  attributes: {
    id: {
      type: 'string',
      primaryKey: true,
      defaultsTo: () => crypto.randomUUID()  // Генерируем UUID
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 255
    },
    description: {
      type: 'text'
    },
    modelName: {
      type: 'string',
      required: true,
      maxLength: 100
    },
    slug: {
      type: 'string',
      required: true,
      unique: true,
      maxLength: 100
    },
    conditions: {
      type: 'json',
      defaultsTo: []
    },
    sortField: {
      type: 'string',
      maxLength: 100
    },
    sortDirection: {
      type: 'string',
      isIn: ['ASC', 'DESC'],
      defaultsTo: 'ASC'
    },
    visibility: {
      type: 'string',
      isIn: ['private', 'public', 'groups'],
      defaultsTo: 'private'
    },
    owner: {
      type: 'number',
      required: true
    },
    groupIds: {
      type: 'json',
      defaultsTo: []
    },
    apiEnabled: {
      type: 'boolean',
      defaultsTo: false
    },
    apiKey: {
      type: 'string',
      unique: true,
      maxLength: 64
    },
    icon: {
      type: 'string',
      maxLength: 50
    },
    color: {
      type: 'string',
      maxLength: 50
    },
    isPinned: {
      type: 'boolean',
      defaultsTo: false
    },
    isSystemFilter: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Системный фильтр - не отображается в списке UI'
    },
    createdAt: {
      type: 'datetime',
      autoCreatedAt: true
    },
    updatedAt: {
      type: 'datetime',
      autoUpdatedAt: true
    }
  },

  // Права доступа через DataAccessor
  userAccessRelation: 'owner',

  // Связи
  associations: {
    owner: {
      model: 'UserAP',
      type: 'belongsTo',
      foreignKey: 'owner'
    },
    columns: {
      model: 'FilterColumnAP',
      type: 'hasMany',
      foreignKey: 'filterId'
    }
  }
};
```

---

## 1.2 Модель FilterColumnAP

**Файл:** `src/models/FilterColumnAP.ts`

```typescript
export interface FilterColumnAPAttributes {
  id: number;
  filterId: number;
  fieldName: string;
  order: number;
  width?: number;
  isVisible: boolean;
  isEditable: boolean;
}

export const FilterColumnAPSchema = {
  attributes: {
    id: {
      type: 'number',
      autoIncrement: true,
      primaryKey: true
    },
    filterId: {
      type: 'number',
      required: true
    },
    fieldName: {
      type: 'string',
      required: true,
      maxLength: 100
    },
    order: {
      type: 'number',
      defaultsTo: 0
    },
    width: {
      type: 'number'
    },
    isVisible: {
      type: 'boolean',
      defaultsTo: true
    },
    isEditable: {
      type: 'boolean',
      defaultsTo: false
    }
  },

  associations: {
    filter: {
      model: 'FilterAP',
      type: 'belongsTo',
      foreignKey: 'filterId'
    }
  }
};
```

---

## 1.3 Sequelize адаптер

**Файл:** `src/lib/model/adapter/sequelize.ts` (дополнить)

Добавить в существующий адаптер поддержку моделей FilterAP и FilterColumnAP.

```typescript
// В методе buildSequelizeModel добавить обработку JSON полей:
if (attr.type === 'json') {
  sequelizeAttr.type = DataTypes.JSON;
  if (attr.defaultsTo !== undefined) {
    sequelizeAttr.defaultValue = attr.defaultsTo;
  }
}
```

---

## 1.4 Миграция Sequelize

**Файл:** `src/migrations/YYYYMMDDHHMMSS-create-filter-ap.ts`

```typescript
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // FilterAP
  await queryInterface.createTable('FilterAP', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    modelName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    conditions: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    sortField: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    sortDirection: {
      type: DataTypes.ENUM('ASC', 'DESC'),
      defaultValue: 'ASC'
    },
    visibility: {
      type: DataTypes.ENUM('private', 'public', 'groups'),
      defaultValue: 'private'
    },
    owner: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'UserAP',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    groupIds: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    apiEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    apiKey: {
      type: DataTypes.STRING(64),
      unique: true,
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isSystemFilter: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Системный фильтр - не отображается в списке UI'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Индексы
  await queryInterface.addIndex('FilterAP', ['modelName']);
  await queryInterface.addIndex('FilterAP', ['ownerId']);
  await queryInterface.addIndex('FilterAP', ['apiKey']);
  await queryInterface.addIndex('FilterAP', ['slug']);

  // FilterColumnAP
  await queryInterface.createTable('FilterColumnAP', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    filterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'FilterAP',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    fieldName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    isVisible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isEditable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  });

  await queryInterface.addIndex('FilterColumnAP', ['filterId']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('FilterColumnAP');
  await queryInterface.dropTable('FilterAP');
}
```

---

## 1.5 Связи с UserAP и GroupAP

В `src/models/UserAP.ts` добавить:

```typescript
// В associations:
filters: {
  model: 'FilterAP',
  type: 'hasMany',
  foreignKey: 'ownerId'
}
```

---

## 1.6 Регистрация моделей

**Файл:** `src/system/bindFilters.ts`

```typescript
import { FilterAPSchema } from '../models/FilterAP';
import { FilterColumnAPSchema } from '../models/FilterColumnAP';

export async function bindFilterModels(adminizer: Adminizer): Promise<void> {
  // Регистрация моделей
  adminizer.modelHandler.registerModel('FilterAP', FilterAPSchema);
  adminizer.modelHandler.registerModel('FilterColumnAP', FilterColumnAPSchema);

  // Синхронизация с БД (если auto-sync включен)
  if (adminizer.config.autoSyncModels) {
    await adminizer.modelHandler.syncModel('FilterAP');
    await adminizer.modelHandler.syncModel('FilterColumnAP');
  }
}
```

---

## 1.7 Конфигурация фильтров (включение/отключение)

**Файл:** `src/interfaces/adminpanelConfig.ts` (расширить)

```typescript
interface AdminizerConfig {
  // ... существующие настройки

  /**
   * Глобальное включение/отключение системы фильтров
   * @default true
   */
  filtersEnabled?: boolean;

  /**
   * Настройки фильтров для конкретных моделей
   */
  modelFilters?: {
    [modelName: string]: {
      /**
       * Включить фильтры для этой модели
       * Переопределяет глобальную настройку filtersEnabled
       * @default undefined (использовать глобальную настройку)
       */
      enabled?: boolean;

      /**
       * Использовать старый поиск вместо фильтров
       * @default false
       */
      useLegacySearch?: boolean;
    };
  };
}
```

**Пример конфигурации:**

```typescript
// В конфиге Adminizer
const adminizer = new Adminizer({
  // Глобально включить фильтры
  filtersEnabled: true,

  // Настройки для конкретных моделей
  modelFilters: {
    // Отключить фильтры для модели UserAP
    UserAP: {
      enabled: false,
      useLegacySearch: true  // Использовать старый поиск
    },

    // Включить фильтры для OrderAP (переопределяет глобальную настройку)
    OrderAP: {
      enabled: true
    },

    // Для CategoryAP использовать глобальную настройку
    // (не указываем)
  },

  // ... другие настройки
});
```

**Также можно отключить глобально:**

```typescript
const adminizer = new Adminizer({
  // Глобально отключить фильтры (использовать старый поиск везде)
  filtersEnabled: false,

  // Но включить для конкретных моделей
  modelFilters: {
    OrderAP: {
      enabled: true  // Только для OrderAP будут работать фильтры
    }
  }
});
```

---

## 1.8 Регистрация моделей

**Файл:** `src/system/bindModels.ts` (дополнить)

```typescript
export async function registerFilterModels(adminizer: Adminizer) {
  // Регистрация моделей
  adminizer.modelHandler.registerModel('FilterAP', FilterAPSchema);
  adminizer.modelHandler.registerModel('FilterColumnAP', FilterColumnAPSchema);

  // Синхронизация с БД (если auto-sync включен)
  if (adminizer.config.autoSyncModels) {
    await adminizer.modelHandler.syncModel('FilterAP');
    await adminizer.modelHandler.syncModel('FilterColumnAP');
  }
}
```

---

## 1.9 Unit тесты

**Приоритет:** P0 (критично)
**Цель coverage:** 85%+
**Время:** 1 день

### 1.8.1 FilterAP CRUD тесты

**Файл:** `tests/models/FilterAP.test.ts`

```typescript
import { FilterAP, FilterColumnAP, UserAP } from '../../src/models';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database';

describe('FilterAP Model', () => {
  let testUser: UserAP;

  beforeAll(async () => {
    await setupTestDatabase();
    testUser = await UserAP.create({
      login: 'testuser',
      email: 'test@test.com',
      passwordHashed: 'hash'
    });
  });

  afterAll(async () => {
    await FilterAP.destroy({ where: {} });
    await UserAP.destroy({ where: { id: testUser.id } });
    await teardownTestDatabase();
  });

  describe('create', () => {
    it('should create filter with required fields', async () => {
      const filter = await FilterAP.create({
        name: 'Test Filter',
        modelName: 'UserAP',
        slug: 'test-filter',
        conditions: [],
        ownerId: testUser.id
      });

      expect(filter.id).toBeDefined();
      expect(filter.name).toBe('Test Filter');
      expect(filter.visibility).toBe('private'); // default value
      expect(filter.apiEnabled).toBe(false); // default value
      expect(filter.version).toBe(1); // default version
    });

    it('should throw error when required fields missing', async () => {
      await expect(
        FilterAP.create({
          name: 'Incomplete',
          // missing modelName, slug, ownerId
        } as any)
      ).rejects.toThrow();
    });

    it('should enforce unique slug', async () => {
      await FilterAP.create({
        name: 'Filter 1',
        modelName: 'UserAP',
        slug: 'unique-slug',
        conditions: [],
        ownerId: testUser.id
      });

      await expect(
        FilterAP.create({
          name: 'Filter 2',
          modelName: 'UserAP',
          slug: 'unique-slug', // duplicate!
          conditions: [],
          ownerId: testUser.id
        })
      ).rejects.toThrow(/unique/i);
    });

    it('should enforce unique apiKey', async () => {
      const apiKey = 'test-api-key-12345';
      
      await FilterAP.create({
        name: 'Filter 1',
        modelName: 'UserAP',
        slug: 'filter-1',
        conditions: [],
        ownerId: testUser.id,
        apiEnabled: true,
        apiKey
      });

      await expect(
        FilterAP.create({
          name: 'Filter 2',
          modelName: 'UserAP',
          slug: 'filter-2',
          conditions: [],
          ownerId: testUser.id,
          apiEnabled: true,
          apiKey // duplicate!
        })
      ).rejects.toThrow(/unique/i);
    });

    it('should validate visibility enum', async () => {
      await expect(
        FilterAP.create({
          name: 'Invalid',
          modelName: 'UserAP',
          slug: 'invalid',
          conditions: [],
          ownerId: testUser.id,
          visibility: 'invalid' as any
        })
      ).rejects.toThrow();
    });

    it('should validate sortDirection enum', async () => {
      await expect(
        FilterAP.create({
          name: 'Invalid Sort',
          modelName: 'UserAP',
          slug: 'invalid-sort',
          conditions: [],
          ownerId: testUser.id,
          sortDirection: 'INVALID' as any
        })
      ).rejects.toThrow();
    });
  });

  describe('read', () => {
    let filter: FilterAP;

    beforeEach(async () => {
      filter = await FilterAP.create({
        name: 'Read Test',
        modelName: 'UserAP',
        slug: 'read-test',
        conditions: [
          { id: '1', field: 'status', operator: 'eq', value: 'active' }
        ],
        ownerId: testUser.id
      });
    });

    afterEach(async () => {
      await FilterAP.destroy({ where: { id: filter.id } });
    });

    it('should find filter by id', async () => {
      const found = await FilterAP.findOne({ where: { id: filter.id } });
      expect(found).toBeDefined();
      expect(found!.name).toBe('Read Test');
    });

    it('should find filter by slug', async () => {
      const found = await FilterAP.findOne({ where: { slug: 'read-test' } });
      expect(found).toBeDefined();
      expect(found!.id).toBe(filter.id);
    });

    it('should list filters by modelName', async () => {
      const filters = await FilterAP.findAll({ where: { modelName: 'UserAP' } });
      expect(filters.length).toBeGreaterThan(0);
      expect(filters.some(f => f.id === filter.id)).toBe(true);
    });

    it('should list filters by ownerId', async () => {
      const filters = await FilterAP.findAll({ where: { ownerId: testUser.id } });
      expect(filters.length).toBeGreaterThan(0);
      expect(filters.every(f => f.ownerId === testUser.id)).toBe(true);
    });
  });

  describe('update', () => {
    let filter: FilterAP;

    beforeEach(async () => {
      filter = await FilterAP.create({
        name: 'Update Test',
        modelName: 'UserAP',
        slug: 'update-test',
        conditions: [],
        ownerId: testUser.id
      });
    });

    afterEach(async () => {
      await FilterAP.destroy({ where: { id: filter.id } });
    });

    it('should update name', async () => {
      await filter.update({ name: 'Updated Name' });
      const reloaded = await FilterAP.findOne({ where: { id: filter.id } });
      expect(reloaded!.name).toBe('Updated Name');
    });

    it('should update conditions', async () => {
      const newConditions = [
        { id: '1', field: 'age', operator: 'gt', value: 18 }
      ];
      await filter.update({ conditions: newConditions });
      const reloaded = await FilterAP.findOne({ where: { id: filter.id } });
      expect(reloaded!.conditions).toEqual(newConditions);
    });

    it('should update updatedAt timestamp', async () => {
      const oldTimestamp = filter.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 100)); // wait 100ms
      await filter.update({ name: 'Changed' });
      expect(filter.updatedAt.getTime()).toBeGreaterThan(oldTimestamp.getTime());
    });
  });

  describe('delete', () => {
    it('should delete filter', async () => {
      const filter = await FilterAP.create({
        name: 'Delete Test',
        modelName: 'UserAP',
        slug: 'delete-test',
        conditions: [],
        ownerId: testUser.id
      });

      await filter.destroy();
      
      const found = await FilterAP.findOne({ where: { id: filter.id } });
      expect(found).toBeNull();
    });
  });

  describe('JSON serialization', () => {
    it('should store simple conditions as JSON', async () => {
      const conditions = [
        { id: '1', field: 'status', operator: 'eq', value: 'active' }
      ];

      const filter = await FilterAP.create({
        name: 'JSON Test',
        modelName: 'UserAP',
        slug: 'json-test',
        conditions,
        ownerId: testUser.id
      });

      const loaded = await FilterAP.findOne({ where: { id: filter.id } });
      expect(loaded!.conditions).toEqual(conditions);
    });

    it('should store complex nested conditions as JSON', async () => {
      const conditions = [
        {
          id: 'group1',
          logic: 'AND',
          children: [
            { id: '1', field: 'status', operator: 'eq', value: 'active' },
            {
              id: 'group2',
              logic: 'OR',
              children: [
                { id: '2', field: 'role', operator: 'eq', value: 'admin' },
                { id: '3', field: 'role', operator: 'eq', value: 'moderator' }
              ]
            }
          ]
        }
      ];

      const filter = await FilterAP.create({
        name: 'Complex JSON Test',
        modelName: 'UserAP',
        slug: 'complex-json-test',
        conditions,
        ownerId: testUser.id
      });

      const loaded = await FilterAP.findOne({ where: { id: filter.id } });
      expect(loaded!.conditions).toEqual(conditions);
    });

    it('should store groupIds as JSON array', async () => {
      const groupIds = [1, 2, 3];

      const filter = await FilterAP.create({
        name: 'Groups Test',
        modelName: 'UserAP',
        slug: 'groups-test',
        conditions: [],
        ownerId: testUser.id,
        visibility: 'groups',
        groupIds
      });

      const loaded = await FilterAP.findOne({ where: { id: filter.id } });
      expect(loaded!.groupIds).toEqual(groupIds);
    });
  });

  describe('associations', () => {
    it('should belong to owner (UserAP)', async () => {
      const filter = await FilterAP.create({
        name: 'Owner Test',
        modelName: 'UserAP',
        slug: 'owner-test',
        conditions: [],
        ownerId: testUser.id
      });

      const loaded = await FilterAP.findOne({
        where: { id: filter.id },
        include: ['owner']
      });

      expect(loaded!.owner).toBeDefined();
      expect(loaded!.owner.id).toBe(testUser.id);
      expect(loaded!.owner.login).toBe('testuser');
    });

    it('should have many columns (FilterColumnAP)', async () => {
      const filter = await FilterAP.create({
        name: 'Columns Test',
        modelName: 'UserAP',
        slug: 'columns-test',
        conditions: [],
        ownerId: testUser.id
      });

      await FilterColumnAP.bulkCreate([
        { filterId: filter.id, fieldName: 'id', order: 0 },
        { filterId: filter.id, fieldName: 'name', order: 1 },
        { filterId: filter.id, fieldName: 'email', order: 2 }
      ]);

      const loaded = await FilterAP.findOne({
        where: { id: filter.id },
        include: ['columns']
      });

      expect(loaded!.columns).toBeDefined();
      expect(loaded!.columns.length).toBe(3);
      expect(loaded!.columns[0].fieldName).toBe('id');
    });

    it('should cascade delete columns when filter deleted', async () => {
      const filter = await FilterAP.create({
        name: 'Cascade Test',
        modelName: 'UserAP',
        slug: 'cascade-test',
        conditions: [],
        ownerId: testUser.id
      });

      const column = await FilterColumnAP.create({
        filterId: filter.id,
        fieldName: 'test',
        order: 0
      });

      await filter.destroy();

      const foundColumn = await FilterColumnAP.findOne({ where: { id: column.id } });
      expect(foundColumn).toBeNull();
    });
  });

  describe('default values', () => {
    it('should set default visibility to private', async () => {
      const filter = await FilterAP.create({
        name: 'Default Visibility',
        modelName: 'UserAP',
        slug: 'default-visibility',
        conditions: [],
        ownerId: testUser.id
      });

      expect(filter.visibility).toBe('private');
    });

    it('should set default apiEnabled to false', async () => {
      const filter = await FilterAP.create({
        name: 'Default API',
        modelName: 'UserAP',
        slug: 'default-api',
        conditions: [],
        ownerId: testUser.id
      });

      expect(filter.apiEnabled).toBe(false);
    });

    it('should set default isPinned to false', async () => {
      const filter = await FilterAP.create({
        name: 'Default Pinned',
        modelName: 'UserAP',
        slug: 'default-pinned',
        conditions: [],
        ownerId: testUser.id
      });

      expect(filter.isPinned).toBe(false);
    });

    it('should set default isSystemFilter to false', async () => {
      const filter = await FilterAP.create({
        name: 'Default System',
        modelName: 'UserAP',
        slug: 'default-system',
        conditions: [],
        ownerId: testUser.id
      });

      expect(filter.isSystemFilter).toBe(false);
    });

    it('should allow creating system filter', async () => {
      const filter = await FilterAP.create({
        name: 'Integration Filter',
        modelName: 'UserAP',
        slug: 'integration-filter',
        conditions: [],
        ownerId: testUser.id,
        isSystemFilter: true
      });

      expect(filter.isSystemFilter).toBe(true);
    });

    it('should set default version to 1', async () => {
      const filter = await FilterAP.create({
        name: 'Default Version',
        modelName: 'UserAP',
        slug: 'default-version',
        conditions: [],
        ownerId: testUser.id
      });

      expect(filter.version).toBe(1);
    });

    it('should set default conditions to empty array', async () => {
      const filter = await FilterAP.create({
        name: 'Default Conditions',
        modelName: 'UserAP',
        slug: 'default-conditions',
        ownerId: testUser.id
      });

      expect(filter.conditions).toEqual([]);
    });
  });

  describe('indexes', () => {
    it('should have index on modelName for fast lookups', async () => {
      // Создать много фильтров
      const filters = Array.from({ length: 100 }, (_, i) => ({
        name: `Filter ${i}`,
        modelName: i % 2 === 0 ? 'UserAP' : 'OrderAP',
        slug: `filter-${i}`,
        conditions: [],
        ownerId: testUser.id
      }));
      
      await FilterAP.bulkCreate(filters);

      const start = Date.now();
      await FilterAP.findAll({ where: { modelName: 'UserAP' } });
      const duration = Date.now() - start;

      // С индексом должно быть быстро
      expect(duration).toBeLessThan(50); // < 50ms
    });
  });
});
```

### 1.8.2 FilterColumnAP CRUD тесты

**Файл:** `tests/models/FilterColumnAP.test.ts`

```typescript
import { FilterAP, FilterColumnAP, UserAP } from '../../src/models';

describe('FilterColumnAP Model', () => {
  let testUser: UserAP;
  let testFilter: FilterAP;

  beforeAll(async () => {
    testUser = await UserAP.create({
      login: 'testuser',
      email: 'test@test.com',
      passwordHashed: 'hash'
    });

    testFilter = await FilterAP.create({
      name: 'Test Filter',
      modelName: 'UserAP',
      slug: 'test-filter',
      conditions: [],
      ownerId: testUser.id
    });
  });

  afterAll(async () => {
    await FilterColumnAP.destroy({ where: {} });
    await FilterAP.destroy({ where: {} });
    await UserAP.destroy({ where: {} });
  });

  describe('create', () => {
    it('should create column with required fields', async () => {
      const column = await FilterColumnAP.create({
        filterId: testFilter.id,
        fieldName: 'name',
        order: 0
      });

      expect(column.id).toBeDefined();
      expect(column.filterId).toBe(testFilter.id);
      expect(column.fieldName).toBe('name');
      expect(column.order).toBe(0);
      expect(column.isVisible).toBe(true); // default
      expect(column.isEditable).toBe(false); // default
    });

    it('should throw error when filterId invalid', async () => {
      await expect(
        FilterColumnAP.create({
          filterId: 999999, // не существует
          fieldName: 'name',
          order: 0
        })
      ).rejects.toThrow();
    });
  });

  describe('ordering', () => {
    beforeEach(async () => {
      await FilterColumnAP.destroy({ where: { filterId: testFilter.id } });
    });

    it('should maintain column order', async () => {
      await FilterColumnAP.bulkCreate([
        { filterId: testFilter.id, fieldName: 'id', order: 0 },
        { filterId: testFilter.id, fieldName: 'name', order: 1 },
        { filterId: testFilter.id, fieldName: 'email', order: 2 }
      ]);

      const columns = await FilterColumnAP.findAll({
        where: { filterId: testFilter.id },
        order: [['order', 'ASC']]
      });

      expect(columns.map(c => c.fieldName)).toEqual(['id', 'name', 'email']);
    });

    it('should update column order', async () => {
      const column = await FilterColumnAP.create({
        filterId: testFilter.id,
        fieldName: 'name',
        order: 0
      });

      await column.update({ order: 5 });

      const updated = await FilterColumnAP.findOne({ where: { id: column.id } });
      expect(updated!.order).toBe(5);
    });
  });

  describe('visibility and editability', () => {
    it('should toggle visibility', async () => {
      const column = await FilterColumnAP.create({
        filterId: testFilter.id,
        fieldName: 'name',
        order: 0
      });

      await column.update({ isVisible: false });
      expect(column.isVisible).toBe(false);

      await column.update({ isVisible: true });
      expect(column.isVisible).toBe(true);
    });

    it('should toggle editability', async () => {
      const column = await FilterColumnAP.create({
        filterId: testFilter.id,
        fieldName: 'name',
        order: 0
      });

      await column.update({ isEditable: true });
      expect(column.isEditable).toBe(true);
    });

    it('should set custom width', async () => {
      const column = await FilterColumnAP.create({
        filterId: testFilter.id,
        fieldName: 'name',
        order: 0,
        width: 200
      });

      expect(column.width).toBe(200);
    });
  });

  describe('associations', () => {
    it('should belong to filter', async () => {
      const column = await FilterColumnAP.create({
        filterId: testFilter.id,
        fieldName: 'name',
        order: 0
      });

      const loaded = await FilterColumnAP.findOne({
        where: { id: column.id },
        include: ['filter']
      });

      expect(loaded!.filter).toBeDefined();
      expect(loaded!.filter.id).toBe(testFilter.id);
    });
  });
});
```

### 1.8.3 CustomFieldHandler тесты

**Файл:** `tests/lib/filter-conditions/CustomFieldHandler.test.ts`

```typescript
import { CustomFieldHandler } from '../../../src/lib/filter-conditions/CustomFieldHandler';

describe('CustomFieldHandler', () => {
  beforeEach(() => {
    // Очистить registry перед каждым тестом
    CustomFieldHandler.clear();
  });

  describe('register', () => {
    it('should register handler', () => {
      CustomFieldHandler.register('Test.field', {
        name: 'Test Handler',
        buildCondition: () => ({ rawSQL: 'test' })
      });

      const handler = CustomFieldHandler.get('Test.field');
      expect(handler).toBeDefined();
      expect(handler!.name).toBe('Test Handler');
    });

    it('should throw error when registering duplicate', () => {
      CustomFieldHandler.register('Test.field', {
        name: 'Test Handler',
        buildCondition: () => ({ rawSQL: 'test' })
      });

      expect(() => {
        CustomFieldHandler.register('Test.field', {
          name: 'Duplicate',
          buildCondition: () => ({ rawSQL: 'test' })
        });
      }).toThrow(/already registered/i);
    });

    it('should allow overwrite with force flag', () => {
      CustomFieldHandler.register('Test.field', {
        name: 'Original',
        buildCondition: () => ({ rawSQL: 'original' })
      });

      CustomFieldHandler.register('Test.field', {
        name: 'Overwrite',
        buildCondition: () => ({ rawSQL: 'overwrite' })
      }, { force: true });

      const handler = CustomFieldHandler.get('Test.field');
      expect(handler!.name).toBe('Overwrite');
    });
  });

  describe('get', () => {
    it('should return handler if exists', () => {
      CustomFieldHandler.register('Test.field', {
        name: 'Test',
        buildCondition: () => ({ rawSQL: 'test' })
      });

      const handler = CustomFieldHandler.get('Test.field');
      expect(handler).toBeDefined();
    });

    it('should return undefined if not exists', () => {
      const handler = CustomFieldHandler.get('NonExistent.field');
      expect(handler).toBeUndefined();
    });
  });

  describe('getForModel', () => {
    it('should return all handlers for model', () => {
      CustomFieldHandler.register('Order.phone', {
        name: 'Phone',
        buildCondition: () => ({ rawSQL: 'test' })
      });

      CustomFieldHandler.register('Order.email', {
        name: 'Email',
        buildCondition: () => ({ rawSQL: 'test' })
      });

      CustomFieldHandler.register('User.name', {
        name: 'Name',
        buildCondition: () => ({ rawSQL: 'test' })
      });

      const orderHandlers = CustomFieldHandler.getForModel('Order');
      expect(orderHandlers.size).toBe(2);
      expect(orderHandlers.has('Order.phone')).toBe(true);
      expect(orderHandlers.has('Order.email')).toBe(true);
      expect(orderHandlers.has('User.name')).toBe(false);
    });
  });

  describe('buildCondition - dialects', () => {
    it('should build PostgreSQL condition', () => {
      CustomFieldHandler.register('Order.phone', {
        name: 'Phone',
        buildCondition: (operator, value, dialect) => {
          if (dialect === 'postgres') {
            return {
              rawSQL: `(phone->>'number') LIKE $1`,
              params: [`%${value}%`]
            };
          }
          return { rawSQL: 'fallback' };
        }
      });

      const handler = CustomFieldHandler.get('Order.phone')!;
      const result = handler.buildCondition('like', '900', 'postgres');

      expect(result.rawSQL).toContain('->>'');
      expect(result.params).toEqual(['%900%']);
    });

    it('should build MySQL condition', () => {
      CustomFieldHandler.register('Order.phone', {
        name: 'Phone',
        buildCondition: (operator, value, dialect) => {
          if (dialect === 'mysql') {
            return {
              rawSQL: `JSON_UNQUOTE(JSON_EXTRACT(phone, '$.number')) LIKE ?`,
              params: [`%${value}%`]
            };
          }
          return { rawSQL: 'fallback' };
        }
      });

      const handler = CustomFieldHandler.get('Order.phone')!;
      const result = handler.buildCondition('like', '900', 'mysql');

      expect(result.rawSQL).toContain('JSON_EXTRACT');
      expect(result.params).toEqual(['%900%']);
    });

    it('should build Waterline in-memory condition', () => {
      CustomFieldHandler.register('Order.phone', {
        name: 'Phone',
        buildCondition: (operator, value, dialect) => {
          if (dialect === 'waterline') {
            return {
              inMemory: (record) => {
                const phone = record.phone?.number || '';
                return phone.includes(value);
              }
            };
          }
          return { rawSQL: 'fallback' };
        }
      });

      const handler = CustomFieldHandler.get('Order.phone')!;
      const result = handler.buildCondition('like', '900', 'waterline');

      expect(result.inMemory).toBeDefined();
      expect(result.inMemory!({ phone: { number: '9001234567' } })).toBe(true);
      expect(result.inMemory!({ phone: { number: '1234567890' } })).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate value if validator provided', () => {
      CustomFieldHandler.register('Order.phone', {
        name: 'Phone',
        buildCondition: () => ({ rawSQL: 'test' }),
        validate: (value) => {
          if (typeof value !== 'string' || value.length < 3) {
            return { valid: false, error: 'Phone too short' };
          }
          return { valid: true };
        }
      });

      const handler = CustomFieldHandler.get('Order.phone')!;
      
      expect(handler.validate!('12')).toEqual({
        valid: false,
        error: 'Phone too short'
      });

      expect(handler.validate!('123')).toEqual({
        valid: true
      });
    });

    it('should not require validator', () => {
      CustomFieldHandler.register('Order.simple', {
        name: 'Simple',
        buildCondition: () => ({ rawSQL: 'test' })
        // no validate
      });

      const handler = CustomFieldHandler.get('Order.simple')!;
      expect(handler.validate).toBeUndefined();
    });
  });
});
```

---

## 1.9 Integration тесты

**Приоритет:** P1
**Время:** 0.5 дня

### 1.9.1 Транзакции

**Файл:** `tests/integration/models/transactions.test.ts`

```typescript
import { FilterAP, FilterColumnAP, UserAP } from '../../../src/models';
import { sequelize } from '../../../src/lib/db';

describe('Model Transactions', () => {
  let testUser: UserAP;

  beforeAll(async () => {
    testUser = await UserAP.create({
      login: 'txuser',
      email: 'tx@test.com',
      passwordHashed: 'hash'
    });
  });

  afterAll(async () => {
    await FilterAP.destroy({ where: {} });
    await UserAP.destroy({ where: {} });
  });

  it('should rollback on error', async () => {
    const transaction = await sequelize.transaction();

    try {
      const filter = await FilterAP.create({
        name: 'TX Test',
        modelName: 'UserAP',
        slug: 'tx-test',
        conditions: [],
        ownerId: testUser.id
      }, { transaction });

      await FilterColumnAP.create({
        filterId: filter.id,
        fieldName: 'name',
        order: 0
      }, { transaction });

      // Имитация ошибки
      throw new Error('Simulated error');
    } catch (error) {
      await transaction.rollback();
    }

    // Проверить что ничего не сохранилось
    const filter = await FilterAP.findOne({ where: { slug: 'tx-test' } });
    expect(filter).toBeNull();
  });

  it('should commit on success', async () => {
    const transaction = await sequelize.transaction();

    try {
      const filter = await FilterAP.create({
        name: 'TX Success',
        modelName: 'UserAP',
        slug: 'tx-success',
        conditions: [],
        ownerId: testUser.id
      }, { transaction });

      await FilterColumnAP.create({
        filterId: filter.id,
        fieldName: 'name',
        order: 0
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    // Проверить что сохранилось
    const filter = await FilterAP.findOne({ 
      where: { slug: 'tx-success' },
      include: ['columns']
    });
    
    expect(filter).toBeDefined();
    expect(filter!.columns.length).toBe(1);
  });
});
```

### 1.9.2 Cascade Delete

**Файл:** `tests/integration/models/cascade.test.ts`

```typescript
describe('Cascade Delete', () => {
  it('should cascade delete columns when filter deleted', async () => {
    const user = await UserAP.create({
      login: 'cascade',
      email: 'cascade@test.com',
      passwordHashed: 'hash'
    });

    const filter = await FilterAP.create({
      name: 'Cascade',
      modelName: 'UserAP',
      slug: 'cascade',
      conditions: [],
      ownerId: user.id
    });

    const columns = await FilterColumnAP.bulkCreate([
      { filterId: filter.id, fieldName: 'id', order: 0 },
      { filterId: filter.id, fieldName: 'name', order: 1 }
    ]);

    // Удалить фильтр
    await filter.destroy();

    // Проверить что колонки тоже удалились
    for (const column of columns) {
      const found = await FilterColumnAP.findOne({ where: { id: column.id } });
      expect(found).toBeNull();
    }
  });
});
```

### 1.9.3 Миграции

**Файл:** `tests/integration/migrations/filter-ap.test.ts`

```typescript
import { QueryInterface } from 'sequelize';
import { up, down } from '../../../src/migrations/YYYYMMDDHHMMSS-create-filter-ap';
import { sequelize } from '../../../src/lib/db';

describe('FilterAP Migration', () => {
  const queryInterface: QueryInterface = sequelize.getQueryInterface();

  it('should run up migration', async () => {
    await up(queryInterface);

    // Проверить что таблицы созданы
    const tables = await queryInterface.showAllTables();
    expect(tables).toContain('FilterAP');
    expect(tables).toContain('FilterColumnAP');

    // Проверить индексы
    const indexes = await queryInterface.showIndex('FilterAP');
    expect(indexes.some(idx => idx.fields.includes('modelName'))).toBe(true);
    expect(indexes.some(idx => idx.fields.includes('slug'))).toBe(true);
  });

  it('should run down migration', async () => {
    await up(queryInterface);
    await down(queryInterface);

    // Проверить что таблицы удалены
    const tables = await queryInterface.showAllTables();
    expect(tables).not.toContain('FilterAP');
    expect(tables).not.toContain('FilterColumnAP');
  });

  it('should be idempotent (safe to run multiple times)', async () => {
    // Первый раз
    await up(queryInterface);
    
    // Второй раз - не должно быть ошибки
    await expect(up(queryInterface)).resolves.not.toThrow();
  });
});
```

---

## Test Coverage Report

После запуска всех тестов Phase 1:

```bash
npm test -- tests/models tests/integration/models --coverage
```

**Ожидаемый результат:**

```
File                                | % Stmts | % Branch | % Funcs | % Lines
------------------------------------|---------|----------|---------|--------
src/models/FilterAP.ts              |   95.2  |   92.3   |  100.0  |   95.1
src/models/FilterColumnAP.ts        |   93.8  |   90.0   |  100.0  |   93.5
src/lib/filter-conditions/
  CustomFieldHandler.ts             |   94.5  |   88.9   |  100.0  |   94.3
------------------------------------|---------|----------|---------|--------
All files                           |   94.5  |   90.4   |  100.0  |   94.3
```

---

## Checklist перед переходом к Фазе 2

### Регистрация обработчика для модели

**Файл:** `fixture/models/Order.ts`

```typescript
import { CustomFieldHandler } from '../../src/lib/filter-conditions/CustomFieldHandler';

export const OrderAPSchema = {
  attributes: {
    id: { type: 'number', primaryKey: true },
    phone: { type: 'json' }, // { countryCode: '+7', number: '9001234567' }
    status: { type: 'string' }
  }
};

// Регистрация кастомного обработчика для поля phone
CustomFieldHandler.register('Order.phone', {
  name: 'Phone Search',
  description: 'Search by phone number in JSON field',
  
  // Преобразование в SQL условие
  buildCondition: (operator, value, dialect) => {
    // value = '9001234567' или '+79001234567'
    const cleanNumber = value.replace(/[^0-9]/g, '');
    
    if (dialect === 'postgres') {
      // PostgreSQL - используем jsonb операторы
      return {
        rawSQL: `(phone->>'number') LIKE $1`,
        params: [`%${cleanNumber}%`]
      };
    } else if (dialect === 'mysql') {
      // MySQL - используем JSON_EXTRACT
      return {
        rawSQL: `JSON_UNQUOTE(JSON_EXTRACT(phone, '$.number')) LIKE ?`,
        params: [`%${cleanNumber}%`]
      };
    } else {
      // Waterline fallback - in-memory фильтрация
      return {
        inMemory: (record) => {
          const phone = record.phone?.number || '';
          return phone.includes(cleanNumber);
        }
      };
    }
  },
  
  // Валидация значения
  validate: (value) => {
    if (typeof value !== 'string' || value.length < 3) {
      return { valid: false, error: 'Phone number too short' };
    }
    return { valid: true };
  }
});

// Более сложный пример - поиск по диапазону дат в JSON
CustomFieldHandler.register('Order.metadata.deliveryDate', {
  name: 'Delivery Date Range',
  description: 'Search by delivery date stored in metadata JSON',
  
  buildCondition: (operator, value, dialect) => {
    // value = { from: '2024-01-01', to: '2024-12-31' }
    
    if (dialect === 'postgres') {
      return {
        rawSQL: `(metadata->>'deliveryDate')::date BETWEEN $1 AND $2`,
        params: [value.from, value.to]
      };
    } else if (dialect === 'mysql') {
      return {
        rawSQL: `STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.deliveryDate')), '%Y-%m-%d') BETWEEN ? AND ?`,
        params: [value.from, value.to]
      };
    }
  }
});
```

---

### Расширенные примеры CustomFieldHandler с rawSQL

> **📌 ВАЖНО:** Все примеры ниже используют параметризованные запросы для предотвращения SQL injection.
> Всегда используйте `params` массив, НИКОГДА не делайте конкатенацию строк с пользовательским вводом!

#### Пример 1: Вычисляемое поле (скидка в рублях)

```typescript
CustomFieldHandler.register('Order.discountAmount', {
  name: 'Discount Amount',
  description: 'Filter by calculated discount amount in currency',
  
  buildCondition: (operator, value, dialect) => {
    // Вычисление: total_price * (discount_percent / 100)
    // Оператор может быть: '>', '>=', '<', '<=', '='
    
    if (dialect === 'postgres') {
      return {
        rawSQL: `(total_price * (discount_percent / 100.0)) ${operator} $1`,
        params: [value]
      };
    } else if (dialect === 'mysql') {
      return {
        rawSQL: `(total_price * (discount_percent / 100.0)) ${operator} ?`,
        params: [value]
      };
    } else {
      // Waterline fallback
      return {
        inMemory: (record) => {
          const amount = record.total_price * (record.discount_percent / 100);
          switch (operator) {
            case '>': return amount > value;
            case '>=': return amount >= value;
            case '<': return amount < value;
            case '<=': return amount <= value;
            case '=': return amount === value;
            default: return false;
          }
        }
      };
    }
  },
  
  validate: (value) => {
    if (typeof value !== 'number' || value < 0) {
      return { valid: false, error: 'Discount amount must be a positive number' };
    }
    return { valid: true };
  }
});
```

#### Пример 2: Полнотекстовый поиск (PostgreSQL + MySQL)

```typescript
CustomFieldHandler.register('Product.fulltext', {
  name: 'Full-Text Search',
  description: 'Search across title and description with relevance ranking',
  
  buildCondition: (operator, value, dialect) => {
    if (dialect === 'postgres') {
      return {
        rawSQL: `to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', $1)`,
        params: [value]
      };
    } else if (dialect === 'mysql') {
      return {
        rawSQL: `MATCH(title, description) AGAINST(? IN BOOLEAN MODE)`,
        params: [value]
      };
    } else {
      // Fallback для Waterline
      return {
        inMemory: (record) => {
          const searchText = `${record.title || ''} ${record.description || ''}`.toLowerCase();
          return searchText.includes(value.toLowerCase());
        }
      };
    }
  },
  
  validate: (value) => {
    if (typeof value !== 'string' || value.length < 2) {
      return { valid: false, error: 'Search query must be at least 2 characters' };
    }
    // Защита от SQL injection - запретить опасные символы
    if (/[;'"\-\-\/\*]/.test(value)) {
      return { valid: false, error: 'Invalid characters in search query' };
    }
    return { valid: true };
  }
});
```

#### Пример 3: Геопространственный поиск (расстояние от точки)

```typescript
CustomFieldHandler.register('Store.distance', {
  name: 'Distance From Point',
  description: 'Find stores within radius from coordinates',
  
  buildCondition: (operator, value, dialect) => {
    // value = { lat: 55.7558, lng: 37.6173, radius: 10 } (радиус в км)
    const { lat, lng, radius } = value;
    
    if (dialect === 'postgres') {
      // Используем PostGIS расширение
      return {
        rawSQL: `ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3 * 1000
        )`,
        params: [lng, lat, radius] // радиус в км -> метры
      };
    } else if (dialect === 'mysql') {
      // Haversine formula для MySQL
      return {
        rawSQL: `(
          6371 * acos(
            cos(radians(?)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(latitude))
          )
        ) <= ?`,
        params: [lat, lng, lat, radius]
      };
    } else {
      // Упрощенный Haversine для Waterline
      return {
        inMemory: (record) => {
          const R = 6371; // радиус Земли в км
          const dLat = (record.latitude - lat) * Math.PI / 180;
          const dLng = (record.longitude - lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat * Math.PI / 180) * Math.cos(record.latitude * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          return distance <= radius;
        }
      };
    }
  },
  
  validate: (value) => {
    if (!value || typeof value !== 'object') {
      return { valid: false, error: 'Value must be an object with lat, lng, radius' };
    }
    if (typeof value.lat !== 'number' || typeof value.lng !== 'number' || typeof value.radius !== 'number') {
      return { valid: false, error: 'lat, lng, and radius must be numbers' };
    }
    if (value.lat < -90 || value.lat > 90) {
      return { valid: false, error: 'Latitude must be between -90 and 90' };
    }
    if (value.lng < -180 || value.lng > 180) {
      return { valid: false, error: 'Longitude must be between -180 and 180' };
    }
    if (value.radius <= 0 || value.radius > 10000) {
      return { valid: false, error: 'Radius must be between 0 and 10000 km' };
    }
    return { valid: true };
  }
});
```

#### Пример 4: Агрегация по связанным данным (количество заказов)

```typescript
CustomFieldHandler.register('User.ordersCount', {
  name: 'Orders Count',
  description: 'Filter users by number of orders',
  
  buildCondition: (operator, value, dialect) => {
    // Оператор может быть: '>', '>=', '<', '<=', '='
    
    if (dialect === 'postgres') {
      return {
        rawSQL: `id IN (
          SELECT user_id 
          FROM orders 
          GROUP BY user_id 
          HAVING COUNT(*) ${operator} $1
        )`,
        params: [value]
      };
    } else if (dialect === 'mysql') {
      return {
        rawSQL: `id IN (
          SELECT user_id 
          FROM orders 
          GROUP BY user_id 
          HAVING COUNT(*) ${operator} ?
        )`,
        params: [value]
      };
    }
  },
  
  validate: (value) => {
    if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
      return { valid: false, error: 'Orders count must be a non-negative integer' };
    }
    return { valid: true };
  }
});
```

#### Пример 5: Массив содержит все элементы (PostgreSQL JSONB)

```typescript
CustomFieldHandler.register('Post.tagsContainAll', {
  name: 'Tags Contain All',
  description: 'Filter posts that contain all specified tags',
  
  buildCondition: (operator, value, dialect) => {
    // value = ['javascript', 'react', 'typescript']
    
    if (dialect === 'postgres') {
      return {
        rawSQL: `tags @> $1::jsonb`,
        params: [JSON.stringify(value)]
      };
    } else if (dialect === 'mysql') {
      // Для MySQL генерируем AND условия для каждого тега
      const conditions = value.map((_, i) => `JSON_CONTAINS(tags, JSON_QUOTE(?), '$')`).join(' AND ');
      return {
        rawSQL: conditions,
        params: value
      };
    } else {
      return {
        inMemory: (record) => {
          if (!Array.isArray(record.tags)) return false;
          return value.every((tag: string) => record.tags.includes(tag));
        }
      };
    }
  },
  
  validate: (value) => {
    if (!Array.isArray(value) || value.length === 0) {
      return { valid: false, error: 'Value must be a non-empty array of tags' };
    }
    if (!value.every(v => typeof v === 'string')) {
      return { valid: false, error: 'All tags must be strings' };
    }
    return { valid: true };
  }
});
```

#### Пример 6: Regex поиск с флагами

```typescript
CustomFieldHandler.register('Product.regexMatch', {
  name: 'Regex Match',
  description: 'Match field against regular expression pattern',
  
  buildCondition: (operator, value, dialect) => {
    // value = { pattern: '^PRO-\\d{4}$', flags: 'i' }
    const { pattern, flags } = value;
    
    if (dialect === 'postgres') {
      const pgOperator = flags?.includes('i') ? '~*' : '~';
      return {
        rawSQL: `sku ${pgOperator} $1`,
        params: [pattern]
      };
    } else if (dialect === 'mysql') {
      return {
        rawSQL: `sku REGEXP ?`,
        params: [pattern]
      };
    } else {
      return {
        inMemory: (record) => {
          try {
            const regex = new RegExp(pattern, flags || '');
            return regex.test(record.sku || '');
          } catch (e) {
            console.error('Invalid regex:', e);
            return false;
          }
        }
      };
    }
  },
  
  validate: (value) => {
    if (!value || typeof value !== 'object' || !value.pattern) {
      return { valid: false, error: 'Value must have pattern property' };
    }
    // Проверяем что regex валидный
    try {
      new RegExp(value.pattern, value.flags || '');
    } catch (e) {
      return { valid: false, error: `Invalid regex pattern: ${e.message}` };
    }
    return { valid: true };
  }
});
```

#### Пример 7: Дата с учетом временной зоны

```typescript
CustomFieldHandler.register('Event.dateInTimezone', {
  name: 'Date in Timezone',
  description: 'Filter by date converted to specific timezone',
  
  buildCondition: (operator, value, dialect) => {
    // value = { date: '2024-01-15', timezone: 'America/New_York' }
    const { date, timezone } = value;
    
    if (dialect === 'postgres') {
      return {
        rawSQL: `(event_date AT TIME ZONE $1)::date ${operator} $2::date`,
        params: [timezone, date]
      };
    } else if (dialect === 'mysql') {
      // MySQL требует CONVERT_TZ
      return {
        rawSQL: `DATE(CONVERT_TZ(event_date, 'UTC', ?)) ${operator} DATE(?)`,
        params: [timezone, date]
      };
    }
  },
  
  validate: (value) => {
    if (!value || !value.date || !value.timezone) {
      return { valid: false, error: 'Value must have date and timezone properties' };
    }
    // Проверяем формат даты
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date)) {
      return { valid: false, error: 'Date must be in YYYY-MM-DD format' };
    }
    return { valid: true };
  }
});
```

---

### 🔒 Безопасность при использовании rawSQL

**КРИТИЧЕСКИ ВАЖНО:**

1. **Всегда используйте параметризованные запросы:**
   ```typescript
   // ✅ ПРАВИЛЬНО
   rawSQL: `field = $1`,
   params: [userInput]
   
   // ❌ НЕПРАВИЛЬНО - SQL Injection!
   rawSQL: `field = '${userInput}'`
   ```

2. **Обязательна валидация в методе `validate()`:**
   ```typescript
   validate: (value) => {
     // Проверка типа
     if (typeof value !== 'string') return { valid: false, error: 'Must be string' };
     
     // Проверка длины
     if (value.length > 100) return { valid: false, error: 'Too long' };
     
     // Запрет опасных символов
     if (/[;'"\-\-\/\*]/.test(value)) return { valid: false, error: 'Invalid chars' };
     
     return { valid: true };
   }
   ```

3. **Ограничивайте операторы:**
   ```typescript
   buildCondition: (operator, value, dialect) => {
     // Whitelist разрешенных операторов
     const allowedOps = ['=', '>', '<', '>=', '<=', '!='];
     if (!allowedOps.includes(operator)) {
       throw new Error(`Operator ${operator} not allowed`);
     }
     // ...
   }
   ```

4. **Используйте prepared statements:**
   - PostgreSQL: `$1, $2, $3`
   - MySQL/MariaDB: `?, ?, ?`
   - Никогда не склеивайте строки!

```

---
```

---

### Конфигурация в adminizerConfig

**Файл:** `fixture/adminizerConfig.ts`

```typescript
export default {
  models: {
    Order: {
      model: 'OrderAP',
      title: 'Orders',
      
      fields: {
        phone: {
          type: 'json',
          title: 'Phone',
          
          // Указываем что поле использует кастомный обработчик
          customHandler: 'Order.phone',
          
          // Доступные операторы для этого поля
          filterOperators: [
            {
              id: 'contains',
              label: 'Contains number',
              requiresValue: true,
              valueType: 'text',
              placeholder: 'Enter phone number'
            }
          ],
          
          // Кастомный UI для отображения
          display: (value) => {
            if (!value) return '-';
            return `${value.countryCode} ${value.number}`;
          }
        },
        
        metadata: {
          type: 'json',
          title: 'Metadata',
          
          // Вложенные поля с обработчиками
          fields: {
            deliveryDate: {
              title: 'Delivery Date',
              customHandler: 'Order.metadata.deliveryDate',
              filterOperators: [
                {
                  id: 'between',
                  label: 'Date range',
                  requiresValue: true,
                  valueType: 'dateRange'
                }
              ]
            }
          }
        },
        
        // Пример с полным raw SQL
        complexCalculation: {
          type: 'virtual',
          title: 'Complex Calculation',
          
          filterOperators: [
            {
              id: 'raw',
              label: 'Custom SQL',
              requiresValue: true,
              
              // Генератор SQL для этого оператора
              buildSQL: (value, dialect) => {
                if (dialect === 'postgres') {
                  return {
                    sql: `(total_price * discount_percent / 100) > $1`,
                    params: [value]
                  };
                }
                return {
                  sql: `(total_price * discount_percent / 100) > ?`,
                  params: [value]
                };
              }
            }
          ]
        }
      }
    }
  }
};
```

---

### Использование в фильтрах

**Пример 1: Поиск по телефону**

```typescript
const filter = {
  modelName: 'Order',
  conditions: [
    {
      id: '1',
      field: 'phone',
      operator: 'custom',
      customHandler: 'Order.phone',
      value: '9001234567'
    }
  ]
};

// Результат в SQL (PostgreSQL):
// WHERE (phone->>'number') LIKE '%9001234567%'
```

**Пример 2: Raw SQL для сложного условия**

```typescript
const filter = {
  modelName: 'Order',
  conditions: [
    {
      id: '1',
      field: 'total',
      operator: 'custom',
      rawSQL: `(total_price * (1 - discount_percent / 100)) > $1`,
      rawSQLParams: [1000]
    }
  ]
};
```

**Пример 3: Комбинация обычных и кастомных условий**

```typescript
const filter = {
  modelName: 'Order',
  conditions: [
    {
      id: 'group1',
      logic: 'AND',
      children: [
        {
          id: '1',
          field: 'status',
          operator: 'eq',
          value: 'pending'
        },
        {
          id: '2',
          field: 'phone',
          operator: 'custom',
          customHandler: 'Order.phone',
          value: '900'
        },
        {
          id: '3',
          field: 'created',
          operator: 'gt',
          value: '2024-01-01'
        }
      ]
    }
  ]
};
```

---

## Checklist перед переходом к Фазе 2

- [x] Модели созданы и работают
- [x] Миграции применены успешно
- [x] Связи настроены корректно
- [x] JSON поля сохраняются/загружаются правильно
- [x] Уникальность slug работает
- [x] Unit тесты для FilterAP/FilterColumnAP написаны (24 теста)
- [ ] Integration тесты написаны (опционально)
- [ ] Код отревьюен

---

## Заметки

_Добавляйте заметки по ходу работы_
