# Стратегия тестирования Plugin System

## Общие принципы

### Типы тестов
1. **Unit тесты** (85% покрытие) — отдельные классы/функции, моки зависимостей, быстрые (<100ms)
2. **Integration тесты** (ключевые сценарии) — взаимодействие компонентов, реальный Adminizer init
3. **Ручное тестирование** — fixture plugin, проверка UI

### Coverage цели
- Минимум: 85%
- Критичные компоненты (PluginManager, PluginHandler): 90%+

### Инструменты
- **Vitest** — уже используется в проекте (process.env.VITEST проверяется в коде)
- **Supertest** — для HTTP-тестов (если не используется, можно взять)
- **Мокирование** — vitest built-in mocks

---

## Тестирование по фазам

### Phase 1: Plugin Core

**Unit тесты:**
- PluginManifest: валидация обязательных полей
- AbstractPlugin: создание, manifest property
- PluginHandler: CRUD операции, дублирование, lookup
- PluginContext: все методы-прокси, scoped logger, scoped emitter

**Coverage:** 90%+

---

### Phase 2: Plugin Lifecycle Hooks

**Unit тесты:**
- PluginManager.register: создаёт context, вызывает onRegister
- PluginManager.initAll: topological sort, вызов onInit по порядку
- PluginManager.loadAll: вызов onLoaded
- PluginManager.destroyAll: обратный порядок
- Topological sort: прямые/транзитивные зависимости, циклы, missing deps

**Integration тесты:**
- Full lifecycle: register → init → load → destroy

**Coverage:** 90%+

---

### Phase 3: Plugin Config Integration

**Unit тесты:**
- AdminpanelConfig с plugins секцией парсится
- configModifier: добавление модели
- configModifier: защита критических полей
- enabled: false → плагин не загружается

**Coverage:** 85%+

---

### Phase 4: Plugin Routes & Middleware

**Unit тесты:**
- registerRoute: формирование пути с namespace
- registerRoute: application policies
- registerMiddleware: выполнение до handler

**Integration тесты:**
- HTTP request к роуту плагина → ответ

**Coverage:** 85%+

---

### Phase 5: Plugin Models & Data

**Unit тесты:**
- registerModel: модель в ModelHandler
- registerModel: access rights token

**Integration тесты:**
- CRUD через модель плагина

**Coverage:** 80%+

---

### Phase 6: Plugin UI

**Unit тесты:**
- registerWidget: проксирование
- addMenuItem: prefix для relative links
- registerCatalog: доступность по slug

**Coverage:** 80%+

---

### Phase 7-8: Frontend & Controls

**Unit тесты:**
- Формирование путей dev/production
- registerControl: проксирование к ControlsHandler

**Coverage:** 75%+

---

### Phase 9: Discovery & Loading

**Unit тесты:**
- Scan directory
- Disabled plugin skip
- Error handling (broken import)
- npm package import

**Coverage:** 85%+

---

### Phase 10: Fixture Plugin

**Integration тесты:**
- Full E2E: plugin discovery → registration → init → routes → request → response
- Ручное тестирование UI

**Coverage:** 70%+

---

### Phase 11: Финальное тестирование

**Regression тесты:**
- Весь существующий функционал Adminizer работает без плагинов
- Adminizer с пустой plugins секцией = без изменений
- Fixture без плагинов = работает как раньше

**Stress тесты:**
- 10 плагинов: всё загружается
- Плагин с 50 роутами: работает

---

## Запуск тестов

```bash
# All tests
npm test

# Plugin tests only
npx vitest run test/plugin/

# Watch mode
npx vitest watch test/plugin/

# Coverage
npx vitest run --coverage test/plugin/
```
