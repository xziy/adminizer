# Фаза 9: Быстрые ссылки (Quick Links) в UI

## Приоритет: P2
## Статус: ⏳ Не начата
## Зависимости: Фаза 1, 3, NavigationAP

> **💡 ПСЕВДОКОД:** Все UI компоненты и API методы — **ПСЕВДОКОД в стиле JavaScript**. Реализуйте согласно паттернам проекта.

---

## 📋 Описание

Добавление сохранённых фильтров в быстрые ссылки навигации для удобного доступа:
- Интеграция с существующей системой навигации (NavigationAP)
- Drag-n-drop для упорядочивания
- Группировка фильтров
- Персональные и публичные ссылки

---

## 🎯 Цели

1. ✅ Добавление фильтров в Navigation
2. ✅ Управление порядком ссылок
3. ✅ Иконки для фильтров
4. ✅ Группировка по категориям
5. ✅ Badge с счётчиком результатов
6. ✅ Контекстное меню для быстрых действий

---

## ✅ Задачи

- [ ] 9.1 FilterNavigationService
- [ ] 9.2 FilterLinkGenerator
- [ ] 9.3 FilterNavigationController
- [ ] 9.4 React UI components
- [ ] 9.5 Unit тесты (75%+ coverage)
  - [ ] 9.5.1 FilterNavigationService.addToNavigation()
  - [ ] 9.5.2 FilterNavigationService.reorder()
  - [ ] 9.5.3 FilterLinkGenerator.generateUrl()
  - [ ] 9.5.4 Badge counter calculation
  - [ ] 9.5.5 Icon mapping
- [ ] 9.6 Integration тесты
  - [ ] 9.6.1 Add filter to NavigationAP
  - [ ] 9.6.2 Reorder navigation items
  - [ ] 9.6.3 Group filters by category
  - [ ] 9.6.4 Load navigation with filters
- [ ] 9.7 E2E тесты
  - [ ] 9.7.1 Add filter to quick links
  - [ ] 9.7.2 Drag-n-drop reorder
  - [ ] 9.7.3 Click quick link and apply filter
  - [ ] 9.7.4 View badge with count
  - [ ] 9.7.5 Context menu actions

---

## 📁 Структура файлов

```
src/
  lib/
    filter-navigation/
      FilterNavigationService.ts    # Сервис для работы с навигацией
      FilterLinkGenerator.ts        # Генератор ссылок
      
  controllers/
    filter-navigation/
      FilterNavigationController.ts # Контроллер навигации
      
  system/
    bindFilterNavigation.ts         # Привязка к Adminizer
    
  assets/
    ui/
      components/
        FilterQuickLinks.tsx        # Компонент быстрых ссылок
        FilterNavigationMenu.tsx    # Навигационное меню
```

---

## 🔧 Реализация

### 1. Filter Navigation Service

**Файл:** `src/lib/filter-navigation/FilterNavigationService.ts`

