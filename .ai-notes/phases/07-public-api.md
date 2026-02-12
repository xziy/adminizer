# Фаза 7: Public API (Atom/XML, JSON) по API ключу

## Приоритет: P2
## Статус: ✅ Завершена
## Зависимости: Фаза 1, 3, 6

> **💡 ПСЕВДОКОД:** Все примеры API endpoints и контроллеров — **ПСЕВДОКОД в стиле JavaScript**. Адаптируйте под реальную структуру роутов.

---

## 📋 Описание

Предоставление публичного доступа к результатам фильтра через персональные токены:
- Один токен на пользователя (хранится в UserAP)
- Публикация данных в форматах JSON и Atom/XML
- Права доступа наследуются от пользователя через DataAccessor
- Простое управление: создать/удалить/пересоздать токен

---

## 🎯 Цели

1. ✅ Один токен на пользователя в модели UserAP
2. ✅ Публичные эндпоинты для JSON
3. ✅ Atom/XML feed генератор
4. ✅ Права доступа через DataAccessor и AccessRightsHelper
5. ✅ Простое управление токеном
6. ✅ Токены прав доступа (Access Rights Tokens):
   
   **Департамент "Filters"** (CRUD для фильтров):
   - Создание фильтров (`create-filter`)
   - Просмотр своих фильтров (`read-filter`)
   - Редактирование своих фильтров (`update-filter`)
   - Удаление своих фильтров (`delete-filter`)
   - Публикация фильтров (public/groups) (`publish-filter`)
   - Расшаривание фильтров другим (`share-filter`)
   
   **Департамент "Public API"** (доступ к API):
   - Создание API токена (`api-token-create`)
   - Доступ к публичному API (`api-public-access`)
   - Просмотр своего токена (`api-token-view`)
   - Удаление токена (`api-token-revoke`)
   
   **Департамент "Data Export"** (экспорт данных):
   - Экспорт в JSON (`export-json`)
   - Экспорт в Excel (`export-excel`)
   - Экспорт в Atom/RSS (`export-feed`)
   - Массовый экспорт (`export-bulk`) - критично для больших объемов

---

## ✅ Задачи

- [ ] 7.1 Добавить поля apiToken и apiTokenCreatedAt в UserAP
- [ ] 7.2 Создать миграцию для новых полей
- [ ] 7.3 ApiTokenManager (getOrCreate, validate, regenerate, revoke)
- [ ] 7.4 FeedGenerator (Atom/XML/RSS)
- [ ] 7.5 PublicApiController с проверкой токена
- [ ] 7.6 Интеграция с DataAccessor для прав доступа
- [ ] 7.7 Регистрация токенов прав доступа в bindAccessRights
  - [ ] 7.7.1 **Департамент "Filters"**:
    - [ ] create-filter (создание фильтров)
    - [ ] read-filter (просмотр своих фильтров)
    - [ ] update-filter (редактирование своих фильтров)
    - [ ] delete-filter (удаление своих фильтров)
    - [ ] publish-filter (публикация фильтров)
    - [ ] share-filter (расшаривание фильтров)
  - [ ] 7.7.2 **Департамент "Public API"**:
    - [ ] api-token-create (создание API токена)
    - [ ] api-public-access (доступ к публичному API)
    - [ ] api-token-view (просмотр своего токена)
    - [ ] api-token-revoke (удаление токена)
  - [ ] 7.7.3 **Департамент "Data Export"**:
    - [ ] export-json (экспорт в JSON)
    - [ ] export-excel (экспорт в Excel)
    - [ ] export-feed (экспорт в Atom/RSS)
    - [ ] export-bulk (массовый экспорт - критично для безопасности)
- [ ] 7.8 Unit тесты (85%+ coverage)
  - [ ] 7.8.1 ApiTokenManager.getOrCreateToken()
  - [ ] 7.8.2 ApiTokenManager.validateToken()
  - [ ] 7.8.3 ApiTokenManager.regenerateToken()
  - [ ] 7.8.4 ApiTokenManager.revokeToken()
  - [ ] 7.8.5 FeedGenerator.generateAtom()
  - [ ] 7.8.6 FeedGenerator.generateRss()
  - [ ] 7.8.7 Access rights checks
- [ ] 7.9 Integration тесты
  - [ ] 7.9.1 Public API endpoint with valid token
  - [ ] 7.9.2 Public API endpoint with invalid token
  - [ ] 7.9.3 User permissions applied correctly
  - [ ] 7.9.4 Token regeneration flow
  - [ ] 7.9.5 Access rights tokens check
  - [ ] 7.9.6 Export permissions (JSON, Excel, Feed)
- [ ] 7.10 Security тесты (P0)
  - [ ] 7.10.1 Token brute force protection
  - [ ] 7.10.2 SQL injection via filter params
  - [ ] 7.10.3 User isolation (no cross-user data)
  - [ ] 7.10.4 Inactive user token rejection
  - [ ] 7.10.5 Access rights bypass attempts
- [ ] 7.11 E2E тесты
  - [ ] 7.11.1 Generate token from UI (with permissions)
  - [ ] 7.11.2 Access public endpoint with token
  - [ ] 7.11.3 Subscribe to Atom feed
  - [ ] 7.11.4 Revoke and regenerate token
  - [ ] 7.11.5 Export to different formats with permissions

---

## 📁 Структура файлов

