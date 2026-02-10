# Прогресс реализации Plugin System

## Инструкции по разработке

### Обязательные проверки на каждой фазе
1. Запустить тесты: `npm test`
2. Запустить приложение: `npm run dev` (fixture)
3. Проверить типы: `npx tsc --noEmit`
4. Ручное тестирование

### Чеклист завершения фазы
- [ ] Код написан и работает
- [ ] Тесты проходят
- [ ] Приложение запускается без ошибок
- [ ] Компиляция без ошибок
- [ ] Новая функциональность протестирована
- [ ] PROGRESS.md обновлён

---

## Общий статус

| Фаза | Название                    | Статус | Прогресс |
|------|-----------------------------|--------|----------|
| 1    | Plugin Core                 | [ ]    | 0%       |
| 2    | Plugin Lifecycle Hooks      | [ ]    | 0%       |
| 3    | Plugin Config Integration   | [ ]    | 0%       |
| 4    | Plugin Routes & Middleware  | [ ]    | 0%       |
| 5    | Plugin Models & Data        | [ ]    | 0%       |
| 6    | Plugin UI                   | [ ]    | 0%       |
| 7    | Plugin Frontend Components  | [ ]    | 0%       |
| 8    | Plugin Controls             | [ ]    | 0%       |
| 9    | Plugin Discovery & Loading  | [ ]    | 0%       |
| 10   | Fixture Plugin (Demo)       | [ ]    | 0%       |
| 11   | Тестирование                | [ ]    | 0%       |

---

## Фаза 1: Plugin Core

**Статус:** [ ] Не начато
**Приоритет:** P0
**Зависимости:** Нет

### Задачи
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

### Созданные файлы
(Заполняется по мере реализации)

### Заметки
(Заполняется по мере реализации)

---

## Фаза 2: Plugin Lifecycle Hooks

**Статус:** [ ] Не начато
**Приоритет:** P0
**Зависимости:** Фаза 1

### Задачи
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

### Созданные файлы
(Заполняется по мере реализации)

### Заметки
(Заполняется по мере реализации)

---

## Фаза 3: Plugin Config Integration

**Статус:** [ ] Не начато
**Приоритет:** P1
**Зависимости:** Фаза 1

### Задачи
- [ ] 3.1 Расширить AdminpanelConfig
  - [ ] 3.1.1 Добавить секцию `plugins` в интерфейс
  - [ ] 3.1.2 Определить PluginConfig: { enabled, options, path }
- [ ] 3.2 Реализовать configModifier hook
  - [ ] 3.2.1 Вызов configModifier каждого плагина перед нормализацией
  - [ ] 3.2.2 Deep merge результатов
  - [ ] 3.2.3 Валидация модификаций (запрет изменения критических полей)
- [ ] 3.3 Обновить defaults.ts
  - [ ] 3.3.1 Добавить дефолтную секцию plugins
- [ ] 3.4 Обновить ConfigHelper.normalizeConfig()
- [ ] 3.5 Unit тесты

### Созданные файлы
(Заполняется по мере реализации)

### Заметки
(Заполняется по мере реализации)

---

## Фаза 4: Plugin Routes & Middleware

**Статус:** [ ] Не начато
**Приоритет:** P1
**Зависимости:** Фаза 1, Фаза 2

### Задачи
- [ ] 4.1 Реализовать PluginContext.registerRoute()
  - [ ] 4.1.1 Namespace-prefix: `${routePrefix}/p/${pluginId}/...`
  - [ ] 4.1.2 Автоматическое применение policies
  - [ ] 4.1.3 Поддержка GET/POST/PUT/DELETE/PATCH
- [ ] 4.2 Реализовать PluginContext.registerMiddleware()
  - [ ] 4.2.1 Global middleware (до роутов)
  - [ ] 4.2.2 Scoped middleware (для роутов плагина)
- [ ] 4.3 Расширить Router.ts
  - [ ] 4.3.1 Биндинг роутов плагинов после системных
  - [ ] 4.3.2 Поддержка plugin router sub-app
