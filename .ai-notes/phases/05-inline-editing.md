# Фаза 5: Inline редактирование

**Приоритет:** P2
**Зависимости:** Фаза 4
**Статус:** `[x]` Завершено

> **💡 ПСЕВДОКОД:** Все примеры кода в этой фазе — **ПСЕВДОКОД в стиле JavaScript**. Интерфейсы и компоненты показаны для иллюстрации.

---

## Цель

Дать возможность редактировать записи прямо из списка для полей, которые это поддерживают.
Используется DataAccessor для контроля прав доступа на уровне записей.

---

## Задачи

- [ ] 5.1 Добавить `inlineEditable` в конфигурацию полей модели
- [ ] 5.2 Создать React компоненты inline-редакторов
- [ ] 5.3 API endpoint для обновления одного поля
- [ ] 5.4 Использование DataAccessor для проверки прав доступа
- [ ] 5.5 Поддержка типов: boolean, string, number, select/enum
- [ ] 5.6 Валидация на клиенте и сервере
- [ ] 5.7 Batch update (опционально)
- [ ] 5.8 Unit тесты (80%+ coverage)
  - [ ] 5.8.1 InlineEditor components (boolean, string, number, select)
  - [ ] 5.8.2 Validation (client + server)
  - [ ] 5.8.3 InlineEditService.updateField()
  - [ ] 5.8.4 DataAccessor.canEdit() integration
  - [ ] 5.8.5 Permissions check
  - [ ] 5.8.6 Error handling
- [ ] 5.9 Integration тесты
  - [ ] 5.9.1 Update через API endpoint
  - [ ] 5.9.2 Batch update
  - [ ] 5.9.3 Optimistic UI updates
  - [ ] 5.9.4 Rollback on error
- [ ] 5.10 E2E тесты
  - [ ] 5.10.1 Edit boolean field
  - [ ] 5.10.2 Edit string field with validation
  - [ ] 5.10.3 Edit select field
  - [ ] 5.10.4 Batch edit multiple records

---

## 5.1 Конфигурация в модели

**Файл:** `src/interfaces/adminpanelConfig.ts` (расширить)

```typescript
interface FieldConfig {
  // ... существующие поля

  /**
   * Разрешить inline-редактирование в списке
   */
  inlineEditable?: boolean;

  /**
   * Дополнительная конфигурация inline-редактора
   */
  inlineEditConfig?: {
    // Для number
    min?: number;
    max?: number;
    step?: number;

    // Для string
    maxLength?: number;
    pattern?: string;

    // Для любого типа
    confirmChange?: boolean;  // Требовать подтверждения
  };
}
```

**Пример использования:**

```typescript
// В конфиге модели:
fields: {
  status: {
    type: 'select',
    title: 'Status',
    isIn: {
      draft: 'Draft',
      published: 'Published',
      archived: 'Archived'
    },
    inlineEditable: true
  },
  isActive: {
    type: 'boolean',
    title: 'Active',
    inlineEditable: true
  },
  priority: {
    type: 'number',
    title: 'Priority',
    inlineEditable: true,
    inlineEditConfig: {
      min: 1,
      max: 10
    }
  },
  title: {
    type: 'string',
    title: 'Title',
    inlineEditable: true,
    inlineEditConfig: {
      maxLength: 100
    }
  }
}
```

---

## 5.2 API endpoint

**Файл:** `src/controllers/inlineEdit.ts`

