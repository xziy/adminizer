# Фаза 2: Query Builder и замена NodeTable

**Приоритет:** P0 (критично)
**Зависимости:** Фаза 1
**Статус:** `[ ]` Не начато

> **💡 ПСЕВДОКОД:** Все примеры кода в этой фазе — **ПСЕВДОКОД в стиле JavaScript**. Не копируйте буквально! Адаптируйте под реальную архитектуру проекта.

> **⚠️ Примечание для агента:** Весь код в этой фазе - **ПРИМЕРЫ** для понимания архитектуры. Реализуйте творчески, используя существующий `NodeTable` как reference. НЕ создавайте markdown файлы с резюме изменений.

---

## Цель

Заменить устаревший `NodeTable` (jQuery DataTables legacy) на современный `ModernQueryBuilder` с поддержкой новой системы фильтров, создать систему построения сложных WHERE-условий с поддержкой вложенных AND/OR групп и фильтрации по связям.

---

## Задачи

### Блок A: Трансформация архитектуры (критично - выполнять первым)

- [ ] 2.1 Создать ModernQueryBuilder класс
- [ ] 2.2 Рефакторинг list.ts контроллера
- [ ] 2.3 Интеграция ModernQueryBuilder с FilterService
- [ ] 2.4 Удалить устаревший NodeTable

### Блок B: Query Builder функциональность

- [ ] 2.5 Реализовать маппинг операторов
- [ ] 2.6 Добавить поддержку AND/OR/NOT группировки
- [ ] 2.7 Добавить поддержку связей (relations)
- [ ] 2.8 Валидация условий
- [ ] 2.9 React компонент FilterBuilder
- [ ] 2.10 Unit тесты (90%+ coverage)
  - [ ] 2.10.1 ModernQueryBuilder.buildWhere()
  - [ ] 2.10.2 ModernQueryBuilder.buildConditionGroup()
  - [ ] 2.10.3 ModernQueryBuilder.buildSingleCondition()
  - [ ] 2.10.4 Все операторы (eq, ne, gt, gte, lt, lte, like, in, between, null, custom)
  - [ ] 2.10.5 Группировка AND/OR/NOT
  - [ ] 2.10.6 CustomFieldHandler интеграция
- [ ] 2.11 Integration тесты
  - [ ] 2.11.1 ModernQueryBuilder + DataAccessor (PostgreSQL)
  - [ ] 2.11.2 ModernQueryBuilder + DataAccessor (MySQL)
  - [ ] 2.11.3 ModernQueryBuilder + Waterline
  - [ ] 2.11.4 Связи (relations) через модели
  - [ ] 2.11.5 CustomFieldHandler с реальной БД
  - [ ] 2.11.6 Fallback на legacy search когда фильтры отключены
  - [ ] 2.11.7 list.ts с filtersEnabled=false (глобально)
  - [ ] 2.11.8 list.ts с filtersEnabled=false для конкретной модели
  - [ ] 2.11.9 Игнорирование filterSlug когда фильтры отключены
- [ ] 2.12 Performance тесты
  - [ ] 2.12.1 1000 записей < 100ms
  - [ ] 2.12.2 10k записей < 500ms
  - [ ] 2.12.3 100k записей < 2s
- [ ] 2.13 Security тесты (P0)
  - [ ] 2.13.1 SQL Injection prevention
  - [ ] 2.13.2 NoSQL Injection prevention
  - [ ] 2.13.3 Field access control
- [ ] 2.14 UI тесты для filtersEnabled флага (Playwright)
  - [ ] 2.14.1 Кнопка "Create Filter" скрыта когда filtersEnabled=false
  - [ ] 2.14.2 Legacy search input показывается когда useLegacySearch=true
  - [ ] 2.14.3 FilterDropdown скрыт когда filtersEnabled=false
  - [ ] 2.14.4 Переключение между моделями с разными настройками

---

## 2.1 Создать ModernQueryBuilder класс

**Приоритет:** P0 (критично - блокирует всю Phase 2)
**Время:** 2 дня
**Зависимости:** Phase 1 (FilterAP модель)

### Цель

Создать современный query builder для замены устаревшего NodeTable:
- ✅ Promise-based API (без callbacks)
- ✅ Чистый интерфейс без DataTables.js формата
- ✅ Прямая интеграция с FilterCondition
- ✅ Поддержка CustomFieldHandler
- ✅ Типобезопасность с TypeScript

### Анализ текущей ситуации

**Проблемы NodeTable (263 строки):**
- ❌ Callback-based: `output(callback: (err, data) => void)`
- ❌ DataTables.js формат (jQuery legacy, больше не используется)
- ❌ Сложный парсинг индексов колонок
- ❌ Жесткий switch-case для типов полей
- ❌ Не поддерживает операторы из ТЗ (gt, between, in, custom)
- ❌ Не работает с JSON полями (phone.number)
- ❌ Нет тестов

**Факты:**
- Фронтенд мигрирован на `@tanstack/react-table` (React)
- NodeTable используется только в 1 месте: `src/controllers/list.ts:93`
- DataTables.js нигде не используется

### Реализация

**Файл:** `src/lib/query-builder/ModernQueryBuilder.ts`

```typescript
/**
 * Современный интерфейс параметров запроса
 * Заменяет DataTables.js legacy формат
 */
export interface QueryParams {
  page: number;
  limit: number;
  sort?: string;
  sortDirection?: 'ASC' | 'DESC';
  filters?: FilterCondition[];
  globalSearch?: string;
  fields?: string[];
}

export interface QueryResult<T = any> {
  data: T[];
  total: number;
  filtered: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Современный Query Builder - заменяет NodeTable
 */
export class ModernQueryBuilder {
  constructor(
    private model: AbstractModel<any>,
    private fields: Fields,
    private dataAccessor: DataAccessor
  ) {}
  
  /**
   * Выполнить запрос (Promise API - без callbacks!)
   */
  async execute(params: QueryParams): Promise<QueryResult> {
    const whereClause = await this.buildWhere(params);
    const orderClause = this.buildOrder(params);
    const offset = (params.page - 1) * params.limit;
    
    // Запрос данных + подсчет
    const [data, total, filtered] = await Promise.all([
      this.dataAccessor.find(this.model.tableName, {
        where: whereClause,
        order: orderClause,
        limit: params.limit,
        skip: offset
      }),
      this.dataAccessor.count(this.model.tableName, {}),
      this.dataAccessor.count(this.model.tableName, { where: whereClause })
    ]);
    
    return {
      data: this.mapData(data),
      total,
      filtered,
      page: params.page,
      limit: params.limit,
      pages: Math.ceil(filtered / params.limit)
    };
  }
  
  /**
   * Построить WHERE из FilterCondition[]
   * Поддерживает вложенные AND/OR/NOT группы
   */
  private async buildWhere(params: QueryParams): Promise<any> {
    const conditions: any[] = [];
    
    // Фильтры из FilterCondition
    if (params.filters?.length > 0) {
      conditions.push(this.buildConditionGroup(params.filters, 'AND'));
    }
    
    // Глобальный поиск (для совместимости)
    if (params.globalSearch) {
      conditions.push(this.buildGlobalSearch(params.globalSearch));
    }
    
    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0];
    return { AND: conditions };
  }
  
  /**
   * Рекурсивное построение группы условий
   * Ключевой метод для поддержки сложных фильтров
   */
  private buildConditionGroup(
    conditions: FilterCondition[],
    logic: 'AND' | 'OR' = 'AND'
  ): Record<string, any> {
    const clauses = conditions
      .filter(cond => this.isValidCondition(cond))
      .map(cond => {
        // Рекурсия для вложенных групп
        if (cond.children?.length > 0) {
          return this.buildConditionGroup(cond.children, cond.logic || 'AND');
        }
        
        // Простое условие
        return this.buildSingleCondition(cond);
      });
    
    if (clauses.length === 0) return {};
    if (clauses.length === 1) return clauses[0];
    
    // NOT оператор
    if (logic === 'NOT') {
      if (clauses.length !== 1) {
        throw new Error('NOT operator requires exactly one condition');
      }
      return { not: clauses[0] };
    }
    
    return logic === 'OR' ? { or: clauses } : { and: clauses };
  }
  
  /**
   * Построение одного условия
   */
  private buildSingleCondition(cond: FilterCondition): Record<string, any> {
    const { field, operator, value, relation, relationField } = cond;
    
    // Условие по связи
    if (relation && relationField) {
      return this.buildRelationCondition(cond);
    }
    
    // Маппинг оператора в формат ORM
    const condition = this.mapOperatorToCondition(operator, value);
    return { [field]: condition };
  }
  
  /**
   * Маппинг операторов фильтра в формат ORM
   */
  private mapOperatorToCondition(operator: FilterOperator, value: any): any {
    // Примеры основных операторов:
    switch (operator) {
      case 'eq': return value;
      case 'neq': return { '!=': value };
      case 'gt': return { '>': value };
      case 'gte': return { '>=': value };
      case 'lt': return { '<': value };
      case 'lte': return { '<=': value };
      case 'like': return { contains: value };
      case 'in': return { in: value };
      case 'between': return { '>=': value[0], '<=': value[1] };
      case 'isNull': return null;
      case 'isNotNull': return { '!=': null };
      // ... остальные операторы (см. Phase 1 для полного списка)
    }
  }
  
  // ... остальные методы (buildOrder, buildGlobalSearch, mapData, etc.)
}
```