```
src/
  lib/
    public-api/
      ApiTokenManager.ts        # Управление токенами (get/create/revoke)
      FeedGenerator.ts          # Генератор Atom/XML/RSS
      
  models/
    UserAP.ts                   # Добавлены поля: apiToken, apiTokenCreatedAt
    
  controllers/
    public-api/
      PublicApiController.ts    # Контроллер публичного API
      
  migrations/
    <adapter>/
      <timestamp>_add_api_token_to_userap.ts
    
  system/
    bindPublicApi.ts            # Привязка к Adminizer
```

---

## 🔧 Реализация

### 1. Расширение модели UserAP

**Файл:** `src/models/UserAP.ts` (добавить поля)

```typescript
// Добавить в attributes:
apiToken: {
  type: 'string',
  unique: true,
  allowNull: true
},
apiTokenCreatedAt: {
  type: 'ref',
  columnType: 'datetime',
  allowNull: true
}
```

**Интерфейс UserAP:**

```typescript
export interface UserAP {
  id: number;
  login: string;
  // ... existing fields ...
  apiToken?: string;
  apiTokenCreatedAt?: Date;
}
```

---

### 2. Миграция

**Файл:** `src/migrations/knex/YYYYMMDD_add_api_token_to_userap.ts`

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('userap', (table) => {
    table.string('api_token', 64).unique().nullable();
    table.timestamp('api_token_created_at', { useTz: false }).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('userap', (table) => {
    table.dropColumn('api_token');
    table.dropColumn('api_token_created_at');
  });
}
```

**Файл:** `src/migrations/umzug/YYYYMMDD_add_api_token_to_userap.ts`

```typescript
import { DataTypes } from 'sequelize';

export async function up({ context }: any): Promise<void> {
  await context.addColumn('userap', 'api_token', {
    type: DataTypes.STRING(64),
    unique: true,
    allowNull: true
  });
  
  await context.addColumn('userap', 'api_token_created_at', {
    type: DataTypes.DATE,
    allowNull: true
  });
}

export async function down({ context }: any): Promise<void> {
  await context.removeColumn('userap', 'api_token');
  await context.removeColumn('userap', 'api_token_created_at');
}
```

---

### 3. API Token Manager

**Файл:** `src/lib/public-api/ApiTokenManager.ts`

```typescript
import { DataAccessor } from '../DataAccessor';
import crypto from 'crypto';
import { UserAP } from '../../models/UserAP';

export class ApiTokenManager {
  private dataAccessor: DataAccessor;
  private accessRightsHelper: any; // AccessRightsHelper
  
  constructor(dataAccessor: DataAccessor, accessRightsHelper: any) {
    this.dataAccessor = dataAccessor;
    this.accessRightsHelper = accessRightsHelper;
  }
  
  /**
   * Получить существующий или создать новый токен для пользователя
   */
  async getOrCreateToken(userId: number): Promise<string> {
    // Проверка прав на создание токена
    const user = await this.dataAccessor.findOne('UserAP', { id: userId });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!this.accessRightsHelper.hasPermission('api-token-create', user)) {
      throw new Error('Access denied: no permission to create API token');
    }
    const user = await this.dataAccessor.findOne('UserAP', { id: userId });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.apiToken) {
      return user.apiToken;
    }
    
    // Генерируем новый токен
    const token = this.generateToken();
    
    await this.dataAccessor.update('UserAP', { id: userId }, {
      apiToken: token,
      apiTokenCreatedAt: new Date()
    });
    
    return token;
  }
  
  /**
   * Валидация токена и получение пользователя
   */
  async validateToken(token: string): Promise<UserAP | null> {
    if (!token) {
      return null;
    }
    
    const user = await this.dataAccessor.findOne('UserAP', {
      apiToken: token,
      isActive: true
    });
    
    return user || null;
  }
  
  /**
   * Пересоздать токен (удалить старый, создать новый)
   */
  async regenerateToken(userId: number): Promise<string> {
    const token = this.generateToken();
    
    await this.dataAccessor.update('UserAP', { id: userId }, {
      apiToken: token,
      apiTokenCreatedAt: new Date()
    });
    
    return token;
  }
  
  /**
   * Удалить токен пользователя
   */
  async revokeToken(userId: number): Promise<void> {
    await this.dataAccessor.update('UserAP', { id: userId }, {
      apiToken: null,
      apiTokenCreatedAt: null
    });
  }
  
  /**
   * Проверить существование токена у пользователя
   */
  async hasToken(userId: number): Promise<boolean> {
    const user = await this.dataAccessor.findOne('UserAP', { id: userId });
    return !!(user && user.apiToken);
  }
  
  /**
   * Генерация безопасного токена
   */
  private generateToken(): string {
    // Формат: ap_<random_64_chars>
    const randomPart = crypto.randomBytes(32).toString('hex');
    return `ap_${randomPart}`;
  }
}
```

---

### 4. Регистрация токенов прав доступа

**Файл:** `src/system/bindFiltersAccessRights.ts`

```typescript
import { Adminizer } from '../lib/Adminizer';

/**
 * Регистрация токенов прав доступа для фильтров и Public API
 * 
 * 3 департамента:
 * 1. Filters - CRUD операции с фильтрами
 * 2. Public API - управление API токенами
 * 3. Data Export - экспорт данных
 */
