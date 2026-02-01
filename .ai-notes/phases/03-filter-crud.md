# Фаза 3: CRUD для фильтров

**Приоритет:** P1
**Зависимости:** Фаза 1, Фаза 2
**Статус:** `[ ]` Не начато

> **⚠️ Примечание для агента:** Весь код в этой фазе - **ПСЕВДОКОД в стиле JavaScript** для понимания API структуры. Реализуйте творчески, следуя паттернам существующих контроллеров. НЕ создавайте markdown файлы с резюме изменений.
>
> 💡 **Все примеры — ПСЕВДОКОД!** Классы, методы и интерфейсы показаны для иллюстрации логики, не для буквального копирования.

---

## 🏗️ Архитектура (SOLID Principles)

> **⚠️ КРИТИЧНО:** Следуем принципу Single Responsibility (SRP).
> FilterService разделён на специализированные компоненты:

```
src/lib/filters/
├── repository/
│   └── FilterRepository.ts       # Только CRUD операции
├── services/
│   ├── FilterAccessService.ts    # Проверка прав доступа
│   ├── FilterExecutionService.ts # Выполнение фильтров
│   └── FilterConfigService.ts    # Работа с конфигурацией
├── validators/
│   └── ConditionValidator.ts     # Валидация условий
├── middleware/
│   ├── filterRateLimit.ts        # Rate limiting
│   └── filterMetrics.ts          # Метрики и мониторинг
├── FilterAuditLogger.ts          # Аудит операций
└── index.ts                      # Публичный API (фасад)
```

### Принципы разделения:

| Компонент | Ответственность | Зависимости |
|-----------|-----------------|-------------|
| `FilterRepository` | CRUD через DataAccessor, транзакции | DataAccessor |
| `FilterAccessService` | Проверка visibility, groups, rawSQL | UserAP, GroupAP |
| `FilterExecutionService` | Выполнение запросов, подсчёт | ModernQueryBuilder |
| `FilterConfigService` | Проверка filtersEnabled для моделей | AdminizerConfig |
| `ConditionValidator` | Валидация полей, операторов, типов | ModelDefinition |

---

## 🔐 Безопасность

### Rate Limiting (обязательно!)

| Endpoint | Лимит | Причина |
|----------|-------|---------|
| `POST /filters/preview` | 30/min | Предотвращение DDoS через тяжёлые запросы |
| `POST /filters` | 10/min | Защита от спама фильтрами |
| `GET /filters/:id/count` | 60/min | Частые запросы от виджетов |

### Защита от SQL Injection

> **🚨 КРИТИЧНО:** `rawSQL` в условиях разрешён ТОЛЬКО администраторам!

```typescript
// В ConditionValidator
if (condition.rawSQL && !user.isAdministrator) {
  throw new ForbiddenError('Raw SQL conditions are admin-only');
}
```

---

## ✅ Ключевые возможности

### 1. ID фильтра - STRING (UUID)
- ✅ ID хранится как `string` (UUID), не `number`
- ✅ Генерация через `crypto.randomUUID()`

### 2. Временное применение фильтра БЕЗ сохранения
- ✅ `POST /adminizer/filters/preview` - применить условия без создания записи
- ✅ Используется для предпросмотра результатов перед сохранением
- ✅ Параметры: `{ modelName, conditions, page, limit, sort, sortDirection }`

### 3. Сохранение фильтра и прямая ссылка
- ✅ `POST /adminizer/filters` - создать и сохранить фильтр
- ✅ `GET /adminizer/filter/:id` - **прямая ссылка на фильтр**
- ✅ Перенаправляет на `/list/:modelName?filterId=:id` с примененным фильтром
- ✅ URL можно использовать в виджетах, быстрых ссылках, закладках

### 4. Список фильтров для Dashboard Widget
- ✅ `GET /adminizer/filters?modelName=...` - получить список доступных фильтров
- ✅ Возвращает: `id` (string!), `name`, `icon`, `color`
- ✅ `GET /adminizer/filters/:id/count` - получить количество результатов для виджета
- ✅ Dashboard Widget использует `/adminizer/filter/:id` как ссылку

### 5. Отключение фильтров (Fallback на старый поиск)
- ✅ **Глобальное отключение:** `filtersEnabled: false` - отключить для всей админки
- ✅ **Отключение для модели:** `modelFilters.UserAP.enabled: false`
- ✅ **Старый поиск:** `modelFilters.UserAP.useLegacySearch: true`
- ✅ API возвращает `403` с флагом `filtersEnabled: false` когда фильтры отключены
- ✅ UI показывает старый search input вместо кнопки фильтров
- ✅ `FilterService.isFiltersEnabledForModel()` - проверка перед операциями

### 6. Системные фильтры (скрытые от UI)
- ✅ **Создание системного фильтра:** `isSystemFilter: true` при создании
- ✅ **Видимость:** Системные фильтры НЕ отображаются в списке UI по умолчанию
- ✅ **Доступ:** Доступны через прямую ссылку `/adminizer/filter/:id` или slug
- ✅ **Использование:** Можно использовать в виджетах, быстрых ссылках, API
- ✅ **Обновление:** Полностью функциональны - можно обновлять, удалять через API
- ✅ **Переключение:** `isSystemFilter` можно изменить - фильтр станет видимым/скрытым
- ✅ **API параметр:** `GET /adminizer/filters?includeSystem=true` для включения в список
- ✅ **Use case:** Технические фильтры для интеграций, которые не должны загромождать UI

**Конфигурация отключения:**
```typescript
const adminizer = new Adminizer({
  // ВАРИАНТ 1: Отключить глобально
  filtersEnabled: false,  // Везде старый поиск

  // ВАРИАНТ 2: Отключить для конкретных моделей
  filtersEnabled: true,
  modelFilters: {
    UserAP: {
      enabled: false,  // Для UserAP - старый поиск
      useLegacySearch: true
    },
    LegacyModel: {
      useLegacySearch: true  // Явно старый поиск
    }
  }
});
```

**Проверка в коде:**
```typescript
// В контроллере
if (!req.adminizer.filterService.isFiltersEnabledForModel('UserAP')) {
  // Fallback на старый поиск
  return useLegacySearch(req, res);
}

// В UI
const { filtersEnabled } = await fetch('/adminizer/filters?modelName=UserAP');
if (!filtersEnabled) {
  // Показать старый search input
}
```

### 6. Примеры использования

**Временная фильтрация (без сохранения):**
```typescript
// Пользователь настраивает фильтр в UI
const preview = await fetch('/adminizer/filters/preview', {
  method: 'POST',
  body: JSON.stringify({
    modelName: 'UserAP',
    conditions: [
      { id: '1', field: 'status', operator: 'eq', value: 'active' }
    ],
    page: 1,
    limit: 25
  })
});
// Показать результаты предпросмотра
```

**Сохранение и получение прямой ссылки:**
```typescript
// Сохранить фильтр
const filter = await fetch('/adminizer/filters', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Active Users',
    modelName: 'UserAP',
    conditions: [...]
  })
});

// filter.id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890" (UUID string!)
// Прямая ссылка: /adminizer/filter/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Создание системного фильтра (скрытого от UI):**
```typescript
// Создать системный фильтр для интеграции
const systemFilter = await fetch('/adminizer/filters', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Integration: Pending Orders',
    slug: 'integration-pending-orders',
    modelName: 'Order',
    isSystemFilter: true,  // ⬅️ Не будет показан в UI списке
    conditions: [
      { id: '1', field: 'status', operator: 'eq', value: 'pending' },
      { id: '2', field: 'paymentStatus', operator: 'eq', value: 'awaiting' }
    ]
  })
});