```typescript
import { ReqType, ResType } from '../interfaces/types';

export const InlineEditController = {
  /**
   * PATCH /adminizer/model/:modelName/:id/field/:fieldName
   */
  async updateField(req: ReqType, res: ResType) {
    try {
      const { modelName, id, fieldName } = req.params;
      const { value } = req.body;

      // Проверка модели
      const modelConfig = req.adminizer.config.models[modelName];
      if (!modelConfig) {
        return res.status(404).json({
          success: false,
          error: 'Model not found'
        });
      }

      // Проверка поля
      const fieldConfig = modelConfig.fields[fieldName];
      if (!fieldConfig) {
        return res.status(404).json({
          success: false,
          error: 'Field not found'
        });
      }

      // Проверка что поле разрешено редактировать inline
      if (!fieldConfig.inlineEditable) {
        return res.status(403).json({
          success: false,
          error: 'Field is not editable inline'
        });
      }

      // Проверка прав доступа к записи
      const model = req.adminizer.modelHandler.getModel(modelConfig.model);
      const record = await model.findOne({ where: { id } });

      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Record not found'
        });
      }

      // Проверка DataAccessor (права на запись)
      const dataAccessor = new DataAccessor(req.adminizer, req.user, modelConfig);
      if (!dataAccessor.canEdit(record)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Валидация значения
      const validationError = validateInlineValue(value, fieldConfig);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError
        });
      }

      // Сохранить старое значение для истории
      const oldValue = record[fieldName];

      // Обновление
      await model.updateOne({ id }, { [fieldName]: value });

      // Запись в историю (если включена)
      if (req.adminizer.config.history?.enabled) {
        await req.adminizer.historyHandler.saveHistory({
          action: 'update',
          modelName,
          recordId: id,
          userId: req.user.id,
          changes: {
            [fieldName]: {
              old: oldValue,
              new: value
            }
          }
        });
      }

      // Получить обновлённую запись
      const updated = await model.findOne({ where: { id } });

      return res.json({
        success: true,
        data: {
          id,
          [fieldName]: updated[fieldName]
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * PATCH /adminizer/model/:modelName/batch
   * Batch update для множественного редактирования
   */
  async batchUpdate(req: ReqType, res: ResType) {
    try {
      const { modelName } = req.params;
      const { updates } = req.body;
      // updates: [{ id, fieldName, value }, ...]

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Updates array is required'
        });
      }

      const modelConfig = req.adminizer.config.models[modelName];
      if (!modelConfig) {
        return res.status(404).json({
          success: false,
          error: 'Model not found'
        });
      }

      const model = req.adminizer.modelHandler.getModel(modelConfig.model);
      const results: any[] = [];
      const errors: any[] = [];

      for (const update of updates) {
        try {
          const { id, fieldName, value } = update;

          const fieldConfig = modelConfig.fields[fieldName];
          if (!fieldConfig?.inlineEditable) {
            errors.push({ id, fieldName, error: 'Field not editable' });
            continue;
          }

          await model.updateOne({ id }, { [fieldName]: value });
          results.push({ id, fieldName, success: true });
        } catch (err) {
          errors.push({ id: update.id, fieldName: update.fieldName, error: err.message });
        }
      }

      return res.json({
        success: errors.length === 0,
        results,
        errors
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

/**
 * Валидация значения для inline редактирования
 */
function validateInlineValue(value: any, fieldConfig: FieldConfig): string | null {
  const config = fieldConfig.inlineEditConfig || {};

  switch (fieldConfig.type) {
    case 'boolean':
      if (typeof value !== 'boolean') {
        return 'Value must be boolean';
      }
      break;

    case 'number':
    case 'integer':
    case 'float':
      if (typeof value !== 'number' || isNaN(value)) {
        return 'Value must be a number';
      }
      if (config.min !== undefined && value < config.min) {
        return `Value must be at least ${config.min}`;
      }
      if (config.max !== undefined && value > config.max) {
        return `Value must be at most ${config.max}`;
      }
      break;

    case 'string':
    case 'text':
      if (typeof value !== 'string') {
        return 'Value must be a string';
      }
      if (config.maxLength && value.length > config.maxLength) {
        return `Value must be at most ${config.maxLength} characters`;
      }
      if (config.pattern && !new RegExp(config.pattern).test(value)) {
        return 'Value does not match required pattern';
      }
      break;

    case 'select':
      if (fieldConfig.isIn && !Object.keys(fieldConfig.isIn).includes(String(value))) {
        return 'Invalid option selected';
      }
      break;
  }

  return null;
}
```

---

## 5.3 React компоненты

**Файл:** `react-app/src/components/InlineEdit/InlineEditCell.tsx`