**Примечание:** Полный код содержит дополнительные методы для:
- Custom field handlers (JSON поля)
- Валидация безопасности (глубина вложенности, SQL injection)
- Связи (relations)
- Все операторы из Phase 1

См. существующий `src/lib/datatable/NodeTable.ts` для reference по маппингу полей.
    
    return {
      data: mappedData,
      total: totalCount,
      filtered: filteredCount,
      page: params.page,
      limit: params.limit,
      pages: Math.ceil(filteredCount / params.limit)
    };
  }
  
  /**
   * Построить WHERE условия из FilterCondition[]
   * Поддерживает вложенные AND/OR/NOT группы
   */
  private async buildWhere(params: QueryParams): Promise<any> {
    const conditions: any[] = [];
    
    // 1. Фильтры из FilterCondition
    if (params.filters && params.filters.length > 0) {
      conditions.push(
        this.buildConditionGroup(params.filters, 'AND')
      );
    }
    
    // 2. Глобальный поиск (для совместимости)
    if (params.globalSearch) {
      const searchConditions = this.buildGlobalSearch(params.globalSearch);
      if (searchConditions) {
        conditions.push(searchConditions);
      }
    }
    
    // Объединить через AND
    if (conditions.length === 0) {
      return {};
    }
    
    if (conditions.length === 1) {
      return conditions[0];
    }
    
    return { AND: conditions };
  }
  
  /**
   * Рекурсивное построение группы условий
   * Ключевой метод для поддержки сложных фильтров
 */
private buildWhereFromConditions(
  conditions: FilterCondition[],
  logic: 'AND' | 'OR' = 'AND'
): Record<string, any> {
  const clauses = conditions
    .filter(cond => this.isValidCondition(cond))
    .map(cond => {
      // Если есть вложенные условия - рекурсия
      if (cond.children && cond.children.length > 0) {
        return this.buildWhereFromConditions(
          cond.children,
          cond.logic || 'AND'
        );
      }

      // Простое условие
      return this.buildSingleCondition(cond);
    });

  if (clauses.length === 0) {
    return {};
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  // Объединение по логике AND/OR/NOT
  if (logic === 'NOT') {
    if (clauses.length !== 1) {
      throw new Error('NOT operator requires exactly one condition');
    }
    return { not: clauses[0] };
  }
  
  return logic === 'OR'
    ? { or: clauses }
    : { and: clauses };
}

/**
 * Проверка валидности условия
 */
private isValidCondition(cond: FilterCondition): boolean {
  // Группа с детьми
  if (cond.children && cond.children.length > 0) {
    return true;
  }

  // Обычное условие
  if (!cond.field || !cond.operator) {
    return false;
  }

  // isNull/isNotNull не требуют value
  if (cond.operator === 'isNull' || cond.operator === 'isNotNull') {
    return true;
  }

  // Остальные требуют value
  return cond.value !== undefined && cond.value !== '';
}

/**
 * Построение одного условия
 */
private buildSingleCondition(cond: FilterCondition): Record<string, any> {
  const { field, operator, value, relation, relationField } = cond;

  // Условие по связи
  if (relation && relationField) {
    return this.buildRelationCondition(cond);
  }

  // Маппинг оператора в формат ORM
  const condition = this.mapOperatorToCondition(operator, value);

  return { [field]: condition };
}

/**
 * Маппинг операторов фильтра в формат ORM
 */
private mapOperatorToCondition(
  operator: FilterOperator,
  value: any
): any {
  switch (operator) {
    case 'eq':
      return value;

    case 'neq':
      return { '!=': value };

    case 'gt':
      return { '>': value };

    case 'gte':
      return { '>=': value };

    case 'lt':
      return { '<': value };

    case 'lte':
      return { '<=': value };

    case 'like':
      return { contains: value };

    case 'ilike':
      // Для Postgres - нативный ILIKE
      if (this.dataAccessor?.getDialect?.() === 'postgres') {
        return { ilike: `%${value}%` };
      }
      // Для других - эмуляция через lower()
      return { contains: String(value).toLowerCase() };

    case 'startsWith':
      return { startsWith: value };

    case 'endsWith':
      return { endsWith: value };

    case 'regex':
      // PostgreSQL/MySQL regex
      if (this.dataAccessor?.getDialect?.() === 'postgres') {
        return { regexp: value };
      }
      // Для других СУБД может потребоваться кастомная реализация
      return { regexp: value };

    case 'in':
      return { in: Array.isArray(value) ? value : [value] };

    case 'notIn':
      return { '!': Array.isArray(value) ? value : [value] };

    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return { '>=': value[0], '<=': value[1] };
      }
      return value;

    case 'isNull':
      return null;

    case 'isNotNull':
      return { '!=': null };

    case 'custom':
      // Обработка кастомных условий - делегируется ConditionRegistry
      return this.handleCustomCondition(value);

    default:
      return value;
  }
}

/**
 * Построение условия по связи
 */
private buildRelationCondition(cond: FilterCondition): Record<string, any> {
  const { relation, relationField, operator, value } = cond;

  // Формат зависит от ORM адаптера
  // Для Sequelize: используем include с where
  // Для Waterline: используем populate с criteria

  return {
    _relation: {
      name: relation,
      field: relationField,
      condition: this.mapOperatorToCondition(operator, value)
    }
  };
}

/**
 * Обработка кастомного условия
 */
private handleCustomCondition(cond: FilterCondition): any {
  // 1. Проверяем rawSQL (высший приоритет - максимальная гибкость)
  if (cond.rawSQL) {
    return {
      __rawSQL: {
        sql: cond.rawSQL,
        params: cond.rawSQLParams || []
      }
    };
  }
  
  // 2. Проверяем кастомный обработчик поля
  if (cond.customHandler) {
    const handler = CustomFieldHandler.get(cond.customHandler);
    
    if (handler) {
      const dialect = this.dataAccessor?.getDialect?.() || 'waterline';
      const condition = handler.buildCondition(
        cond.operator,
        cond.value,
        dialect,
        cond.customHandlerParams
      );
      
      // Если вернулся rawSQL
      if (condition.rawSQL) {
        return {
          __rawSQL: {
            sql: condition.rawSQL,
            params: condition.params || []
          }
        };
      }
      
      // Если вернулась in-memory функция
      if (condition.inMemory) {
        return {
          __inMemory: condition.inMemory
        };
      }
      
      return condition;
    }
  }
  
  // 3. Fallback - делегируем в ConditionRegistry (Фаза 12)
  if (cond.value && cond.value.__custom) {
    // return this.conditionRegistry.buildCondition(cond.value.__custom, cond.value);
  }

  return {};
}
```

---

## 2.2 Адаптация для Sequelize

**Файл:** `src/lib/model/adapter/sequelize.ts`

Добавить обработку `_relation` условий:

```typescript
/**
 * Конвертация условий с relations в Sequelize формат
 */
private convertConditionsWithRelations(
  where: Record<string, any>,
  model: ModelStatic<any>
): { where: WhereOptions; include: Includeable[] } {
  const includes: Includeable[] = [];
  const cleanWhere: Record<string, any> = {};

  for (const [key, value] of Object.entries(where)) {
    if (key === 'and' || key === 'or') {
      // Рекурсивно обработать вложенные условия
      const nested = (value as any[]).map(v =>
        this.convertConditionsWithRelations(v, model)
      );

      cleanWhere[key === 'or' ? Op.or : Op.and] = nested.map(n => n.where);
      nested.forEach(n => includes.push(...n.include));
    } else if (value && value._relation) {
      // Условие по связи
      const rel = value._relation;
      const association = model.associations[rel.name];

      if (association) {
        includes.push({
          association: rel.name,
          where: {
            [rel.field]: this._convertCriteriaToSequelize({
              [rel.field]: rel.condition
            })[rel.field]
          },
          required: true
        });
      }
    } else {
      cleanWhere[key] = this._convertSingleCriteria(key, value);
    }
  }

  return { where: cleanWhere, include: includes };
}
```

---

## 2.3 Валидация условий

**Файл:** `src/lib/filters/ConditionValidator.ts`

```typescript
import { FilterCondition, FilterOperator } from '../models/FilterAP';
import { FieldConfig } from '../interfaces/adminpanelConfig';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  conditionId: string;
  field: string;
  message: string;
}

export class ConditionValidator {
  constructor(private fieldsConfig: Record<string, FieldConfig>) {}

