# Фаза 2: Plugin Lifecycle Hooks

**Приоритет:** P0
**Зависимости:** Фаза 1
**Статус:** [ ] Не начато

> ⚠️ Примечание для агента: Весь код — ПСЕВДОКОД. Реализуйте творчески,
> адаптируя под существующую кодовую базу. НЕ создавайте markdown файлы с резюме.

> ⚠️ КРИТИЧНО: Порядок инициализации плагинов определяется topological sort по
> зависимостям. Циклические зависимости — ошибка при запуске.

---

## Цель
Создать PluginManager — оркестратор жизненного цикла плагинов, который управляет порядком
инициализации, вызывает lifecycle-хуки и интегрируется с Adminizer.init().

---

## Задачи

- [ ] 2.1 Создать PluginManager
  - [ ] 2.1.1 Метод register(plugin) — вызов onRegister
  - [ ] 2.1.2 Метод initAll() — topological sort + вызов onInit
  - [ ] 2.1.3 Метод loadAll() — вызов onLoaded
  - [ ] 2.1.4 Метод destroyAll() — обратный порядок, вызов onDestroy
- [ ] 2.2 Реализовать topological sort по зависимостям
  - [ ] 2.2.1 Обнаружение циклических зависимостей
  - [ ] 2.2.2 Валидация наличия всех зависимостей
- [ ] 2.3 Интеграция в Adminizer.init()
  - [ ] 2.3.1 Вызов pluginManager.initAll() после bindModels
  - [ ] 2.3.2 Вызов pluginManager.loadAll() перед emit('adminizer:loaded')
  - [ ] 2.3.3 Добавить pluginManager как свойство Adminizer
- [ ] 2.4 Emit plugin-specific events
  - [ ] 2.4.1 `plugin:registered`, `plugin:initialized`, `plugin:loaded`
- [ ] 2.5 Unit тесты

---

## 🏗️ Архитектура

### Структура файлов
```
src/lib/plugin/
└── PluginManager.ts         # Оркестратор жизненного цикла

src/system/
└── bindPlugins.ts           # Начальная загрузка плагинов (stub для Фазы 9)

src/lib/
└── Adminizer.ts             # РАСШИРИТЬ: добавить pluginManager
```

### Жизненный цикл плагина

```
                      Adminizer.init()
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
  register()          Config merge            bindModels()
  onRegister()        configModifier()             │
    │                      │                      │
    └──────────────────────┼──────────────────────┘
                           │
                    topological sort
                           │
                     ┌─────┴─────┐
                     ▼           ▼
              pluginA.onInit()  pluginB.onInit()  (по порядку зависимостей)
                     │           │
                     └─────┬─────┘
                           │
                    ... (routes, inertia, etc.) ...
                           │
                     ┌─────┴─────┐
                     ▼           ▼
             pluginA.onLoaded() pluginB.onLoaded()
                           │
                    emit('adminizer:loaded')
                           │
                    ═══════════════════
                    Application running
                    ═══════════════════
                           │
                    shutdown / destroy
                           │
                     ┌─────┴─────┐
                     ▼           ▼
            pluginB.onDestroy() pluginA.onDestroy()  (обратный порядок!)
```

---

## ✅ Ключевые возможности

### 1. PluginManager
- ✅ `register(plugin)` — регистрирует плагин, создаёт PluginContext, вызывает onRegister
- ✅ `initAll()` — topological sort → последовательный вызов onInit каждого плагина
- ✅ `loadAll()` — последовательный вызов onLoaded каждого плагина
- ✅ `destroyAll()` — обратный порядок, вызов onDestroy
- ✅ `getPlugin(id)` — проксирование к PluginHandler
- ✅ Error handling: ошибка в плагине не останавливает инициализацию остальных

### 2. Topological Sort
- ✅ Алгоритм Kahn's или DFS-based
- ✅ Обнаружение циклов → throw Error с описанием цикла
- ✅ Валидация: все зависимости должны быть зарегистрированы

### 3. Интеграция с Adminizer.init()
- ✅ pluginManager создаётся в конструкторе Adminizer
- ✅ Порядок в init(): configModifier → bindModels → pluginManager.initAll() → ... → pluginManager.loadAll()

