# Чек-лист изменений в план реализации

**Дата:** 30 января 2026  
**Статус:** ⏳ Требуется обновление  
**Приоритет:** P0 (перед началом реализации)

---

## 🎯 Обязательные изменения (P0-P1)

### 1. ✅ Обновить тип logic с добавлением NOT

**Файлы для изменения:**
- [ ] `.ai-notes/phases/01-data-model.md` (строки ~70)
- [ ] `.ai-notes/phases/02-query-builder.md` (строки ~40-70)

**Текущее значение:**
```typescript
logic?: 'AND' | 'OR';
```

**Новое значение:**
```typescript
logic?: 'AND' | 'OR' | 'NOT';
```

**Дополнительно добавить в Фазу 2:**
```typescript
// В метод buildWhereFromConditions:
if (logic === 'NOT') {
  if (clauses.length !== 1) {
    throw new Error('NOT operator requires exactly one condition');
  }
  return { not: clauses[0] };
}
```

---

### 2. ✅ Расширить список операторов

**Файл:** `.ai-notes/phases/01-data-model.md`

**Добавить операторы:**
```typescript
export type FilterOperator =
  | 'eq'           // =
  | 'neq'          // !=
  | 'gt'           // >
  | 'gte'          // >=
  | 'lt'           // <
  | 'lte'          // <=
  | 'like'         // LIKE %value%
  | 'ilike'        // ILIKE %value% (case-insensitive) ← НОВЫЙ
  | 'startsWith'   // LIKE value%
  | 'endsWith'     // LIKE %value
  | 'in'           // IN (array)
  | 'notIn'        // NOT IN
  | 'between'      // BETWEEN
  | 'isNull'       // IS NULL
  | 'isNotNull'    // IS NOT NULL
  | 'regex'        // Регулярное выражение ← НОВЫЙ
  | 'custom';      // Кастомный обработчик
```

**Добавить в Фазу 2 маппинг:**
```typescript
case 'ilike':
  // Для Postgres - нативный ILIKE
  if (this.dataAccessor.getDialect() === 'postgres') {
    return { ilike: `%${value}%` };
  }
  // Для других - эмуляция через lower()
  return Sequelize.where(
    Sequelize.fn('LOWER', Sequelize.col(field)),
    'LIKE',
    `%${String(value).toLowerCase()}%`
  );

case 'regex':
  if (this.dataAccessor.getDialect() === 'postgres') {
    return { regexp: value };
  }
  // MySQL/MariaDB
  return Sequelize.where(
    Sequelize.col(field),
    'REGEXP',
    value
  );
```

---

### 3. ✅ Добавить версионирование фильтров

**Файл:** `.ai-notes/phases/01-data-model.md`

**Добавить поля в FilterAPAttributes:**
```typescript
export interface FilterAPAttributes {
  id: number;
  
  // ... существующие поля ...
  
  // Версионирование
  version: number;              // Версия формата фильтра (начинается с 1)
  schemaVersion?: string;       // Версия схемы модели при создании
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Константы версионирования:**
```typescript
export const FILTER_FORMAT_VERSION = 1;

// Маппинг изменений между версиями
export const FILTER_VERSION_MIGRATIONS = {
  0: (filter: any) => {
    // Миграция со старого формата (без версии) на версию 1
    return {
      ...filter,
      version: 1,
      conditions: migrateConditions(filter.conditions)
    };
  }
};
```

---

### 4. ✅ Добавить задачу безопасности в Фазу 2

**Файл:** `.ai-notes/phases/02-query-builder.md`

**Добавить раздел 2.8:**

```markdown
## 2.8 Валидация безопасности

**Приоритет:** P0 (критично)

### Константы безопасности