  /**
   * Валидация массива условий
   */
  validate(conditions: FilterCondition[]): ValidationResult {
    const errors: ValidationError[] = [];

    for (const condition of conditions) {
      this.validateCondition(condition, errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateCondition(
    condition: FilterCondition,
    errors: ValidationError[]
  ): void {
    // Группа с детьми
    if (condition.children && condition.children.length > 0) {
      for (const child of condition.children) {
        this.validateCondition(child, errors);
      }
      return;
    }

    // Проверка поля
    if (!condition.field) {
      errors.push({
        conditionId: condition.id,
        field: '',
        message: 'Field is required'
      });
      return;
    }

    const fieldConfig = this.fieldsConfig[condition.field];
    if (!fieldConfig) {
      errors.push({
        conditionId: condition.id,
        field: condition.field,
        message: `Unknown field: ${condition.field}`
      });
      return;
    }

    // Проверка оператора для типа поля
    if (!this.isOperatorValidForType(condition.operator, fieldConfig.type)) {
      errors.push({
        conditionId: condition.id,
        field: condition.field,
        message: `Operator '${condition.operator}' is not valid for field type '${fieldConfig.type}'`
      });
    }

    // Проверка значения
    const valueError = this.validateValue(
      condition.value,
      condition.operator,
      fieldConfig
    );
    if (valueError) {
      errors.push({
        conditionId: condition.id,
        field: condition.field,
        message: valueError
      });
    }
  }

  private isOperatorValidForType(
    operator: FilterOperator,
    fieldType: string
  ): boolean {
    const operatorsByType: Record<string, FilterOperator[]> = {
      string: ['eq', 'neq', 'like', 'startsWith', 'endsWith', 'in', 'notIn', 'isNull', 'isNotNull'],
      text: ['eq', 'neq', 'like', 'startsWith', 'endsWith', 'isNull', 'isNotNull'],
      number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
      integer: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
      float: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
      boolean: ['eq', 'neq', 'isNull', 'isNotNull'],
      date: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'],
      datetime: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'],
      select: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
      json: ['isNull', 'isNotNull', 'custom']
    };

    const allowed = operatorsByType[fieldType] || operatorsByType.string;
    return allowed.includes(operator);
  }

  private validateValue(
    value: any,
    operator: FilterOperator,
    fieldConfig: FieldConfig
  ): string | null {
    // isNull/isNotNull не требуют значения
    if (operator === 'isNull' || operator === 'isNotNull') {
      return null;
    }

    if (value === undefined || value === null || value === '') {
      return 'Value is required';
    }

    // between требует массив из 2 элементов
    if (operator === 'between') {
      if (!Array.isArray(value) || value.length !== 2) {
        return 'Between requires array of 2 values';
      }
    }

    // in/notIn требуют массив
    if (operator === 'in' || operator === 'notIn') {
      if (!Array.isArray(value)) {
        return 'IN/NOT IN requires array of values';
      }
    }

    return null;
  }
}
```

---

## 2.4 React компонент FilterBuilder

**Файл:** `react-app/src/components/FilterBuilder/FilterBuilder.tsx`

```tsx
export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  logic?: 'AND' | 'OR';
  children?: FilterCondition[];
  relation?: string;
  relationField?: string;
}

export interface FieldOption {
  name: string;
  type: string;
  title: string;
  options?: Record<string, string>;
  relation?: string;
}

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  fields,
  relations = [],
  initialConditions = [],
  onChange,
  maxDepth = 3
}) => {
  const [conditions, setConditions] = useState<FilterCondition[]>(
    initialConditions.length > 0 ? initialConditions : [createEmptyCondition(fields[0]?.name)]
  );
  
  // Обработчики добавления/удаления/обновления условий
  const addCondition = () => { /* ... */ };
  const addGroup = (logic: 'AND' | 'OR') => { /* ... */ };
  const updateCondition = (id: string, updates: Partial<FilterCondition>) => { /* ... */ };
  const removeCondition = (id: string) => { /* ... */ };
  
  return (
    <div className="filter-builder">
      <div className="conditions-list">
        {conditions.map((condition, index) => (
          <React.Fragment key={condition.id}>
            {index > 0 && <div className="logic-operator">AND</div>}
            
            {condition.children ? (
              <FilterGroup
                condition={condition}
                fields={fields}
                relations={relations}
                onUpdate={(updates) => updateCondition(condition.id, updates)}
                onRemove={() => removeCondition(condition.id)}
              />
            ) : (
              <FilterConditionRow
                condition={condition}
                fields={fields}
                relations={relations}
                onUpdate={(updates) => updateCondition(condition.id, updates)}
                onRemove={() => removeCondition(condition.id)}
                canRemove={conditions.length > 1}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      
      <div className="filter-actions">
        <button onClick={addCondition}>+ Add Condition</button>
        <button onClick={() => addGroup('AND')}>+ AND Group</button>
        <button onClick={() => addGroup('OR')}>+ OR Group</button>
      </div>
    </div>
  );
};
```

**Примечание:** Полная реализация включает:
- Рекурсивные компоненты для вложенных групп
- Drag-and-drop для переупорядочивания
- Валидация перед отправкой
- Сохранение состояния в localStorage

См. существующие React компоненты в `react-app/src/components/` для стилизации.
      ? initialConditions
      : [createEmptyCondition(fields[0]?.name)]
  );

  const updateConditions = useCallback((newConditions: FilterCondition[]) => {
    setConditions(newConditions);
    onChange(newConditions);
  }, [onChange]);

  const addCondition = () => {
    updateConditions([
      ...conditions,
      createEmptyCondition(fields[0]?.name)
    ]);
  };

  const addGroup = (logic: 'AND' | 'OR') => {
    updateConditions([
      ...conditions,
      {
        id: uuid(),
        field: '',
        operator: 'eq',
        value: '',
        logic,
        children: [createEmptyCondition(fields[0]?.name)]
      }
    ]);
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    updateConditions(
      updateConditionRecursive(conditions, id, updates)
    );
  };

  const removeCondition = (id: string) => {
    updateConditions(
      removeConditionRecursive(conditions, id)
    );
  };

  const addChildCondition = (parentId: string) => {
    updateConditions(
      addChildRecursive(conditions, parentId, fields[0]?.name)
    );
  };

  return (
    <div className="filter-builder">
      <div className="filter-conditions space-y-2">
        {conditions.map((condition, index) => (
          <React.Fragment key={condition.id}>
            {index > 0 && (
              <div className="filter-logic-separator text-sm text-gray-500 py-1">
                AND
              </div>
            )}

            {condition.children ? (
              <FilterGroup
                condition={condition}
                fields={fields}
                relations={relations}
                depth={0}
                maxDepth={maxDepth}
                onUpdate={(updates) => updateCondition(condition.id, updates)}
                onRemove={() => removeCondition(condition.id)}
                onAddChild={() => addChildCondition(condition.id)}
              />
            ) : (
              <FilterConditionRow
                condition={condition}
                fields={fields}
                relations={relations}
                onUpdate={(updates) => updateCondition(condition.id, updates)}
                onRemove={() => removeCondition(condition.id)}
                canRemove={conditions.length > 1}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="filter-actions mt-4 flex gap-2">
        <button
          type="button"
          onClick={addCondition}
          className="btn btn-outline btn-sm"
        >
          + Add Condition
        </button>
        <button
          type="button"
          onClick={() => addGroup('AND')}
          className="btn btn-outline btn-sm"
        >
          + AND Group
        </button>
        <button
          type="button"
          onClick={() => addGroup('OR')}
          className="btn btn-outline btn-sm"
        >
          + OR Group
        </button>
      </div>
    </div>
  );
};

// Вспомогательные функции
function createEmptyCondition(defaultField: string): FilterCondition {
  return {
    id: uuid(),
    field: defaultField || '',
    operator: 'eq',
    value: ''
  };
}

function updateConditionRecursive(
  conditions: FilterCondition[],
  id: string,
  updates: Partial<FilterCondition>
): FilterCondition[] {
  return conditions.map(cond => {
    if (cond.id === id) {
      return { ...cond, ...updates };
    }
    if (cond.children) {
      return {
        ...cond,
        children: updateConditionRecursive(cond.children, id, updates)
      };
    }
    return cond;
  });
}

function removeConditionRecursive(
  conditions: FilterCondition[],
  id: string
): FilterCondition[] {
  return conditions
    .filter(cond => cond.id !== id)
    .map(cond => {
      if (cond.children) {
        return {
          ...cond,
          children: removeConditionRecursive(cond.children, id)
        };
      }
      return cond;
    });
}

function addChildRecursive(
  conditions: FilterCondition[],
  parentId: string,
  defaultField: string
): FilterCondition[] {
  return conditions.map(cond => {
    if (cond.id === parentId && cond.children) {
      return {
        ...cond,
        children: [...cond.children, createEmptyCondition(defaultField)]
      };
    }
    if (cond.children) {
      return {
        ...cond,
        children: addChildRecursive(cond.children, parentId, defaultField)
      };
    }
    return cond;
  });
}
```

---

## 2.5 FilterConditionRow компонент

**Файл:** `react-app/src/components/FilterBuilder/FilterConditionRow.tsx`

```tsx
import React from 'react';
import { FilterCondition, FieldOption } from './FilterBuilder';
import { OperatorSelect } from './OperatorSelect';
import { ValueInput } from './ValueInput';

interface FilterConditionRowProps {
  condition: FilterCondition;
  fields: FieldOption[];
  relations?: { name: string; model: string; fields: FieldOption[] }[];
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const FilterConditionRow: React.FC<FilterConditionRowProps> = ({
  condition,
  fields,
  relations = [],
  onUpdate,
  onRemove,
  canRemove
}) => {
  const selectedField = fields.find(f => f.name === condition.field);

  // Если выбрана связь, показать поля связанной модели
  const isRelation = condition.relation != null;
  const relationConfig = relations.find(r => r.name === condition.relation);

  const handleFieldChange = (fieldName: string) => {
    // Проверяем, это связь или обычное поле
    const relation = relations.find(r => r.name === fieldName);

    if (relation) {
      onUpdate({
        field: '',
        relation: fieldName,
        relationField: relation.fields[0]?.name || '',
        operator: 'eq',
        value: ''
      });
    } else {
      onUpdate({
        field: fieldName,
        relation: undefined,
        relationField: undefined,
        operator: 'eq',
        value: ''
      });
    }
  };

  return (
    <div className="filter-condition-row flex items-center gap-2 p-2 bg-gray-50 rounded">
      {/* Field Select */}
      <select
        value={isRelation ? condition.relation : condition.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="select select-bordered select-sm w-40"
      >
        <optgroup label="Fields">
          {fields.map(field => (
            <option key={field.name} value={field.name}>
              {field.title}
            </option>
          ))}
        </optgroup>

        {relations.length > 0 && (
          <optgroup label="Relations">
            {relations.map(rel => (
              <option key={rel.name} value={rel.name}>
                {rel.name} →
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* Relation Field Select (если выбрана связь) */}
      {isRelation && relationConfig && (
        <select
          value={condition.relationField || ''}
          onChange={(e) => onUpdate({ relationField: e.target.value })}
          className="select select-bordered select-sm w-32"
        >
          {relationConfig.fields.map(field => (
            <option key={field.name} value={field.name}>
              {field.title}
            </option>
          ))}
        </select>
      )}

      {/* Operator Select */}
      <OperatorSelect
        value={condition.operator}
        fieldType={selectedField?.type || 'string'}
        onChange={(operator) => onUpdate({ operator })}
      />

      {/* Value Input */}
      {condition.operator !== 'isNull' && condition.operator !== 'isNotNull' && (
        <ValueInput
          value={condition.value}
          operator={condition.operator}
          fieldConfig={selectedField}
          onChange={(value) => onUpdate({ value })}
        />
      )}

      {/* Remove Button */}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="btn btn-ghost btn-sm btn-circle"
          title="Remove condition"
        >
          ✕
        </button>
      )}
    </div>
  );
};
```

---

## Тесты

**Ключевые тест-кейсы (см. секцию 2.10-2.14 для полного списка):**

```typescript
// tests/lib/ModernQueryBuilder.test.ts
describe('ModernQueryBuilder', () => {
  it('should handle simple equality condition', () => {
    // { field: 'status', operator: 'eq', value: 'active' }
    // => { status: 'active' }
  });
  
  it('should handle AND/OR groups', () => {
    // Вложенные группы с logic: 'AND' | 'OR'
  });
  
  it('should handle all operators', () => {
    // eq, neq, gt, gte, lt, lte, like, in, between, isNull, etc.
  });
  
  it('should handle relations', () => {
    // relation: 'category', relationField: 'name'
  });
  
  it('should prevent SQL injection', () => {
    // Валидация и санитизация значений
  });
});
```

**Примечание:** Полные тесты с 90%+ coverage см. в секциях 2.10-2.14. Реализация должна покрывать все операторы из Phase 1.

---

## 2.9 CustomFieldHandler для сложных полей

**Цель:** Поддержка JSON полей, вычисляемых полей, rawSQL

```typescript
// src/lib/filter-conditions/CustomFieldHandler.ts
export interface CustomFieldHandlerDefinition {
  name: string;
  description: string;
  buildCondition: (operator: string, value: any, dialect: string) => CustomFieldCondition;
  validate?: (value: any) => { valid: boolean; error?: string };
}

export class CustomFieldHandler {
  private static handlers = new Map<string, CustomFieldHandlerDefinition>();
  
  static register(id: string, handler: CustomFieldHandlerDefinition): void {
    this.handlers.set(id, handler);
  }
  
  static get(id: string): CustomFieldHandlerDefinition | undefined {
    return this.handlers.get(id);
  }
}
```

**Пример использования:**

```typescript
// Регистрация обработчика для phone.number (JSON поле)
CustomFieldHandler.register('UserAP.phone.number', {
  name: 'Phone Number',
  description: 'Phone number from JSON field',
  buildCondition: (operator, value, dialect) => {
    if (dialect === 'postgres') {
      return {
        rawSQL: "phone->>'number' = ?",
        params: [value]
      };
    } else {
      return {
        inMemory: (record) => record.phone?.number === value
      };
    }
  }
});
````
    value: any,
    dialect: string,
    params?: any
  ) => CustomFieldCondition;
  
  /**
   * Валидация значения
   */
  validate?: (value: any) => { valid: boolean; error?: string };
}

export class CustomFieldHandler {
  private static handlers: Map<string, CustomFieldHandlerDefinition> = new Map();
  
  /**
   * Зарегистрировать обработчик для поля модели
   * @param id - Идентификатор в формате "ModelName.fieldName" или "ModelName.field.nested"
   * @param handler - Определение обработчика
   */
  static register(id: string, handler: CustomFieldHandlerDefinition): void {
    this.handlers.set(id, handler);
    console.log(`✓ Registered custom field handler: ${id}`);
  }
  
  /**
   * Получить обработчик по ID
   */
  static get(id: string): CustomFieldHandlerDefinition | undefined {
    return this.handlers.get(id);
  }
  
  /**
   * Получить все обработчики
   */
  static getAll(): Map<string, CustomFieldHandlerDefinition> {
    return this.handlers;
  }
  
  /**
   * Получить обработчики для модели
   */
  static getForModel(modelName: string): Map<string, CustomFieldHandlerDefinition> {
    const modelHandlers = new Map();
    const prefix = `${modelName}.`;
    
    for (const [id, handler] of this.handlers.entries()) {
      if (id.startsWith(prefix)) {
        const fieldName = id.substring(prefix.length);
        modelHandlers.set(fieldName, handler);
      }
    }
    
    return modelHandlers;
  }
  
  /**
   * Очистить все обработчики (для тестов)
   */
  static clear(): void {
    this.handlers.clear();
  }
}
```

**Примеры регистрации обработчиков:**

```typescript
// 1. Поиск по телефону в JSON поле
CustomFieldHandler.register('Order.phone', {
  name: 'Phone Search',
  buildCondition: (operator, value, dialect) => {
    if (dialect === 'postgres') {
      return { rawSQL: "phone->>'number' LIKE $1", params: [`%${value}%`] };
    }
    return { inMemory: (record) => record.phone?.number?.includes(value) };
  }
});

// 2. Вычисляемое поле (скидка)
CustomFieldHandler.register('Order.discountAmount', {
  name: 'Discount Amount',
  buildCondition: (operator, value, dialect) => {
    return {
      rawSQL: `(total_price * discount_percent / 100) ${operator} ?`,
      params: [value]
    };
  }
});

// 3. JSON массив (tags)
CustomFieldHandler.register('Product.tags', {
  name: 'Tags Search',
  buildCondition: (operator, value, dialect) => {
    if (dialect === 'postgres') {
      return { rawSQL: `tags @> $1::jsonb`, params: [JSON.stringify([value])] };
    }
    return { inMemory: (record) => record.tags?.includes(value) };
  }
});
```

**Интеграция с ModernQueryBuilder:**

```typescript
private buildSingleCondition(cond: FilterCondition): Record<string, any> {
  // 1. Custom handler (если есть)
  if (cond.customHandler) {
    const handler = CustomFieldHandler.get(cond.customHandler);
    if (handler) {
      const condition = handler.buildCondition(cond.operator, cond.value, this.dialect);
      if (condition.rawSQL) return this.handleRawSQL(condition.rawSQL, condition.params);
      if (condition.inMemory) return { __inMemory: condition.inMemory };
      return condition.criteria || {};
    }
  }
  
  // 2. Связи
  if (cond.relation && cond.relationField) {
    return this.buildRelationCondition(cond);
  }
  
  // 3. Стандартный маппинг
  return { [cond.field]: this.mapOperatorToCondition(cond.operator, cond.value) };
}
}
```

---

### Тесты

```typescript
// tests/lib/filter-conditions/CustomFieldHandler.test.ts

describe('CustomFieldHandler', () => {
  beforeEach(() => {
    CustomFieldHandler.clear();
  });
  
  describe('register', () => {
    it('should register custom handler', () => {
      CustomFieldHandler.register('Order.phone', {
        name: 'Phone Search',
        description: 'Search by phone',
        buildCondition: (op, val, dialect) => ({
          rawSQL: `phone LIKE $1`,
          params: [`%${val}%`]
        })
      });
      
      const handler = CustomFieldHandler.get('Order.phone');
      expect(handler).toBeDefined();
      expect(handler.name).toBe('Phone Search');
    });
  });
  
  describe('buildCondition', () => {
    it('should build PostgreSQL condition', () => {
      CustomFieldHandler.register('Order.phone', {
        name: 'Phone',
        description: 'Phone search',
        buildCondition: (op, val, dialect) => {
          if (dialect === 'postgres') {
            return {
              rawSQL: `(phone->>'number') LIKE $1`,
              params: [`%${val}%`]
            };
          }
          return {};
        }
      });
      
      const handler = CustomFieldHandler.get('Order.phone');
      const condition = handler.buildCondition('like', '900', 'postgres');
      
      expect(condition.rawSQL).toContain('phone->>');
      expect(condition.params[0]).toBe('%900%');
    });
    
    it('should build in-memory condition for Waterline', () => {
      CustomFieldHandler.register('Order.phone', {
        name: 'Phone',
        description: 'Phone search',
        buildCondition: (op, val, dialect) => {
          if (dialect === 'waterline') {
            return {
              inMemory: (record) => {
                return record.phone?.number?.includes(val);
              }
            };
          }
          return {};
        }
      });
      
      const handler = CustomFieldHandler.get('Order.phone');
      const condition = handler.buildCondition('like', '900', 'waterline');
      
      expect(condition.inMemory).toBeDefined();
      expect(condition.inMemory({ phone: { number: '9001234567' } })).toBe(true);
      expect(condition.inMemory({ phone: { number: '8001234567' } })).toBe(false);
    });
  });
  
  describe('getForModel', () => {
    it('should get all handlers for model', () => {
      CustomFieldHandler.register('Order.phone', { /* ... */ });
      CustomFieldHandler.register('Order.email', { /* ... */ });
      CustomFieldHandler.register('Product.sku', { /* ... */ });
      
      const orderHandlers = CustomFieldHandler.getForModel('Order');
      
      expect(orderHandlers.size).toBe(2);
      expect(orderHandlers.has('phone')).toBe(true);
      expect(orderHandlers.has('email')).toBe(true);
      expect(orderHandlers.has('sku')).toBe(false);
    });
  });
});
```

---

## Checklist задачи 2.9

- [ ] Создать CustomFieldHandler класс
- [ ] Реализовать регистрацию обработчиков
- [ ] Добавить поддержку rawSQL
- [ ] Добавить поддержку in-memory фильтрации
- [ ] Интегрировать с NodeTable.buildSingleCondition
- [ ] Написать тесты
- [ ] Документировать примеры использования

---

## Checklist перед переходом к Фазе 3

- [ ] NodeTable расширен и поддерживает все операторы
- [ ] AND/OR группировка работает с любой вложенностью
- [ ] Условия по связям работают
- [ ] React компонент FilterBuilder создан
- [ ] Валидация условий работает
- [ ] Все тесты проходят

---

## Заметки

_Добавляйте заметки по ходу работы_

---

## 2.8 Валидация безопасности

**Приоритет:** P0 (критично)

### Задачи

- [ ] 2.8.1 Определить константы безопасности
- [ ] 2.8.2 Расширить isValidCondition с проверкой глубины
- [ ] 2.8.3 Реализовать isFieldAllowed (whitelist полей)
- [ ] 2.8.4 Реализовать isOperatorValid
- [ ] 2.8.5 Реализовать validateOperatorValue с лимитами
- [ ] 2.8.6 Реализовать sanitizeValue для типизации
- [ ] 2.8.7 Написать тесты безопасности
- [ ] 2.8.8 Добавить логирование подозрительных попыток

### Константы безопасности

```typescript
// Файл: src/lib/filters/FilterSecurityLimits.ts
export const FILTER_SECURITY_LIMITS = {
  MAX_DEPTH: 10,                  // Максимальная вложенность условий
  MAX_IN_VALUES: 1000,            // Максимум элементов в IN
  MAX_CONDITIONS_PER_GROUP: 100,  // Максимум условий в одной группе
  MAX_STRING_LENGTH: 10000        // Максимальная длина строки в фильтре
};
```

### Расширенная валидация

Добавить в `NodeTable.ts`:

```typescript
/**
 * Проверка валидности условия с безопасностью
 */
private isValidCondition(
  cond: FilterCondition, 
  currentDepth: number = 0
): boolean {
  // 1. Проверка глубины вложенности
  if (currentDepth > FILTER_SECURITY_LIMITS.MAX_DEPTH) {
    throw new Error(
      `Filter nesting too deep (max ${FILTER_SECURITY_LIMITS.MAX_DEPTH})`
    );
  }

  // 2. Группа с детьми - рекурсивная проверка
  if (cond.children && cond.children.length > 0) {
    if (cond.children.length > FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP) {
      throw new Error(
        `Too many conditions in group (max ${FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP})`
      );
    }
    
    return cond.children.every(child => 
      this.isValidCondition(child, currentDepth + 1)
    );
  }

  // 3. Проверка разрешённых полей (whitelist)
  if (!this.isFieldAllowed(cond.field, cond.relation)) {
    throw new Error(`Field '${cond.field}' is not allowed for filtering`);
  }

  // 4. Валидация оператора
  if (!this.isOperatorValid(cond.operator)) {
    throw new Error(`Invalid operator: ${cond.operator}`);
  }

  // 5. Специальные проверки для операторов
  return this.validateOperatorValue(cond.operator, cond.value);
}

/**
 * Проверка разрешённых полей
 */
private isFieldAllowed(field: string, relation?: string): boolean {
  const modelDefinition = this.dataAccessor.getModelDefinition(this.modelName);
  
  if (!relation) {
    return field in modelDefinition.attributes;
  }
  
  const relationDef = modelDefinition.relations?.[relation];
  if (!relationDef) return false;
  
  const relatedModel = this.dataAccessor.getModelDefinition(relationDef.model);
  return field in relatedModel.attributes;
}

/**
 * Валидация значения для оператора
 */
private validateOperatorValue(operator: FilterOperator, value: any): boolean {
  switch (operator) {
    case 'in':
    case 'notIn':
      if (!Array.isArray(value)) {
        throw new Error(`Operator '${operator}' requires array value`);
      }
      if (value.length > FILTER_SECURITY_LIMITS.MAX_IN_VALUES) {
        throw new Error(
          `Too many values in IN operator (max ${FILTER_SECURITY_LIMITS.MAX_IN_VALUES})`
        );
      }
      return true;
      
    case 'between':
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error('BETWEEN operator requires array of 2 values');
      }
      return true;
      
    case 'regex':
      if (typeof value !== 'string') {
        throw new Error('Regex operator requires string pattern');
      }
      try {
        new RegExp(value);
        return true;
      } catch (e) {
        throw new Error(`Invalid regex pattern: ${value}`);
      }
      
    default:
      return true;
  }
}
```

### Тесты безопасности

```typescript
// tests/lib/NodeTable.security.test.ts

describe('Filter Security', () => {
  it('should reject deeply nested conditions', () => {
    const deepFilter = createNestedCondition(15); // > MAX_DEPTH
    
    expect(() => {
      nodeTable.applyFilterConditions([deepFilter]);
    }).toThrow('Filter nesting too deep');
  });
  
  it('should reject too many IN values', () => {
    const filter: FilterCondition = {
      id: '1',
      field: 'status',
      operator: 'in',
      value: Array(1500).fill('active')
    };
    
    expect(() => {
      nodeTable.applyFilterConditions([filter]);
    }).toThrow('Too many values in IN operator');
  });
  
  it('should reject non-existent fields', () => {
    const filter: FilterCondition = {
      id: '1',
      field: 'nonExistentField',
      operator: 'eq',
      value: 'test'
    };
    
    expect(() => {
      nodeTable.applyFilterConditions([filter]);
    }).toThrow('Field \'nonExistentField\' is not allowed');
  });
  
  it('should validate regex patterns', () => {
    const invalidRegex: FilterCondition = {
      id: '1',
      field: 'name',
      operator: 'regex',
      value: '[invalid(regex'
    };
    
    expect(() => {
      nodeTable.applyFilterConditions([invalidRegex]);
    }).toThrow('Invalid regex pattern');
  });
});
```

---

**Завершение Фазы 2:** После реализации всех задач, включая 2.8, система фильтров будет защищена от основных атак и готова к продакшену.

```typescript
// Было (NodeTable с DataTables форматом):
const RequestBody = {
  draw: "1",
  start: String((page - 1) * count),
  length: String(count),
  order: [{
    column: orderColumn,
    dir: direction
  }],
  columns: [
    { data: "0", searchable: "true", orderable: "true", search: { value: "", regex: false } },
    ...nodeTreeColumns  // Массив с индексами колонок
  ],
  search: { value: globalSearch, regex: false }
};

const nodeTable = new NodeTable(RequestBody, entity.model, fields);
await nodeTable.output((err: Error, data: NodeOutput) => {
  if (err) {
    Adminizer.log.error(err);
  }
  return req.Inertia.render({
    component: 'list',
    props: { data: data ?? [] }
  });
}, dataAccessor);
```

### Новый код (после)

**Файл:** `src/controllers/list.ts`

```typescript
import { ModernQueryBuilder } from '../lib/query-builder/ModernQueryBuilder';
import { FilterCondition } from '../models/FilterAP';

export async function getHandler(req: ReqType, res: Response) {
  const entity = req.entity;
  const fields = entity.fields;
  const dataAccessor = req.adminizer.dataAccessor;
  
  // 1. Парсинг параметров из запроса (простой формат)
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.count as string) || 5;
  const sortField = req.query.column as string || 'createdAt';
  const sortDirection = (req.query.direction as string || 'desc').toUpperCase() as 'ASC' | 'DESC';
  const globalSearch = req.query.globalSearch as string || '';
  
  // 2. Парсинг search по колонкам (если есть)
  const searchColumns = req.query.searchColumn as string[] || [];
  const searchValues = req.query.searchColumnValue as string[] || [];
  
  const filters: FilterCondition[] = searchColumns.map((colIndex, i) => ({
    id: `search-${i}`,
    field: Object.keys(fields)[parseInt(colIndex) - 1], // Индекс минус 1 (первая колонка - actions)
    operator: 'like',
    value: searchValues[i]
  })).filter(f => f.value);  // Только непустые
  
  // 3. Создать QueryBuilder
  const queryBuilder = new ModernQueryBuilder(
    entity.model,
    fields,
    dataAccessor
  );
  
  // 4. Выполнить запрос (Promise API - без callbacks!)
  try {
    const result = await queryBuilder.execute({
      page,
      limit,
      sort: sortField,
      sortDirection,
      globalSearch: globalSearch || undefined,
      filters: filters.length > 0 ? filters : undefined
    });
    
    // 5. Подготовить заголовок и колонки
    const header = buildHeader(entity, req);
    const columns = buildColumns(fields, sortField, sortDirection, req);
    
    // 6. Render через Inertia
    return req.Inertia.render({
      component: 'list',
      props: {
        header,
        columns,
        data: {
          data: result.data,
          recordsTotal: result.total,
          recordsFiltered: result.filtered
        }
      }
    });
  } catch (error) {
    Adminizer.log.error('Query execution failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch data'
    });
  }
}

// Вспомогательные функции (упрощены)
function buildColumns(
  fields: Fields,
  sortField: string,
  sortDirection: string,
  req: ReqType
): Record<string, any> {
  const columns: Record<string, any> = {};
  
  let index = 1;
  for (const [key, field] of Object.entries(fields)) {
    const config = field.config as BaseFieldConfig;
    columns[key] = {
      ...config,
      title: req.i18n.__(config.title),
      data: String(index),
      direction: key === sortField ? sortDirection : undefined
    };
    index++;
  }
  
  return columns;
}
```

### Сравнение (до/после)

| Аспект | NodeTable (до) | ModernQueryBuilder (после) |
|--------|----------------|----------------------------|
| API | Callback-based | Promise/async-await |
| Параметры | DataTables формат (draw, columns[], order[]) | Простой QueryParams (page, limit, sort) |
| Парсинг | Сложный (индексы колонок) | Прямой (имена полей) |
| Строк кода | ~70 строк подготовки | ~30 строк |
| Читаемость | Низкая (legacy) | Высокая (modern) |
| Поддержка фильтров | ❌ Нет | ✅ Полная (FilterCondition) |
| Тесты | ❌ Нет | ✅ Есть |

---

### Integration тесты

**Файл:** `tests/controllers/list.integration.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../src/app';

describe('List Controller Integration', () => {
  let authToken: string;
  
  beforeAll(async () => {
    // Получить auth token
    const loginRes = await request(app)
      .post('/adminizer/login')
      .send({ login: 'admin', password: 'admin' });
    authToken = loginRes.body.token;
  });
  
  describe('GET /adminizer/:entity/list', () => {
    it('should return paginated data', async () => {
      const res = await request(app)
        .get('/adminizer/users/list?page=1&count=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(res.body.data).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('recordsTotal');
      expect(res.body.data).toHaveProperty('recordsFiltered');
      expect(res.body.data.data).toBeInstanceOf(Array);
      expect(res.body.data.data.length).toBeLessThanOrEqual(5);
    });
    
    it('should apply sorting', async () => {
      const res = await request(app)
        .get('/adminizer/users/list?page=1&count=5&column=name&direction=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const names = res.body.data.data.map((u: any) => u.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
    
    it('should apply global search', async () => {
      const res = await request(app)
        .get('/adminizer/users/list?page=1&count=5&globalSearch=john')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const data = res.body.data.data;
      expect(data.every((u: any) => 
        JSON.stringify(u).toLowerCase().includes('john')
      )).toBe(true);
    });
    
    it('should apply column search', async () => {
      const res = await request(app)
        .get('/adminizer/users/list?page=1&count=5&searchColumn=2&searchColumnValue=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const data = res.body.data.data;
      expect(data.every((u: any) => u.status === 'active')).toBe(true);
    });
  });
});
```

---

### Checklist задачи 2.2

- [ ] Обновить импорты в list.ts
- [ ] Заменить NodeTable на ModernQueryBuilder
- [ ] Упростить парсинг параметров
- [ ] Убрать DataTables формат (draw, columns[], order[])
- [ ] Обновить типы RequestBody
- [ ] Обновить buildColumns() функцию
- [ ] Обновить buildHeader() функцию
- [ ] Написать integration тесты
- [ ] Проверить работу в браузере
- [ ] Код отревьюен

---

## 2.3 Интеграция с FilterService

**Приоритет:** P0 (критично)
**Время:** 0.5 дня
**Зависимости:** 2.1, Phase 3.1 (FilterService)

### Цель

Подключить ModernQueryBuilder к сохраненным фильтрам из FilterAP.

### Реализация

**Файл:** `src/helpers/FilterService.ts` (дополнить)

```typescript
import { ModernQueryBuilder, QueryParams } from '../lib/query-builder/ModernQueryBuilder';
import { FilterAP, FilterAPAttributes } from '../models/FilterAP';
import { DataAccessor } from '../lib/DataAccessor';

export class FilterService {
  // ... существующие методы ...
  
  /**
   * Применить фильтр к запросу
   * Преобразует FilterAP в QueryParams для ModernQueryBuilder
   */
  async applyFilter(
    filterId: number,
    model: AbstractModel<any>,
    fields: Fields,
    dataAccessor: DataAccessor,
    options?: {
      page?: number;
      limit?: number;
      sort?: string;
      sortDirection?: 'ASC' | 'DESC';
    }
  ): Promise<QueryResult> {
    // 1. Загрузить фильтр
    const filter = await this.getById(filterId);
    
    if (!filter) {
      throw new Error(`Filter #${filterId} not found`);
    }
    
    // 2. Проверить права
    if (!this.canView(filter, req.user)) {
      throw new Error('Access denied to this filter');
    }
    
    // 3. Преобразовать в QueryParams
    const queryParams: QueryParams = {
      page: options?.page || 1,
      limit: options?.limit || 10,
      sort: options?.sort || filter.sortField || 'createdAt',
      sortDirection: options?.sortDirection || filter.sortDirection || 'DESC',
      filters: filter.conditions || []
    };
    
    // 4. Создать QueryBuilder
    const queryBuilder = new ModernQueryBuilder(
      model,
      fields,
      dataAccessor
    );
    
    // 5. Выполнить запрос
    return await queryBuilder.execute(queryParams);
  }
  
  /**
   * Применить фильтр по slug
   */
  async applyFilterBySlug(
    slug: string,
    model: AbstractModel<any>,
    fields: Fields,
    dataAccessor: DataAccessor,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<QueryResult> {
    const filter = await FilterAP.findOne({ where: { slug } });
    
    if (!filter) {
      throw new Error(`Filter '${slug}' not found`);
    }
    
    return this.applyFilter(filter.id, model, fields, dataAccessor, options);
  }
}
```

---

### Использование в контроллерах

**Файл:** `src/controllers/list.ts` (расширить)

```typescript
export async function getHandler(req: ReqType, res: Response) {
  const entity = req.entity;
  const fields = entity.fields;
  const dataAccessor = req.adminizer.dataAccessor;
  
  // ПРОВЕРКА: Включены ли фильтры для этой модели?
  const filtersEnabled = req.adminizer.filterService.isFiltersEnabledForModel(entity.model.identity);
  
  // Проверка - используется ли сохраненный фильтр?
  const filterSlug = req.query.filter as string;
  
  if (filterSlug && filtersEnabled) {
    // Применить сохраненный фильтр (только если фильтры включены)
    try {
      const result = await req.adminizer.filterService.applyFilterBySlug(
        filterSlug,
        entity.model,
        fields,
        dataAccessor,
        {
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.count as string) || 10
        }
      );
      
      return req.Inertia.render({
        component: 'list',
        props: {
          header: buildHeader(entity, req),
          columns: buildColumns(fields, result.sort, result.sortDirection, req),
          data: {
            data: result.data,
            recordsTotal: result.total,
            recordsFiltered: result.filtered
          },
          appliedFilter: filterSlug,
          filtersEnabled: true  // Передать флаг в UI
        }
      });
    } catch (error) {
      Adminizer.log.error(`Failed to apply filter '${filterSlug}':`, error);
      // Fallback на обычный список
    }
  } else if (filterSlug && !filtersEnabled) {
    // Если фильтры отключены, но пытаются использовать - игнорировать
    Adminizer.log.warn(`Filters disabled for model ${entity.model.identity}, ignoring filter slug '${filterSlug}'`);
  }
  
  // FALLBACK: Обычный запрос (используется если фильтры отключены или нет filterSlug)
  // Если фильтры отключены для модели - всегда используется старый поиск
  const useLegacySearch = !filtersEnabled || req.adminizer.filterService.shouldUseLegacySearch(entity.model.identity);
  
  if (useLegacySearch) {
    // Старый способ: глобальный поиск по всем полям
    const globalSearch = req.query.globalSearch as string || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.count as string) || 5;
    const sortField = req.query.column as string || 'createdAt';
    const sortDirection = (req.query.direction as string || 'desc').toUpperCase() as 'ASC' | 'DESC';
    
    // Простой WHERE с LIKE по всем текстовым полям
    const where: any = {};
    if (globalSearch) {
      const searchConditions = Object.entries(fields)
        .filter(([_, field]) => {
          const type = field.config.type;
          return type === 'string' || type === 'text' || type === 'email';
        })
        .map(([fieldName]) => ({
          [fieldName]: { contains: globalSearch }
        }));
      
      if (searchConditions.length > 0) {
        where.or = searchConditions;
      }
    }
    
    const [data, total] = await Promise.all([
      entity.model.find({
        where,
        limit,
        skip: (page - 1) * limit,
        sort: `${sortField} ${sortDirection}`
      }),
      entity.model.count({ where })
    ]);
    
    return req.Inertia.render({
      component: 'list',
      props: {
        header: buildHeader(entity, req),
        columns: buildColumns(fields, sortField, sortDirection, req),
        data: {
          data,
          recordsTotal: total,
          recordsFiltered: total
        },
        filtersEnabled: false,  // Передать флаг что фильтры отключены
        useLegacySearch: true
      }
    });
  }
  
  // Обычный запрос с ModernQueryBuilder (если фильтры включены)
  const queryBuilder = new ModernQueryBuilder(
    entity.model,
    fields,
    dataAccessor
  );
  
  // ... остальной код с ModernQueryBuilder ...
}
```

---

### Integration тесты

**Файл:** `tests/helpers/FilterService.integration.test.ts`

```typescript
import { FilterService } from '../../src/helpers/FilterService';
import { FilterAP } from '../../src/models/FilterAP';
import { UserAP } from '../../src/models/UserAP';

describe('FilterService Integration', () => {
  let filterService: FilterService;
  let testUser: UserAP;
  let testFilter: FilterAP;
  
  beforeAll(async () => {
    filterService = new FilterService(adminizer);
    
    testUser = await UserAP.create({
      login: 'testuser',
      email: 'test@test.com',
      passwordHashed: 'hash'
    });
    
    testFilter = await FilterAP.create({
      name: 'Active Users',
      modelName: 'UserAP',
      slug: 'active-users',
      conditions: [
        {
          id: '1',
          field: 'status',
          operator: 'eq',
          value: 'active'
        }
      ],
      sortField: 'createdAt',
      sortDirection: 'DESC',
      ownerId: testUser.id,
      visibility: 'public'
    });
  });
  
  afterAll(async () => {
    await FilterAP.destroy({ where: { id: testFilter.id } });
    await UserAP.destroy({ where: { id: testUser.id } });
  });
  
  describe('applyFilter()', () => {
    it('should execute filter with ModernQueryBuilder', async () => {
      // Создать несколько тестовых пользователей
      await UserAP.bulkCreate([
        { login: 'user1', email: 'user1@test.com', passwordHashed: 'hash', status: 'active' },
        { login: 'user2', email: 'user2@test.com', passwordHashed: 'hash', status: 'inactive' },
        { login: 'user3', email: 'user3@test.com', passwordHashed: 'hash', status: 'active' }
      ]);
      
      const result = await filterService.applyFilter(
        testFilter.id,
        UserAP,
        userFields,
        dataAccessor,
        { page: 1, limit: 10 }
      );
      
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.every(u => u.status === 'active')).toBe(true);
      expect(result.filtered).toBeLessThanOrEqual(result.total);
    });
    
    it('should throw error if filter not found', async () => {
      await expect(
        filterService.applyFilter(
          999999,
          UserAP,
          userFields,
          dataAccessor
        )
      ).rejects.toThrow('Filter #999999 not found');
    });
  });
  
  describe('applyFilterBySlug()', () => {
    it('should execute filter by slug', async () => {
      const result = await filterService.applyFilterBySlug(
        'active-users',
        UserAP,
        userFields,
        dataAccessor,
        { page: 1, limit: 10 }
      );
      
      expect(result.data).toBeInstanceOf(Array);
    });
    
    it('should throw error if slug not found', async () => {
      await expect(
        filterService.applyFilterBySlug(
          'non-existent-slug',
          UserAP,
          userFields,
          dataAccessor
        )
      ).rejects.toThrow("Filter 'non-existent-slug' not found");
    });
  });
});
```

---

### Checklist задачи 2.3

- [ ] Добавить метод applyFilter() в FilterService
- [ ] Добавить метод applyFilterBySlug() в FilterService
- [ ] Интегрировать с list.ts контроллером
- [ ] Добавить поддержку ?filter=slug в URL
- [ ] Написать integration тесты
- [ ] Проверить права доступа к фильтрам
- [ ] Код отревьюен

---

## 2.4 Удалить устаревший NodeTable

**Приоритет:** P0 (критично - финальный шаг трансформации)
**Время:** 0.5 дня
**Зависимости:** 2.1, 2.2, 2.3

### Цель

Полностью удалить NodeTable из кодовой базы и создать migration guide.

### Шаги

1. **Удалить файлы:**
   ```bash
   rm src/lib/datatable/NodeTable.ts
   rm -rf src/lib/datatable/  # Если директория пустая
   ```

2. **Проверить импорты:**
   ```bash
   grep -r "NodeTable" src/
   grep -r "from.*datatable" src/
   ```

3. **Удалить экспорты:**
   ```typescript
   // src/index.ts
   // УДАЛИТЬ:
   // export { NodeTable } from './lib/datatable/NodeTable';
   ```

4. **Обновить документацию:**

**Файл:** `docs/MIGRATION_NODETABLE_TO_QUERYBUILDER.md`

```markdown
# Migration: NodeTable → ModernQueryBuilder

