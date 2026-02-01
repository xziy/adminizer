# Фаза 11: Программный API для регистрации фильтров

## Приоритет: P1
## Статус: ⏳ Не начата
## Зависимости: Фаза 1, 2, 3

> **💡 ПСЕВДОКОД:** Весь код FilterBuilder, CriteriaBuilder и Registry — **ПСЕВДОКОД в стиле JavaScript**. Реализуйте согласно архитектуре проекта.

---

## 📋 Описание

Создание программного API для регистрации и управления фильтрами через код (не через UI):
- FilterBuilder для создания фильтров программно
- Fluent API для построения критериев
- Предустановленные (preset) фильтры
- Миграции для фильтров

---

## 🎯 Цели

1. ✅ FilterBuilder fluent API
2. ✅ Preset фильтры
3. ✅ Программная регистрация критериев
4. ✅ Type-safe API для TypeScript
5. ✅ Миграции фильтров
6. ✅ Валидация и тестирование

---

## ✅ Задачи

- [ ] 11.1 FilterBuilder fluent API
- [ ] 11.2 CriteriaBuilder
- [ ] 11.3 FilterRegistry
- [ ] 11.4 FilterPresets
- [ ] 11.5 FilterMigration system
- [ ] 11.6 TypeScript type definitions
- [ ] 11.7 Unit тесты (85%+ coverage)
  - [ ] 11.7.1 FilterBuilder.create().where().and().build()
  - [ ] 11.7.2 CriteriaBuilder chaining
  - [ ] 11.7.3 FilterRegistry.register()
  - [ ] 11.7.4 FilterPresets.apply()
  - [ ] 11.7.5 FilterMigration.migrate()
  - [ ] 11.7.6 Type inference
- [ ] 11.8 Integration тесты
  - [ ] 11.8.1 Programmatic filter creation
  - [ ] 11.8.2 Preset filter execution
  - [ ] 11.8.3 Migration from v1 to v2
  - [ ] 11.8.4 TypeScript compilation
- [ ] 11.9 API документация
  - [ ] 11.9.1 JSDoc comments
  - [ ] 11.9.2 Usage examples
  - [ ] 11.9.3 Migration guide
  - [ ] 11.9.4 TypeDoc generation
- [ ] 11.10 E2E тесты
  - [ ] 11.10.1 Create filter via API
  - [ ] 11.10.2 Use preset filter
  - [ ] 11.10.3 Register custom criteria
  - [ ] 11.10.4 Run migration

---

## 📁 Структура файлов

```
src/
  lib/
    filter-builder/
      FilterBuilder.ts              # Основной API
      CriteriaBuilder.ts            # Построение критериев
      FilterRegistry.ts             # Реестр фильтров
      FilterPresets.ts              # Предустановленные фильтры
      FilterMigration.ts            # Миграции
      
  helpers/
    filterBuilderHelper.ts          # Хелперы
    
  interfaces/
    filter-builder.d.ts             # TypeScript типы
```

---

## 🔧 Реализация

### 1. Criteria Builder

**Файл:** `src/lib/filter-builder/CriteriaBuilder.ts`

