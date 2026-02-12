# Фаза 13: Права доступа к фильтрам

## Приоритет: P0
## Статус: ✅ Завершена
## Зависимости: Фаза 1, 3, AccessRights система

> **💡 ПСЕВДОКОД:** Все примеры проверки прав и токенов — **ПСЕВДОКОД в стиле JavaScript**. Адаптируйте под реальную систему AccessRights.

---

## 📋 Описание

Комплексная система прав доступа для фильтров:
- Личные фильтры (только владелец)
- Публичные фильтры (доступны всем)
- Групповые фильтры (доступны группе)
- Кастомные разрешения (read/edit/delete/share)
- Делегирование прав

---

## 🎯 Цели

1. ✅ Модель прав доступа FilterPermissionAP
2. ✅ Проверка прав (can read/edit/delete)
3. ✅ Sharing фильтров с пользователями/группами
4. ✅ Наследование прав от моделей
5. ✅ Audit log изменений прав
6. ✅ UI управления правами

---

## ✅ Задачи

- [ ] 13.1 FilterPermissionAP модель
- [ ] 13.2 FilterPermissionManager
- [ ] 13.3 FilterAccessControl
- [ ] 13.4 FilterSharingService
- [ ] 13.5 filterAccessControl middleware
- [x] 13.6 Audit logging
- [x] 13.7 React UI components
- [ ] 13.8 Unit тесты (90%+ coverage - CRITICAL)
  - [ ] 13.8.1 FilterPermissionManager.grant()
  - [ ] 13.8.2 FilterPermissionManager.revoke()
  - [ ] 13.8.3 FilterAccessControl.canRead()
  - [ ] 13.8.4 FilterAccessControl.canEdit()
  - [ ] 13.8.5 FilterAccessControl.canDelete()
  - [ ] 13.8.6 FilterSharingService.shareWithUser()
  - [ ] 13.8.7 FilterSharingService.shareWithGroup()
  - [ ] 13.8.8 Audit log creation
- [x] 13.9 Integration тесты
  - [x] 13.9.1 Owner full access
  - [x] 13.9.2 Shared user read-only access
  - [x] 13.9.3 Group access
  - [x] 13.9.4 Public filter access
  - [x] 13.9.5 Permission inheritance
  - [x] 13.9.6 Audit trail
- [x] 13.10 Security тесты (P0 - OWASP)
  - [x] 13.10.1 Horizontal privilege escalation
  - [x] 13.10.2 Vertical privilege escalation
  - [x] 13.10.3 IDOR (Insecure Direct Object Reference)
  - [x] 13.10.4 Permission bypass attempts
  - [x] 13.10.5 Token tampering
  - [x] 13.10.6 Mass assignment vulnerabilities
  - [x] 13.10.7 Access control list bypass
- [x] 13.11 Performance тесты
  - [x] 13.11.1 Permission check < 10ms
  - [x] 13.11.2 Bulk permission check < 100ms
  - [x] 13.11.3 Permission cache hit < 1ms
- [x] 13.12 E2E тесты
  - [x] 13.12.1 Share filter with user
  - [x] 13.12.2 Change permissions
  - [x] 13.12.3 Revoke access
  - [x] 13.12.4 View audit log
  - [x] 13.12.5 Access denied scenarios

---

## 📁 Структура файлов

```
src/
  lib/
    filter-permissions/
      FilterPermissionManager.ts    # Управление правами
      FilterAccessControl.ts        # Проверка доступа
      FilterSharingService.ts       # Шэринг фильтров
      
  models/
    FilterPermissionAP.ts           # Модель прав доступа
    FilterShareAP.ts                # Модель шэринга
    
  middleware/
    filterAccessControl.ts          # Middleware проверки прав
    
  policies/
    filterPermissions.ts            # Политики доступа
```

---

## 🔧 Реализация

### 1. Модель прав доступа

**Файл:** `src/models/FilterPermissionAP.ts`

