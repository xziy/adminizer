# Фаза 7: Plugin Frontend Components

**Приоритет:** P2
**Зависимости:** Фаза 4
**Статус:** [ ] Не начато

> ⚠️ Примечание для агента: Весь код — ПСЕВДОКОД. Реализуйте творчески,
> адаптируя под существующую кодовую базу. НЕ создавайте markdown файлы с резюме.

> ⚠️ КРИТИЧНО: Уже существует `module.tsx` — React-страница, которая делает
> dynamic import компонента по URL. Этот механизм НУЖНО переиспользовать.
> НЕ создавать новую систему lazy-load.

---

## Цель
Обеспечить плагинам возможность предоставлять React-компоненты для своих страниц,
используя существующий механизм `module.tsx` + Inertia.js. Включая сборку через Vite
и раздачу статики.

---

## Задачи

- [ ] 7.1 Определить соглашение для frontend-ассетов плагина
  - [ ] 7.1.1 Структура: `plugin-dir/frontend/` → компоненты React
  - [ ] 7.1.2 Build output: `plugin-dir/dist/` → .es.js + .css
- [ ] 7.2 Vite config для сборки плагин-фронтенда
  - [ ] 7.2.1 Base vite config шаблон для плагинов
  - [ ] 7.2.2 Library mode build (ESM)
- [ ] 7.3 Механизм маршрутизации к module.tsx
  - [ ] 7.3.1 registerRoute() + `req.Inertia.render({ component: 'module', props: { moduleComponent, data } })`
  - [ ] 7.3.2 Автоматическое определение путей JS/CSS в dev и production
- [ ] 7.4 Раздача статики плагинов
  - [ ] 7.4.1 Express static для build-артефактов плагинов (production)
  - [ ] 7.4.2 Vite dev: прокси к исходникам плагинов (development)
- [ ] 7.5 Unit тесты

---

## ✅ Ключевые возможности

### 1. Структура frontend плагина
```
my-plugin/
├── index.ts              # Plugin class
├── frontend/
│   ├── MyPage.tsx        # React component
│   └── MyPage.css        # Styles
├── dist/
│   ├── MyPage.es.js      # Built ESM
│   └── MyPage.css        # Built CSS
└── vite.config.ts        # Plugin-specific vite config
```

### 2. Рендеринг через module.tsx
- ✅ Существующий `module.tsx` уже поддерживает dynamic import по URL
- ✅ Плагин регистрирует роут, который рендерит `component: 'module'`
- ✅ В props передаёт `moduleComponent` (URL к .tsx или .es.js)
- ✅ В props передаёт `moduleComponentCSS` (URL к CSS)

### 3. Dev/Production пути
- ✅ Dev: `/plugins/my-plugin/frontend/MyPage.tsx` (через Vite)
- ✅ Production: `${routePrefix}/assets/plugins/my-plugin/MyPage.es.js`

---

## Псевдокод ключевых компонентов

### Рендеринг страницы плагина
```typescript
// ПСЕВДОКОД — внутри onLoaded()
context.registerRoute('get', '/dashboard', async (req, res) => {
  const isDev = process.env.NODE_ENV === 'development'
  const moduleComponent = isDev
    ? '/plugins/my-plugin/frontend/Dashboard.tsx'
    : `${context.routePrefix}/assets/plugins/my-plugin/Dashboard.es.js`

  return req.Inertia.render({
    component: 'module',
    props: {
      moduleComponent,
      moduleComponentCSS: isDev ? undefined : `${context.routePrefix}/assets/plugins/my-plugin/Dashboard.css`,
      data: { /* plugin data */ }
    }
  })
})
```

### Static serving
```typescript
// ПСЕВДОКОД — в bindPlugins или PluginManager
// Production: serve built assets
adminizer.app.use(
  `${routePrefix}/assets/plugins`,
  express.static(path.join(pluginsDir, '*/dist'))
)

// Dev: Vite handles /plugins/* automatically if paths are configured
```

---

## Тесты для этой фазы

### Unit тесты
- [ ] Правильное формирование путей dev/production
- [ ] Static serve отдаёт файлы из dist/
- [ ] module.tsx корректно загружает компонент плагина

### Coverage цель: 75%+