// Фильтр доступен через:
// 1. Прямую ссылку: /adminizer/filter/:id
// 2. По slug: /adminizer/filter/by-slug/integration-pending-orders
// 3. Через API: /api/filters/integration-pending-orders/json?apiKey=...
// 
// НО не отображается в GET /adminizer/filters (список UI)

// Чтобы увидеть системные фильтры в списке:
const allFilters = await fetch('/adminizer/filters?includeSystem=true');

// Переключение на публичный фильтр:
await fetch(`/adminizer/filters/${systemFilter.id}`, {
  method: 'PATCH',
  body: JSON.stringify({
    isSystemFilter: false  // Теперь виден в UI
  })
});
```

**Dashboard Widget - получить список фильтров:**
```typescript
// Получить фильтры пользователя
const filters = await fetch('/adminizer/filters?modelName=OrderAP');
// [
//   { id: "uuid-1", name: "New Orders", icon: "shopping_cart", ... },
//   { id: "uuid-2", name: "Completed", icon: "check_circle", ... }
// ]

// Для каждого фильтра в виджете:
filters.forEach(filter => {
  const count = await fetch(`/adminizer/filters/${filter.id}/count`);
  // Показать: "New Orders: 42" с ссылкой на /adminizer/filter/uuid-1
});
```

---

## Цель

Создать API и контроллеры для создания, чтения, обновления и удаления фильтров.

---

## Задачи

- [ ] 3.1 Создать FilterRepository (CRUD через DataAccessor)
- [ ] 3.2 Создать ConditionValidator (валидация условий)
- [ ] 3.3 Создать FilterAccessService (проверка прав)
- [ ] 3.4 Создать FilterExecutionService (выполнение запросов)
- [ ] 3.5 Создать FilterController (REST API)
  - [ ] 3.5.1 Добавить поддержку isSystemFilter в create/update
  - [ ] 3.5.2 Добавить параметр includeSystem в список фильтров
  - [ ] 3.5.3 Фильтровать системные фильтры по умолчанию
- [ ] 3.6 Добавить Rate Limiting middleware
- [ ] 3.7 Добавить маршруты в Router.ts
- [ ] 3.8 Интеграция с UI списка записей
- [ ] 3.9 Unit тесты (90%+ coverage)
  - [ ] 3.9.1 FilterRepository CRUD
  - [ ] 3.9.2 ConditionValidator
  - [ ] 3.9.3 FilterAccessService
  - [ ] 3.9.4 Slug generation with retry
  - [ ] 3.9.5 Системные фильтры (create/list/toggle)
- [ ] 3.10 Integration тесты
  - [ ] 3.10.1 CRUD через API endpoints
  - [ ] 3.10.2 Permissions (owner, shared, groups)
  - [ ] 3.10.3 Rate limiting verification
  - [ ] 3.10.4 Транзакции create+columns
  - [ ] 3.10.5 Системные фильтры в списке (с/без includeSystem)
  - [ ] 3.10.6 Прямой доступ к системному фильтру по ID/slug
- [ ] 3.11 E2E тесты
  - [ ] 3.11.1 Create filter flow
  - [ ] 3.11.2 Apply filter to list
  - [ ] 3.11.3 Share filter with group
  - [ ] 3.11.4 Создание системного фильтра через UI
- [ ] 3.12 Миграция и валидация старых фильтров

---

## 3.1 FilterRepository (Helper/Service)

> **КОНЦЕПЦИЯ:** Модуль для CRUD операций с фильтрами через DataAccessor

**Файл:** `src/lib/filters/filterRepository.ts` (или helpers/filterHelper.ts)

```javascript
// ПСЕВДОКОД: Концептуальная структура, НЕ для копирования!

// Основные операции:
// - createFilter(data, user) - создать фильтр через DataAccessor
// - updateFilter(filterId, data, user) - обновить
// - deleteFilter(filterId, user) - удалить
// - findFilters(where, user) - найти с пагинацией
// - findById(filterId, user) - получить один

// КЛЮЧЕВЫЕ МОМЕНТЫ:
// ✅ Используем DataAccessor для всех операций (автоматические права)
// ✅ Генерация slug через существующие helpers
// ✅ UUID генерация для ID
// ✅ Транзакции для атомарности (фильтр + колонки)
// ✅ Проверка userAccessRelation: 'owner' в модели FilterAP

// Пример концепции создания:
async function createFilter(filterData, user, adminizer) {
  // 1. Подготовка данных
  filterData.id = generateUUID();
  filterData.slug = filterData.slug || generateSlug(filterData.name);
  filterData.owner = user.id;
  
  // 2. Создание через DataAccessor
  const dataAccessor = new DataAccessor(adminizer, user, filterEntity, 'create');
  const filter = await dataAccessor.create('FilterAP', filterData);
  
  return filter;
}
    data: Partial<FilterAPAttributes>,
    columns: Partial<FilterColumnAP>[] | undefined,
    user: UserAP
  ): Promise<FilterAP> {
    return this.dataAccessor.transaction(async (tx) => {
      // Обновить фильтр
      await tx.update('FilterAP', { id: filterId }, data, user);
      
      // Если переданы колонки — пересоздать их
      if (columns !== undefined) {
        await tx.destroy('FilterColumnAP', { filterId }, user);
        
        if (columns.length) {
          await tx.bulkCreate(
            'FilterColumnAP',
            columns.map((col, idx) => ({
              ...col,
              filterId,
              order: col.order ?? idx
            })),
            user
          );
        }
      }
      
      return this.findById(filterId, user);
    });
  }

  /**
   * Удалить фильтр (транзакционно!)
   */
  async delete(filterId: string, user: UserAP): Promise<void> {
    await this.dataAccessor.transaction(async (tx) => {
      // Сначала удаляем колонки
      await tx.destroy('FilterColumnAP', { filterId }, user);
      // Потом фильтр
      await tx.destroy('FilterAP', { id: filterId }, user);
    });
  }

  /**
   * Получить фильтр по ID
   * DataAccessor автоматически проверит права через userAccessRelation
   */
  async findById(filterId: string, user: UserAP): Promise<FilterAP | null> {
    return this.dataAccessor.process('FilterAP', { id: filterId }, user);
  }

  /**
   * Получить фильтр по slug
   */
  async findBySlug(slug: string, user: UserAP): Promise<FilterAP | null> {
    return this.dataAccessor.process('FilterAP', { slug }, user);
  }

  /**
   * Получить фильтр по API ключу (без проверки владельца!)
   */
  async findByApiKey(apiKey: string): Promise<FilterAP | null> {
    // Прямой запрос без DataAccessor — API ключ сам по себе авторизация
    return this.dataAccessor.findOneRaw('FilterAP', { 
      apiKey, 
      apiEnabled: true 
    });
  }

  /**
   * Получить фильтры пользователя С ПАГИНАЦИЕЙ
   * 
   * ⚠️ ВАЖНО: Всегда возвращаем пагинированный результат!
   */
  async findMany(
    user: UserAP,
    options: {
      modelName?: string;
      onlyPinned?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedFilters> {
    const { page = 1, limit = 50 } = options;
    const where: Record<string, any> = {};

    if (options.modelName) {
      where.modelName = options.modelName;
    }
    if (options.onlyPinned) {
      where.isPinned = true;
    }

    // DataAccessor автоматически фильтрует по owner для не-админов
    const result = await this.dataAccessor.processManyPaginated(
      'FilterAP',
      where,
      user,
      { page, limit, sort: 'name', sortDirection: 'ASC' }
    );

    // Для не-админов добавляем публичные фильтры
    if (!user.isAdministrator) {
      const publicFilters = await this.dataAccessor.findManyRaw(
        'FilterAP',
        { ...where, visibility: 'public' }
      );
      
      // Merge и deduplicate
      const allFilters = [...result.data, ...publicFilters];
      const unique = Array.from(
        new Map(allFilters.map(f => [f.id, f])).values()
      );
      
      return {
        data: unique.slice((page - 1) * limit, page * limit),
        total: unique.length,
        page,
        limit,
        pages: Math.ceil(unique.length / limit)
      };
    }

    return result;
  }

  /**
   * Генерация slug С RETRY (защита от race condition)
   * 
   * ⚠️ КРИТИЧНО: Используем timestamp + retry вместо простого counter
   */
  private async generateSlugWithRetry(
    name: string,
    maxRetries = 5
  ): Promise<string> {
    const base = this.slugify(name);
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const slug = attempt === 0 
        ? base 
        : `${base}-${Date.now()}-${attempt}`;
      
      const exists = await this.dataAccessor.findOneRaw('FilterAP', { slug });
      
      if (!exists) {
        return slug;
      }
    }
    
    // Fallback: UUID-based slug
    return `${base}-${crypto.randomUUID().slice(0, 8)}`;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100); // Ограничиваем длину
  }

  private generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