```typescript
/**
 * Fluent API для построения WHERE критериев
 */
export class CriteriaBuilder<T = any> {
  private criteria: any = {};
  
  /**
   * Равенство
   */
  where(field: keyof T, value: any): this {
    this.criteria[field as string] = value;
    return this;
  }
  
  /**
   * Не равно
   */
  whereNot(field: keyof T, value: any): this {
    this.criteria[field as string] = { '!=': value };
    return this;
  }
  
  /**
   * IN
   */
  whereIn(field: keyof T, values: any[]): this {
    this.criteria[field as string] = { in: values };
    return this;
  }
  
  /**
   * NOT IN
   */
  whereNotIn(field: keyof T, values: any[]): this {
    this.criteria[field as string] = { nin: values };
    return this;
  }
  
  /**
   * Больше
   */
  whereGt(field: keyof T, value: any): this {
    this.criteria[field as string] = { '>': value };
    return this;
  }
  
  /**
   * Больше или равно
   */
  whereGte(field: keyof T, value: any): this {
    this.criteria[field as string] = { '>=': value };
    return this;
  }
  
  /**
   * Меньше
   */
  whereLt(field: keyof T, value: any): this {
    this.criteria[field as string] = { '<': value };
    return this;
  }
  
  /**
   * Меньше или равно
   */
  whereLte(field: keyof T, value: any): this {
    this.criteria[field as string] = { '<=': value };
    return this;
  }
  
  /**
   * LIKE (contains)
   */
  whereLike(field: keyof T, pattern: string): this {
    this.criteria[field as string] = { contains: pattern };
    return this;
  }
  
  /**
   * Starts with
   */
  whereStartsWith(field: keyof T, prefix: string): this {
    this.criteria[field as string] = { startsWith: prefix };
    return this;
  }
  
  /**
   * Ends with
   */
  whereEndsWith(field: keyof T, suffix: string): this {
    this.criteria[field as string] = { endsWith: suffix };
    return this;
  }
  
  /**
   * NULL check
   */
  whereNull(field: keyof T): this {
    this.criteria[field as string] = null;
    return this;
  }
  
  /**
   * NOT NULL check
   */
  whereNotNull(field: keyof T): this {
    this.criteria[field as string] = { '!=': null };
    return this;
  }
  
  /**
   * Between
   */
  whereBetween(field: keyof T, min: any, max: any): this {
    this.criteria[field as string] = {
      '>=': min,
      '<=': max
    };
    return this;
  }
  
  /**
   * OR условие
   */
  orWhere(conditions: Array<Partial<Record<keyof T, any>>>): this {
    this.criteria.or = conditions.map(cond => {
      const builder = new CriteriaBuilder<T>();
      Object.entries(cond).forEach(([key, value]) => {
        builder.where(key as keyof T, value);
      });
      return builder.build();
    });
    return this;
  }
  
  /**
   * Сортировка
   */
  orderBy(field: keyof T, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.criteria.sort = `${String(field)} ${direction}`;
    return this;
  }
  
  /**
   * Лимит
   */
  limit(value: number): this {
    this.criteria.limit = value;
    return this;
  }
  
  /**
   * Offset
   */
  skip(value: number): this {
    this.criteria.skip = value;
    return this;
  }
  
  /**
   * Populate (join)
   */
  populate(relations: string | string[]): this {
    if (!this.criteria.populate) {
      this.criteria.populate = [];
    }
    
    if (Array.isArray(relations)) {
      this.criteria.populate.push(...relations);
    } else {
      this.criteria.populate.push(relations);
    }
    
    return this;
  }
  
  /**
   * Произвольное условие
   */
  raw(criteria: any): this {
    Object.assign(this.criteria, criteria);
    return this;
  }
  
  /**
   * Построить финальные критерии
   */
  build(): any {
    return this.criteria;
  }
  
  /**
   * Клонировать builder
   */
  clone(): CriteriaBuilder<T> {
    const cloned = new CriteriaBuilder<T>();
    cloned.criteria = JSON.parse(JSON.stringify(this.criteria));
    return cloned;
  }
}
```

---

### 2. Filter Builder

**Файл:** `src/lib/filter-builder/FilterBuilder.ts`