```tsx
import React, { useState, useRef, useEffect } from 'react';

interface InlineEditCellProps {
  value: any;
  recordId: number;
  fieldName: string;
  fieldConfig: {
    type: string;
    title: string;
    isIn?: Record<string, string>;
    inlineEditConfig?: {
      min?: number;
      max?: number;
      maxLength?: number;
      confirmChange?: boolean;
    };
  };
  onSave: (recordId: number, fieldName: string, value: any) => Promise<void>;
  disabled?: boolean;
}

export const InlineEditCell: React.FC<InlineEditCellProps> = ({
  value,
  recordId,
  fieldName,
  fieldConfig,
  onSave,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    if (fieldConfig.inlineEditConfig?.confirmChange) {
      if (!confirm(`Change ${fieldConfig.title} to "${editValue}"?`)) {
        setEditValue(value);
        setIsEditing(false);
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(recordId, fieldName, editValue);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Boolean - всегда показываем checkbox
  if (fieldConfig.type === 'boolean') {
    return (
      <div className="inline-edit-cell inline-edit-boolean">
        <input
          type="checkbox"
          checked={!!editValue}
          onChange={(e) => {
            setEditValue(e.target.checked);
            onSave(recordId, fieldName, e.target.checked);
          }}
          disabled={disabled || isSaving}
          className="checkbox checkbox-sm"
        />
        {isSaving && <span className="loading loading-spinner loading-xs ml-1" />}
      </div>
    );
  }

  // Не редактируем - показываем значение
  if (!isEditing) {
    return (
      <div
        className={`inline-edit-cell inline-edit-display ${disabled ? '' : 'cursor-pointer hover:bg-gray-100'}`}
        onClick={() => !disabled && setIsEditing(true)}
        title={disabled ? '' : 'Click to edit'}
      >
        {renderValue(value, fieldConfig)}
        {!disabled && (
          <span className="inline-edit-hint ml-1 opacity-0 group-hover:opacity-50">
            ✏️
          </span>
        )}
      </div>
    );
  }

  // Редактирование
  return (
    <div className="inline-edit-cell inline-edit-active flex items-center gap-1">
      {fieldConfig.type === 'select' && fieldConfig.isIn ? (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="select select-bordered select-xs"
        >
          {Object.entries(fieldConfig.isIn).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      ) : fieldConfig.type === 'number' || fieldConfig.type === 'integer' ? (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(parseFloat(e.target.value))}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          min={fieldConfig.inlineEditConfig?.min}
          max={fieldConfig.inlineEditConfig?.max}
          className="input input-bordered input-xs w-20"
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          maxLength={fieldConfig.inlineEditConfig?.maxLength}
          className="input input-bordered input-xs"
        />
      )}

      {isSaving && <span className="loading loading-spinner loading-xs" />}

      <button
        onClick={handleCancel}
        disabled={isSaving}
        className="btn btn-ghost btn-xs"
      >
        ✕
      </button>

      {error && (
        <span className="text-error text-xs" title={error}>⚠️</span>
      )}
    </div>
  );
};

function renderValue(value: any, fieldConfig: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">—</span>;
  }

  if (fieldConfig.type === 'select' && fieldConfig.isIn) {
    return fieldConfig.isIn[value] || value;
  }

  return String(value);
}
```

---

## 5.4 Интеграция в таблицу списка

**Файл:** `react-app/src/components/List/ListTable.tsx`

```tsx
// В компоненте таблицы:

const handleInlineSave = async (recordId: number, fieldName: string, value: any) => {
  const response = await fetch(
    `/adminizer/model/${modelName}/${recordId}/field/${fieldName}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to save');
  }

  // Обновить данные в таблице
  setRecords(records.map(r =>
    r.id === recordId ? { ...r, [fieldName]: value } : r
  ));
};

// В рендере ячейки:
{column.isEditable ? (
  <InlineEditCell
    value={record[column.fieldName]}
    recordId={record.id}
    fieldName={column.fieldName}
    fieldConfig={fieldsConfig[column.fieldName]}
    onSave={handleInlineSave}
  />
) : (
  renderCellValue(record[column.fieldName], fieldsConfig[column.fieldName])
)}
```

---

## 5.5 Маршруты

**Файл:** `src/system/Router.ts`

```typescript
// Inline edit
app.patch(
  `${prefix}/model/:modelName/:id/field/:fieldName`,
  ...policyManager.bindPolicies(policies, InlineEditController.updateField)
);

app.patch(
  `${prefix}/model/:modelName/batch`,
  ...policyManager.bindPolicies(policies, InlineEditController.batchUpdate)
);
```

---

## Тесты

```typescript
describe('InlineEditController', () => {
  describe('PATCH /model/:modelName/:id/field/:fieldName', () => {
    it('should update boolean field', async () => {
      const response = await request(app)
        .patch('/adminizer/model/User/1/field/isActive')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: false });

      expect(response.status).toBe(200);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should reject non-editable field', async () => {
      const response = await request(app)
        .patch('/adminizer/model/User/1/field/createdAt')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: new Date() });

      expect(response.status).toBe(403);
    });

    it('should validate number range', async () => {
      const response = await request(app)
        .patch('/adminizer/model/User/1/field/priority')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 999 }); // max is 10

      expect(response.status).toBe(400);
    });
  });
});
```

---

## Checklist

- [ ] Конфигурация `inlineEditable` добавлена
- [ ] API endpoint работает
- [ ] React компоненты созданы
- [ ] Поддержка boolean, string, number, select
- [ ] Валидация работает
- [ ] История записывается
- [ ] Тесты проходят

---

## Заметки

_Добавляйте заметки по ходу работы_