```

---

## 3.2 ConditionValidator (Helper)

> **КОНЦЕПЦИЯ:** Валидация условий фильтра перед выполнением

**Файл:** `src/helpers/filterValidators.ts`

```javascript
// ПСЕВДОКОД: Концептуальная структура валидации

// Основные задачи:
// 1. Проверить существование модели
// 2. Проверить существование полей
// 3. Проверить соответствие операторов типам полей
// 4. Проверить rawSQL только для админов
// 5. Валидировать значения

// Результат:
// {
//   valid: boolean,
//   errors: [{path, code, message}],
//   sanitizedConditions: [] // очищенные условия
// }
```

---
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedConditions: errors.length === 0 ? sanitized : undefined
    };
  }

  private validateConditions(
    conditions: FilterCondition[],
    modelDef: any,
    user: UserAP,
    errors: ValidationError[],
    warnings: string[],
    path: string
  ): FilterCondition[] {
    return conditions.map((cond, idx) => {
      const condPath = `${path}[${idx}]`;
      
      // Проверка rawSQL — ТОЛЬКО для администраторов!
      if (cond.rawSQL) {
        if (!user.isAdministrator) {
          errors.push({
            path: `${condPath}.rawSQL`,
            code: 'RAW_SQL_FORBIDDEN',
            message: 'Raw SQL conditions are only allowed for administrators'
          });
          // Удаляем rawSQL из условия
          const { rawSQL, rawSQLParams, ...safeCond } = cond;
          return safeCond;
        }
        warnings.push(`Raw SQL at ${condPath} — ensure it's properly parameterized`);
        return cond;
      }

      // Рекурсивная обработка children
      if (cond.children?.length) {
        return {
          ...cond,
          children: this.validateConditions(
            cond.children,
            modelDef,
            user,
            errors,
            warnings,
            `${condPath}.children`
          )
        };
      }

      // Валидация поля
      if (cond.field && !cond.relation) {
        const fieldDef = modelDef.attributes?.[cond.field];
        
        if (!fieldDef) {
          errors.push({
            path: `${condPath}.field`,
            code: 'INVALID_FIELD',
            message: `Field '${cond.field}' does not exist in model`
          });
          return cond;
        }

        // Валидация оператора
        const fieldType = this.normalizeFieldType(fieldDef.type);
        const allowedOperators = OPERATORS_BY_TYPE[fieldType] || [];
        
        if (cond.operator && !allowedOperators.includes(cond.operator)) {
          errors.push({
            path: `${condPath}.operator`,
            code: 'INVALID_OPERATOR',
            message: `Operator '${cond.operator}' is not valid for field type '${fieldType}'`
          });
        }

        // Валидация значения
        const valueError = this.validateValue(cond.value, cond.operator, fieldType);
        if (valueError) {
          errors.push({
            path: `${condPath}.value`,
            code: 'INVALID_VALUE',
            message: valueError
          });
        }
      }

      // Валидация связи
      if (cond.relation) {
        const relationDef = modelDef.relations?.[cond.relation];
        if (!relationDef) {
          errors.push({
            path: `${condPath}.relation`,
            code: 'INVALID_RELATION',
            message: `Relation '${cond.relation}' does not exist`
          });
        }
      }

      return cond;
    });
  }

  private normalizeFieldType(type: string): string {
    const typeMap: Record<string, string> = {
      'integer': 'number',
      'float': 'number',
      'decimal': 'number',
      'bigint': 'number',
      'text': 'string',
      'varchar': 'string',
      'datetime': 'date',
      'timestamp': 'date',
      'jsonb': 'json'
    };
    return typeMap[type?.toLowerCase()] || type?.toLowerCase() || 'string';
  }

  private validateValue(
    value: any,
    operator: FilterOperator,
    fieldType: string
  ): string | null {
    // isNull/isNotNull не требуют значения
    if (operator === 'isNull' || operator === 'isNotNull') {
      return null;
    }

    if (value === undefined || value === null) {
      return 'Value is required for this operator';
    }

    // between требует массив из 2 элементов
    if (operator === 'between') {
      if (!Array.isArray(value) || value.length !== 2) {
        return 'Between operator requires array of 2 values';
      }
    }

    // in/notIn требуют массив
    if (operator === 'in' || operator === 'notIn') {
      if (!Array.isArray(value)) {
        return 'IN operator requires an array';
      }
    }

    return null;
  }
}
```

---

## 3.3 FilterAccessService (Policy)

> **КОНЦЕПЦИЯ:** Проверка прав доступа к фильтрам (может быть частью PolicyManager)

**Файл:** `src/policies/filterPolicy.ts` или интегрировано в PolicyManager

```typescript
import { FilterAP } from '../../../models/FilterAP';
import { UserAP } from '../../../models/UserAP';
import { Adminizer } from '../../Adminizer';

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class FilterAccessService {
  constructor(private adminizer: Adminizer) {}

  /**
   * Проверка права просмотра
   * 
   * Логика: админ видит всё, владелец своё, public для всех, groups по группам
   */
  canView(filter: FilterAP, user: UserAP): boolean {
    if (user.isAdministrator) return true;
    if (filter.owner === user.id) return true;
    if (filter.visibility === 'public') return true;

    if (filter.visibility === 'groups' && filter.groupIds?.length) {
      const userGroupIds = user.groups?.map(g => g.id) || [];
      return filter.groupIds.some(id => userGroupIds.includes(id));
    }

    return false;
  }

  /**
   * Проверка права редактирования
   * 
   * Логика: админ или владелец
   */
  canEdit(filter: FilterAP, user: UserAP): boolean {
    if (user.isAdministrator) return true;
    return filter.owner === user.id;
  }

  /**
   * Проверка права выполнения фильтра
   * 
   * То же что canView — если видишь, можешь выполнить
   */
  canExecute(filter: FilterAP, user: UserAP): boolean {
    return this.canView(filter, user);
  }

  /**
   * Проверка права использовать rawSQL
   * 
   * 🚨 ТОЛЬКО администраторы!
   */
  canUseRawSQL(user: UserAP): boolean {
    return user.isAdministrator === true;
  }

  /**
   * Assert методы — бросают ForbiddenError
   */
  assertCanView(filter: FilterAP, user: UserAP): void {
    if (!this.canView(filter, user)) {
      this.logSecurityEvent('VIEW_DENIED', filter.id, user);
      throw new ForbiddenError('Access denied: cannot view this filter');
    }
  }

  assertCanEdit(filter: FilterAP, user: UserAP): void {
    if (!this.canEdit(filter, user)) {
      this.logSecurityEvent('EDIT_DENIED', filter.id, user);
      throw new ForbiddenError('Access denied: cannot edit this filter');
    }
  }

  assertCanExecute(filter: FilterAP, user: UserAP): void {
    if (!this.canExecute(filter, user)) {
      this.logSecurityEvent('EXECUTE_DENIED', filter.id, user);
      throw new ForbiddenError('Access denied: cannot execute this filter');
    }
  }

  /**
   * Логирование security events
   */
  private logSecurityEvent(
    event: string,
    filterId: string,
    user: UserAP
  ): void {
    Adminizer.log.warn(`[SECURITY] ${event}: filter=${filterId}, user=${user.id} (${user.login})`);
  }
}
```

---

## 3.4 FilterConfigService

> **SOLID:** Single Responsibility — только конфигурация фильтров

**Файл:** `src/lib/filters/services/FilterConfigService.ts`

```typescript
import { Adminizer } from '../../Adminizer';