- [ ] 4.4 Интеграция с PolicyManager
  - [ ] 4.4.1 Плагин может указать свои policies
  - [ ] 4.4.2 Глобальные policies применяются автоматически
- [ ] 4.5 Unit тесты

### Созданные файлы
(Заполняется по мере реализации)

### Заметки
(Заполняется по мере реализации)

---

## Фаза 5: Plugin Models & Data

**Статус:** [ ] Не начато
**Приоритет:** P1
**Зависимости:** Фаза 1, Фаза 2

### Задачи
- [ ] 5.1 Реализовать PluginContext.registerModel()
  - [ ] 5.1.1 Регистрация через ORM-адаптер
  - [ ] 5.1.2 Namespace модели: `PluginId_ModelName`
  - [ ] 5.1.3 Конфигурация полей (ModelConfig)
- [ ] 5.2 Поддержка миграций плагинов
  - [ ] 5.2.1 Плагин определяет свои миграции
  - [ ] 5.2.2 Миграции запускаются при init
- [ ] 5.3 Интеграция с ModelHandler
  - [ ] 5.3.1 Модели плагинов добавляются в общий ModelHandler
  - [ ] 5.3.2 DataAccessor работает с моделями плагинов
- [ ] 5.4 Интеграция с AccessRightsHelper
  - [ ] 5.4.1 Автоматическая регистрация access tokens для моделей плагинов
- [ ] 5.5 Unit тесты

### Созданные файлы
(Заполняется по мере реализации)

### Заметки
(Заполняется по мере реализации)

---

## Фаза 6: Plugin UI (Navigation, Menu, Widgets)

**Статус:** [ ] Не начато
**Приоритет:** P2
**Зависимости:** Фаза 1, Фаза 2

### Задачи
- [ ] 6.1 Реализовать PluginContext.registerWidget()
  - [ ] 6.1.1 Проксирование к WidgetHandler.add()
  - [ ] 6.1.2 Авто-регистрация access rights token
- [ ] 6.2 Реализовать PluginContext.addMenuItem()
  - [ ] 6.2.1 Добавление в sections конфига
  - [ ] 6.2.2 Добавление в navbar.additionalLinks
  - [ ] 6.2.3 Группировка по section
- [ ] 6.3 Реализовать PluginContext.addNavItem()
  - [ ] 6.3.1 Добавление через Navigation system
- [ ] 6.4 Реализовать PluginContext.registerCatalog()
  - [ ] 6.4.1 Проксирование к CatalogHandler.add()
- [ ] 6.5 Обновить MenuHelper
  - [ ] 6.5.1 Включить пункты меню от плагинов
- [ ] 6.6 Unit тесты

### Созданные файлы
(Заполняется по мере реализации)

### Заметки
(Заполняется по мере реализации)

---

## Фаза 7: Plugin Frontend Components

**Статус:** [ ] Не начато
**Приоритет:** P2
**Зависимости:** Фаза 4

### Задачи
- [ ] 7.1 Определить соглашение для frontend-ассетов плагина
  - [ ] 7.1.1 Структура: `plugin-dir/frontend/` → компоненты
  - [ ] 7.1.2 Build output: `plugin-dir/dist/`
- [ ] 7.2 Vite config для сборки плагин-фронтенда
  - [ ] 7.2.1 Base vite config для плагинов
  - [ ] 7.2.2 Library mode build
- [ ] 7.3 Механизм маршрутизации к module.tsx
  - [ ] 7.3.1 registerRoute() + Inertia render component: 'module'
  - [ ] 7.3.2 Props: moduleComponent path, moduleComponentCSS path
- [ ] 7.4 Раздача статики плагинов
  - [ ] 7.4.1 Express static для build-артефактов плагинов
  - [ ] 7.4.2 Vite dev: прокси к исходникам плагинов
- [ ] 7.5 Unit тесты

### Созданные файлы
(Заполняется по мере реализации)

### Заметки
(Заполняется по мере реализации)

---

## Фаза 8: Plugin Controls

**Статус:** [ ] Не начато
**Приоритет:** P2
**Зависимости:** Фаза 1, Фаза 7

