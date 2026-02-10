# Фаза 10: Fixture Plugin (Demo)

**Приоритет:** P3
**Зависимости:** Фазы 1-9
**Статус:** [ ] Не начато

> ⚠️ Примечание для агента: Весь код — ПСЕВДОКОД. Реализуйте творчески,
> адаптируя под существующую кодовую базу. НЕ создавайте markdown файлы с резюме.

---

## Цель
Создать демонстрационный плагин, который показывает все возможности Plugin API.
Перенести текущую fixture-логику (module-test, ReactQuill, custom widgets) в формат плагина.

---

## Задачи

- [ ] 10.1 Создать демо-плагин
  - [ ] 10.1.1 Определить manifest (id: 'fixture-demo', name, version)
  - [ ] 10.1.2 Реализовать onInit — регистрация моделей (если есть)
  - [ ] 10.1.3 Реализовать onLoaded — регистрация роутов, виджетов, контролов
  - [ ] 10.1.4 Реализовать frontend-компонент (перенести ComponentB)
- [ ] 10.2 Перенести текущий fixture module-test в формат плагина
  - [ ] 10.2.1 Роут `/module-test` → `context.registerRoute('get', '/module-test', handler)`
  - [ ] 10.2.2 POST handler → `context.registerRoute('post', '/module-test', handler)`
- [ ] 10.3 Перенести ReactQuill control в формат плагина
  - [ ] 10.3.1 `context.registerControl(new ReactQuill(...))`
- [ ] 10.4 Обновить fixture/index.ts
  - [ ] 10.4.1 Добавить plugins в конфиг вместо ручной регистрации через emitter
  - [ ] 10.4.2 Сохранить обратную совместимость (emitter всё ещё работает)
- [ ] 10.5 Документация плагина (README в plugin dir)

---

## 🏗️ Архитектура

### Структура демо-плагина
```
fixture/plugins/
└── fixture-demo/
    ├── index.ts              # export default new FixtureDemoPlugin()
    ├── frontend/
    │   └── ComponentB.tsx    # Перенесён из modules/test/
    └── dist/
        └── ComponentB.es.js  # Build output
```

---

## ✅ Ключевые возможности

### Демонстрирует:
- ✅ Manifest с метаданными
- ✅ Lifecycle hooks: onInit, onLoaded
- ✅ Регистрация роутов (GET, POST)
- ✅ Регистрация контролов (ReactQuill)
- ✅ Frontend-компонент через module.tsx
- ✅ Отправка уведомлений
- ✅ Использование scoped logger

---

## Псевдокод

### FixtureDemoPlugin
```typescript
// ПСЕВДОКОД
export class FixtureDemoPlugin extends AbstractPlugin {
  readonly manifest: PluginManifest = {
    id: 'fixture-demo',
    name: 'Fixture Demo Plugin',
    version: '1.0.0',
    description: 'Demonstrates all Plugin API capabilities'
  }

  async onLoaded(ctx: PluginContext) {
    // Register module-test route
    ctx.registerRoute('get', '/module-test', async (req, res) => {
      const isDev = process.env.NODE_ENV === 'development'
      const moduleComponent = isDev
        ? '/plugins/fixture-demo/frontend/ComponentB.tsx'
        : `${ctx.routePrefix}/assets/plugins/fixture-demo/ComponentB.es.js`

      const users = await req.adminizer.modelHandler.model.get('userap')["_find"]({})
      return req.Inertia.render({
        component: 'module',
        props: { moduleComponent, data: { users } }
      })
    })

    ctx.registerRoute('post', '/module-test', async (req, res) => {
      // Send notification example
      res.json({ test: req.body })
    })

    // Register ReactQuill control
    ctx.registerControl(new ReactQuill(...))

    ctx.log.info('Fixture demo plugin loaded!')
  }
}

export default new FixtureDemoPlugin()
```

---

## Тесты для этой фазы

### Integration тесты
- [ ] Плагин загружается через discovery
- [ ] Роуты доступны и отвечают
- [ ] Контрол зарегистрирован
- [ ] Frontend-компонент загружается

### Coverage цель: 70%+