```typescript
import { DataAccessor } from '../DataAccessor';

export interface AddFilterToNavigationOptions {
  filterId: string;
  userId?: string;      // Если null - публичная ссылка
  groupId?: string;     // Для группового доступа
  icon?: string;
  customName?: string;  // Переопределить название фильтра
  position?: number;
  parentId?: string;    // Для вложенных меню
}

export class FilterNavigationService {
  private dataAccessor: DataAccessor;
  
  constructor(dataAccessor: DataAccessor) {
    this.dataAccessor = dataAccessor;
  }
  
  /**
   * Добавить фильтр в навигацию
   */
  async addFilterToNavigation(options: AddFilterToNavigationOptions) {
    const filter = await this.dataAccessor.findOne('FilterAP', {
      id: options.filterId
    });
    
    if (!filter) {
      throw new Error(`Filter ${options.filterId} not found`);
    }
    
    // Проверить существует ли уже
    const existing = await this.dataAccessor.findOne('NavigationAP', {
      filterRef: options.filterId,
      userId: options.userId || null
    });
    
    if (existing) {
      throw new Error('Filter already in navigation');
    }
    
    // Определить позицию
    let position = options.position;
    if (position === undefined) {
      const lastItem = await this.dataAccessor.findOne('NavigationAP', {
        userId: options.userId || null,
        sort: 'position DESC'
      });
      position = lastItem ? lastItem.position + 1 : 0;
    }
    
    // Создать запись в навигации
    const navigationItem = await this.dataAccessor.create('NavigationAP', {
      type: 'filter',
      filterRef: options.filterId,
      name: options.customName || filter.name,
      url: `/adminizer/filters/${filter.id}/results`,
      icon: options.icon || 'filter_alt',
      position,
      userId: options.userId || null,
      groupId: options.groupId,
      parentId: options.parentId,
      isActive: true
    });
    
    return navigationItem;
  }
  
  /**
   * Удалить фильтр из навигации
   */
  async removeFilterFromNavigation(filterId: string, userId?: string) {
    const item = await this.dataAccessor.findOne('NavigationAP', {
      filterRef: filterId,
      userId: userId || null
    });
    
    if (!item) {
      throw new Error('Filter not found in navigation');
    }
    
    await this.dataAccessor.destroy('NavigationAP', {
      id: item.id
    });
  }
  
  /**
   * Получить фильтры в навигации
   */
  async getNavigationFilters(userId?: string, groupId?: string) {
    const criteria: any = {
      type: 'filter',
      isActive: true
    };
    
    if (userId) {
      criteria.or = [
        { userId },
        { userId: null } // Публичные
      ];
      
      if (groupId) {
        criteria.or.push({ groupId });
      }
    } else {
      criteria.userId = null; // Только публичные
    }
    
    return this.dataAccessor.find('NavigationAP', {
      ...criteria,
      sort: 'position ASC'
    });
  }
  
  /**
   * Обновить порядок
   */
  async reorderFilters(userId: string, orderedIds: string[]) {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.dataAccessor.update('NavigationAP',
        { id: orderedIds[i], userId },
        { position: i }
      );
    }
  }
  
  /**
   * Обновить параметры ссылки
   */
  async updateFilterLink(
    navigationId: string,
    updates: {
      name?: string;
      icon?: string;
      parentId?: string;
    }
  ) {
    return this.dataAccessor.update('NavigationAP',
      { id: navigationId },
      updates
    );
  }
  
  /**
   * Создать группу фильтров
   */
  async createFilterGroup(
    name: string,
    userId?: string,
    icon?: string
  ) {
    const position = await this.getNextPosition(userId);
    
    return this.dataAccessor.create('NavigationAP', {
      type: 'group',
      name,
      icon: icon || 'folder',
      position,
      userId: userId || null,
      isActive: true
    });
  }
  
  /**
   * Получить следующую позицию
   */
  private async getNextPosition(userId?: string): Promise<number> {
    const lastItem = await this.dataAccessor.findOne('NavigationAP', {
      userId: userId || null,
      sort: 'position DESC'
    });
    
    return lastItem ? lastItem.position + 1 : 0;
  }
}
```

---

### 2. Расширение модели NavigationAP

Необходимо добавить поля в существующую модель `NavigationAP`:

```typescript
// В src/models/NavigationAP.ts добавить:

{
  // Тип элемента
  type: {
    type: 'string',
    isIn: ['link', 'group', 'filter'], // Добавляем 'filter'
    defaultsTo: 'link',
    columnName: 'type'
  },
  
  // Ссылка на фильтр (если type='filter')
  filterRef: {
    model: 'FilterAP',
    allowNull: true,
    columnName: 'filter_ref'
  },
  
  // ID пользователя (null = публичная)
  userId: {
    model: 'UserAP',
    allowNull: true,
    columnName: 'user_id'
  },
  
  // ID группы (для группового доступа)
  groupId: {
    model: 'GroupAP',
    allowNull: true,
    columnName: 'group_id'
  },
  
  // Показывать badge с количеством
  showBadge: {
    type: 'boolean',
    defaultsTo: false,
    columnName: 'show_badge'
  },
  
  // Кэшированное количество (для badge)
  cachedCount: {
    type: 'number',
    allowNull: true,
    columnName: 'cached_count'
  },
  
  // Последнее обновление кэша
  countCachedAt: {
    type: 'ref',
    columnType: 'datetime',
    allowNull: true,
    columnName: 'count_cached_at'
  }
}
```

---

### 3. Filter Link Generator

**Файл:** `src/lib/filter-navigation/FilterLinkGenerator.ts`

