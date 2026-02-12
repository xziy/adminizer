# Фаза 4: Кастомизация колонок

**Приоритет:** P1
**Зависимости:** Фаза 3
**Статус:** `[x]` Завершено

> **💡 ПСЕВДОКОД:** Все React-компоненты и TypeScript код здесь — **ПСЕВДОКОД в стиле JavaScript**. Адаптируйте под реальные компоненты проекта.

---

## Цель

Дать возможность выбирать какие поля отображать в списке и сохранять эту конфигурацию для фильтра.

---

## Задачи

- [ ] 4.1 UI компонент выбора колонок
- [ ] 4.2 Drag-n-drop сортировка колонок
- [ ] 4.3 Сохранение конфигурации в FilterColumnAP
- [ ] 4.4 Применение конфигурации при отображении списка
- [ ] 4.5 Ширина колонок (опционально)
- [ ] 4.6 Unit тесты (80%+ coverage)
  - [ ] 4.6.1 ColumnSelector component
  - [ ] 4.6.2 Drag-n-drop ordering
  - [ ] 4.6.3 FilterColumnAP CRUD
  - [ ] 4.6.4 Column visibility toggle
  - [ ] 4.6.5 Column width validation
- [ ] 4.7 Integration тесты
  - [ ] 4.7.1 Save column config to DB
  - [ ] 4.7.2 Apply config to list view
  - [ ] 4.7.3 Per-user column overrides
- [ ] 4.8 E2E тесты
  - [ ] 4.8.1 Add/remove columns
  - [ ] 4.8.2 Reorder columns
  - [ ] 4.8.3 Resize columns

---

## 4.1 ColumnSelector компонент

**Файл:** `react-app/src/components/FilterBuilder/ColumnSelector.tsx`

```tsx
import React, { useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from 'react-beautiful-dnd';

export interface ColumnConfig {
  fieldName: string;
  order: number;
  isVisible: boolean;
  isEditable: boolean;
  width?: number;
}

export interface FieldInfo {
  name: string;
  title: string;
  type: string;
  inlineEditable?: boolean;
}

interface ColumnSelectorProps {
  availableFields: FieldInfo[];
  selectedColumns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  availableFields,
  selectedColumns,
  onChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Поля которые ещё не выбраны
  const unselectedFields = availableFields.filter(
    field => !selectedColumns.some(col => col.fieldName === field.name)
  );

  const filteredUnselected = unselectedFields.filter(field =>
    field.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(selectedColumns);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    // Обновить порядок
    const updated = items.map((item, index) => ({
      ...item,
      order: index
    }));

    onChange(updated);
  };

  const addColumn = (fieldName: string) => {
    const field = availableFields.find(f => f.name === fieldName);
    if (!field) return;

    onChange([
      ...selectedColumns,
      {
        fieldName,
        order: selectedColumns.length,
        isVisible: true,
        isEditable: field.inlineEditable || false
      }
    ]);
  };

  const removeColumn = (fieldName: string) => {
    const filtered = selectedColumns.filter(col => col.fieldName !== fieldName);
    // Пересчитать порядок
    const reordered = filtered.map((col, index) => ({
      ...col,
      order: index
    }));
    onChange(reordered);
  };

  const toggleEditable = (fieldName: string) => {
    onChange(
      selectedColumns.map(col =>
        col.fieldName === fieldName
          ? { ...col, isEditable: !col.isEditable }
          : col
      )
    );
  };

  const toggleVisible = (fieldName: string) => {
    onChange(
      selectedColumns.map(col =>
        col.fieldName === fieldName
          ? { ...col, isVisible: !col.isVisible }
          : col
      )
    );
  };

  const getFieldTitle = (fieldName: string): string => {
    return availableFields.find(f => f.name === fieldName)?.title || fieldName;
  };

  const canBeEditable = (fieldName: string): boolean => {
    return availableFields.find(f => f.name === fieldName)?.inlineEditable || false;
  };

  return (
    <div className="column-selector flex gap-4">
      {/* Доступные поля */}
      <div className="available-fields w-1/2">
        <h4 className="font-medium mb-2">Available Fields</h4>

        <input
          type="text"
          placeholder="Search fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input input-bordered input-sm w-full mb-2"
        />

        <div className="fields-list max-h-64 overflow-y-auto border rounded p-2">
          {filteredUnselected.map(field => (
            <div
              key={field.name}
              className="field-item flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => addColumn(field.name)}
            >
              <span className="text-sm">
                {field.title}
                <span className="text-gray-400 text-xs ml-1">
                  ({field.type})
                </span>
              </span>
              <button className="btn btn-xs btn-ghost">+</button>
            </div>
          ))}

          {filteredUnselected.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-4">
              {searchTerm ? 'No matching fields' : 'All fields selected'}
            </div>
          )}
        </div>
      </div>

      {/* Выбранные колонки */}
      <div className="selected-columns w-1/2">
        <h4 className="font-medium mb-2">
          Selected Columns ({selectedColumns.length})
        </h4>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="selected-columns">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="columns-list max-h-64 overflow-y-auto border rounded p-2"
              >
                {selectedColumns
                  .sort((a, b) => a.order - b.order)
                  .map((column, index) => (
                    <Draggable
                      key={column.fieldName}
                      draggableId={column.fieldName}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`column-item flex items-center gap-2 p-2 rounded mb-1 ${
                            snapshot.isDragging ? 'bg-blue-100' : 'bg-gray-50'
                          }`}
                        >
                          {/* Drag handle */}
                          <span
                            {...provided.dragHandleProps}
                            className="cursor-grab text-gray-400"
                          >
                            ⋮⋮
                          </span>

                          {/* Field name */}
                          <span className="flex-1 text-sm">
                            {getFieldTitle(column.fieldName)}
                          </span>

                          {/* Visible toggle */}
                          <button
                            onClick={() => toggleVisible(column.fieldName)}
                            className={`btn btn-xs ${
                              column.isVisible ? 'btn-primary' : 'btn-ghost'
                            }`}
                            title={column.isVisible ? 'Visible' : 'Hidden'}
                          >
                            👁
                          </button>

                          {/* Editable toggle (если поле поддерживает) */}
                          {canBeEditable(column.fieldName) && (
                            <button
                              onClick={() => toggleEditable(column.fieldName)}
                              className={`btn btn-xs ${
                                column.isEditable ? 'btn-secondary' : 'btn-ghost'
                              }`}
                              title={column.isEditable ? 'Editable' : 'Read-only'}
                            >
                              ✏️
                            </button>
                          )}

                          {/* Remove */}
                          <button
                            onClick={() => removeColumn(column.fieldName)}
                            className="btn btn-xs btn-ghost text-red-500"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}

                {selectedColumns.length === 0 && (
                  <div className="text-gray-400 text-sm text-center py-4">
                    No columns selected
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};
```

