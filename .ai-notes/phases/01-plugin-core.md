# Фаза 1: Plugin Core

**Приоритет:** P0
**Зависимости:** Нет
**Статус:** [ ] Не начато

> ⚠️ Примечание для агента: Весь код — ПСЕВДОКОД. Реализуйте творчески,
> адаптируя под существующую кодовую базу. НЕ создавайте markdown файлы с резюме.

> ⚠️ КРИТИЧНО: PluginContext — единственный способ для плагинов взаимодействовать
> с Adminizer. Прямой доступ к adminizer instance НЕ предоставляется.

---

## Цель
Создать фундаментальные абстракции plugin system: манифест, базовый класс плагина, реестр и безопасный API-контекст.

---

## Задачи

- [ ] 1.1 Создать интерфейс PluginManifest
  - [ ] 1.1.1 Определить поля: id, name, version, description, dependencies
  - [ ] 1.1.2 Определить опциональные поля: author, homepage, icon
- [ ] 1.2 Создать абстрактный класс AbstractPlugin
  - [ ] 1.2.1 Определить абстрактный метод manifest
  - [ ] 1.2.2 Определить lifecycle-методы как опциональные
  - [ ] 1.2.3 Определить receive context pattern
- [ ] 1.3 Создать PluginHandler (реестр)
  - [ ] 1.3.1 Реализовать add/get/remove/getAll
  - [ ] 1.3.2 Валидация уникальности id
  - [ ] 1.3.3 Проверка зависимостей при регистрации
- [ ] 1.4 Создать PluginContext (safe API)
  - [ ] 1.4.1 Определить интерфейс PluginContextAPI
  - [ ] 1.4.2 Реализовать проксирование к Adminizer handlers
  - [ ] 1.4.3 Scoped logger (prefix: plugin id)
  - [ ] 1.4.4 Scoped emitter (namespace events)
- [ ] 1.5 Экспорт Plugin API из src/index.ts
- [ ] 1.6 Unit тесты

---

## 🏗️ Архитектура

### Структура файлов
```
src/lib/plugin/
├── AbstractPlugin.ts       # Базовый класс плагина
├── PluginManifest.ts       # Интерфейс манифеста (типы)
├── PluginHandler.ts        # Реестр плагинов
└── PluginContext.ts         # Безопасный API для плагинов
```

### Принципы разделения
| Компонент     | Ответственность                        | Зависимости           |
|---------------|----------------------------------------|-----------------------|
| PluginManifest| Описание метаданных плагина            | Нет                   |
| AbstractPlugin| Базовый класс с lifecycle-контрактом   | PluginManifest        |
| PluginHandler | Хранение и поиск плагинов              | AbstractPlugin        |
| PluginContext | Безопасный API для взаимодействия      | Adminizer (internal)  |

---

## ✅ Ключевые возможности

### 1. PluginManifest
- ✅ Уникальный идентификатор плагина (slug, lowercase, kebab-case)
- ✅ Семантическая версия (semver string)
- ✅ Список зависимостей (массив plugin id)
- ✅ Опциональные метаданные (author, homepage, icon)

### 2. AbstractPlugin
- ✅ Абстрактный readonly `manifest` — декларация плагина
- ✅ Опциональные lifecycle-методы: `onRegister`, `onInit`, `onLoaded`, `onDestroy`
- ✅ Метод `configModifier(config)` — для модификации конфига
- ✅ Получает `PluginContext` при инициализации

### 3. PluginHandler
- ✅ CRUD для плагинов (add, get, remove, getAll, has)
- ✅ Lookup по id (case-insensitive)
- ✅ Валидация: нет дублей, все зависимости существуют

### 4. PluginContext
- ✅ Proxy к registerRoute, registerMiddleware, registerModel и т.д.
- ✅ Scoped logger: `[plugin:my-plugin] message`
- ✅ Scoped emitter: события `plugin:my-plugin:eventName`
- ✅ Доступ к конфигу (readonly)
- ✅ Доступ к route prefix

---

## Псевдокод ключевых компонентов

### PluginManifest
**Файл:** `src/lib/plugin/PluginManifest.ts`