### Задачи
- [ ] 8.1 Реализовать PluginContext.registerControl()
  - [ ] 8.1.1 Проксирование к ControlsHandler.add()
  - [ ] 8.1.2 Автоматическое разрешение путей JS/CSS
- [ ] 8.2 Обновить AbstractControls (если нужно)
  - [ ] 8.2.1 Поддержка plugin-relative путей
- [ ] 8.3 Unit тесты

### Созданные файлы
(Заполняется по мере реализации)

### Заметки
(Заполняется по мере реализации)

---

## Фаза 9: Plugin Discovery & Loading

**Статус:** [ ] Не начато
**Приоритет:** P1
**Зависимости:** Фаза 1, Фаза 2, Фаза 3

### Задачи
- [ ] 9.1 Создать bindPlugins.ts
  - [ ] 9.1.1 Scan plugins/ директории
  - [ ] 9.1.2 Dynamic import каждого плагина
  - [ ] 9.1.3 Проверка enabled/disabled из конфига
- [ ] 9.2 Конвенция структуры плагина
  - [ ] 9.2.1 `plugin-dir/index.ts` → export default plugin
  - [ ] 9.2.2 `plugin-dir/package.json` (опционально) → метаданные
- [ ] 9.3 Поддержка npm-пакетов как плагинов
  - [ ] 9.3.1 Конфиг: `plugins: { 'npm-package-name': { enabled: true } }`
  - [ ] 9.3.2 Dynamic import по имени пакета
- [ ] 9.4 Поддержка указания пути к плагину
  - [ ] 9.4.1 Конфиг: `plugins: { 'my-plugin': { path: './custom/path' } }`
- [ ] 9.5 Error handling при загрузке
  - [ ] 9.5.1 Graceful fail — ошибка одного плагина не роняет всё
  - [ ] 9.5.2 Логирование ошибок через Adminizer.log
- [ ] 9.6 Unit тесты

### Созданные файлы
(Заполняется по мере реализации)

### Заметки
(Заполняется по мере реализации)

---

## Фаза 10: Fixture Plugin (Demo)

**Статус:** [ ] Не начато
**Приоритет:** P3
**Зависимости:** Фазы 1-9

### Задачи
- [ ] 10.1 Создать демо-плагин
  - [ ] 10.1.1 Определить manifest
  - [ ] 10.1.2 Реализовать onInit — регистрация роутов, виджетов
  - [ ] 10.1.3 Реализовать frontend-компонент
- [ ] 10.2 Перенести текущий fixture module-test в формат плагина
  - [ ] 10.2.1 Роут `/module-test` → плагин
  - [ ] 10.2.2 ReactQuill control → плагин
- [ ] 10.3 Обновить fixture/index.ts
  - [ ] 10.3.1 Убрать ручную регистрацию через emitter
  - [ ] 10.3.2 Подключить через plugins конфиг
- [ ] 10.4 Документация плагина (README)

### Созданные файлы
(Заполняется по мере реализации)

### Заметки
(Заполняется по мере реализации)

---

## Фаза 11: Тестирование

**Статус:** [ ] Не начато
**Приоритет:** P1
**Зависимости:** Фазы 1-9

### Задачи
- [ ] 11.1 Unit тесты PluginManifest
- [ ] 11.2 Unit тесты AbstractPlugin
- [ ] 11.3 Unit тесты PluginHandler
- [ ] 11.4 Unit тесты PluginContext
- [ ] 11.5 Unit тесты PluginManager
  - [ ] 11.5.1 Topological sort
  - [ ] 11.5.2 Cycle detection
  - [ ] 11.5.3 Missing dependency detection
- [ ] 11.6 Unit тесты bindPlugins (discovery)
- [ ] 11.7 Integration тест: полный жизненный цикл плагина
  - [ ] 11.7.1 Register → Init → Load → Destroy
  - [ ] 11.7.2 Route registration + request
  - [ ] 11.7.3 Model registration + CRUD
- [ ] 11.8 Integration тест: два плагина с зависимостью
- [ ] 11.9 Integration тест: ошибка в плагине не ломает систему

### Созданные файлы
(Заполняется по мере реализации)

### Заметки
(Заполняется по мере реализации)