export class FilterConfigService {
  constructor(private adminizer: Adminizer) {}

  /**
   * Проверить включены ли фильтры глобально
   */
  isFiltersEnabled(): boolean {
    return this.adminizer.config.filtersEnabled !== false;
  }

  /**
   * Проверить включены ли фильтры для конкретной модели
   */
  isFiltersEnabledForModel(modelName: string): boolean {
    const modelConfig = this.adminizer.config.modelFilters?.[modelName];
    
    if (modelConfig) {
      if (modelConfig.enabled !== undefined) {
        return modelConfig.enabled;
      }
      if (modelConfig.useLegacySearch) {
        return false;
      }
    }
    
    return this.isFiltersEnabled();
  }

  /**
   * Проверить нужно ли использовать старый поиск
   */
  shouldUseLegacySearch(modelName: string): boolean {
    const modelConfig = this.adminizer.config.modelFilters?.[modelName];
    
    if (modelConfig?.useLegacySearch) {
      return true;
    }
    
    return !this.isFiltersEnabledForModel(modelName);
  }
}
```

---

## 3.5 FilterController

> **ПАТТЕРН:** Отдельные функции (как в существующих контроллерах)
> **⚠️ ВАЖНО:** НЕ используем parseInt для UUID!

**Файлы:** `src/controllers/filters/` (list.ts, create.ts, update.ts, delete.ts, preview.ts)

```javascript
// ПСЕВДОКОД: Концепция контроллеров, НЕ для копирования!

// КЛЮЧЕВЫЕ МОМЕНТЫ:
// ✅ Функции, а не классы (паттерн проекта)
// ✅ DataAccessor для всех операций
// ✅ Проверка прав через PolicyManager
// ✅ UUID - строка, не число!
// ✅ Валидация условий перед сохранением

// GET /adminizer/filters - список фильтров
async function list(req, res) {
  // Параметры: modelName, page, limit, includeSystem
  // Через DataAccessor (автофильтрация по owner)
  // Возврат: {data: [], meta: {total, page, pages}}
}

// POST /adminizer/filters/preview - временное применение
async function preview(req, res) {
  // Параметры: modelName, conditions, page, limit
  // БЕЗ сохранения в БД!
  // Валидация условий
  // Выполнение через QueryBuilder
}

// POST /adminizer/filters - создать
async function create(req, res) {
  // Валидация + создание через DataAccessor
  // Генерация slug, UUID
  // Возврат созданного фильтра с прямой ссылкой
}

// PATCH /adminizer/filters/:id - обновить
async function update(req, res) {
  // Проверка прав через DataAccessor
  // Обновление данных
}

// DELETE /adminizer/filters/:id - удалить
async function remove(req, res) {
  // Проверка прав
  // Удаление через DataAccessor
}

// GET /adminizer/filter/:id - прямая ссылка (redirect)
async function directLink(req, res) {
  // Redirect на /list/:modelName?filterId=:id
}
```

---
  try {
    const { filterConfig, filterRepository } = req.adminizer.filters;
    
    // Проверить что фильтры включены
    if (!filterConfig.isFiltersEnabled()) {
      return res.status(403).json({
        success: false,
        error: 'Filters are disabled',
        filtersEnabled: false
      });
    }

    const { modelName, pinned, page = '1', limit = '50' } = req.query;

    const result = await filterRepository.findMany(req.user, {
      modelName: modelName as string,
      onlyPinned: pinned === 'true',
      page: Math.max(1, parseInt(page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string) || 50))
    });

    return res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /adminizer/filters/:id
 * 
 * ⚠️ ID - это UUID строка, НЕ число!
 */
export async function get(req: ReqType, res: ResType) {
  try {
    const { filterRepository, filterAccess } = req.adminizer.filters;
    const filterId = req.params.id; // UUID string — НЕ парсим!

    const filter = await filterRepository.findById(filterId, req.user);

    if (!filter) {
      return res.status(404).json({
        success: false,
        error: 'Filter not found'
      });
    }

    // Дополнительная проверка через AccessService
    filterAccess.assertCanView(filter, req.user);

    return res.json({
      success: true,
      data: filter
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /adminizer/filters/preview
 * 
 * Временная фильтрация БЕЗ СОХРАНЕНИЯ
 */
export async function preview(req: ReqType, res: ResType) {
  try {
    const { filterConfig, filterExecution, conditionValidator } = req.adminizer.filters;
    const { modelName, conditions, page = 1, limit = 25, sort, sortDirection } = req.body;

    if (!modelName || !conditions) {
      return res.status(400).json({
        success: false,
        error: 'modelName and conditions are required'
      });
    }

    // Проверка что фильтры включены для модели
    if (!filterConfig.isFiltersEnabledForModel(modelName)) {
      return res.status(403).json({
        success: false,
        error: `Filters are disabled for model ${modelName}`,
        filtersEnabled: false,
        useLegacySearch: true
      });
    }

    // Валидация условий (включая проверку rawSQL)
    const validation = conditionValidator.validate(conditions, modelName, req.user);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filter conditions',
        validation
      });
    }

    // Выполнить временный фильтр
    const result = await filterExecution.executeTemporary(
      modelName,
      validation.sanitizedConditions!,
      { page, limit: Math.min(limit, 100), sort, sortDirection }
    );

    return res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.pages,
        limit
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /adminizer/filters
 * 
 * Создать и сохранить фильтр
 */
export async function create(req: ReqType, res: ResType) {
  try {
    const { filterConfig, filterRepository, conditionValidator } = req.adminizer.filters;
    const {
      name, description, modelName, conditions, columns,
      sortField, sortDirection, visibility, groupIds,
      apiEnabled, icon, color, isPinned
    } = req.body;

    // Валидация обязательных полей
    if (!name || !modelName) {
      return res.status(400).json({
        success: false,
        error: 'name and modelName are required'
      });
    }

    // Проверка что фильтры включены
    if (!filterConfig.isFiltersEnabledForModel(modelName)) {
      return res.status(403).json({
        success: false,
        error: `Filters are disabled for model ${modelName}`,
        filtersEnabled: false
      });
    }

    // Валидация условий
    if (conditions?.length) {
      const validation = conditionValidator.validate(conditions, modelName, req.user);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid filter conditions',
          validation
        });
      }
    }

    // Создать фильтр (с колонками транзакционно)
    const filter = await filterRepository.create(
      {
        name, description, modelName,
        conditions: conditions || [],
        sortField, sortDirection,
        visibility: visibility || 'private',
        groupIds,
        apiEnabled: apiEnabled || false,
        icon, color, isPinned
      },
      columns,
      req.user
    );

    return res.status(201).json({
      success: true,
      data: filter
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PUT /adminizer/filters/:id
 */
export async function update(req: ReqType, res: ResType) {
  try {
    const { filterRepository, filterAccess } = req.adminizer.filters;
    const filterId = req.params.id; // UUID string!
    const { columns, ...filterData } = req.body;

    // Проверка существования и прав
    const existing = await filterRepository.findById(filterId, req.user);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Filter not found' });
    }
    
    filterAccess.assertCanEdit(existing, req.user);

    // Обновить (транзакционно с колонками)
    const filter = await filterRepository.update(
      filterId,
      filterData,
      columns,
      req.user
    );

    return res.json({ success: true, data: filter });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /adminizer/filters/:id
 */
export async function remove(req: ReqType, res: ResType) {
  try {
    const { filterRepository, filterAccess } = req.adminizer.filters;
    const filterId = req.params.id; // UUID string!

    const existing = await filterRepository.findById(filterId, req.user);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Filter not found' });
    }

    filterAccess.assertCanEdit(existing, req.user);

    await filterRepository.delete(filterId, req.user);

    return res.json({ success: true });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /adminizer/filters/:id/count
 * 
 * Получить количество записей (для виджета)
 */
export async function count(req: ReqType, res: ResType) {
  try {
    const { filterRepository, filterExecution, filterAccess } = req.adminizer.filters;
    const filterId = req.params.id;

    const filter = await filterRepository.findById(filterId, req.user);
    if (!filter) {
      return res.status(404).json({ success: false, error: 'Filter not found' });
    }

    filterAccess.assertCanExecute(filter, req.user);

    const count = await filterExecution.count(filter);

    return res.json({ success: true, count });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /adminizer/filter/:id
 * 
 * Прямая ссылка на фильтр — редирект на список
 */
export async function directLink(req: ReqType, res: ResType) {
  try {
    const { filterRepository, filterAccess } = req.adminizer.filters;
    const filterId = req.params.id;

    const filter = await filterRepository.findById(filterId, req.user);
    if (!filter) {
      return res.status(404).json({ success: false, error: 'Filter not found' });
    }

    filterAccess.assertCanView(filter, req.user);

    const prefix = req.adminizer.config.routePrefix;
    return res.redirect(`${prefix}/list/${filter.modelName}?filterId=${filter.id}`);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
}
```