```typescript
export default {
  identity: 'filterpermissionap',
  tableName: 'adminizer_filter_permissions',
  
  attributes: {
    id: {
      type: 'string',
      required: true,
      unique: true,
      columnName: 'id'
    },
    
    // Фильтр
    filterId: {
      model: 'FilterAP',
      required: true,
      columnName: 'filter_id'
    },
    
    // Пользователь (null = для группы или публичное)
    userId: {
      model: 'UserAP',
      allowNull: true,
      columnName: 'user_id'
    },
    
    // Группа (null = для пользователя или публичное)
    groupId: {
      model: 'GroupAP',
      allowNull: true,
      columnName: 'group_id'
    },
    
    // Тип доступа
    accessType: {
      type: 'string',
      isIn: ['owner', 'editor', 'viewer', 'commenter'],
      required: true,
      columnName: 'access_type'
    },
    
    // Детальные разрешения
    permissions: {
      type: 'json',
      defaultsTo: {
        read: true,
        edit: false,
        delete: false,
        share: false,
        export: true,
        subscribe: true
      },
      columnName: 'permissions'
    },
    
    // Кто выдал доступ
    grantedBy: {
      model: 'UserAP',
      allowNull: true,
      columnName: 'granted_by'
    },
    
    // Дата истечения (null = бессрочно)
    expiresAt: {
      type: 'ref',
      columnType: 'datetime',
      allowNull: true,
      columnName: 'expires_at'
    },
    
    createdAt: {
      type: 'ref',
      columnType: 'datetime',
      autoCreatedAt: true,
      columnName: 'created_at'
    },
    
    updatedAt: {
      type: 'ref',
      columnType: 'datetime',
      autoUpdatedAt: true,
      columnName: 'updated_at'
    }
  },
  
  indexes: [
    { columns: ['filter_id', 'user_id'], unique: true },
    { columns: ['filter_id', 'group_id'] },
    { columns: ['user_id'] },
    { columns: ['group_id'] }
  ]
};
```

---

### 2. Модель шэринга

**Файл:** `src/models/FilterShareAP.ts`

```typescript
export default {
  identity: 'filtershareap',
  tableName: 'adminizer_filter_shares',
  
  attributes: {
    id: {
      type: 'string',
      required: true,
      unique: true,
      columnName: 'id'
    },
    
    filterId: {
      model: 'FilterAP',
      required: true,
      columnName: 'filter_id'
    },
    
    // Кто расшарил
    sharedBy: {
      model: 'UserAP',
      required: true,
      columnName: 'shared_by'
    },
    
    // Кому расшарили (пользователь или группа)
    sharedWithUser: {
      model: 'UserAP',
      allowNull: true,
      columnName: 'shared_with_user'
    },
    
    sharedWithGroup: {
      model: 'GroupAP',
      allowNull: true,
      columnName: 'shared_with_group'
    },
    
    // Уровень доступа
    accessLevel: {
      type: 'string',
      isIn: ['view', 'edit', 'admin'],
      defaultsTo: 'view',
      columnName: 'access_level'
    },
    
    // Сообщение при шэринге
    message: {
      type: 'string',
      allowNull: true,
      columnName: 'message'
    },
    
    // Активен ли шэр
    isActive: {
      type: 'boolean',
      defaultsTo: true,
      columnName: 'is_active'
    },
    
    // Уведомлён ли получатель
    notified: {
      type: 'boolean',
      defaultsTo: false,
      columnName: 'notified'
    },
    
    createdAt: {
      type: 'ref',
      columnType: 'datetime',
      autoCreatedAt: true,
      columnName: 'created_at'
    },
    
    updatedAt: {
      type: 'ref',
      columnType: 'datetime',
      autoUpdatedAt: true,
      columnName: 'updated_at'
    }
  }
};
```

---

### 3. Расширение модели FilterAP

Добавить поля в `src/models/FilterAP.ts`:

```typescript
{
  // Видимость фильтра
  visibility: {
    type: 'string',
    isIn: ['private', 'public', 'shared', 'group'],
    defaultsTo: 'private',
    columnName: 'visibility'
  },
  
  // Владелец фильтра
  ownerId: {
    model: 'UserAP',
    required: true,
    columnName: 'owner_id'
  },
  
  // Группа-владелец (для групповых фильтров)
  ownerGroupId: {
    model: 'GroupAP',
    allowNull: true,
    columnName: 'owner_group_id'
  },
  
  // Разрешить другим редактировать
  allowEdit: {
    type: 'boolean',
    defaultsTo: false,
    columnName: 'allow_edit'
  },
  
  // Разрешить другим делиться
  allowShare: {
    type: 'boolean',
    defaultsTo: false,
    columnName: 'allow_share'
  }
}
```

---

### 4. Filter Access Control

**Файл:** `src/lib/filter-permissions/FilterAccessControl.ts`