```typescript
import { DataAccessor } from '../DataAccessor';
import { CriteriaBuilder } from './CriteriaBuilder';

export interface FilterOptions {
  name: string;
  description?: string;
  modelName: string;
  icon?: string;
  ownerId?: string;
  groupId?: string;
  isPublic?: boolean;
  tags?: string[];
  columns?: Array<{
    field: string;
    label?: string;
    visible?: boolean;
    sortable?: boolean;
  }>;
}

export class FilterBuilder<T = any> {
  private dataAccessor: DataAccessor;
  private options: FilterOptions;
  private criteriaBuilder: CriteriaBuilder<T>;
  
  constructor(dataAccessor: DataAccessor, modelName: string) {
    this.dataAccessor = dataAccessor;
    this.options = {
      name: '',
      modelName,
      isPublic: false
    };
    this.criteriaBuilder = new CriteriaBuilder<T>();
  }
  
  /**
   * Установить название фильтра
   */
  name(value: string): this {
    this.options.name = value;
    return this;
  }
  
  /**
   * Установить описание
   */
  description(value: string): this {
    this.options.description = value;
    return this;
  }
  
  /**
   * Установить иконку
   */
  icon(value: string): this {
    this.options.icon = value;
    return this;
  }
  
  /**
   * Сделать публичным
   */
  public(): this {
    this.options.isPublic = true;
    return this;
  }
  
  /**
   * Установить владельца
   */
  ownedBy(userId: string): this {
    this.options.ownerId = userId;
    return this;
  }
  
  /**
   * Установить группу
   */
  forGroup(groupId: string): this {
    this.options.groupId = groupId;
    return this;
  }
  
  /**
   * Добавить теги
   */
  tags(...tags: string[]): this {
    this.options.tags = tags;
    return this;
  }
  
  /**
   * Определить колонки
   */
  columns(columns: FilterOptions['columns']): this {
    this.options.columns = columns;
    return this;
  }
  
  /**
   * Простое условие WHERE
   */
  where(field: keyof T, value: any): this {
    this.criteriaBuilder.where(field, value);
    return this;
  }
  
  /**
   * Использовать кастомный CriteriaBuilder
   */
  criteria(callback: (builder: CriteriaBuilder<T>) => void): this {
    callback(this.criteriaBuilder);
    return this;
  }
  
  /**
   * Установить критерии напрямую
   */
  rawCriteria(criteria: any): this {
    this.criteriaBuilder.raw(criteria);
    return this;
  }
  
  /**
   * Сохранить фильтр в базу
   */
  async save(): Promise<any> {
    if (!this.options.name) {
      throw new Error('Filter name is required');
    }
    
    const filter = await this.dataAccessor.create('FilterAP', {
      name: this.options.name,
      description: this.options.description,
      modelName: this.options.modelName,
      criteria: this.criteriaBuilder.build(),
      icon: this.options.icon || 'filter_alt',
      ownerId: this.options.ownerId,
      groupId: this.options.groupId,
      visibility: this.options.isPublic ? 'public' : 'private',
      tags: this.options.tags || [],
      columns: this.options.columns || []
    });
    
    return filter;
  }
  
  /**
   * Обновить существующий фильтр
   */
  async update(filterId: string): Promise<any> {
    const updates: any = {
      criteria: this.criteriaBuilder.build()
    };
    
    if (this.options.name) updates.name = this.options.name;
    if (this.options.description) updates.description = this.options.description;
    if (this.options.icon) updates.icon = this.options.icon;
    if (this.options.columns) updates.columns = this.options.columns;
    if (this.options.tags) updates.tags = this.options.tags;
    
    return this.dataAccessor.update('FilterAP', { id: filterId }, updates);
  }
  
  /**
   * Получить результаты без сохранения
   */
  async execute(): Promise<any[]> {
    const criteria = this.criteriaBuilder.build();
    return this.dataAccessor.find(this.options.modelName, criteria);
  }
  
  /**
   * Получить количество без сохранения
   */
  async count(): Promise<number> {
    const criteria = this.criteriaBuilder.build();
    return this.dataAccessor.count(this.options.modelName, criteria);
  }
}
```

---

### 3. Filter Registry

**Файл:** `src/lib/filter-builder/FilterRegistry.ts`

```typescript
import { DataAccessor } from '../DataAccessor';
import { FilterBuilder } from './FilterBuilder';

type FilterFactory = (dataAccessor: DataAccessor) => FilterBuilder<any>;

export class FilterRegistry {
  private static filters: Map<string, FilterFactory> = new Map();
  private dataAccessor: DataAccessor;
  
  constructor(dataAccessor: DataAccessor) {
    this.dataAccessor = dataAccessor;
  }
  
  /**
   * Зарегистрировать фильтр
   */
  static register(id: string, factory: FilterFactory) {
    this.filters.set(id, factory);
  }
  
  /**
   * Получить фильтр по ID
   */
  get(id: string): FilterBuilder<any> | null {
    const factory = FilterRegistry.filters.get(id);
    if (!factory) {
      return null;
    }
    
    return factory(this.dataAccessor);
  }
  
  /**
   * Получить все зарегистрированные ID
   */
  getAllIds(): string[] {
    return Array.from(FilterRegistry.filters.keys());
  }
  
  /**
   * Синхронизировать preset фильтры с базой
   */
  async sync() {
    for (const [id, factory] of FilterRegistry.filters.entries()) {
      try {
        const builder = factory(this.dataAccessor);
        
        // Проверить существует ли фильтр
        const existing = await this.dataAccessor.findOne('FilterAP', {
          presetId: id
        });
        
        if (existing) {
          // Обновить
          await builder.update(existing.id);
          console.log(`✓ Updated preset filter: ${id}`);
        } else {
          // Создать
          const filter = await builder.save();
          
          // Добавить presetId
          await this.dataAccessor.update('FilterAP',
            { id: filter.id },
            { presetId: id }
          );
          
          console.log(`✓ Created preset filter: ${id}`);
        }
      } catch (error) {
        console.error(`✗ Failed to sync preset filter ${id}:`, error);
      }
    }
  }
}
```

---

### 4. Filter Presets

**Файл:** `src/lib/filter-builder/FilterPresets.ts`