export default async function bindFiltersAccessRights(adminizer: Adminizer) {
  
  // =========================================
  // Департамент 1: Filters (CRUD)
  // =========================================
  const filtersDept = 'Filters';
  
  // Создание фильтров
  adminizer.accessRightsHelper.registerToken({
    id: 'create-filter',
    name: 'Create Filter',
    description: 'Allows user to create new filters',
    department: filtersDept
  });
  
  // Просмотр своих фильтров (автоматически через DataAccessor)
  adminizer.accessRightsHelper.registerToken({
    id: 'read-filter',
    name: 'Read Own Filters',
    description: 'Allows user to view their own filters (automatically filtered by DataAccessor)',
    department: filtersDept
  });
  
  // Редактирование своих фильтров
  adminizer.accessRightsHelper.registerToken({
    id: 'update-filter',
    name: 'Update Own Filters',
    description: 'Allows user to edit their own filters',
    department: filtersDept
  });
  
  // Удаление своих фильтров
  adminizer.accessRightsHelper.registerToken({
    id: 'delete-filter',
    name: 'Delete Own Filters',
    description: 'Allows user to delete their own filters',
    department: filtersDept
  });
  
  // Публикация фильтров (изменение visibility)
  adminizer.accessRightsHelper.registerToken({
    id: 'publish-filter',
    name: 'Publish Filter',
    description: 'Allows user to change filter visibility (private/public/groups)',
    department: filtersDept
  });
  
  // Расшаривание фильтров другим пользователям/группам
  adminizer.accessRightsHelper.registerToken({
    id: 'share-filter',
    name: 'Share Filter',
    description: 'Allows user to share filters with other users or groups',
    department: filtersDept
  });
  
  // =========================================
  // Департамент 2: Public API
  // =========================================
  const apiDept = 'Public API';
  
  // Создание API токена
  adminizer.accessRightsHelper.registerToken({
    id: 'api-token-create',
    name: 'Create API Token',
    description: 'Allows user to create/regenerate their personal API token',
    department: apiDept
  });
  
  // Доступ к публичному API
  adminizer.accessRightsHelper.registerToken({
    id: 'api-public-access',
    name: 'Public API Access',
    description: 'Allows access to public API endpoints (requires valid token)',
    department: apiDept
  });
  
  // Просмотр своего токена
  adminizer.accessRightsHelper.registerToken({
    id: 'api-token-view',
    name: 'View API Token',
    description: 'Allows user to view their own API token',
    department: apiDept
  });
  
  // Удаление токена
  adminizer.accessRightsHelper.registerToken({
    id: 'api-token-revoke',
    name: 'Revoke API Token',
    description: 'Allows user to revoke/delete their API token',
    department: apiDept
  });
  
  // =========================================
  // Департамент 3: Data Export
  // =========================================
  const exportDept = 'Data Export';
  
  // Экспорт в JSON
  adminizer.accessRightsHelper.registerToken({
    id: 'export-json',
    name: 'Export to JSON',
    description: 'Allows exporting filter data to JSON format',
    department: exportDept
  });
  
  // Экспорт в Excel
  adminizer.accessRightsHelper.registerToken({
    id: 'export-excel',
    name: 'Export to Excel',
    description: 'Allows exporting filter data to Excel format',
    department: exportDept
  });
  
  // Экспорт в Atom/RSS
  adminizer.accessRightsHelper.registerToken({
    id: 'export-feed',
    name: 'Export to Atom/RSS',
    description: 'Allows subscribing to Atom/RSS feeds for filters',
    department: exportDept
  });
  
  // Массовый экспорт (критично для безопасности!)
  adminizer.accessRightsHelper.registerToken({
    id: 'export-bulk',
    name: 'Bulk Export',
    description: 'Allows bulk export of large datasets (security-critical: potential data leak)',
    department: exportDept
  });
}
```

**Интеграция в главный файл инициализации:**

```typescript
// src/lib/Adminizer.ts или src/system/bindAccessRights.ts
import bindFiltersAccessRights from './bindFiltersAccessRights';

// В функции инициализации:
await bindFiltersAccessRights(adminizer);
```

---

### 4.1. Обоснование токенов (почему именно эти?)

#### 🎯 Критерии выбора:
1. **Минимализм** - только самое необходимое
2. **Безопасность** - контроль критичных операций
3. **Гибкость** - разные уровни доступа для групп
4. **Следование паттерну** - CRUD как в Adminizer (create/read/update/delete)

#### 📊 3 департамента вместо 1:

**Почему разделили?**
- **Filters** - базовые операции с фильтрами (основа системы)
- **Public API** - токены безопасности (отдельная зона риска)
- **Data Export** - экспорт данных (потенциальная утечка информации)

Это позволяет группам иметь разные права:
```typescript
// Пример: аналитики могут экспортировать, но не создавать фильтры
analysts.tokens = ['read-filter', 'export-json', 'export-excel'];

// Редакторы могут все с фильтрами, но без массового экспорта
editors.tokens = ['create-filter', 'read-filter', 'update-filter', 
                  'delete-filter', 'publish-filter', 'export-json'];

// Администраторы получают все автоматически
```

#### 🔐 Самые критичные для безопасности:

1. **`publish-filter`** - может сделать приватные данные публичными
2. **`share-filter`** - может дать доступ посторонним
3. **`export-bulk`** - массовая утечка данных
4. **`api-token-create`** - создание точек доступа извне

---

### 5. Feed Generator (Atom/XML)

**Файл:** `src/lib/public-api/FeedGenerator.ts`

```typescript
export interface FeedOptions {
  title: string;
  subtitle?: string;
  link: string;
  updated: Date;
  author?: {
    name: string;
    email?: string;
  };
  items: FeedItem[];
}