```typescript
import { DataAccessor } from '../DataAccessor';

export type FilterAction = 'read' | 'edit' | 'delete' | 'share' | 'export' | 'subscribe';

export class FilterAccessControl {
  private dataAccessor: DataAccessor;
  
  constructor(dataAccessor: DataAccessor) {
    this.dataAccessor = dataAccessor;
  }
  
  /**
   * Проверить может ли пользователь выполнить действие с фильтром
   */
  async can(
    userId: string,
    filterId: string,
    action: FilterAction
  ): Promise<boolean> {
    // Получить фильтр
    const filter = await this.dataAccessor.findOne('FilterAP', {
      id: filterId
    });
    
    if (!filter) {
      return false;
    }
    
    // Владелец может всё
    if (filter.ownerId === userId) {
      return true;
    }
    
    // Проверить публичный доступ
    if (filter.visibility === 'public') {
      if (action === 'read' || action === 'export' || action === 'subscribe') {
        return true;
      }
      
      if (action === 'edit' && filter.allowEdit) {
        return true;
      }
      
      if (action === 'share' && filter.allowShare) {
        return true;
      }
    }
    
    // Проверить групповой доступ
    if (filter.visibility === 'group' && filter.ownerGroupId) {
      const user = await this.dataAccessor.findOne('UserAP', {
        id: userId
      });
      
      if (user && user.groupId === filter.ownerGroupId) {
        // Члены группы имеют доступ на чтение
        if (action === 'read' || action === 'export' || action === 'subscribe') {
          return true;
        }
      }
    }
    
    // Проверить персональные разрешения
    const permission = await this.dataAccessor.findOne('FilterPermissionAP', {
      filterId,
      userId
    });
    
    if (permission && this.hasPermission(permission, action)) {
      return true;
    }
    
    // Проверить групповые разрешения
    const user = await this.dataAccessor.findOne('UserAP', {
      id: userId
    });
    
    if (user && user.groupId) {
      const groupPermission = await this.dataAccessor.findOne('FilterPermissionAP', {
        filterId,
        groupId: user.groupId
      });
      
      if (groupPermission && this.hasPermission(groupPermission, action)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Проверить имеет ли permission нужное разрешение
   */
  private hasPermission(permission: any, action: FilterAction): boolean {
    // Проверить истечение срока
    if (permission.expiresAt && new Date(permission.expiresAt) < new Date()) {
      return false;
    }
    
    const perms = permission.permissions;
    
    switch (action) {
      case 'read':
        return perms.read === true;
      case 'edit':
        return perms.edit === true;
      case 'delete':
        return perms.delete === true;
      case 'share':
        return perms.share === true;
      case 'export':
        return perms.export === true;
      case 'subscribe':
        return perms.subscribe === true;
      default:
        return false;
    }
  }
  
  /**
   * Получить все фильтры доступные пользователю
   */
  async getAccessibleFilters(
    userId: string,
    action: FilterAction = 'read'
  ): Promise<any[]> {
    const user = await this.dataAccessor.findOne('UserAP', {
      id: userId
    });
    
    if (!user) {
      return [];
    }
    
    // Собрать все фильтры с учётом прав
    const filters: any[] = [];
    
    // 1. Собственные фильтры
    const ownFilters = await this.dataAccessor.find('FilterAP', {
      ownerId: userId
    });
    filters.push(...ownFilters);
    
    // 2. Публичные фильтры
    const publicFilters = await this.dataAccessor.find('FilterAP', {
      visibility: 'public'
    });
    filters.push(...publicFilters);
    
    // 3. Групповые фильтры
    if (user.groupId) {
      const groupFilters = await this.dataAccessor.find('FilterAP', {
        visibility: 'group',
        ownerGroupId: user.groupId
      });
      filters.push(...groupFilters);
    }
    
    // 4. Фильтры с персональными разрешениями
    const userPermissions = await this.dataAccessor.find('FilterPermissionAP', {
      userId
    });
    
    for (const perm of userPermissions) {
      if (this.hasPermission(perm, action)) {
        const filter = await this.dataAccessor.findOne('FilterAP', {
          id: perm.filterId
        });
        if (filter) {
          filters.push(filter);
        }
      }
    }
    
    // 5. Фильтры с групповыми разрешениями
    if (user.groupId) {
      const groupPermissions = await this.dataAccessor.find('FilterPermissionAP', {
        groupId: user.groupId
      });
      
      for (const perm of groupPermissions) {
        if (this.hasPermission(perm, action)) {
          const filter = await this.dataAccessor.findOne('FilterAP', {
            id: perm.filterId
          });
          if (filter) {
            filters.push(filter);
          }
        }
      }
    }
    
    // Удалить дубликаты
    const uniqueFilters = Array.from(
      new Map(filters.map(f => [f.id, f])).values()
    );
    
    return uniqueFilters;
  }
  
  /**
   * Проверить является ли пользователь владельцем
   */
  async isOwner(userId: string, filterId: string): Promise<boolean> {
    const filter = await this.dataAccessor.findOne('FilterAP', {
      id: filterId,
      ownerId: userId
    });
    
    return !!filter;
  }
}
```