\`\`\`typescript
// В начале файла NodeTable.ts или отдельный config
export const FILTER_SECURITY_LIMITS = {
  MAX_DEPTH: 10,                  // Максимальная вложенность условий
  MAX_IN_VALUES: 1000,            // Максимум элементов в IN
  MAX_CONDITIONS_PER_GROUP: 100,  // Максимум условий в одной группе
  MAX_STRING_LENGTH: 10000        // Максимальная длина строки в фильтре
};
\`\`\`

### Методы валидации

#### isValidCondition (расширенная версия)

\`\`\`typescript
private isValidCondition(
  cond: FilterCondition, 
  currentDepth: number = 0
): boolean {
  // 1. Проверка глубины вложенности
  if (currentDepth > FILTER_SECURITY_LIMITS.MAX_DEPTH) {
    throw new Error(
      \`Filter nesting too deep (max \${FILTER_SECURITY_LIMITS.MAX_DEPTH})\`
    );
  }

  // 2. Группа с детьми - рекурсивная проверка
  if (cond.children && cond.children.length > 0) {
    if (cond.children.length > FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP) {
      throw new Error(
        \`Too many conditions in group (max \${FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP})\`
      );
    }
    
    return cond.children.every(child => 
      this.isValidCondition(child, currentDepth + 1)
    );
  }

  // 3. Проверка наличия обязательных полей
  if (!cond.field || !cond.operator) {
    return false;
  }

  // 4. Проверка разрешённых полей (whitelist)
  if (!this.isFieldAllowed(cond.field, cond.relation)) {
    throw new Error(\`Field '\${cond.field}' is not allowed for filtering\`);
  }

  // 5. Валидация оператора
  if (!this.isOperatorValid(cond.operator)) {
    throw new Error(\`Invalid operator: \${cond.operator}\`);
  }

  // 6. isNull/isNotNull не требуют value
  if (cond.operator === 'isNull' || cond.operator === 'isNotNull') {
    return true;
  }

  // 7. Проверка наличия значения
  if (cond.value === undefined || cond.value === '') {
    return false;
  }

  // 8. Специальные проверки для операторов
  return this.validateOperatorValue(cond.operator, cond.value);
}

/**
 * Проверка разрешённых полей
 */
private isFieldAllowed(field: string, relation?: string): boolean {
  const modelDefinition = this.dataAccessor.getModelDefinition(this.modelName);
  
  // Простое поле
  if (!relation) {
    return field in modelDefinition.attributes;
  }
  
  // Поле в связи
  const relationDef = modelDefinition.relations?.[relation];
  if (!relationDef) {
    return false;
  }
  
  const relatedModel = this.dataAccessor.getModelDefinition(
    relationDef.model
  );
  return field in relatedModel.attributes;
}

/**
 * Проверка валидности оператора
 */
private isOperatorValid(operator: FilterOperator): boolean {
  const validOperators: FilterOperator[] = [
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'startsWith', 'endsWith',
    'in', 'notIn', 'between',
    'isNull', 'isNotNull',
    'regex', 'custom'
  ];
  
  return validOperators.includes(operator);
}

/**
 * Валидация значения для оператора
 */
private validateOperatorValue(
  operator: FilterOperator, 
  value: any
): boolean {
  switch (operator) {
    case 'in':
    case 'notIn':
      if (!Array.isArray(value)) {
        throw new Error(\`Operator '\${operator}' requires array value\`);
      }
      if (value.length > FILTER_SECURITY_LIMITS.MAX_IN_VALUES) {
        throw new Error(
          \`Too many values in IN operator (max \${FILTER_SECURITY_LIMITS.MAX_IN_VALUES})\`
        );
      }
      return true;
      
    case 'between':
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error('BETWEEN operator requires array of 2 values');
      }
      return true;
      
    case 'like':
    case 'ilike':
    case 'startsWith':
    case 'endsWith':
      if (typeof value !== 'string') {
        throw new Error(\`Operator '\${operator}' requires string value\`);
      }
      if (value.length > FILTER_SECURITY_LIMITS.MAX_STRING_LENGTH) {
        throw new Error(\`String value too long\`);
      }
      return true;
      
    case 'regex':
      if (typeof value !== 'string') {
        throw new Error('Regex operator requires string pattern');
      }
      // Проверка валидности regex
      try {
        new RegExp(value);
        return true;
      } catch (e) {
        throw new Error(\`Invalid regex pattern: \${value}\`);
      }
      
    default:
      return true;
  }
}

/**
 * Санитизация значения
 */
private sanitizeValue(value: any, fieldType: string): any {
  // ORM уже делает параметризацию, но дополнительная проверка:
  
  switch (fieldType) {
    case 'string':
      return String(value).slice(0, FILTER_SECURITY_LIMITS.MAX_STRING_LENGTH);
      
    case 'integer':
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        throw new Error(\`Invalid integer value: \${value}\`);
      }
      return num;
      
    case 'float':
      const float = parseFloat(value);
      if (isNaN(float)) {
        throw new Error(\`Invalid float value: \${value}\`);
      }
      return float;
      
    case 'boolean':
      return Boolean(value);
      
    case 'date':
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error(\`Invalid date value: \${value}\`);
      }
      return date;
      
    default:
      return value;
  }
}
\`\`\`

### Тесты безопасности

\`\`\`typescript
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
      value: Array(1500).fill('active') // > MAX_IN_VALUES
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
  
  it('should sanitize SQL injection attempts', () => {
    const filter: FilterCondition = {
      id: '1',
      field: 'name',
      operator: 'eq',
      value: "'; DROP TABLE users; --"
    };
    
    // Благодаря параметризации ORM это должно быть безопасно
    expect(() => {
      nodeTable.applyFilterConditions([filter]);
    }).not.toThrow();
    
    // Значение должно быть экранировано
    const where = nodeTable.getWhere();
    expect(where).not.toContain('DROP TABLE');
  });
});
\`\`\`
\`\`\`

**Добавить в задачи Фазы 2:**
- [ ] 2.8.1 Реализовать константы безопасности
- [ ] 2.8.2 Расширить isValidCondition с проверками
- [ ] 2.8.3 Добавить isFieldAllowed (whitelist)
- [ ] 2.8.4 Добавить validateOperatorValue
- [ ] 2.8.5 Добавить sanitizeValue
- [ ] 2.8.6 Написать тесты безопасности
```