export interface FeedItem {
  id: string;
  title: string;
  link?: string;
  summary?: string;
  content?: string;
  published?: Date;
  updated?: Date;
  author?: {
    name: string;
    email?: string;
  };
}

export class FeedGenerator {
  
  /**
   * Генерация Atom feed
   */
  generateAtom(options: FeedOptions): string {
    const { title, subtitle, link, updated, author, items } = options;
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<feed xmlns="http://www.w3.org/2005/Atom">\n';
    
    // Метаданные
    xml += `  <title>${this.escapeXml(title)}</title>\n`;
    if (subtitle) {
      xml += `  <subtitle>${this.escapeXml(subtitle)}</subtitle>\n`;
    }
    xml += `  <link href="${this.escapeXml(link)}" rel="self"/>\n`;
    xml += `  <updated>${updated.toISOString()}</updated>\n`;
    xml += `  <id>${this.escapeXml(link)}</id>\n`;
    
    if (author) {
      xml += '  <author>\n';
      xml += `    <name>${this.escapeXml(author.name)}</name>\n`;
      if (author.email) {
        xml += `    <email>${this.escapeXml(author.email)}</email>\n`;
      }
      xml += '  </author>\n';
    }
    
    // Items
    items.forEach(item => {
      xml += '  <entry>\n';
      xml += `    <id>${this.escapeXml(item.id)}</id>\n`;
      xml += `    <title>${this.escapeXml(item.title)}</title>\n`;
      
      if (item.link) {
        xml += `    <link href="${this.escapeXml(item.link)}"/>\n`;
      }
      
      if (item.summary) {
        xml += `    <summary>${this.escapeXml(item.summary)}</summary>\n`;
      }
      
      if (item.content) {
        xml += `    <content type="html">${this.escapeXml(item.content)}</content>\n`;
      }
      
      if (item.published) {
        xml += `    <published>${item.published.toISOString()}</published>\n`;
      }
      
      if (item.updated) {
        xml += `    <updated>${item.updated.toISOString()}</updated>\n`;
      } else {
        xml += `    <updated>${updated.toISOString()}</updated>\n`;
      }
      
      if (item.author) {
        xml += '    <author>\n';
        xml += `      <name>${this.escapeXml(item.author.name)}</name>\n`;
        if (item.author.email) {
          xml += `      <email>${this.escapeXml(item.author.email)}</email>\n`;
        }
        xml += '    </author>\n';
      }
      
      xml += '  </entry>\n';
    });
    
    xml += '</feed>';
    
    return xml;
  }
  
  /**
   * Генерация RSS 2.0 feed
   */
  generateRss(options: FeedOptions): string {
    const { title, subtitle, link, updated, items } = options;
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
    xml += '  <channel>\n';
    
    xml += `    <title>${this.escapeXml(title)}</title>\n`;
    xml += `    <link>${this.escapeXml(link)}</link>\n`;
    if (subtitle) {
      xml += `    <description>${this.escapeXml(subtitle)}</description>\n`;
    }
    xml += `    <lastBuildDate>${updated.toUTCString()}</lastBuildDate>\n`;
    xml += `    <atom:link href="${this.escapeXml(link)}" rel="self" type="application/rss+xml"/>\n`;
    
    items.forEach(item => {
      xml += '    <item>\n';
      xml += `      <title>${this.escapeXml(item.title)}</title>\n`;
      xml += `      <guid isPermaLink="false">${this.escapeXml(item.id)}</guid>\n`;
      
      if (item.link) {
        xml += `      <link>${this.escapeXml(item.link)}</link>\n`;
      }
      
      if (item.summary || item.content) {
        xml += `      <description>${this.escapeXml(item.summary || item.content || '')}</description>\n`;
      }
      
      if (item.published) {
        xml += `      <pubDate>${item.published.toUTCString()}</pubDate>\n`;
      }
      
      xml += '    </item>\n';
    });
    
    xml += '  </channel>\n';
    xml += '</rss>';
    
    return xml;
  }
  
