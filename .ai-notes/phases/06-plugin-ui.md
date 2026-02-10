# Фаза 6: Plugin UI (Navigation, Menu, Widgets)

**Приоритет:** P2
**Зависимости:** Фаза 1, Фаза 2
**Статус:** [ ] Не начато

> ⚠️ Примечание для агента: Весь код — ПСЕВДОКОД. Реализуйте творчески,
> адаптируя под существующую кодовую базу. НЕ создавайте markdown файлы с резюме.

---

## Цель
Дать плагинам возможность добавлять UI-элементы: виджеты на дашборд, пункты меню, навигацию,
каталоги. Все через PluginContext API.

---

## Задачи

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

---

## ✅ Ключевые возможности

### 1. registerWidget()
- ✅ Принимает WidgetType (SwitchBase, InfoBase, ActionBase, LinkBase, CustomBase)
- ✅ Автоматически регистрирует access rights token: `widget-${widgetId}`
- ✅ Виджет появляется на дашборде

### 2. addMenuItem()
- ✅ Добавляет HrefConfig в navbar
- ✅ Поддержка section группировки
- ✅ Поддержка subItems
- ✅ Автоматический routePrefix для ссылок плагина

### 3. registerCatalog()
- ✅ Регистрирует AbstractCatalog в CatalogHandler
- ✅ Автоматические роуты: `/catalog/${slug}`

---

## Псевдокод ключевых компонентов

### PluginContext UI methods
```typescript
// ПСЕВДОКОД
registerWidget(widget: WidgetType): void {
  this.adminizer.widgetHandler.add(widget)
}

addMenuItem(item: HrefConfig): void {
  // Auto-prefix links that are relative
  if (!item.link.startsWith('http') && !item.link.startsWith('/')) {
    item.link = `${this.routePrefix}/p/${this.pluginId}/${item.link}`
  }
  if (!this.adminizer.config.navbar) {
    this.adminizer.config.navbar = { additionalLinks: [] }
  }
  this.adminizer.config.navbar.additionalLinks.push(item)
}

registerCatalog(catalog: AbstractCatalog): void {
  this.adminizer.catalogHandler.add(catalog)
}
```

---

## Тесты для этой фазы

### Unit тесты
- [ ] registerWidget: виджет появляется в widgetHandler
- [ ] addMenuItem: пункт появляется в navbar
- [ ] addMenuItem: относительные ссылки получают prefix
- [ ] registerCatalog: каталог доступен по slug

### Coverage цель: 80%+