---

## Псевдокод ключевых компонентов

### PluginManager
**Файл:** `src/lib/plugin/PluginManager.ts`

```typescript
// ПСЕВДОКОД — адаптировать под реальную архитектуру!
export class PluginManager {
  private handler: PluginHandler
  private adminizer: Adminizer
  private contexts: Map<string, PluginContext>
  private initOrder: string[] // результат topological sort

  constructor(adminizer: Adminizer) {
    this.handler = new PluginHandler()
    this.contexts = new Map()
  }

  /** Register a plugin — creates context, calls onRegister */
  async register(plugin: AbstractPlugin): Promise<void> {
    const ctx = new PluginContext(plugin.manifest.id, this.adminizer)
    this.contexts.set(plugin.manifest.id, ctx)
    this.handler.add(plugin)
    await plugin.onRegister?.(ctx)
    this.adminizer.emitter.emit('plugin:registered', plugin.manifest)
  }

  /** Init all plugins in dependency order */
  async initAll(): Promise<void> {
    this.initOrder = this.topologicalSort()
    for (const id of this.initOrder) {
      const plugin = this.handler.get(id)!
      const ctx = this.contexts.get(id)!
      try {
        await plugin.onInit?.(ctx)
        this.adminizer.emitter.emit('plugin:initialized', plugin.manifest)
      } catch (err) {
        Adminizer.log.error(`Plugin ${id} failed to init:`, err)
        // продолжаем с остальными
      }
    }
  }

  /** Notify all plugins that Adminizer is fully loaded */
  async loadAll(): Promise<void> {
    for (const id of this.initOrder) {
      const plugin = this.handler.get(id)!
      const ctx = this.contexts.get(id)!
      try {
        await plugin.onLoaded?.(ctx)
        this.adminizer.emitter.emit('plugin:loaded', plugin.manifest)
      } catch (err) {
        Adminizer.log.error(`Plugin ${id} failed to load:`, err)
      }
    }
  }

  /** Destroy in reverse order */
  async destroyAll(): Promise<void> {
    for (const id of [...this.initOrder].reverse()) {
      const plugin = this.handler.get(id)!
      const ctx = this.contexts.get(id)!
      try {
        await plugin.onDestroy?.(ctx)
      } catch (err) {
        Adminizer.log.error(`Plugin ${id} failed to destroy:`, err)
      }
    }
  }

  /** Kahn's algorithm for topological sort */
  private topologicalSort(): string[] {
    // Build adjacency + in-degree
    // Process zero in-degree nodes
    // Detect cycles if remaining nodes > 0
    // Return sorted order
  }
}
```

### Интеграция в Adminizer.init()
**Файл:** `src/lib/Adminizer.ts` (модификация)

```typescript
// ПСЕВДОКОД — показывает КУДА вставить вызовы
async init(config: AdminpanelConfig) {
  // ... existing code ...
  this.config = ConfigHelper.normalizeConfig(config);

  // NEW: Apply plugin configModifiers BEFORE rest of init
  await this.pluginManager.applyConfigModifiers(this.config);

  // ... existing: bindCors, cookieParser, viteMiddleware ...
  // ... existing: bindModels, bindForms ...

  // NEW: Init plugins (register models, middleware)
  await this.pluginManager.initAll();

  // ... existing: policyManager, accessRights, etc. ...
  // ... existing: Router.bind() ...

  // NEW: Notify plugins that everything is loaded
  await this.pluginManager.loadAll();

  this._emitter.emit('adminizer:loaded');
}
```

---

## Тесты для этой фазы

### Unit тесты
- [ ] topologicalSort: 3 плагина с зависимостями → правильный порядок
- [ ] topologicalSort: циклическая зависимость → ошибка
- [ ] topologicalSort: отсутствующая зависимость → ошибка
- [ ] register: вызывает onRegister
- [ ] initAll: вызывает onInit в правильном порядке
- [ ] loadAll: вызывает onLoaded
- [ ] destroyAll: обратный порядок
- [ ] ошибка в одном плагине не блокирует остальные

### Coverage цель: 90%+