---

## 3.6 Rate Limiting Middleware

> **Безопасность:** Защита от DDoS и brute-force

**Файл:** `src/lib/filters/middleware/filterRateLimit.ts`

```typescript
import rateLimit from 'express-rate-limit';
import { ReqType } from '../../../interfaces/types';

## 3.6 Rate Limiting

> **КОНЦЕПЦИЯ:** Защита от DDoS и спама

```javascript
// ПСЕВДОКОД: Используйте существующий rate limiting middleware проекта

// Критичные endpoints:
// - POST /filters/preview: 30 req/min (тяжелые запросы)
// - POST /filters: 10 req/min (защита от спама)
// - GET /filters/:id/count: 60 req/min (частые запросы от виджетов)
```

---

## 3.7 Маршруты

```javascript
// ПСЕВДОКОД: Добавить в Router.ts

// GET /adminizer/filters - список
// POST /adminizer/filters/preview - применить БЕЗ сохранения
// POST /adminizer/filters - создать
// GET /adminizer/filters/:id - получить один
// PATCH /adminizer/filters/:id - обновить
// DELETE /adminizer/filters/:id - удалить
// GET /adminizer/filters/:id/count - количество результатов
// GET /adminizer/filter/:id - прямая ссылка (redirect)
```

---

## 3.8 Интеграция с UI

> Интеграция с существующим list.ts контроллером

```javascript
// ПСЕВДОКОД: Модификация src/controllers/list.ts

// Добавить параметр ?filterId=uuid
// Если filterId присутствует:
//   1. Загрузить фильтр через DataAccessor
//   2. Применить conditions к NodeTable
//   3. Применить кастомные колонки (если есть)
//   4. Применить сортировку из фильтра
```

---

## 3.9-3.12 Тесты и миграции

> Используйте Vitest (уже настроен в проекте)

**Unit тесты** (90%+ coverage):
- FilterRepository CRUD
- ConditionValidator
- FilterAccessService  
- Slug generation with retry
- Системные фильтры

**Integration тесты**:
- CRUD через API endpoints
- Permissions (owner, shared, groups)
- Rate limiting verification
- Системные фильтры в списке

**E2E тесты**:
- Create filter flow
- Apply filter to list
- Создание системного фильтра

---
  let mockDataAccessor: any;
  let testUser: any;

  beforeEach(() => {
    mockDataAccessor = {
      create: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      process: vi.fn(),
      findOneRaw: vi.fn(),
      transaction: vi.fn((cb) => cb(mockDataAccessor)),
      bulkCreate: vi.fn()
    };
    repository = new FilterRepository(mockDataAccessor);
    testUser = { id: 1, login: 'test', isAdministrator: false };
  });

  describe('create', () => {
    it('should generate UUID for id', async () => {
      mockDataAccessor.create.mockResolvedValue({ id: 'mock-uuid' });
      mockDataAccessor.findOneRaw.mockResolvedValue(null); // slug не занят

      await repository.create({ name: 'Test', modelName: 'User' }, undefined, testUser);

      expect(mockDataAccessor.create).toHaveBeenCalledWith(
        'FilterAP',
        expect.objectContaining({
          id: expect.stringMatching(/^[0-9a-f-]{36}$/), // UUID format
          owner: testUser.id
        }),
        testUser
      );
    });

    it('should use transaction for create with columns', async () => {
      mockDataAccessor.create.mockResolvedValue({ id: 'filter-uuid' });
      mockDataAccessor.findOneRaw.mockResolvedValue(null);

      const columns = [{ fieldName: 'name', isVisible: true }];
      await repository.create({ name: 'Test', modelName: 'User' }, columns, testUser);

      expect(mockDataAccessor.transaction).toHaveBeenCalled();
      expect(mockDataAccessor.bulkCreate).toHaveBeenCalledWith(
        'FilterColumnAP',
        expect.arrayContaining([
          expect.objectContaining({ filterId: 'filter-uuid' })
        ]),
        testUser
      );
    });

    it('should generate slug with retry on collision', async () => {
      // Первый slug занят, второй свободен
      mockDataAccessor.findOneRaw
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null);
      mockDataAccessor.create.mockResolvedValue({ id: 'new-uuid' });

      await repository.create({ name: 'Test Filter', modelName: 'User' }, undefined, testUser);

      // Проверяем что slug содержит timestamp (защита от race condition)
      expect(mockDataAccessor.create).toHaveBeenCalledWith(
        'FilterAP',
        expect.objectContaining({
          slug: expect.stringMatching(/^test-filter-\d+-1$/)
        }),
        testUser
      );
    });
  });

  describe('delete', () => {
    it('should delete columns before filter (transaction)', async () => {
      const callOrder: string[] = [];
      mockDataAccessor.destroy.mockImplementation((model) => {
        callOrder.push(model);
        return Promise.resolve();
      });

      await repository.delete('filter-123', testUser);

      expect(callOrder).toEqual(['FilterColumnAP', 'FilterAP']);
    });
  });
});
```