---

### 5. ✅ Добавить миграцию фильтров в Фазу 3

**Файл:** `.ai-notes/phases/03-filter-crud.md`

**Добавить задачу 3.6:**

```markdown
## 3.6 Миграция и валидация старых фильтров

### Цель
Обеспечить совместимость при изменении схемы модели или формата фильтров.

### Задачи
- [ ] 3.6.1 Определить стратегию миграции
- [ ] 3.6.2 Реализовать валидацию фильтра при загрузке
- [ ] 3.6.3 Автоматическая конвертация deprecated операторов
- [ ] 3.6.4 UI для ручной миграции несовместимых фильтров

### Реализация

\`\`\`typescript
// helpers/filterMigration.ts

export class FilterMigration {
  /**
   * Проверить актуальность фильтра
   */
  static isFilterValid(
    filter: FilterAPAttributes,
    currentModelSchema: any
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 1. Проверка версии
    if (!filter.version || filter.version < FILTER_FORMAT_VERSION) {
      errors.push(\`Outdated filter format version \${filter.version}\`);
    }
    
    // 2. Проверка существования модели
    if (!currentModelSchema) {
      errors.push(\`Model '\${filter.modelName}' no longer exists\`);
    }
    
    // 3. Проверка полей в условиях
    const invalidFields = this.checkFieldsExist(
      filter.conditions,
      currentModelSchema
    );
    if (invalidFields.length > 0) {
      errors.push(\`Invalid fields: \${invalidFields.join(', ')}\`);
    }
    
    return {
      valid: errors.length === 0,
      errors
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
    
    return migrated;
  }
  
  /**
   * Проверка существования полей
   */
  private static checkFieldsExist(
    conditions: FilterCondition[],
    schema: any,
    invalidFields: string[] = []
  ): string[] {
    conditions.forEach(cond => {
      if (cond.children) {
        this.checkFieldsExist(cond.children, schema, invalidFields);
      } else if (cond.field && !(cond.field in schema.attributes)) {
        invalidFields.push(cond.field);
      }
    });
    
    return invalidFields;
  }
}

// Использование при загрузке фильтра:
const filter = await FilterAP.findById(id);

const validation = FilterMigration.isFilterValid(
  filter,
  dataAccessor.getModelDefinition(filter.modelName)
);

if (!validation.valid) {
  // Попытка автомиграции
  const migrated = FilterMigration.migrateFilter(filter);
  
  const revalidation = FilterMigration.isFilterValid(
    migrated,
    dataAccessor.getModelDefinition(filter.modelName)
  );
  
  if (revalidation.valid) {
    // Сохранить мигрированную версию
    await filter.update(migrated);
    console.log(\`✓ Filter #\${id} migrated successfully\`);
  } else {
    // Требуется ручная миграция
    throw new Error(
      \`Filter #\${id} cannot be auto-migrated: \${validation.errors.join(', ')}\`
    );
  }
}
\`\`\`

### UI для миграции

Добавить в админку раздел "Устаревшие фильтры":
- Список фильтров с ошибками валидации
- Кнопка "Попробовать автомиграцию"
- Редактор для ручной правки условий
- Возможность удалить несовместимые фильтры
```

