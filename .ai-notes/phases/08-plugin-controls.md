# Фаза 8: Plugin Controls

**Приоритет:** P2
**Зависимости:** Фаза 1, Фаза 7
**Статус:** [ ] Не начато

> ⚠️ Примечание для агента: Весь код — ПСЕВДОКОД. Реализуйте творчески,
> адаптируя под существующую кодовую базу. НЕ создавайте markdown файлы с резюме.

> ⚠️ ВАЖНО: Уже есть паттерн — `ReactQuill` в modules/controls/wysiwyg/.
> Это ЭТАЛОН для реализации. Плагин должен работать аналогично.

---

## Цель
Дать плагинам возможность регистрировать кастомные form controls (WYSIWYG, code editor,
JSON editor и т.д.) через PluginContext, используя существующий AbstractControls/ControlsHandler.

---

## Задачи

- [ ] 8.1 Реализовать PluginContext.registerControl()
  - [ ] 8.1.1 Проксирование к ControlsHandler.add()
  - [ ] 8.1.2 Автоматическое разрешение путей JS/CSS
- [ ] 8.2 Обновить AbstractControls (если нужно)
  - [ ] 8.2.1 Поддержка plugin-relative путей
- [ ] 8.3 Unit тесты

---

## ✅ Ключевые возможности

### 1. registerControl()
- ✅ Принимает экземпляр AbstractControls
- ✅ Проксирует к `controlsHandler.add(control)`
- ✅ Автоматическое определение JS/CSS путей (dev/production)

### 2. Паттерн использования
```typescript
// В плагине — onLoaded()
class MyWysiwyg extends AbstractControls {
  name = 'my-wysiwyg'
  type: ControlType = 'wysiwyg'
  // ... paths, config ...
}

context.registerControl(new MyWysiwyg(adminizer))
```

---

## Тесты для этой фазы

### Unit тесты
- [ ] registerControl: контрол появляется в ControlsHandler
- [ ] CSS paths собираются через collectAndGenerateStyleLinks
- [ ] JS paths доступны для frontend

### Coverage цель: 80%+