```typescript
import { DataAccessor } from '../DataAccessor';

export class FilterLinkGenerator {
  private dataAccessor: DataAccessor;
  
  constructor(dataAccessor: DataAccessor) {
    this.dataAccessor = dataAccessor;
  }
  
  /**
   * Сгенерировать URL для фильтра
   */
  generateFilterUrl(filterId: string, format?: string): string {
    const base = `/adminizer/filters/${filterId}/results`;
    return format ? `${base}?format=${format}` : base;
  }
  
  /**
   * Обновить счётчик для badge
   */
  async updateFilterBadgeCount(navigationId: string) {
    const navItem = await this.dataAccessor.findOne('NavigationAP', {
      id: navigationId
    });
    
    if (!navItem || navItem.type !== 'filter' || !navItem.filterRef) {
      return;
    }
    
    const filter = await this.dataAccessor.findOne('FilterAP', {
      id: navItem.filterRef
    });
    
    if (!filter) {
      return;
    }
    
    // Подсчитать количество результатов
    const count = await this.dataAccessor.count(
      filter.modelName,
      filter.criteria
    );
    
    // Обновить кэш
    await this.dataAccessor.update('NavigationAP',
      { id: navigationId },
      {
        cachedCount: count,
        countCachedAt: new Date()
      }
    );
    
    return count;
  }
  
  /**
   * Обновить все badge счётчики
   */
  async updateAllBadgeCounts(userId?: string) {
    const filters = await this.dataAccessor.find('NavigationAP', {
      type: 'filter',
      showBadge: true,
      userId: userId || null,
      isActive: true
    });
    
    for (const navItem of filters) {
      await this.updateFilterBadgeCount(navItem.id);
    }
  }
}
```

---

### 4. Controller

**Файл:** `src/controllers/filter-navigation/FilterNavigationController.ts`

```typescript
import { ReqType, ResType } from '../../interfaces/types';
import { FilterNavigationService } from '../../lib/filter-navigation/FilterNavigationService';
import { FilterLinkGenerator } from '../../lib/filter-navigation/FilterLinkGenerator';

export class FilterNavigationController {
  private navigationService: FilterNavigationService;
  private linkGenerator: FilterLinkGenerator;
  
  constructor(
    navigationService: FilterNavigationService,
    linkGenerator: FilterLinkGenerator
  ) {
    this.navigationService = navigationService;
    this.linkGenerator = linkGenerator;
  }
  
  /**
   * POST /api/adminizer/filters/:id/add-to-navigation
   */
  async addToNavigation(req: ReqType, res: ResType) {
    try {
      const { id } = req.params;
      const { icon, customName, parentId } = req.body;
      const userId = req.user?.id;
      
      const navItem = await this.navigationService.addFilterToNavigation({
        filterId: id,
        userId,
        icon,
        customName,
        parentId
      });
      
      return res.json(navItem);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
  
  /**
   * DELETE /api/adminizer/filters/:id/remove-from-navigation
   */
  async removeFromNavigation(req: ReqType, res: ResType) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      await this.navigationService.removeFilterFromNavigation(id, userId);
      
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
  
  /**
   * GET /api/adminizer/navigation/filters
   */
  async getNavigationFilters(req: ReqType, res: ResType) {
    try {
      const userId = req.user?.id;
      const groupId = req.user?.groupId;
      
      const filters = await this.navigationService.getNavigationFilters(userId, groupId);
      
      return res.json(filters);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * POST /api/adminizer/navigation/filters/reorder
   */
  async reorder(req: ReqType, res: ResType) {
    try {
      const { orderedIds } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      await this.navigationService.reorderFilters(userId, orderedIds);
      
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
  
  /**
   * PUT /api/adminizer/navigation/:id
   */
  async updateLink(req: ReqType, res: ResType) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updated = await this.navigationService.updateFilterLink(id, updates);
      
      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
  
  /**
   * POST /api/adminizer/navigation/groups
   */
  async createGroup(req: ReqType, res: ResType) {
    try {
      const { name, icon } = req.body;
      const userId = req.user?.id;
      
      const group = await this.navigationService.createFilterGroup(name, userId, icon);
      
      return res.json(group);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
  
  /**
   * POST /api/adminizer/navigation/:id/update-badge
   */
  async updateBadge(req: ReqType, res: ResType) {
    try {
      const { id } = req.params;
      
      const count = await this.linkGenerator.updateFilterBadgeCount(id);
      
      return res.json({ count });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
```

---

## 🎨 Frontend UI

### Filter Quick Links Component