**Файл:** `test/filters/ConditionValidator.spec.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ConditionValidator } from '../../src/lib/filters/validators/ConditionValidator';

describe('ConditionValidator', () => {
  let validator: ConditionValidator;
  let mockDataAccessor: any;
  let adminUser: any;
  let regularUser: any;

  beforeEach(() => {
    mockDataAccessor = {
      getModelDefinition: vi.fn().mockReturnValue({
        attributes: {
          name: { type: 'string' },
          age: { type: 'integer' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'datetime' }
        }
      })
    };
    validator = new ConditionValidator(mockDataAccessor);
    adminUser = { id: 1, isAdministrator: true };
    regularUser = { id: 2, isAdministrator: false };
  });

  describe('rawSQL protection', () => {
    it('should REJECT rawSQL for non-admin users', () => {
      const conditions = [
        { id: '1', field: 'name', operator: 'eq', value: 'test', rawSQL: 'DROP TABLE users' }
      ];

      const result = validator.validate(conditions, 'User', regularUser);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'RAW_SQL_FORBIDDEN'
        })
      );
    });

    it('should ALLOW rawSQL for admin users with warning', () => {
      const conditions = [
        { id: '1', rawSQL: 'custom_function(field)' }
      ];

      const result = validator.validate(conditions, 'User', adminUser);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('operator validation', () => {
    it('should reject invalid operator for field type', () => {
      const conditions = [
        { id: '1', field: 'isActive', operator: 'like', value: 'test' } // like не для boolean!
      ];

      const result = validator.validate(conditions, 'User', regularUser);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_OPERATOR',
          path: 'conditions[0].operator'
        })
      );
    });

    it('should accept valid operator for field type', () => {
      const conditions = [
        { id: '1', field: 'name', operator: 'like', value: 'John' }
      ];

      const result = validator.validate(conditions, 'User', regularUser);

      expect(result.valid).toBe(true);
    });
  });

  describe('value validation', () => {
    it('should require array for between operator', () => {
      const conditions = [
        { id: '1', field: 'age', operator: 'between', value: 18 } // должен быть массив!
      ];

      const result = validator.validate(conditions, 'User', regularUser);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_VALUE'
        })
      );
    });
  });
});
```

**Файл:** `test/filters/FilterAccessService.spec.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterAccessService, ForbiddenError } from '../../src/lib/filters/services/FilterAccessService';

describe('FilterAccessService', () => {
  let accessService: FilterAccessService;
  let mockAdminizer: any;

  beforeEach(() => {
    mockAdminizer = { log: { warn: vi.fn() } };
    accessService = new FilterAccessService(mockAdminizer);
  });

  describe('canView', () => {
    it('admin can view any filter', () => {
      const filter = { id: '1', owner: 999, visibility: 'private' };
      const admin = { id: 1, isAdministrator: true };

      expect(accessService.canView(filter, admin)).toBe(true);
    });

    it('owner can view own filter', () => {
      const filter = { id: '1', owner: 5, visibility: 'private' };
      const user = { id: 5, isAdministrator: false };

      expect(accessService.canView(filter, user)).toBe(true);
    });

    it('anyone can view public filter', () => {
      const filter = { id: '1', owner: 999, visibility: 'public' };
      const user = { id: 5, isAdministrator: false };

      expect(accessService.canView(filter, user)).toBe(true);
    });

    it('user in group can view group filter', () => {
      const filter = { id: '1', owner: 999, visibility: 'groups', groupIds: [10, 20] };
      const user = { id: 5, isAdministrator: false, groups: [{ id: 20 }] };

      expect(accessService.canView(filter, user)).toBe(true);
    });

    it('user NOT in group cannot view group filter', () => {
      const filter = { id: '1', owner: 999, visibility: 'groups', groupIds: [10, 20] };
      const user = { id: 5, isAdministrator: false, groups: [{ id: 30 }] };

      expect(accessService.canView(filter, user)).toBe(false);
    });
  });

  describe('assertCanEdit', () => {
    it('should throw ForbiddenError and log security event', () => {
      const filter = { id: 'filter-123', owner: 999 };
      const user = { id: 5, login: 'hacker', isAdministrator: false };

      expect(() => accessService.assertCanEdit(filter, user)).toThrow(ForbiddenError);
      expect(mockAdminizer.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] EDIT_DENIED')
      );
    });
  });

  describe('canUseRawSQL', () => {
    it('should return true ONLY for administrators', () => {
      expect(accessService.canUseRawSQL({ isAdministrator: true })).toBe(true);
      expect(accessService.canUseRawSQL({ isAdministrator: false })).toBe(false);
      expect(accessService.canUseRawSQL({ isAdministrator: undefined })).toBe(false);
    });
  });
});
```

---

## 3.10 Integration тесты