---

## 📋 Средний приоритет (P2)

### 6. ⚠️ Документировать примеры кастомных условий

**Файл:** `.ai-notes/phases/12-custom-conditions.md`

**Добавить раздел "Примеры реализации":**

```markdown
## Примеры кастомных условий

### 1. Regex Matcher (уже есть через оператор 'regex')

Для более сложных случаев:

\`\`\`typescript
CustomConditionRegistry.register('advancedRegex', {
  name: 'Advanced Regex',
  description: 'Regex with flags support',
  isApplicable: (modelName, field) => {
    return true; // Применимо к любому текстовому полю
  },
  transform: (field, value, dataAccessor) => {
    // value = { pattern: string, flags: string }
    const { pattern, flags } = value;
    
    if (dataAccessor.getDialect() === 'postgres') {
      // PostgreSQL regex с флагами
      const operator = flags.includes('i') ? '~*' : '~';
      return Sequelize.literal(\`"\${field}" \${operator} :pattern\`);
    }
    
    throw new Error('Advanced regex only supported in PostgreSQL');
  },
  validate: (value) => {
    if (!value.pattern) {
      return { valid: false, error: 'Pattern is required' };
    }
    try {
      new RegExp(value.pattern, value.flags || '');
      return { valid: true };
    } catch (e) {
      return { valid: false, error: \`Invalid regex: \${e.message}\` };
    }
  }
});
\`\`\`

### 2. Geospatial Queries

\`\`\`typescript
CustomConditionRegistry.register('geoWithin', {
  name: 'Geo Within Radius',
  description: 'Find points within radius',
  isApplicable: (modelName, field) => {
    const model = dataAccessor.getModelDefinition(modelName);
    return model.attributes[field]?.type === 'geometry';
  },
  transform: (field, value, dataAccessor) => {
    // value = { lat, lng, radiusKm }
    const { lat, lng, radiusKm } = value;
    
    if (dataAccessor.getDialect() === 'postgres') {
      return Sequelize.literal(
        \`ST_DWithin(
          "\${field}"::geography,
          ST_MakePoint(:lng, :lat)::geography,
          :radius
        )\`
      );
    }
    
    // MySQL fallback
    return Sequelize.literal(
      \`ST_Distance_Sphere(
        "\${field}",
        POINT(:lng, :lat)
      ) <= :radius\`
    );
  }
});
\`\`\`

### 3. Array Operations (PostgreSQL)

\`\`\`typescript
CustomConditionRegistry.register('arrayContains', {
  name: 'Array Contains',
  description: 'Check if array contains value',
  isApplicable: (modelName, field) => {
    const model = dataAccessor.getModelDefinition(modelName);
    return model.attributes[field]?.type === 'array';
  },
  transform: (field, value, dataAccessor) => {
    if (dataAccessor.getDialect() !== 'postgres') {
      throw new Error('Array operations only supported in PostgreSQL');
    }
    
    return Sequelize.literal(\`:value = ANY("\${field}")\`);
  }
});
\`\`\`
```

---

## ✅ Чек-лист перед началом Фазы 1

- [ ] Все изменения из раздела P0-P1 внесены в план
- [ ] Создана задача 2.8 "Валидация безопасности"
- [ ] Создана задача 3.6 "Миграция фильтров"
- [ ] Обновлены типы FilterCondition и FilterOperator
- [ ] Добавлено поле version в FilterAPAttributes
- [ ] Проверено соответствие плана и ТЗ (см. TECHNICAL_SPECIFICATION_COMPLIANCE.md)

---

## 📊 Оценка времени на внесение изменений

| Изменение | Время |
|-----------|-------|
| 1. Добавить NOT в logic | 5 мин |
| 2. Расширить операторы (ilike, regex) | 10 мин |
| 3. Добавить версионирование | 15 мин |
| 4. Написать секцию 2.8 (безопасность) | 30 мин |
| 5. Написать секцию 3.6 (миграция) | 30 мин |
| 6. Примеры custom conditions | 20 мин |

**Итого:** ~1.5 часа на обновление документации

---

## 🎯 После внесения изменений

1. Обновить `PROGRESS.md` с новыми задачами
2. Пометить этот чек-лист как выполненный
3. Начать реализацию Фазы 1

---

**Статус:** ⏳ Ожидает выполнения  
**Ответственный:** AI Agent / Lead Developer  
**Deadline:** Перед началом Фазы 1