```tsx
// FilterQuickLinks.tsx
import { useState, useEffect } from 'react';
import { FilterIcon, Plus, Settings, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface FilterLink {
  id: string;
  name: string;
  icon: string;
  url: string;
  cachedCount?: number;
  showBadge: boolean;
  filterRef: string;
}

export function FilterQuickLinks() {
  const [links, setLinks] = useState<FilterLink[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    loadLinks();
  }, []);
  
  const loadLinks = async () => {
    const response = await fetch('/api/adminizer/navigation/filters');
    const data = await response.json();
    setLinks(data);
  };
  
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(links);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    setLinks(items);
    
    // Сохранить новый порядок
    await fetch('/api/adminizer/navigation/filters/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderedIds: items.map(item => item.id)
      })
    });
  };
  
  const removeLink = async (linkId: string, filterId: string) => {
    await fetch(`/api/adminizer/filters/${filterId}/remove-from-navigation`, {
      method: 'DELETE'
    });
    loadLinks();
  };
  
  return (
    <div className="filter-quick-links">
      <div className="header">
        <h3>Quick Filters</h3>
        <button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Done' : <Settings size={16} />}
        </button>
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="filter-links">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="links-list"
            >
              {links.map((link, index) => (
                <Draggable
                  key={link.id}
                  draggableId={link.id}
                  index={index}
                  isDragDisabled={!isEditing}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="filter-link-item"
                    >
                      {isEditing && (
                        <div {...provided.dragHandleProps}>
                          <GripVertical size={16} />
                        </div>
                      )}
                      
                      <a href={link.url} className="link-content">
                        <span className="material-icons">{link.icon}</span>
                        <span className="link-name">{link.name}</span>
                        {link.showBadge && link.cachedCount !== undefined && (
                          <span className="badge">{link.cachedCount}</span>
                        )}
                      </a>
                      
                      {isEditing && (
                        <button
                          onClick={() => removeLink(link.id, link.filterRef)}
                          className="remove-btn"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
```

---

### Add to Quick Links Button

```tsx
// AddToQuickLinksButton.tsx
import { useState } from 'react';
import { Star, StarOff } from 'lucide-react';

interface AddToQuickLinksButtonProps {
  filterId: string;
  isInNavigation: boolean;
}

export function AddToQuickLinksButton({
  filterId,
  isInNavigation
}: AddToQuickLinksButtonProps) {
  const [inNav, setInNav] = useState(isInNavigation);
  const [loading, setLoading] = useState(false);
  
  const toggle = async () => {
    setLoading(true);
    
    try {
      if (inNav) {
        await fetch(`/api/adminizer/filters/${filterId}/remove-from-navigation`, {
          method: 'DELETE'
        });
        setInNav(false);
      } else {
        await fetch(`/api/adminizer/filters/${filterId}/add-to-navigation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        setInNav(true);
      }
    } catch (error) {
      console.error('Failed to toggle navigation:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`add-to-nav-btn ${inNav ? 'active' : ''}`}
      title={inNav ? 'Remove from Quick Links' : 'Add to Quick Links'}
    >
      {inNav ? <Star size={16} /> : <StarOff size={16} />}
      {inNav ? 'In Quick Links' : 'Add to Quick Links'}
    </button>
  );
}
```

---

## 🎨 Стили

```scss
// filter-quick-links.scss
.filter-quick-links {
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    
    h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }
  }
  
  .links-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .filter-link-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: #f9fafb;
    border-radius: 6px;
    transition: all 0.2s;
    
    &:hover {
      background: #f3f4f6;
    }
    
    .link-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      text-decoration: none;
      color: inherit;
      
      .material-icons {
        font-size: 18px;
        color: #6b7280;
      }
      
      .link-name {
        flex: 1;
        font-size: 0.875rem;
      }
      
      .badge {
        background: #3b82f6;
        color: white;
        padding: 0.125rem 0.5rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
      }
    }
    
    .remove-btn {
      opacity: 0;
      transition: opacity 0.2s;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 4px;
      width: 24px;
      height: 24px;
      cursor: pointer;
      
      &:hover {
        background: #dc2626;
      }
    }
    
    &:hover .remove-btn {
      opacity: 1;
    }
  }
}

.add-to-nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }
  
  &.active {
    background: #fef3c7;
    border-color: #fbbf24;
    color: #92400e;
    
    svg {
      fill: #fbbf24;
    }
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

---

## ✅ Чеклист готовности

- [ ] Расширение модели NavigationAP
- [ ] FilterNavigationService
- [ ] FilterLinkGenerator с badge счётчиками
- [ ] FilterNavigationController
- [ ] Frontend компонент FilterQuickLinks
- [ ] Drag-n-drop переупорядочивание
- [ ] AddToQuickLinksButton
- [ ] Группировка фильтров
- [ ] Контекстное меню
- [ ] Тесты
- [ ] Документация

---

## 🚀 Следующие шаги

После завершения:
1. ✅ Добавить иконки для фильтров (библиотека)
2. ✅ Синхронизация badge счётчиков в реальном времени
3. ✅ Экспорт/импорт навигационных настроек