**Файл:** `test/filters/FilterController.integration.spec.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupTestApp, teardownTestApp, createTestUser, createTestFilter } from '../setup';

describe('FilterController Integration', () => {
  let app: Express.Application;
  let testUser: { id: number; token: string };
  let adminUser: { id: number; token: string };

  beforeAll(async () => {
    app = await setupTestApp();
    testUser = await createTestUser({ isAdministrator: false });
    adminUser = await createTestUser({ isAdministrator: true });
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('CRUD flow', () => {
    let filterId: string;

    it('should create filter and return UUID', async () => {
      const res = await request(app)
        .post('/adminizer/filters')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'My Filter',
          modelName: 'User',
          conditions: [{ id: '1', field: 'name', operator: 'like', value: 'John' }]
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format!
      expect(res.body.data.slug).toMatch(/^my-filter/);
      
      filterId = res.body.data.id;
    });

    it('should read filter by UUID', async () => {
      const res = await request(app)
        .get(`/adminizer/filters/${filterId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('My Filter');
    });

    it('should update filter', async () => {
      const res = await request(app)
        .put(`/adminizer/filters/${filterId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ name: 'Updated Filter' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Filter');
    });

    it('should delete filter', async () => {
      const res = await request(app)
        .delete(`/adminizer/filters/${filterId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);

      // Verify deleted
      const verify = await request(app)
        .get(`/adminizer/filters/${filterId}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      
      expect(verify.status).toBe(404);
    });
  });

  describe('Access control', () => {
    it('should return 403 for editing other user filter', async () => {
      const filter = await createTestFilter({ owner: adminUser.id });

      const res = await request(app)
        .put(`/adminizer/filters/${filter.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ name: 'Hacked' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for private filter of other user', async () => {
      const filter = await createTestFilter({ 
        owner: adminUser.id, 
        visibility: 'private' 
      });

      const res = await request(app)
        .get(`/adminizer/filters/${filter.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 after exceeding preview limit', async () => {
      // Делаем 31 запрос (лимит 30)
      const requests = Array.from({ length: 31 }, () =>
        request(app)
          .post('/adminizer/filters/preview')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send({ modelName: 'User', conditions: [] })
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(r => r.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);
      expect(tooManyRequests[0].headers['retry-after']).toBeDefined();
    });
  });

  describe('Pagination', () => {
    it('should return paginated results with meta', async () => {
      // Создаём 5 фильтров
      for (let i = 0; i < 5; i++) {
        await createTestFilter({ owner: testUser.id, name: `Filter ${i}` });
      }

      const res = await request(app)
        .get('/adminizer/filters?page=1&limit=2')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta).toMatchObject({
        total: expect.any(Number),
        page: 1,
        limit: 2,
        pages: expect.any(Number)
      });
    });
  });
});
```

---

## ✅ Checklist перед переходом к Фазе 4

### Архитектура (SOLID)
- [ ] `FilterRepository` — только CRUD, транзакции
- [ ] `ConditionValidator` — только валидация
- [ ] `FilterAccessService` — только права доступа
- [ ] `FilterConfigService` — только конфигурация
- [ ] `FilterExecutionService` — только выполнение запросов

### Безопасность
- [ ] rawSQL запрещён для не-админов
- [ ] Rate limiting настроен для preview, create, count
- [ ] Security events логируются

### Функциональность
- [ ] UUID используется для filter.id
- [ ] Транзакции для create/update с columns
- [ ] Slug генерируется с retry (нет race condition)
- [ ] Пагинация в getFilters
- [ ] Прямая ссылка /filter/:id работает

### Тестирование
- [ ] Unit тесты: 90%+ coverage
- [ ] Integration тесты: CRUD flow
- [ ] Integration тесты: Access control
- [ ] Integration тесты: Rate limiting
- [ ] Нет hardcoded значений в assertions

---

## Заметки

_Добавляйте заметки по ходу работы_

---

## 3.12 Миграция и валидация старых фильтров

**Приоритет:** P2  
**Зависимости:** 3.1, 3.2

### Цель

Обеспечить совместимость при изменении схемы модели или формата фильтров.

### Задачи

- [ ] 3.12.1 Определить стратегию миграции
- [ ] 3.12.2 Реализовать валидацию фильтра при загрузке
- [ ] 3.12.3 Автоматическая конвертация deprecated операторов
- [ ] 3.12.4 UI для ручной миграции несовместимых фильтров
- [ ] 3.12.5 Версионирование формата фильтров

### Реализация

**Файл:** `src/helpers/filterMigration.ts`

```typescript
import { FilterAPAttributes, FilterCondition, FILTER_FORMAT_VERSION } from '../models/FilterAP';
import { DataAccessor } from '../lib/DataAccessor';

export interface FilterValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class FilterMigration {
  /**
   * Проверить актуальность фильтра
   */
  static isFilterValid(
    filter: FilterAPAttributes,
    dataAccessor: DataAccessor
  ): FilterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Проверка версии
    if (!filter.version || filter.version < FILTER_FORMAT_VERSION) {
      warnings.push(
        `Outdated filter format version ${filter.version || 0} (current: ${FILTER_FORMAT_VERSION})`
      );
    }
    
    // 2. Проверка существования модели
    const modelDefinition = dataAccessor.getModelDefinition(filter.modelName);
    if (!modelDefinition) {
      errors.push(`Model '${filter.modelName}' no longer exists`);
      return { valid: false, errors, warnings };
    }
    
    // 3. Проверка полей в условиях
    const invalidFields = this.checkFieldsExist(
      filter.conditions,
      modelDefinition,
      dataAccessor
    );
    
    if (invalidFields.length > 0) {
      errors.push(`Invalid fields: ${invalidFields.join(', ')}`);
    }
    
    // 4. Проверка deprecated операторов
    const deprecatedOps = this.checkDeprecatedOperators(filter.conditions);
    if (deprecatedOps.length > 0) {
      warnings.push(`Deprecated operators: ${deprecatedOps.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Автоматическая миграция фильтра
   */
  static migrateFilter(
    filter: FilterAPAttributes
  ): FilterAPAttributes {
    let migrated = { ...filter };
    
    // Применить миграции последовательно
    const currentVersion = filter.version || 0;
    
    for (let v = currentVersion; v < FILTER_FORMAT_VERSION; v++) {
      const migrationFn = FILTER_VERSION_MIGRATIONS[v];
      if (migrationFn) {
        migrated = migrationFn(migrated);
      }
    }
    
    // Обновить версию
    migrated.version = FILTER_FORMAT_VERSION;
    
    return migrated;
  }
  
  /**
   * Проверка существования полей
   */
  private static checkFieldsExist(
    conditions: FilterCondition[],
    modelDefinition: any,
    dataAccessor: DataAccessor,
    invalidFields: Set<string> = new Set()
  ): string[] {
    conditions.forEach(cond => {
      if (cond.children) {
        this.checkFieldsExist(cond.children, modelDefinition, dataAccessor, invalidFields);
      } else {
        // Проверка обычного поля
        if (cond.field && !cond.relation) {
          if (!(cond.field in modelDefinition.attributes)) {
            invalidFields.add(cond.field);
          }
        }
        
        // Проверка поля в связи
        if (cond.relation && cond.relationField) {
          const relationDef = modelDefinition.relations?.[cond.relation];
          if (relationDef) {
            const relatedModel = dataAccessor.getModelDefinition(relationDef.model);
            if (relatedModel && !(cond.relationField in relatedModel.attributes)) {
              invalidFields.add(`${cond.relation}.${cond.relationField}`);
            }
          }
        }
      }
    });
    
    return Array.from(invalidFields);
  }
  
  /**
   * Проверка deprecated операторов
   */
  private static checkDeprecatedOperators(
    conditions: FilterCondition[],
    deprecated: Set<string> = new Set()
  ): string[] {
    // Пример: если какие-то операторы стали deprecated
    const deprecatedOperators = ['old_like', 'legacy_in'];
    
    conditions.forEach(cond => {
      if (cond.children) {
        this.checkDeprecatedOperators(cond.children, deprecated);
      } else if (cond.operator && deprecatedOperators.includes(cond.operator)) {
        deprecated.add(cond.operator);
      }
    });
    
    return Array.from(deprecated);
  }
}

/**
 * Константа текущей версии формата
 */
export const FILTER_FORMAT_VERSION = 1;

/**
 * Маппинг миграций между версиями
 */
export const FILTER_VERSION_MIGRATIONS: Record<number, (filter: any) => any> = {
  // Миграция с версии 0 (без версии) на версию 1
  0: (filter: any) => {
    return {
      ...filter,
      version: 1,
      conditions: migrateConditionsV0toV1(filter.conditions || [])
    };
  }
  
  // Будущие миграции добавлять сюда:
  // 1: (filter: any) => { ... }
};

/**
 * Миграция условий с версии 0 на 1
 */
function migrateConditionsV0toV1(conditions: any[]): FilterCondition[] {
  return conditions.map(cond => {
    // Пример миграции: переименование операторов
    if (cond.operator === 'old_like') {
      cond.operator = 'like';
    }
    
    // Рекурсивная миграция детей
    if (cond.children) {
      cond.children = migrateConditionsV0toV1(cond.children);
    }
    
    return cond;
  });
}
```

### Использование в FilterService

Добавить в `FilterService.ts`:

```typescript
/**
 * Загрузить фильтр с валидацией и миграцией
 */
async getByIdWithValidation(filterId: number): Promise<{
  filter: FilterAP | null;
  validation: FilterValidationResult;
  migrated: boolean;
}> {
  const filter = await this.getById(filterId);
  
  if (!filter) {
    return { filter: null, validation: { valid: false, errors: ['Filter not found'], warnings: [] }, migrated: false };
  }
  
  // Валидация
  const validation = FilterMigration.isFilterValid(
    filter,
    this.adminizer.dataAccessor
  );
  
  let migrated = false;
  
  // Если есть предупреждения о версии - попытка автомиграции
  if (validation.warnings.some(w => w.includes('Outdated filter format'))) {
    try {
      const migratedFilter = FilterMigration.migrateFilter(filter);
      
      // Ревалидация
      const revalidation = FilterMigration.isFilterValid(
        migratedFilter,
        this.adminizer.dataAccessor
      );
      
      if (revalidation.valid) {
        // Сохранить мигрированную версию
        await this.update(filterId, migratedFilter, { isAdministrator: true } as any);
        migrated = true;
        
        console.log(`✓ Filter #${filterId} migrated successfully to version ${FILTER_FORMAT_VERSION}`);
        
        return { 
          filter: await this.getById(filterId), 
          validation: revalidation, 
          migrated: true 
        };
      }
    } catch (error) {
      console.error(`Failed to migrate filter #${filterId}:`, error);
    }
  }
  
  return { filter, validation, migrated };
}
```

### API Endpoint для валидации

Добавить в `FilterController.ts`:

```typescript
/**
 * POST /adminizer/filters/:id/validate
 * Проверить фильтр на ошибки без выполнения
 */
async validate(req: ReqType, res: ResType) {
  try {
    const filterId = parseInt(req.params.id);
    const result = await req.adminizer.filterService.getByIdWithValidation(filterId);
    
    if (!result.filter) {
      return res.status(404).json({
        success: false,
        error: 'Filter not found'
      });
    }
    
    return res.json({
      success: true,
      validation: result.validation,
      migrated: result.migrated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
},

/**
 * POST /adminizer/filters/:id/migrate
 * Принудительная миграция фильтра
 */
async migrate(req: ReqType, res: ResType) {
  try {
    const filterId = parseInt(req.params.id);
    const filter = await req.adminizer.filterService.getById(filterId);
    
    if (!filter) {
      return res.status(404).json({
        success: false,
        error: 'Filter not found'
      });
    }
    
    // Проверка прав
    if (!req.adminizer.filterService.canEdit(filter, req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Миграция
    const migrated = FilterMigration.migrateFilter(filter);
    
    // Валидация после миграции
    const validation = FilterMigration.isFilterValid(
      migrated,
      req.adminizer.dataAccessor
    );
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Filter cannot be migrated automatically',
        validation
      });
    }
    
    // Сохранить
    await req.adminizer.filterService.update(filterId, migrated, req.user);
    
    return res.json({
      success: true,
      data: migrated,
      validation
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

### UI компонент для миграции

**Файл:** `react-app/src/components/FilterMigration/FilterMigrationAlert.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Alert, Button } from '../ui';

interface FilterMigrationAlertProps {
  filterId: number;
  onMigrated?: () => void;
}

export const FilterMigrationAlert: React.FC<FilterMigrationAlertProps> = ({
  filterId,
  onMigrated
}) => {
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    checkValidation();
  }, [filterId]);

  const checkValidation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/adminizer/filters/${filterId}/validate`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setValidation(data.validation);
      }
    } catch (error) {
      console.error('Validation check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const response = await fetch(`/adminizer/filters/${filterId}/migrate`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setValidation(data.validation);
        onMigrated?.();
      } else {
        alert(`Migration failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed');
    } finally {
      setMigrating(false);
    }
  };

  if (loading || !validation) {
    return null;
  }

  // Показать предупреждения
  if (validation.warnings.length > 0) {
    return (
      <Alert variant="warning" className="mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold mb-2">Filter needs migration</h4>
            <ul className="list-disc list-inside space-y-1">
              {validation.warnings.map((warning: string, i: number) => (
                <li key={i} className="text-sm">{warning}</li>
              ))}
            </ul>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMigrate}
            disabled={migrating}
          >
            {migrating ? 'Migrating...' : 'Auto-migrate'}
          </Button>
        </div>
      </Alert>
    );
  }

  // Показать ошибки
  if (!validation.valid) {
    return (
      <Alert variant="error" className="mb-4">
        <h4 className="font-semibold mb-2">Filter has errors</h4>
        <ul className="list-disc list-inside space-y-1">
          {validation.errors.map((error: string, i: number) => (
            <li key={i} className="text-sm">{error}</li>
          ))}
        </ul>
        <p className="text-sm mt-2">
          This filter requires manual fixes. Please edit the filter conditions.
        </p>
      </Alert>
    );
  }

  return null;
};
```

### Тесты

```typescript
// tests/helpers/filterMigration.test.ts

describe('FilterMigration', () => {
  describe('isFilterValid', () => {
    it('should validate filter with current version', () => {
      const filter: FilterAPAttributes = {
        id: 1,
        version: FILTER_FORMAT_VERSION,
        modelName: 'User',
        conditions: [
          { id: '1', field: 'name', operator: 'eq', value: 'John' }
        ]
        // ... other fields
      };
      
      const result = FilterMigration.isFilterValid(filter, dataAccessor);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect outdated version', () => {
      const filter: FilterAPAttributes = {
        id: 1,
        version: 0,
        modelName: 'User',
        conditions: []
      };
      
      const result = FilterMigration.isFilterValid(filter, dataAccessor);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Outdated filter format');
    });
    
    it('should detect non-existent model', () => {
      const filter: FilterAPAttributes = {
        id: 1,
        version: 1,
        modelName: 'NonExistentModel',
        conditions: []
      };
      
      const result = FilterMigration.isFilterValid(filter, dataAccessor);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Model \'NonExistentModel\' no longer exists');
    });
    
    it('should detect invalid fields', () => {
      const filter: FilterAPAttributes = {
        id: 1,
        version: 1,
        modelName: 'User',
        conditions: [
          { id: '1', field: 'nonExistentField', operator: 'eq', value: 'test' }
        ]
      };
      
      const result = FilterMigration.isFilterValid(filter, dataAccessor);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid fields: nonExistentField');
    });
  });
  
  describe('migrateFilter', () => {
    it('should migrate from version 0 to current', () => {
      const oldFilter: any = {
        id: 1,
        version: 0,
        modelName: 'User',
        conditions: [
          { id: '1', field: 'name', operator: 'old_like', value: 'John' }
        ]
      };
      
      const migrated = FilterMigration.migrateFilter(oldFilter);
      
      expect(migrated.version).toBe(FILTER_FORMAT_VERSION);
      expect(migrated.conditions[0].operator).toBe('like');
    });
  });
});
```

---

## Checklist задачи 3.12

- [ ] Реализовать `FilterMigration` класс
- [ ] Добавить константы версионирования
- [ ] Реализовать `FILTER_VERSION_MIGRATIONS`
- [ ] Добавить `getByIdWithValidation` в FilterRepository
- [ ] Добавить API endpoints для валидации и миграции
- [ ] Создать UI компонент `FilterMigrationAlert`
- [ ] Написать тесты
- [ ] Документировать процесс миграции

---

## 📋 ИТОГОВАЯ СВОДКА ИСПРАВЛЕНИЙ

> По результатам архитектурного ревью были внесены следующие улучшения:

| # | Проблема | Решение | Статус |
|---|----------|---------|--------|
| 1 | Монолитный FilterService (God Object) | Разделён на FilterRepository, FilterAccessService, ConditionValidator, FilterConfigService | ✅ |
| 2 | Race condition в generateSlug() | Slug с timestamp + retry mechanism | ✅ |
| 3 | SQL Injection через rawSQL | Запрещён для не-админов в ConditionValidator | ✅ |
| 4 | Отсутствие Rate Limiting | Добавлен middleware для preview, create, count | ✅ |
| 5 | parseInt для UUID | Используем req.params.id напрямую | ✅ |
| 6 | Дублирование проверок прав | Централизовано в FilterAccessService | ✅ |
| 7 | Нет пагинации в getFilters | Добавлена пагинация с meta | ✅ |
| 8 | Хрупкие тесты (hardcoded values) | Используем regex patterns и expect.any() | ✅ |
| 9 | Нет транзакций для create+columns | Транзакции в FilterRepository | ✅ |
| 10 | Нет валидации conditions | Добавлен ConditionValidator | ✅ |

---

**После завершения Фазы 3** все фильтры будут защищены от breaking changes в схеме моделей.