```typescript
import { FilterRegistry } from './FilterRegistry';
import { FilterBuilder } from './FilterBuilder';
import { DataAccessor } from '../DataAccessor';

/**
 * Регистрация preset фильтров
 */
export function registerPresetFilters() {
  // Активные пользователи
  FilterRegistry.register('users.active', (dataAccessor: DataAccessor) => {
    return new FilterBuilder(dataAccessor, 'UserAP')
      .name('Active Users')
      .description('All active users in the system')
      .icon('people')
      .public()
      .tags('users', 'active')
      .criteria(builder => {
        builder
          .where('isActive', true)
          .whereNotNull('lastLoginAt')
          .orderBy('lastLoginAt', 'DESC');
      })
      .columns([
        { field: 'name', label: 'Name', visible: true, sortable: true },
        { field: 'email', label: 'Email', visible: true, sortable: true },
        { field: 'lastLoginAt', label: 'Last Login', visible: true, sortable: true }
      ]);
  });
  
  // Неактивные пользователи (давно не заходили)
  FilterRegistry.register('users.inactive', (dataAccessor: DataAccessor) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return new FilterBuilder(dataAccessor, 'UserAP')
      .name('Inactive Users (30+ days)')
      .description('Users who haven\'t logged in for 30 days')
      .icon('person_off')
      .public()
      .tags('users', 'inactive')
      .criteria(builder => {
        builder
          .where('isActive', true)
          .whereLt('lastLoginAt', thirtyDaysAgo)
          .orderBy('lastLoginAt', 'ASC');
      });
  });
  
  // Сегодняшние записи
  FilterRegistry.register('generic.today', (dataAccessor: DataAccessor) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return new FilterBuilder(dataAccessor, 'Example') // Замените на нужную модель
      .name('Today\'s Records')
      .description('Records created today')
      .icon('today')
      .public()
      .criteria(builder => {
        builder.whereBetween('createdAt', today, tomorrow);
      });
  });
  
  // Последние 100 записей
  FilterRegistry.register('generic.recent', (dataAccessor: DataAccessor) => {
    return new FilterBuilder(dataAccessor, 'Example')
      .name('Recent Records')
      .description('Last 100 records')
      .icon('history')
      .public()
      .criteria(builder => {
        builder
          .orderBy('createdAt', 'DESC')
          .limit(100);
      });
  });
}
```

---

### 5. Filter Migration

**Файл:** `src/lib/filter-builder/FilterMigration.ts`

```typescript
import { DataAccessor } from '../DataAccessor';
import { FilterBuilder } from './FilterBuilder';

/**
 * Система миграций для фильтров
 */
export class FilterMigration {
  private dataAccessor: DataAccessor;
  
  constructor(dataAccessor: DataAccessor) {
    this.dataAccessor = dataAccessor;
  }
  
  /**
   * Применить миграцию
   */
  async up(name: string, migration: (dataAccessor: DataAccessor) => Promise<void>) {
    console.log(`Running filter migration: ${name}`);
    
    try {
      await migration(this.dataAccessor);
      console.log(`✓ Migration ${name} completed`);
    } catch (error) {
      console.error(`✗ Migration ${name} failed:`, error);
      throw error;
    }
  }
  
  /**
   * Создать фильтр из миграции
   */
  createFilter<T>(modelName: string): FilterBuilder<T> {
    return new FilterBuilder<T>(this.dataAccessor, modelName);
  }
}

/**
 * Пример использования миграций
 */
export async function runFilterMigrations(dataAccessor: DataAccessor) {
  const migration = new FilterMigration(dataAccessor);
  
  // Миграция 1: Создать базовые фильтры
  await migration.up('001_create_base_filters', async (da) => {
    await migration.createFilter('UserAP')
      .name('All Users')
      .description('Complete list of users')
      .public()
      .icon('people')
      .save();
    
    await migration.createFilter('GroupAP')
      .name('All Groups')
      .description('Complete list of groups')
      .public()
      .icon('group')
      .save();
  });
  
  // Миграция 2: Фильтры для администраторов
  await migration.up('002_create_admin_filters', async (da) => {
    await migration.createFilter('UserAP')
      .name('Administrators')
      .description('Users with admin rights')
      .icon('admin_panel_settings')
      .forGroup('admin-group-id')
      .criteria(builder => {
        builder.where('isAdmin', true);
      })
      .save();
  });
}
```

---

## 📝 Примеры использования

### Пример 1: Простой фильтр

```typescript
import { FilterBuilder } from './lib/filter-builder/FilterBuilder';

// Создать фильтр активных пользователей
const filter = await new FilterBuilder(dataAccessor, 'UserAP')
  .name('Active Users')
  .description('All active users')
  .icon('people')
  .public()
  .where('isActive', true)
  .save();
```