---

### 5. Filter Permission Manager

**Файл:** `src/lib/filter-permissions/FilterPermissionManager.ts`

```typescript
import { DataAccessor } from '../DataAccessor';
import { FilterAccessControl, FilterAction } from './FilterAccessControl';

export interface GrantPermissionOptions {
  filterId: string;
  userId?: string;
  groupId?: string;
  accessType: 'owner' | 'editor' | 'viewer' | 'commenter';
  permissions?: {
    read?: boolean;
    edit?: boolean;
    delete?: boolean;
    share?: boolean;
    export?: boolean;
    subscribe?: boolean;
  };
  grantedBy: string;
  expiresAt?: Date;
}

export class FilterPermissionManager {
  private dataAccessor: DataAccessor;
  private accessControl: FilterAccessControl;
  
  constructor(dataAccessor: DataAccessor) {
    this.dataAccessor = dataAccessor;
    this.accessControl = new FilterAccessControl(dataAccessor);
  }
  
  /**
   * Выдать разрешение
   */
  async grantPermission(options: GrantPermissionOptions): Promise<any> {
    // Проверить может ли grantedBy выдавать разрешения
    const canShare = await this.accessControl.can(
      options.grantedBy,
      options.filterId,
      'share'
    );
    
    if (!canShare) {
      throw new Error('You do not have permission to share this filter');
    }
    
    // Определить разрешения по типу доступа
    const permissions = options.permissions || this.getDefaultPermissions(options.accessType);
    
    // Проверить существует ли уже разрешение
    const existing = await this.dataAccessor.findOne('FilterPermissionAP', {
      filterId: options.filterId,
      userId: options.userId || null,
      groupId: options.groupId || null
    });
    
    if (existing) {
      // Обновить существующее
      return this.dataAccessor.update('FilterPermissionAP',
        { id: existing.id },
        {
          accessType: options.accessType,
          permissions,
          expiresAt: options.expiresAt
        }
      );
    }
    
    // Создать новое разрешение
    return this.dataAccessor.create('FilterPermissionAP', {
      filterId: options.filterId,
      userId: options.userId,
      groupId: options.groupId,
      accessType: options.accessType,
      permissions,
      grantedBy: options.grantedBy,
      expiresAt: options.expiresAt
    });
  }
  
  /**
   * Отозвать разрешение
   */
  async revokePermission(
    filterId: string,
    userId: string | undefined,
    groupId: string | undefined,
    revokedBy: string
  ): Promise<void> {
    // Проверить может ли revokedBy отзывать разрешения
    const isOwner = await this.accessControl.isOwner(revokedBy, filterId);
    const canShare = await this.accessControl.can(revokedBy, filterId, 'share');
    
    if (!isOwner && !canShare) {
      throw new Error('You do not have permission to revoke access');
    }
    
    await this.dataAccessor.destroy('FilterPermissionAP', {
      filterId,
      userId: userId || null,
      groupId: groupId || null
    });
  }
  
  /**
   * Получить все разрешения для фильтра
   */
  async getFilterPermissions(filterId: string): Promise<any[]> {
    return this.dataAccessor.find('FilterPermissionAP', {
      filterId
    });
  }
  
  /**
   * Получить разрешения пользователя
   */
  async getUserPermissions(userId: string): Promise<any[]> {
    return this.dataAccessor.find('FilterPermissionAP', {
      userId
    });
  }
  
  /**
   * Изменить видимость фильтра
   */
  async changeVisibility(
    filterId: string,
    visibility: 'private' | 'public' | 'shared' | 'group',
    userId: string
  ): Promise<any> {
    // Проверить является ли пользователь владельцем
    const isOwner = await this.accessControl.isOwner(userId, filterId);
    
    if (!isOwner) {
      throw new Error('Only owner can change filter visibility');
    }
    
    return this.dataAccessor.update('FilterAP',
      { id: filterId },
      { visibility }
    );
  }
  
  /**
   * Получить разрешения по умолчанию для типа доступа
   */
  private getDefaultPermissions(accessType: string) {
    switch (accessType) {
      case 'owner':
        return {
          read: true,
          edit: true,
          delete: true,
          share: true,
          export: true,
          subscribe: true
        };
      case 'editor':
        return {
          read: true,
          edit: true,
          delete: false,
          share: false,
          export: true,
          subscribe: true
        };
      case 'viewer':
        return {
          read: true,
          edit: false,
          delete: false,
          share: false,
          export: true,
          subscribe: true
        };
      case 'commenter':
        return {
          read: true,
          edit: false,
          delete: false,
          share: false,
          export: false,
          subscribe: true
        };
      default:
        return {
          read: true,
          edit: false,
          delete: false,
          share: false,
          export: false,
          subscribe: false
        };
    }
  }
}
```

