# Фаза 4: Plugin Routes & Middleware

**Приоритет:** P1
**Зависимости:** Фаза 1, Фаза 2
**Статус:** [ ] Не начато

> ⚠️ Примечание для агента: Весь код — ПСЕВДОКОД. Реализуйте творчески,
> адаптируя под существующую кодовую базу. НЕ создавайте markdown файлы с резюме.

> ⚠️ КРИТИЧНО: Роуты плагинов ДОЛЖНЫ быть изолированы в namespace
> `${routePrefix}/p/${pluginId}/...`. Плагин НЕ может регистрировать роуты
> вне своего namespace. Глобальные policies ВСЕГДА применяются.

---

## Цель
Реализовать механизм регистрации Express-роутов и middleware из плагинов с namespace-изоляцией
и автоматическим применением policies.

---

## Задачи

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

---

## ✅ Ключевые возможности

### 1. registerRoute()
- ✅ Автоматический prefix: `/adminizer/p/my-plugin/dashboard` → для `registerRoute('get', '/dashboard', handler)`
- ✅ Policies chain: global policies → plugin policies → handler
- ✅ Inertia support: handler может использовать `req.Inertia.render()`

### 2. registerMiddleware()
- ✅ Middleware выполняется ДО роутов плагина
- ✅ Может добавлять данные в req

---

## Псевдокод ключевых компонентов

### PluginContext.registerRoute()
```typescript
// ПСЕВДОКОД
registerRoute(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  handler: ControllerFunction,
  options?: {
    policies?: MiddlewareType[]  // дополнительные policies
    skipGlobalPolicies?: boolean // default: false
  }
): void {
  const fullPath = `${this.routePrefix}/p/${this.pluginId}${path.startsWith('/') ? path : '/' + path}`
  const allPolicies = [...globalPolicies, ...(options?.policies ?? [])]
  this.adminizer.app[method](fullPath, this.adminizer.policyManager.bindPolicies(allPolicies, handler))
  // Store route info for potential cleanup
  this.registeredRoutes.push({ method, path: fullPath })
}
```

### Plugin Router Sub-App
```typescript
// ПСЕВДОКОД — каждый плагин получает свой Express Router
const pluginRouter = express.Router()
// plugin registers routes on pluginRouter
// then mount: adminizer.app.use(`${routePrefix}/p/${pluginId}`, pluginRouter)
```

---

## Тесты для этой фазы

### Unit тесты
- [ ] registerRoute: создаёт роут с правильным prefix
- [ ] registerRoute: policies применяются
- [ ] registerMiddleware: middleware выполняется до handler
- [ ] Namespace isolation: плагин не может создать роут вне своего namespace

### Coverage цель: 85%+