## Обзор

NodeTable (263 строки) был удален и заменен на ModernQueryBuilder.

### Причины замены:

- ❌ Фронтенд мигрирован на @tanstack/react-table, DataTables.js не используется
- ❌ Callback-based архитектура вместо Promise/async-await
- ❌ Не поддерживает операторы из ТЗ (gt, between, in, custom handlers)
- ❌ Только 1 место использования
- ❌ 0% test coverage

## Что изменилось

### До (NodeTable):

\`\`\`typescript
const RequestBody = {
  draw: "1",
  start: String((page - 1) * count),
  length: String(count),
  order: [{ column: orderColumn, dir: direction }],
  columns: [...],
  search: { value: globalSearch, regex: false }
};

const nodeTable = new NodeTable(RequestBody, entity.model, fields);
await nodeTable.output((err, data) => {
  if (err) {
    Adminizer.log.error(err);
  }
  return req.Inertia.render({
    component: 'list',
    props: { data }
  });
}, dataAccessor);
\`\`\`

### После (ModernQueryBuilder):

\`\`\`typescript
const queryBuilder = new ModernQueryBuilder(
  entity.model,
  fields,
  dataAccessor
);

try {
  const result = await queryBuilder.execute({
    page,
    limit,
    sort: sortField,
    sortDirection,
    globalSearch,
    filters
  });
  
  return req.Inertia.render({
    component: 'list',
    props: { data: result }
  });
} catch (error) {
  Adminizer.log.error('Query failed:', error);
  return res.status(500).json({ error: 'Failed to fetch data' });
}
\`\`\`

## Для разработчиков плагинов

Если вы использовали NodeTable в своих плагинах:

1. Замените импорт:
   \`\`\`typescript
   // Старый:
   import { NodeTable } from 'adminizer/lib/datatable/NodeTable';
   
   // Новый:
   import { ModernQueryBuilder } from 'adminizer/lib/query-builder/ModernQueryBuilder';
   \`\`\`

2. Обновите параметры запроса:
   \`\`\`typescript
   // Старый формат (DataTables):
   const request = {
     draw: "1",
     start: "0",
     length: "10",
     order: [{ column: "1", dir: "desc" }],
     columns: [...]
   };
   
   // Новый формат (простой):
   const params = {
     page: 1,
     limit: 10,
     sort: 'createdAt',
     sortDirection: 'DESC'
   };
   \`\`\`

3. Замените callback на async/await:
   \`\`\`typescript
   // Старый:
   await nodeTable.output((err, data) => {
     // ...
   }, dataAccessor);
   
   // Новый:
   const result = await queryBuilder.execute(params);
   \`\`\`

## Новые возможности

ModernQueryBuilder поддерживает:

✅ Все операторы из ТЗ: eq, neq, gt, gte, lt, lte, like, ilike, in, notIn, between, isNull, isNotNull, regex
✅ Вложенные AND/OR/NOT группы
✅ Custom handlers для JSON полей (например, phone.number)
✅ Связи (relations)
✅ Promise-based API
✅ 80%+ test coverage

## Поддержка

Если у вас возникли проблемы с миграцией, создайте issue на GitHub.
\`\`\`

5. **Обновить CHANGELOG.md:**

\`\`\`markdown
# Changelog

## [v5.0.0] - 2024-XX-XX

### 🚨 BREAKING CHANGES

- **Удален NodeTable:** Устаревший класс NodeTable удален и заменен на ModernQueryBuilder.
  - Callback-based API → Promise/async-await
  - DataTables.js формат → Простой QueryParams
  - Только 1 контроллер требует изменений (list.ts)
  - См. `docs/MIGRATION_NODETABLE_TO_QUERYBUILDER.md` для деталей

### ✨ Features

- **ModernQueryBuilder:** Новый query builder с поддержкой:
  - Всех операторов из ТЗ (eq, gt, like, between, in, regex)
  - Вложенных AND/OR/NOT групп
  - Custom handlers для JSON полей
  - Полной интеграции с FilterAP

### 🐛 Bug Fixes

- Исправлена проблема с callback-based async patterns
- Улучшена типобезопасность запросов

### 📚 Documentation

- Добавлен migration guide для NodeTable → ModernQueryBuilder
- Обновлена документация по query building
\`\`\`

---

### Checklist задачи 2.4

- [ ] Удалить файл `src/lib/datatable/NodeTable.ts`
- [ ] Удалить директорию `src/lib/datatable/` (если пустая)
- [ ] Проверить отсутствие импортов NodeTable
- [ ] Удалить экспорты из `src/index.ts`
- [ ] Создать `MIGRATION_NODETABLE_TO_QUERYBUILDER.md`
- [ ] Обновить `CHANGELOG.md`
- [ ] Обновить `README.md` (если упоминается NodeTable)
- [ ] Запустить все тесты
- [ ] Проверить работу в браузере
- [ ] Код отревьюен

---

## Checklist перед переходом к Фазе 3

**Статус:** Готов к реализации
**Приоритет:** P0 (критично - выполнить первым)
**Общее время:** 4 дня

### Что будет сделано:

1. ✅ **ModernQueryBuilder** - современный query builder (2 дня)
2. ✅ **list.ts рефакторинг** - замена NodeTable (0.5 дня)
3. ✅ **FilterService интеграция** - подключение фильтров (0.5 дня)
4. ✅ **Удаление NodeTable** - очистка legacy кода (0.5 дня)

### Результат:

- ❌ NodeTable удален
- ✅ ModernQueryBuilder работает
- ✅ Promise/async-await API
- ✅ Поддержка всех операторов из ТЗ
- ✅ Интеграция с FilterAP
- ✅ 80%+ test coverage
- ✅ Чистая кодовая база

**После завершения блока A можно переходить к блоку B (Query Builder функциональность).**

---

## 2.12 Работа UI с флагом filtersEnabled

**Приоритет:** P0 (критично для backward compatibility)
**Зависимости:** 2.2, Phase 1 (конфигурация)

### Цель

Обеспечить корректную работу UI когда фильтры отключены глобально или для конкретной модели.

### Механизм

1. **Backend передает флаг в props:**
   - `filtersEnabled: boolean` - доступны ли фильтры для текущей модели
   - `useLegacySearch: boolean` - используется ли старый глобальный поиск

2. **UI реагирует на флаг:**
   - Если `filtersEnabled === false` - скрыть кнопку "Create Filter", показать только старый поиск
   - Если `filtersEnabled === true` - показать кнопку "Create Filter" и список фильтров

### Реализация

**Файл:** `react-app/src/pages/List.tsx` (пример)

```tsx
import React from 'react';
import { usePage } from '@inertiajs/react';