---

### 6. Middleware для проверки прав

**Файл:** `src/middleware/filterAccessControl.ts`

```typescript
import { ReqType, ResType } from '../interfaces/types';
import { FilterAccessControl, FilterAction } from '../lib/filter-permissions/FilterAccessControl';

export function requireFilterPermission(action: FilterAction) {
  return async (req: ReqType, res: ResType, next: Function) => {
    const filterId = req.params.id || req.params.filterId;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    if (!filterId) {
      return res.status(400).json({
        error: 'Filter ID required'
      });
    }
    
    const accessControl = new FilterAccessControl(req.adminizer.dataAccessor);
    const hasPermission = await accessControl.can(userId, filterId, action);
    
    if (!hasPermission) {
      return res.status(403).json({
        error: `You do not have '${action}' permission for this filter`
      });
    }
    
    next();
  };
}
```

---

## 🎨 Frontend UI

### Permission Manager Component

```tsx
// FilterPermissionManager.tsx
import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Trash2 } from 'lucide-react';

interface Permission {
  id: string;
  userId?: string;
  userName?: string;
  groupId?: string;
  groupName?: string;
  accessType: string;
  permissions: any;
}

export function FilterPermissionManager({ filterId }: { filterId: string }) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  useEffect(() => {
    loadPermissions();
  }, [filterId]);
  
  const loadPermissions = async () => {
    const response = await fetch(`/api/adminizer/filters/${filterId}/permissions`);
    const data = await response.json();
    setPermissions(data);
  };
  
  const revokePermission = async (permissionId: string) => {
    await fetch(`/api/adminizer/filter-permissions/${permissionId}`, {
      method: 'DELETE'
    });
    loadPermissions();
  };
  
  return (
    <div className="filter-permissions">
      <div className="header">
        <h3>
          <Shield size={20} />
          Access Control
        </h3>
        <button onClick={() => setShowAddDialog(true)}>
          <UserPlus size={16} />
          Share
        </button>
      </div>
      
      <div className="permissions-list">
        {permissions.map(perm => (
          <div key={perm.id} className="permission-item">
            <Users size={16} />
            <div className="permission-info">
              <div className="name">
                {perm.userName || perm.groupName}
              </div>
              <div className="access-type">{perm.accessType}</div>
            </div>
            
            <button
              onClick={() => revokePermission(perm.id)}
              className="revoke-btn"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      
      {showAddDialog && (
        <AddPermissionDialog
          filterId={filterId}
          onClose={() => setShowAddDialog(false)}
          onAdded={loadPermissions}
        />
      )}
    </div>
  );
}
```

---

### Visibility Toggle

```tsx
// FilterVisibilityToggle.tsx
import { Lock, Globe, Users, Share } from 'lucide-react';

const visibilityOptions = [
  { value: 'private', label: 'Private', icon: Lock },
  { value: 'public', label: 'Public', icon: Globe },
  { value: 'group', label: 'Group', icon: Users },
  { value: 'shared', label: 'Shared', icon: Share }
];

export function FilterVisibilityToggle({
  filterId,
  currentVisibility
}: {
  filterId: string;
  currentVisibility: string;
}) {
  const [visibility, setVisibility] = useState(currentVisibility);
  
  const handleChange = async (newVisibility: string) => {
    await fetch(`/api/adminizer/filters/${filterId}/visibility`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: newVisibility })
    });
    
    setVisibility(newVisibility);
  };
  
  return (
    <div className="visibility-toggle">
      {visibilityOptions.map(option => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            className={visibility === option.value ? 'active' : ''}
            onClick={() => handleChange(option.value)}
          >
            <Icon size={16} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
```

---

## ✅ Чеклист готовности

- [ ] Модель FilterPermissionAP
- [ ] Модель FilterShareAP
- [ ] Расширение FilterAP (visibility, ownerId)
- [ ] FilterAccessControl с проверкой прав
- [ ] FilterPermissionManager
- [ ] Middleware requireFilterPermission
- [ ] Frontend UI управления правами
- [ ] Visibility toggle
- [ ] Share dialog
- [ ] Audit log изменений прав
- [ ] Тесты всех сценариев
- [ ] Документация

---

## 🚀 Следующие шаги

После завершения:
1. ✅ Интеграция с OAuth для внешних пользователей
2. ✅ Временные ссылки для доступа
3. ✅ Watermarking для экспортов
