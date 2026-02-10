# Фаза 11: Тестирование

**Приоритет:** P1
**Зависимости:** Фазы 1-9
**Статус:** [ ] Не начато

> ⚠️ Примечание для агента: Весь код — ПСЕВДОКОД. Реализуйте творчески,
> адаптируя под существующую кодовую базу. НЕ создавайте markdown файлы с резюме.

---

## Цель
Полное тестовое покрытие plugin system: unit тесты для каждого компонента,
integration тесты для жизненного цикла, edge cases и error handling.

---

## Задачи

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

---

## 🏗️ Архитектура

### Структура тестов
```
test/
└── plugin/
    ├── PluginManifest.test.ts
    ├── AbstractPlugin.test.ts
    ├── PluginHandler.test.ts
    ├── PluginContext.test.ts
    ├── PluginManager.test.ts
    ├── bindPlugins.test.ts
    ├── integration/
    │   ├── lifecycle.test.ts
    │   ├── routes.test.ts
    │   ├── models.test.ts
    │   └── error-handling.test.ts
    └── fixtures/
        ├── test-plugin-a/
        │   └── index.ts
        ├── test-plugin-b/      # depends on A
        │   └── index.ts
        ├── broken-plugin/
        │   └── index.ts        # throws error
        └── cyclic-plugin/
            └── index.ts
```

---

## Тестовые сценарии

### Unit тесты

#### PluginManifest
- Валидный манифест создаётся без ошибок
- Обязательные поля: id, name, version

#### PluginHandler
- add() → get() возвращает плагин
- add() с дублирующим id → throw Error
- remove() → get() возвращает undefined
- has() → true/false
- getAll() → массив всех плагинов

#### PluginContext
- registerRoute() формирует правильный path
- scoped logger добавляет prefix
- scoped emitter namespace'ит события
- config readonly — попытка записи → ошибка

#### PluginManager
- topologicalSort: A→B→C (B depends on A, C depends on B) → [A, B, C]
- topologicalSort: circular dependency → Error
- topologicalSort: missing dependency → Error
- register → onRegister вызывается
- initAll → onInit вызывается в порядке зависимостей
- loadAll → onLoaded вызывается
- destroyAll → onDestroy в обратном порядке
- Ошибка в onInit одного плагина → остальные продолжают

#### bindPlugins
- Сканирует директорию → находит плагины
- enabled: false → пропускает
- Несуществующая директория → не падает
- Невалидный export → логирует ошибку, продолжает

### Integration тесты

#### Full lifecycle
- Создать Adminizer + плагин → init → verify hooks called in order
- Плагин регистрирует роут → HTTP request → response OK
- Плагин регистрирует виджет → виджет в списке
- Плагин модифицирует конфиг → изменения применены

#### Multi-plugin
- Plugin A + Plugin B (зависит от A)
- A.onInit вызывается раньше B.onInit
- B может использовать ресурсы A

#### Error resilience
- Broken plugin → другие плагины работают
- Missing dependency → ошибка логируется

---

### Coverage цели
| Компонент | Целевой coverage |
|-----------|-----------------|
| PluginManifest | 95%+ |
| AbstractPlugin | 90%+ |
| PluginHandler | 95%+ |
| PluginContext | 85%+ |
| PluginManager | 90%+ |
| bindPlugins | 85%+ |
| Integration | ключевые сценарии |
| **Общий** | **85%+** |