```typescript
// ПСЕВДОКОД — адаптировать под реальную архитектуру!
export interface PluginManifest {
  /** Unique plugin identifier (kebab-case) */
  id: string
  /** Human-readable name */
  name: string
  /** Semantic version */
  version: string
  /** Description */
  description?: string
  /** Dependencies — array of plugin IDs that must be loaded before this plugin */
  dependencies?: string[]
  /** Author */
  author?: string
  /** Plugin icon for UI */
  icon?: MaterialIcon
}
```

### AbstractPlugin
**Файл:** `src/lib/plugin/AbstractPlugin.ts`

```typescript
// ПСЕВДОКОД — адаптировать под реальную архитектуру!
export abstract class AbstractPlugin {
  /** Plugin metadata */
  abstract readonly manifest: PluginManifest

  /** Plugin context (set by PluginManager during init) */
  protected context: PluginContext

  /**
   * Called when plugin is registered (before init).
   * Good place for early setup, config modification.
   */
  onRegister?(context: PluginContext): void | Promise<void>

  /**
   * Called during Adminizer.init() — after models are bound,
   * before routes are bound.
   * Good place to register models, middleware.
   */
  onInit?(context: PluginContext): void | Promise<void>

  /**
   * Called after Adminizer is fully loaded (routes bound, etc.).
   * Good place to register routes, widgets, controls.
   */
  onLoaded?(context: PluginContext): void | Promise<void>

  /**
   * Called when plugin is being destroyed/unloaded.
   * Cleanup resources.
   */
  onDestroy?(context: PluginContext): void | Promise<void>

  /**
   * Optional: modify Adminizer config before normalization.
   * Return partial config to merge.
   */
  configModifier?(config: AdminpanelConfig): Partial<AdminpanelConfig> | void
}
```

### PluginHandler
**Файл:** `src/lib/plugin/PluginHandler.ts`

```typescript
// ПСЕВДОКОД — адаптировать под реальную архитектуру!
export class PluginHandler {
  private plugins: Map<string, AbstractPlugin> // id → plugin

  add(plugin: AbstractPlugin): void {
    // validate unique id
    // store plugin
  }

  get(id: string): AbstractPlugin | undefined {
    // case-insensitive lookup
  }

  has(id: string): boolean

  remove(id: string): boolean

  getAll(): AbstractPlugin[]

  get entries(): IterableIterator<[string, AbstractPlugin]>
}
```

### PluginContext
**Файл:** `src/lib/plugin/PluginContext.ts`

```typescript
// ПСЕВДОКОД — адаптировать под реальную архитектуру!
export class PluginContext {
  private pluginId: string
  private adminizer: Adminizer  // internal, NOT exposed

  constructor(pluginId: string, adminizer: Adminizer)

  // --- Config ---
  get config(): Readonly<AdminpanelConfig>
  get routePrefix(): string

  // --- Routes ---
  registerRoute(method: HttpMethod, path: string, handler: ControllerFunction, options?: RouteOptions): void
  // path будет преобразован в: ${routePrefix}/p/${pluginId}/${path}

  // --- Middleware ---
  registerMiddleware(middleware: MiddlewareType): void

  // --- Models ---
  registerModel(name: string, schema: object, config?: ModelConfig): void

  // --- UI ---
  registerWidget(widget: WidgetType): void
  registerControl(control: AbstractControls): void
  registerCatalog(catalog: AbstractCatalog): void
  addMenuItem(item: HrefConfig): void

  // --- Events ---
  get emitter(): ScopedEmitter  // events namespaced: plugin:${id}:*

  // --- Logging ---
  get log(): ScopedLogger  // prefix: [plugin:${id}]
}
```

---

## Тесты для этой фазы

### Unit тесты
- [ ] PluginManifest: валидация корректных/некорректных манифестов
- [ ] AbstractPlugin: создание конкретного плагина, проверка manifest
- [ ] PluginHandler: add/get/remove/has, дублирование id → ошибка
- [ ] PluginContext: проксирование вызовов, scoped logger format, scoped emitter namespace

### Coverage цель: 90%+