---

## 4.2 Интеграция с FilterBuilder

**Файл:** `react-app/src/components/FilterBuilder/FilterDialog.tsx`

```tsx
import React, { useState } from 'react';
import { FilterBuilder, FilterCondition } from './FilterBuilder';
import { ColumnSelector, ColumnConfig, FieldInfo } from './ColumnSelector';

interface FilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filter: FilterFormData) => void;
  modelName: string;
  fields: FieldInfo[];
  relations?: any[];
  initialData?: Partial<FilterFormData>;
}

interface FilterFormData {
  name: string;
  description?: string;
  conditions: FilterCondition[];
  columns: ColumnConfig[];
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
  visibility: 'private' | 'public' | 'groups';
  groupIds?: number[];
  apiEnabled: boolean;
  icon?: string;
  color?: string;
}

export const FilterDialog: React.FC<FilterDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  modelName,
  fields,
  relations = [],
  initialData
}) => {
  const [activeTab, setActiveTab] = useState<'conditions' | 'columns' | 'settings'>('conditions');

  const [formData, setFormData] = useState<FilterFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    conditions: initialData?.conditions || [],
    columns: initialData?.columns || fields.slice(0, 5).map((f, i) => ({
      fieldName: f.name,
      order: i,
      isVisible: true,
      isEditable: false
    })),
    sortField: initialData?.sortField,
    sortDirection: initialData?.sortDirection || 'ASC',
    visibility: initialData?.visibility || 'private',
    apiEnabled: initialData?.apiEnabled || false,
    icon: initialData?.icon,
    color: initialData?.color
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Filter name is required');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl">
        <h3 className="font-bold text-lg mb-4">
          {initialData ? 'Edit Filter' : 'Create Filter'}
        </h3>

        {/* Filter Name */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Filter Name *</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Active Premium Users"
            className="input input-bordered"
          />
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-4">
          <button
            className={`tab ${activeTab === 'conditions' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('conditions')}
          >
            Conditions
          </button>
          <button
            className={`tab ${activeTab === 'columns' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('columns')}
          >
            Columns
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content min-h-[300px]">
          {activeTab === 'conditions' && (
            <FilterBuilder
              fields={fields}
              relations={relations}
              initialConditions={formData.conditions}
              onChange={(conditions) => setFormData({ ...formData, conditions })}
            />
          )}

          {activeTab === 'columns' && (
            <ColumnSelector
              availableFields={fields}
              selectedColumns={formData.columns}
              onChange={(columns) => setFormData({ ...formData, columns })}
            />
          )}

          {activeTab === 'settings' && (
            <div className="settings-form space-y-4">
              {/* Description */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="textarea textarea-bordered"
                  rows={2}
                />
              </div>

              {/* Sort */}
              <div className="flex gap-4">
                <div className="form-control flex-1">
                  <label className="label">
                    <span className="label-text">Sort by</span>
                  </label>
                  <select
                    value={formData.sortField || ''}
                    onChange={(e) => setFormData({ ...formData, sortField: e.target.value })}
                    className="select select-bordered"
                  >
                    <option value="">Default</option>
                    {fields.map(f => (
                      <option key={f.name} value={f.name}>{f.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-control w-32">
                  <label className="label">
                    <span className="label-text">Direction</span>
                  </label>
                  <select
                    value={formData.sortDirection}
                    onChange={(e) => setFormData({
                      ...formData,
                      sortDirection: e.target.value as 'ASC' | 'DESC'
                    })}
                    className="select select-bordered"
                  >
                    <option value="ASC">Ascending</option>
                    <option value="DESC">Descending</option>
                  </select>
                </div>
              </div>

              {/* Visibility */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Visibility</span>
                </label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({
                    ...formData,
                    visibility: e.target.value as 'private' | 'public' | 'groups'
                  })}
                  className="select select-bordered"
                >
                  <option value="private">Private (only me)</option>
                  <option value="public">Public (everyone)</option>
                  <option value="groups">Specific groups</option>
                </select>
              </div>

              {/* API Access */}
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    checked={formData.apiEnabled}
                    onChange={(e) => setFormData({ ...formData, apiEnabled: e.target.checked })}
                    className="checkbox"
                  />
                  <span className="label-text">Enable API access (JSON/Atom)</span>
                </label>
              </div>

              {/* Icon & Color */}
              <div className="flex gap-4">
                <div className="form-control flex-1">
                  <label className="label">
                    <span className="label-text">Icon</span>
                  </label>
                  <input
                    type="text"
                    value={formData.icon || ''}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="filter_list"
                    className="input input-bordered"
                  />
                </div>
                <div className="form-control w-32">
                  <label className="label">
                    <span className="label-text">Color</span>
                  </label>
                  <input
                    type="color"
                    value={formData.color || '#3b82f6'}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="input input-bordered h-10"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {initialData ? 'Save Changes' : 'Create Filter'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 4.3 Применение колонок в списке

**Файл:** `src/controllers/list.ts` (модификация)

```typescript
// В методе list добавить обработку фильтра:

async function list(req: ReqType, res: ResType) {
  const { filterId } = req.query;

  let columns: ColumnConfig[] | null = null;

  // Если указан фильтр - загрузить его конфигурацию колонок
  if (filterId) {
    const filter = await req.adminizer.filterService.getWithAccess(
      parseInt(filterId as string),
      req.user
    );

    if (filter) {
      // Применить условия фильтра через ModernQueryBuilder
      // (условия будут применены при выполнении запроса через queryBuilder.execute())
      filterConditions = filter.conditions;

      // Загрузить конфигурацию колонок
      const columnModel = req.adminizer.modelHandler.getModel('FilterColumnAP');
      const filterColumns = await columnModel.find({
        where: { filterId: filter.id },
        sort: 'order ASC'
      });

      if (filterColumns.length > 0) {
        columns = filterColumns;
      }
    }
  }

  // Формирование списка полей для отображения
  const displayFields = columns
    ? columns
        .filter(c => c.isVisible)
        .map(c => ({
          name: c.fieldName,
          ...fieldsConfig[c.fieldName],
          isEditable: c.isEditable
        }))
    : Object.entries(fieldsConfig)
        .filter(([_, config]) => config.list !== false)
        .map(([name, config]) => ({ name, ...config }));

  // ... остальной код
}
```

---

## 4.4 Хранение ширины колонок (опционально)

```typescript
// В FilterColumnAP уже есть поле width

// На фронтенде можно добавить resize:
<th
  style={{ width: column.width ? `${column.width}px` : 'auto' }}
  onMouseDown={(e) => startResize(e, column.fieldName)}
>
  {column.title}
</th>

// При завершении resize - сохранять в API
const saveColumnWidth = async (fieldName: string, width: number) => {
  await api.updateFilterColumn(filterId, fieldName, { width });
};
```

---

## Тесты

```typescript
describe('ColumnSelector', () => {
  it('should add column to selected', () => {
    const { getByText } = render(
      <ColumnSelector
        availableFields={mockFields}
        selectedColumns={[]}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(getByText('Name'));

    expect(mockOnChange).toHaveBeenCalledWith([
      expect.objectContaining({ fieldName: 'name', order: 0 })
    ]);
  });

  it('should reorder columns on drag', () => {
    // ... drag-n-drop тест
  });

  it('should toggle editable flag', () => {
    // ...
  });
});
```

---

## Checklist

- [ ] ColumnSelector компонент создан
- [ ] Drag-n-drop работает
- [ ] Конфигурация сохраняется в БД
- [ ] Список отображает только выбранные колонки
- [ ] Порядок колонок соответствует конфигурации
- [ ] Тесты проходят

---

## Заметки

_Добавляйте заметки по ходу работы_