interface ListPageProps {
  header: any;
  columns: any;
  data: {
    data: any[];
    recordsTotal: number;
    recordsFiltered: number;
  };
  appliedFilter?: string;
  filtersEnabled: boolean;  // Флаг доступности фильтров
  useLegacySearch?: boolean;
}

export default function List() {
  const { filtersEnabled, useLegacySearch, appliedFilter } = usePage<ListPageProps>().props;
  
  return (
    <div className="list-container">
      {/* Поиск: legacy или фильтры */}
      <div className="list-toolbar">
        {useLegacySearch ? (
          // Старый глобальный поиск
          <input
            type="text"
            placeholder="Search..."
            className="input input-bordered"
            onChange={(e) => {
              // Использовать globalSearch параметр
              router.get(window.location.pathname, {
                ...router.page.props.query,
                globalSearch: e.target.value,
                page: 1
              });
            }}
          />
        ) : (
          // Новые фильтры
          <div className="flex gap-2">
            {filtersEnabled && (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => router.visit('/adminizer/filters/create')}
                >
                  + Create Filter
                </button>
                
                {/* Dropdown с сохраненными фильтрами */}
                <FilterDropdown currentFilter={appliedFilter} />
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Таблица */}
      <DataTable {...props} />
    </div>
  );
}
```

### Логика условного рендеринга

```tsx
// Компонент FilterDropdown показывается только если filtersEnabled
{filtersEnabled && <FilterDropdown />}

// Старый поиск показывается если useLegacySearch
{useLegacySearch && <LegacySearchInput />}

// Можно комбинировать: если фильтры отключены - всегда показывать legacy
{(!filtersEnabled || useLegacySearch) && <LegacySearchInput />}
```

### API Response с флагом

При запросе списка фильтров API возвращает флаг:

```json
// GET /adminizer/filters?modelName=UserAP
{
  "filters": [...],
  "filtersEnabled": false  // Фильтры отключены для UserAP
}
```

UI проверяет этот флаг и не показывает кнопки создания/редактирования фильтров.

### Сценарии использования

**Сценарий 1: Глобальное отключение фильтров**

```typescript
const adminizer = new Adminizer({
  filtersEnabled: false  // Все модели используют legacy search
});
```

UI для ВСЕХ моделей:
- ❌ Кнопка "Create Filter" скрыта
- ❌ Dropdown с фильтрами скрыт
- ✅ Показывается только старый input для globalSearch

**Сценарий 2: Фильтры включены глобально, но отключены для UserAP**

```typescript
const adminizer = new Adminizer({
  filtersEnabled: true,
  modelFilters: {
    UserAP: {
      enabled: false,
      useLegacySearch: true
    }
  }
});
```

UI для UserAP:
- ❌ Кнопка "Create Filter" скрыта
- ✅ Показывается legacy search

UI для остальных моделей:
- ✅ Кнопка "Create Filter" видна
- ✅ Dropdown с фильтрами работает

**Сценарий 3: Постепенная миграция**

```typescript
const adminizer = new Adminizer({
  filtersEnabled: true,
  modelFilters: {
    // Старые модели используют legacy
    UserAP: { enabled: false, useLegacySearch: true },
    OrderAP: { enabled: false, useLegacySearch: true },
    
    // Новые модели используют фильтры
    ProductAP: { enabled: true },
    CategoryAP: { enabled: true }
  }
});
```

Это позволяет:
- ✅ Мигрировать модели постепенно
- ✅ Не ломать существующую функциональность
- ✅ Тестировать новые фильтры на части моделей

---

### Checklist задачи 2.12

- [ ] Обновить List.tsx для проверки filtersEnabled
- [ ] Добавить условный рендеринг кнопок фильтров
- [ ] Добавить legacy search input
- [ ] API возвращает filtersEnabled в response
- [ ] FilterDropdown компонент проверяет флаг
- [ ] Написать тесты UI (Playwright)
- [ ] Документировать в MIGRATION.md
- [ ] Проверить работу в браузере

