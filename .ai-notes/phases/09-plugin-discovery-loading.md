# Фаза 9: Plugin Discovery & Loading

**Приоритет:** P1
**Зависимости:** Фаза 1, Фаза 2, Фаза 3
**Статус:** [ ] Не начато

> ⚠️ Примечание для агента: Весь код — ПСЕВДОКОД. Реализуйте творчески,
> адаптируя под существующую кодовую базу. НЕ создавайте markdown файлы с резюме.

> ⚠️ КРИТИЧНО: Ошибка загрузки одного плагина НЕ должна ломать загрузку остальных.
> Graceful error handling с подробным логированием.

---

## Цель
Создать систему автоматического обнаружения и загрузки плагинов из файловой системы
и npm-пакетов. Реализовать `bindPlugins.ts` — функцию инициализации в pipeline Adminizer.

---

## Задачи

- [ ] 9.1 Создать bindPlugins.ts
  - [ ] 9.1.1 Scan plugins/ директории
  - [ ] 9.1.2 Dynamic import каждого плагина
  - [ ] 9.1.3 Проверка enabled/disabled из конфига
- [ ] 9.2 Конвенция структуры плагина
  - [ ] 9.2.1 `plugin-dir/index.ts` → export default plugin instance или class
  - [ ] 9.2.2 `plugin-dir/package.json` (опционально) → метаданные
- [ ] 9.3 Поддержка npm-пакетов как плагинов
  - [ ] 9.3.1 Конфиг: `plugins.registry: { 'npm-package-name': { enabled: true } }`
  - [ ] 9.3.2 Dynamic import по имени пакета
- [ ] 9.4 Поддержка указания пути к плагину
  - [ ] 9.4.1 Конфиг: `plugins.registry: { 'my-plugin': { path: './custom/path' } }`
- [ ] 9.5 Error handling при загрузке
  - [ ] 9.5.1 Graceful fail — ошибка одного плагина не роняет всё
  - [ ] 9.5.2 Логирование ошибок через Adminizer.log
- [ ] 9.6 Unit тесты

---

## 🏗️ Архитектура

### Процесс discovery

```
bindPlugins(adminizer)
        │
        ▼
┌───────────────────────────────────┐
│ 1. Read config.plugins.directory  │
│    (default: './plugins')         │
│                                   │
│ 2. Scan directory for subdirs     │
│    with index.ts/index.js         │
│                                   │
│ 3. Read config.plugins.registry   │
│    for npm packages & custom paths│
│                                   │
│ 4. Merge: directory + registry    │
└──────────────┬────────────────────┘
               │
               ▼
        For each plugin:
┌───────────────────────────────────┐
│ 1. Check enabled/disabled         │
│ 2. Dynamic import                 │
│ 3. Validate: has manifest?        │
│ 4. pluginManager.register(plugin) │
└───────────────────────────────────┘
```

### Конвенция файловой системы

```
plugins/
├── my-plugin/
│   ├── index.ts           # export default new MyPlugin() or export default MyPlugin
│   ├── package.json       # optional: { "name": "my-plugin", "version": "1.0.0" }
│   ├── frontend/          # optional: React components
│   └── dist/              # optional: built assets
├── another-plugin/
│   └── index.ts
└── ...
```

---

## ✅ Ключевые возможности

### 1. Directory scanning
- ✅ Сканирует директорию plugins/ (конфигурируемо)
- ✅ Для каждой поддиректории ищет index.ts/index.js
- ✅ Dynamic import → получает экземпляр или класс плагина
- ✅ Если class → создаёт экземпляр: `new PluginClass()`

### 2. Config-based loading
- ✅ `plugins.registry['my-plugin'].path` → загрузка по кастомному пути
- ✅ `plugins.registry['npm-package']` → `import('npm-package')`
- ✅ `plugins.registry['my-plugin'].enabled: false` → пропускается

### 3. Error handling
- ✅ Try/catch вокруг каждого dynamic import
- ✅ Try/catch вокруг каждого register
- ✅ Подробный лог: что не загрузилось и почему
- ✅ Список успешно загруженных плагинов в лог

---

## Псевдокод ключевых компонентов

### bindPlugins
**Файл:** `src/system/bindPlugins.ts`

```typescript
// ПСЕВДОКОД — адаптировать под реальную архитектуру!
export async function bindPlugins(adminizer: Adminizer): Promise<void> {
  const pluginConfig = adminizer.config.plugins
  if (!pluginConfig) return

  const pluginsDir = pluginConfig.directory
    ? path.resolve(pluginConfig.directory)
    : path.resolve(process.cwd(), 'plugins')

  const pluginsToLoad: { id: string, source: string }[] = []

  // 1. Scan directory
  if (await fs.pathExists(pluginsDir)) {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const indexPath = path.join(pluginsDir, entry.name, 'index')
        pluginsToLoad.push({ id: entry.name, source: indexPath })
      }
    }
  }

  // 2. Add from registry (npm packages or custom paths)
  if (pluginConfig.registry) {
    for (const [id, config] of Object.entries(pluginConfig.registry)) {
      if (config.enabled === false) continue
      if (config.path) {
        pluginsToLoad.push({ id, source: path.resolve(config.path) })
      } else if (!pluginsToLoad.find(p => p.id === id)) {
        // Assume npm package
        pluginsToLoad.push({ id, source: id })
      }
    }
  }

  // 3. Load each plugin
  for (const { id, source } of pluginsToLoad) {
    // Check if disabled in registry
    if (pluginConfig.registry?.[id]?.enabled === false) {
      Adminizer.log.info(`Plugin ${id} is disabled, skipping`)
      continue
    }

    try {
      const module = await import(source)
      let plugin: AbstractPlugin

      if (module.default instanceof AbstractPlugin) {
        plugin = module.default
      } else if (typeof module.default === 'function') {
        plugin = new module.default()
      } else {
        throw new Error(`Plugin ${id} does not export a valid plugin`)
      }

      await adminizer.pluginManager.register(plugin)
      Adminizer.log.info(`Plugin ${plugin.manifest.id} v${plugin.manifest.version} registered`)
    } catch (err) {
      Adminizer.log.error(`Failed to load plugin ${id} from ${source}:`, err)
      // Continue with next plugin
    }
  }
}
```

---

## Тесты для этой фазы

### Unit тесты
- [ ] Scan directory: находит плагины
- [ ] Disabled plugin: пропускается
- [ ] Invalid plugin: ошибка логируется, остальные загружаются
- [ ] npm package import: корректно загружается
- [ ] Custom path: корректно загружается
- [ ] No plugins directory: не ломается

### Coverage цель: 85%+