---

### Пример 2: Сложные критерии

```typescript
const filter = await new FilterBuilder(dataAccessor, 'Order')
  .name('Pending Orders (High Value)')
  .description('Orders over $1000 waiting for approval')
  .criteria(builder => {
    builder
      .where('status', 'pending')
      .whereGte('totalAmount', 1000)
      .whereBetween('createdAt', startDate, endDate)
      .populate(['customer', 'items'])
      .orderBy('totalAmount', 'DESC')
      .limit(50);
  })
  .columns([
    { field: 'id', label: 'Order ID', visible: true, sortable: true },
    { field: 'customer.name', label: 'Customer', visible: true },
    { field: 'totalAmount', label: 'Amount', visible: true, sortable: true },
    { field: 'createdAt', label: 'Date', visible: true, sortable: true }
  ])
  .save();
```

---

### Пример 3: OR условия

```typescript
const filter = await new FilterBuilder(dataAccessor, 'Task')
  .name('My Tasks or Assigned to My Team')
  .criteria(builder => {
    builder.orWhere([
      { assignedTo: currentUserId },
      { teamId: currentUserTeamId }
    ]);
  })
  .save();
```

---

### Пример 4: Preset фильтр

```typescript
// Регистрация
FilterRegistry.register('products.out-of-stock', (dataAccessor) => {
  return new FilterBuilder(dataAccessor, 'Product')
    .name('Out of Stock')
    .description('Products that need restocking')
    .icon('inventory_2')
    .public()
    .criteria(builder => {
      builder
        .whereLte('quantity', 0)
        .orderBy('name', 'ASC');
    });
});

// Использование
const registry = new FilterRegistry(dataAccessor);
const filter = registry.get('products.out-of-stock');
const results = await filter.execute();
```

---

### Пример 5: Тестирование фильтра без сохранения

```typescript
const builder = new FilterBuilder(dataAccessor, 'Article')
  .criteria(builder => {
    builder
      .where('published', true)
      .whereGte('publishedAt', new Date('2025-01-01'));
  });

// Получить результаты без сохранения
const articles = await builder.execute();
console.log(`Found ${articles.length} articles`);

// Если результаты корректные - сохранить фильтр
if (articles.length > 0) {
  await builder
    .name('Published Articles 2025')
    .public()
    .save();
}
```

---

## 🧪 Тесты

```typescript
// tests/filter-builder.spec.ts
import { FilterBuilder } from '../src/lib/filter-builder/FilterBuilder';
import { CriteriaBuilder } from '../src/lib/filter-builder/CriteriaBuilder';

describe('FilterBuilder', () => {
  it('should build simple criteria', async () => {
    const builder = new CriteriaBuilder()
      .where('status', 'active')
      .where('verified', true);
    
    expect(builder.build()).toEqual({
      status: 'active',
      verified: true
    });
  });
  
  it('should build complex criteria', async () => {
    const builder = new CriteriaBuilder()
      .whereGte('age', 18)
      .whereLike('name', 'John')
      .whereIn('country', ['US', 'UK', 'CA'])
      .orderBy('createdAt', 'DESC')
      .limit(10);
    
    const criteria = builder.build();
    
    expect(criteria.age).toEqual({ '>=': 18 });
    expect(criteria.name).toEqual({ contains: 'John' });
    expect(criteria.country).toEqual({ in: ['US', 'UK', 'CA'] });
    expect(criteria.sort).toBe('createdAt DESC');
    expect(criteria.limit).toBe(10);
  });
  
  it('should create and save filter', async () => {
    const filter = await new FilterBuilder(dataAccessor, 'Example')
      .name('Test Filter')
      .where('status', 'active')
      .save();
    
    expect(filter.name).toBe('Test Filter');
    expect(filter.criteria.status).toBe('active');
  });
});
```

---

## ✅ Чеклист готовности

- [ ] CriteriaBuilder с fluent API
- [ ] FilterBuilder с type-safe методами
- [ ] FilterRegistry для preset фильтров
- [ ] FilterMigration система
- [ ] Регистрация preset фильтров
- [ ] Type definitions (TypeScript)
- [ ] Валидация критериев
- [ ] Unit тесты
- [ ] Integration тесты
- [ ] Документация и примеры

---

## 🚀 Следующие шаги

После завершения:
1. ✅ Автогенерация фильтров из моделей
2. ✅ Visual builder GUI на основе API
3. ✅ Filter templates