  /**
   * Экранирование XML
   */
  private escapeXml(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
```

---

### 5. Public API Controller

**Файл:** `src/controllers/public-api/PublicApiController.ts`

```typescript
import { ReqType, ResType } from '../../interfaces/types';
import { ApiTokenManager } from '../../lib/public-api/ApiTokenManager';
import { FeedGenerator } from '../../lib/public-api/FeedGenerator';
import { DataAccessor } from '../../lib/DataAccessor';
import { Adminizer } from '../../lib/Adminizer';

export class PublicApiController {
  private tokenManager: ApiTokenManager;
  private feedGenerator: FeedGenerator;
  private adminizer: Adminizer;
  
  constructor(
    tokenManager: ApiTokenManager,
    feedGenerator: FeedGenerator,
    adminizer: Adminizer
  ) {
    this.tokenManager = tokenManager;
    this.feedGenerator = feedGenerator;
    this.adminizer = adminizer;
  }
  
  /**
   * GET /api/public/:format/:filterId?token=xxx
   * Примеры:
   *   /api/public/json/my-filter?token=ap_abc123
   *   /api/public/atom/my-filter?token=ap_abc123
   *   /api/public/rss/my-filter?token=ap_abc123
   */
  async getPublicData(req: ReqType, res: ResType) {
    const format = req.params.format || 'json';
    const filterId = req.params.filterId;
    const token = req.query.token as string;
    
    try {
      // 1. Валидация токена
      const user = await this.tokenManager.validateToken(token);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid or expired token'
        });
      }
      
      // 1.1 Проверка прав на публичный API
      if (!this.adminizer.accessRightsHelper.hasPermission('api-public-access', user)) {
        return res.status(403).json({
          error: 'Access denied: no permission for public API'
        });
      }
      
      // 1.2 Проверка прав на доступ к фильтрам через API
      if (!this.adminizer.accessRightsHelper.hasPermission('filter-api-access', user)) {
        return res.status(403).json({
          error: 'Access denied: no permission for filter API access'
        });
      }
      
      // 2. CORS для публичного доступа
      this.setCorsHeaders(res);
      
      // 3. Получение фильтра
      // Создаём DataAccessor с правами пользователя
      const filterAccessor = new DataAccessor({
        entity: this.adminizer.modelHandler.model.get('FilterAP'),
        config: this.adminizer.config,
        user: user  // ← Права пользователя применяются автоматически
      });
      
      const filter = await filterAccessor.findOne({ id: filterId });
      
      if (!filter) {
        return res.status(404).json({
          error: 'Filter not found or access denied'
        });
      }
      
      // 4. Получение данных с учётом прав пользователя
      const dataAccessor = new DataAccessor({
        entity: this.adminizer.modelHandler.model.get(filter.modelName),
        config: this.adminizer.config,
        user: user  // ← DataAccessor автоматически применит фильтрацию по правам
      });
      
      const data = await dataAccessor.find(filter.conditions);
      
      // 5. Проверка прав на экспорт в выбранном формате
      if (format === 'json' && !this.adminizer.accessRightsHelper.hasPermission('export-json', user)) {
        return res.status(403).json({
          error: 'Access denied: no permission to export to JSON'
        });
      }
      
      if (format === 'excel' && !this.adminizer.accessRightsHelper.hasPermission('export-excel', user)) {
        return res.status(403).json({
          error: 'Access denied: no permission to export to Excel'
        });
      }
      
      if ((format === 'atom' || format === 'rss' || format === 'xml') && 
          !this.adminizer.accessRightsHelper.hasPermission('export-feed', user)) {
        return res.status(403).json({
          error: 'Access denied: no permission to export to Atom/RSS'
        });
      }
      
      // 6. Форматирование ответа
      let response: any;
      let contentType: string;
      
      if (format === 'json') {
        response = {
          data,
          meta: {
            count: data.length,
            filter: {
              id: filter.id,
              name: filter.name
            }
          }
        };
        contentType = 'application/json';
      } else if (format === 'atom') {
        response = this.feedGenerator.generateAtom({
          title: filter.name,
          subtitle: filter.description,
          link: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
          updated: new Date(),
          items: data.map((item: any) => ({
            id: item.id,
            title: item.name || item.title || String(item.id),
            content: JSON.stringify(item),
            updated: item.updatedAt || new Date()
          }))
        });
        contentType = 'application/atom+xml';
      } else if (format === 'rss' || format === 'xml') {
        response = this.feedGenerator.generateRss({
          title: filter.name,
          subtitle: filter.description,
          link: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
          updated: new Date(),
          items: data.map((item: any) => ({
            id: item.id,
            title: item.name || item.title || String(item.id),
            summary: JSON.stringify(item),
            published: item.createdAt || new Date()
          }))
        });
        contentType = 'application/rss+xml';
      } else {
        return res.status(400).json({
          error: `Unsupported format: ${format}. Supported: json, atom, rss`
        });
      }
      
      // 6. Отправка ответа
      res.setHeader('Content-Type', contentType);
      res.send(response);
      
    } catch (error: any) {
      console.error('Public API error:', error);
      
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
  
  /**
   * Установить CORS заголовки для публичного доступа
   */
  private setCorsHeaders(res: ResType) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}
```

---

## 🎨 Frontend UI

### API Token Management

```tsx
// ApiTokenManager.tsx
import { useState, useEffect } from 'react';
import { Key, Copy, RefreshCw, Trash2, ExternalLink } from 'lucide-react';

interface UserToken {
  token?: string;
  createdAt?: string;
}

interface ApiTokenManagerProps {
  userId: number;
  hasCreatePermission: boolean;  // Проверка на сервере
  hasPublicApiPermission: boolean;
  exportPermissions: {
    json: boolean;
    excel: boolean;
    feed: boolean;
  };
}

export function ApiTokenManager(props: ApiTokenManagerProps) {
  const { userId, hasCreatePermission, hasPublicApiPermission, exportPermissions } = props;
  const [tokenData, setTokenData] = useState<UserToken | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadToken();
  }, [userId]);
  
  const loadToken = async () => {
    const response = await fetch(`/api/adminizer/user/api-token`);
    const data = await response.json();
    setTokenData(data);
  };
  
  const generateToken = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/adminizer/user/api-token`, {
        method: 'POST'
      });
      const data = await response.json();
      setTokenData(data);
      // Show success notification
    } finally {
      setLoading(false);
    }
  };
  
  const regenerateToken = async () => {
    if (!confirm('Are you sure? Old token will stop working.')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/adminizer/user/api-token/regenerate`, {
        method: 'POST'
      });
      const data = await response.json();
      setTokenData(data);
      // Show success notification
    } finally {
      setLoading(false);
    }
  };
  
  const revokeToken = async () => {
    if (!confirm('Are you sure? This will revoke all public access.')) return;
    
    setLoading(true);
    try {
      await fetch(`/api/adminizer/user/api-token`, {
        method: 'DELETE'
      });
      setTokenData(null);
      // Show success notification
    } finally {
      setLoading(false);
    }
  };
  
  const copyToken = () => {
    if (tokenData?.token) {
      navigator.clipboard.writeText(tokenData.token);
      // Show notification
    }
  };
  
  const getPublicUrl = (filterId: string, format: string) => {
    if (!tokenData?.token) return '';
    return `${window.location.origin}/api/public/${format}/${filterId}?token=${tokenData.token}`;
  };
  
  // Если нет прав - не показывать компонент
  if (!hasCreatePermission || !hasPublicApiPermission) {
    return (
      <div className="api-token-manager disabled">
        <p>You don't have permission to create API tokens.</p>
        <p>Contact your administrator to grant access rights.</p>
      </div>
    );
  }
  
  return (
    <div className="api-token-manager">
      <div className="header">
        <Key size={20} />
        <h3>API Token</h3>
      </div>
      
      {!tokenData?.token ? (
        <div className="no-token">
          <p>You don't have an API token yet.</p>
          <p>Generate a token to access your filters via public API.</p>
          <button onClick={generateToken} disabled={loading}>
            <Key size={16} />
            Generate Token
          </button>
        </div>
      ) : (
        <div className="token-details">
          <div className="token-value">
            <code>{tokenData.token}</code>
            <button onClick={copyToken}>
              <Copy size={14} />
            </button>
          </div>
          
          <div className="token-info">
            Created: {new Date(tokenData.createdAt!).toLocaleString()}
          </div>
          
          <div className="token-actions">
            <button onClick={regenerateToken} disabled={loading}>
              <RefreshCw size={14} />
              Regenerate
            </button>
            <button onClick={revokeToken} disabled={loading} className="danger">
              <Trash2 size={14} />
              Revoke
            </button>
          </div>
          
          <div className="usage-examples">
            <h4>Usage Examples:</h4>
            
            {exportPermissions.json && (
              <div className="example">
                <strong>JSON:</strong>
                <code>/api/public/json/[filterId]?token={tokenData.token}</code>
              </div>
            )}
            
            {exportPermissions.excel && (
              <div className="example">
                <strong>Excel:</strong>
                <code>/api/public/excel/[filterId]?token={tokenData.token}</code>
              </div>
            )}
            
            {exportPermissions.feed && (
              <>
                <div className="example">
                  <strong>Atom Feed:</strong>
                  <code>/api/public/atom/[filterId]?token={tokenData.token}</code>
                </div>
                <div className="example">
                  <strong>RSS Feed:</strong>
                  <code>/api/public/rss/[filterId]?token={tokenData.token}</code>
                </div>
              </>
            )}
            
            {!exportPermissions.json && !exportPermissions.excel && !exportPermissions.feed && (
              <div className="no-permissions">
                <p>No export permissions granted. Contact administrator.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Filter Public Link Button

```tsx
// В компоненте списка фильтров добавить кнопку
import { ExternalLink } from 'lucide-react';

function FilterListItem({ filter, userToken }: { filter: Filter, userToken?: string }) {
  const getAtomUrl = () => {
    if (!userToken) return null;
    return `${window.location.origin}/api/public/atom/${filter.id}?token=${userToken}`;
  };
  
  return (
    <div className="filter-item">
      {/* ... other filter info ... */}
      
      {userToken && (
        <button 
          onClick={() => window.open(getAtomUrl(), '_blank')}
          title="Open Atom Feed"
        >
          <ExternalLink size={16} />
        </button>
      )}
    </div>
  );
}
```

---

## ✅ Чеклист готовности

- [ ] Поля apiToken и apiTokenCreatedAt в UserAP
- [ ] Миграции для Knex и Sequelize
- [ ] **Токены прав доступа (bindFiltersAccessRights.ts)** - 14 токенов в 3 департаментах:
  - [ ] **Департамент "Filters"** (6 токенов):
    - [ ] `create-filter` - создание фильтров
    - [ ] `read-filter` - просмотр своих фильтров
    - [ ] `update-filter` - редактирование своих фильтров
    - [ ] `delete-filter` - удаление своих фильтров
    - [ ] `publish-filter` - публикация фильтров (критично!)
    - [ ] `share-filter` - расшаривание фильтров (критично!)
  - [ ] **Департамент "Public API"** (4 токена):
    - [ ] `api-token-create` - создание API токена (критично!)
    - [ ] `api-public-access` - доступ к публичному API
    - [ ] `api-token-view` - просмотр своего токена
    - [ ] `api-token-revoke` - удаление токена
  - [ ] **Департамент "Data Export"** (4 токена):
    - [ ] `export-json` - экспорт в JSON
    - [ ] `export-excel` - экспорт в Excel
    - [ ] `export-feed` - экспорт в Atom/RSS
    - [ ] `export-bulk` - массовый экспорт (очень критично!)
- [ ] ApiTokenManager (get/create/validate/revoke) с проверкой прав
- [ ] FeedGenerator (Atom, RSS)
- [ ] PublicApiController с многоуровневой проверкой прав
- [ ] Интеграция с DataAccessor для прав
- [ ] Интеграция с AccessRightsHelper для токенов
- [ ] CORS заголовки
- [ ] Frontend управление токеном (с проверкой прав)
- [ ] Кнопки генерации публичных ссылок
- [ ] Unit и E2E тесты
- [ ] Документация API

---

## 🚀 Следующие шаги

После завершения:
1. ✅ Интеграция с уведомлениями (Фаза 8)
2. ✅ Опционально: Rate limiting на nginx/middleware уровне
3. ✅ Опционально: Кэширование через Redis
4. ✅ Опционально: Статистика через HistoryActionsAP

---

## 💡 Преимущества упрощенной модели

✅ **Простота**: Один токен на пользователя, нет отдельных таблиц  
✅ **Безопасность**: Права наследуются через DataAccessor автоматически  
✅ **Удобство**: Токен создается по требованию, легко пересоздать  
✅ **Изоляция**: Каждый пользователь видит только свои данные  
✅ **Масштабируемость**: Нет сложных связей между моделями  

---

## 🔐 Безопасность

- Токен хранится в БД в открытом виде (длина 64 символа, криптостойкий)
- Проверка isActive пользователя при валидации токена
- Права доступа применяются через DataAccessor.sanitizeUserRelationAccess()
- Возможность мгновенно отозвать доступ через revokeToken()
- CORS разрешён для всех источников (публичный API)
- **Многоуровневая проверка прав (14 токенов в 3 департаментах):**
  
  **Департамент "Filters"** (базовые операции):
  - `create-filter` - создание фильтров
  - `read-filter` - просмотр своих фильтров
  - `update-filter` - редактирование своих фильтров
  - `delete-filter` - удаление своих фильтров
  - `publish-filter` - публикация фильтров (⚠️ критично)
  - `share-filter` - расшаривание фильтров (⚠️ критично)
  
  **Департамент "Public API"** (внешний доступ):
  - `api-token-create` - создание токена (⚠️ критично)
  - `api-public-access` - доступ к API
  - `api-token-view` - просмотр токена
  - `api-token-revoke` - удаление токена
  
  **Департамент "Data Export"** (экспорт данных):
  - `export-json` - экспорт в JSON
  - `export-excel` - экспорт в Excel
  - `export-feed` - подписка на Atom/RSS
  - `export-bulk` - массовый экспорт (⚠️⚠️⚠️ очень критично!)

---

## 👥 Настройка прав для групп

### Пример 1: Группа "Administrators" - полный доступ ко всему

```typescript
const adminsGroup = await adminizer.modelHandler.model.get('GroupAP')._findOne({
  name: 'Administrators'
});

// Все 14 токенов (или оставить пустым - админы все могут)
adminsGroup.tokens = [
  // Filters
  'create-filter', 'read-filter', 'update-filter', 'delete-filter',
  'publish-filter', 'share-filter',
  // Public API
  'api-token-create', 'api-public-access', 'api-token-view', 'api-token-revoke',
  // Data Export
  'export-json', 'export-excel', 'export-feed', 'export-bulk'
];
```

### Пример 2: Группа "Editors" - работа с фильтрами без массового экспорта

```typescript
const editorsGroup = await adminizer.modelHandler.model.get('GroupAP')._findOne({
  name: 'Editors'
});

// Полный доступ к фильтрам и API, но без массового экспорта
editorsGroup.tokens = [
  // Filters - все права
  'create-filter', 'read-filter', 'update-filter', 'delete-filter',
  'publish-filter', 'share-filter',
  // Public API
  'api-token-create', 'api-public-access', 'api-token-view', 'api-token-revoke',
  // Data Export - только стандартные форматы
  'export-json', 'export-excel', 'export-feed'
  // НЕТ 'export-bulk' - критично!
];
```

### Пример 3: Группа "Analysts" - только чтение и экспорт

```typescript
const analystsGroup = await adminizer.modelHandler.model.get('GroupAP')._findOne({
  name: 'Analysts'
});

// Только чтение своих фильтров и экспорт
analystsGroup.tokens = [
  'read-filter',           // Просмотр своих фильтров
  'api-token-create',      // Создание токена для API
  'api-public-access',     // Доступ к API
  'api-token-view',        // Просмотр токена
  'export-json',           // Экспорт в JSON
  'export-excel'           // Экспорт в Excel
  // НЕТ создания/редактирования фильтров
  // НЕТ публикации и расшаривания
  // НЕТ массового экспорта
];
```

### Пример 4: Группа "Viewers" - только просмотр через API

```typescript
const viewersGroup = await adminizer.modelHandler.model.get('GroupAP')._findOne({
  name: 'Viewers'
});

// Минимальный доступ - только читать через API
viewersGroup.tokens = [
  'read-filter',           // Просмотр своих фильтров
  'api-token-create',      // Создание токена
  'api-public-access',     // Доступ к API
  'export-json'            // Только JSON
  // НЕТ редактирования, публикации, расшаривания
  // НЕТ Excel, Atom/RSS, массового экспорта
];
```

### Пример 5: Группа "Guests" - нет доступа к фильтрам и API

```typescript
const guestsGroup = await adminizer.modelHandler.model.get('GroupAP')._findOne({
  name: 'Guests'
});

// Пустой массив - доступа нет
guestsGroup.tokens = [];
```

### Пример 6: Группа "Content Creators" - создание без публикации

```typescript
const creatorsGroup = await adminizer.modelHandler.model.get('GroupAP')._findOne({
  name: 'Content Creators'
});

// Могут создавать и редактировать, но не публиковать и не расшаривать
creatorsGroup.tokens = [
  'create-filter',         // Создание фильтров
  'read-filter',           // Просмотр своих
  'update-filter',         // Редактирование своих
  'delete-filter',         // Удаление своих
  'export-json'            // Простой экспорт
  // НЕТ 'publish-filter' - не могут делать публичными!
  // НЕТ 'share-filter' - не могут давать доступ другим!
  // НЕТ API токенов - работают только в UI
];
```

---

## 📊 Матрица прав: рекомендуемые конфигурации

| Токен / Роль | Admin | Editor | Analyst | Creator | Viewer | Guest |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Filters** ||||||
| `create-filter` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `read-filter` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `update-filter` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `delete-filter` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `publish-filter` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `share-filter` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Public API** ||||||
| `api-token-create` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `api-public-access` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `api-token-view` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `api-token-revoke` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Data Export** ||||||
| `export-json` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `export-excel` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `export-feed` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `export-bulk` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 🎯 Описание ролей:

- **Admin** - полный доступ ко всему (включая опасные операции)
- **Editor** - создание и управление фильтрами, публикация, расшаривание
- **Analyst** - чтение и анализ данных, экспорт в JSON/Excel
- **Creator** - создание контента, но без прав публикации
- **Viewer** - только просмотр через API
- **Guest** - нет доступа к системе фильтров

### ⚠️ Критичные токены (выдавать осторожно!):

1. **`publish-filter`** - может сделать приватные данные публичными
2. **`share-filter`** - может дать доступ посторонним пользователям
3. **`export-bulk`** - массовая выгрузка данных (риск утечки)
4. **`api-token-create`** - создание точек доступа извне

---

## 🔄 Автоматическая настройка прав при создании групп

```typescript
// src/system/bindAccessRights.ts - после регистрации токенов

export async function setupDefaultFilterGroups(adminizer: Adminizer) {
  
  // 1. Группа "Filter Editors" (по умолчанию для редакторов)
  const editorsGroup = await adminizer.modelHandler.model.get('GroupAP')._findOrCreate({
    name: 'Filter Editors'
  }, {
    name: 'Filter Editors',
    description: 'Can create, edit, publish and share filters',
    tokens: [
      'create-filter', 'read-filter', 'update-filter', 'delete-filter',
      'publish-filter', 'share-filter',
      'api-token-create', 'api-public-access', 'api-token-view', 'api-token-revoke',
      'export-json', 'export-excel', 'export-feed'
    ]
  });
  
  // 2. Группа "Filter Viewers" (по умолчанию для пользователей)
  const viewersGroup = await adminizer.modelHandler.model.get('GroupAP')._findOrCreate({
    name: 'Filter Viewers'
  }, {
    name: 'Filter Viewers',
    description: 'Can only view and export own filters',
    tokens: [
      'read-filter',
      'api-token-create', 'api-public-access', 'api-token-view',
      'export-json'
    ]
  });
  
  // 3. Группа "Data Analysts" (аналитики)
  const analystsGroup = await adminizer.modelHandler.model.get('GroupAP')._findOrCreate({
    name: 'Data Analysts'
  }, {
    name: 'Data Analysts',
    description: 'Can read filters and export data for analysis',
    tokens: [
      'read-filter',
      'api-token-create', 'api-public-access', 'api-token-view',
      'export-json', 'export-excel'
    ]
  });
}
```

---

## 📚 Документация по безопасности

### Почему так много токенов?

**Принцип наименьших привилегий (Principle of Least Privilege):**
- Каждая группа получает только те права, которые ей нужны
- Снижается риск случайных и намеренных утечек данных
- Легче аудировать действия пользователей

### Что если не настроить права?

**По умолчанию (без токенов):**
- ❌ Пользователь НЕ может создавать фильтры
- ❌ Пользователь НЕ может создать API токен
- ❌ Пользователь НЕ может экспортировать данные

**Только администраторы (`isAdministrator: true`) обходят все проверки!**

### Проверка в коде:

```typescript
// Перед созданием фильтра
if (!adminizer.accessRightsHelper.hasPermission('create-filter', req.user)) {
  return res.status(403).json({ error: 'No permission to create filters' });
}

// Перед экспортом
if (format === 'excel' && !adminizer.accessRightsHelper.hasPermission('export-excel', req.user)) {
  return res.status(403).json({ error: 'No permission to export to Excel' });
}

// Перед публикацией фильтра
if (newVisibility === 'public' && !adminizer.accessRightsHelper.hasPermission('publish-filter', req.user)) {
  return res.status(403).json({ error: 'No permission to publish filters' });
}
```

---

## 📊 Примеры использования

### Генерация токена
```typescript
const token = await apiTokenManager.getOrCreateToken(req.user.id);
console.log(token); // ap_abc123...
```

### Публичный доступ
```bash
# JSON
curl 'https://example.com/api/public/json/my-filter?token=ap_abc123...'

# Atom Feed
curl 'https://example.com/api/public/atom/my-filter?token=ap_abc123...'

# RSS Feed
curl 'https://example.com/api/public/rss/my-filter?token=ap_abc123...'
```

### Пересоздание токена
```typescript
const newToken = await apiTokenManager.regenerateToken(req.user.id);
// Старый токен перестанет работать
```
