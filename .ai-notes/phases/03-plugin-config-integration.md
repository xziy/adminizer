# Фаза 3: Plugin Config Integration

**Приоритет:** P1
**Зависимости:** Фаза 1
**Статус:** [ ] Не начато

> ⚠️ Примечание для агента: Весь код — ПСЕВДОКОД. Реализуйте творчески,
> адаптируя под существующую кодовую базу. НЕ создавайте markdown файлы с резюме.

> ⚠️ КРИТИЧНО: configModifier НЕ должен иметь возможность удалять системные модели
> или менять routePrefix. Защитить критические поля от модификации.

---

## Цель
Интегрировать систему плагинов в конфигурационную систему Adminizer: добавить секцию `plugins`
в AdminpanelConfig, реализовать configModifier hook, поддержку enabled/disabled.

---

## Задачи

- [ ] 3.1 Расширить AdminpanelConfig
  - [ ] 3.1.1 Добавить секцию `plugins` в интерфейс
  - [ ] 3.1.2 Определить PluginConfigEntry: { enabled, options, path }
- [ ] 3.2 Реализовать configModifier hook
  - [ ] 3.2.1 Вызов configModifier каждого плагина перед нормализацией
  - [ ] 3.2.2 Deep merge результатов
  - [ ] 3.2.3 Валидация модификаций (запрет изменения критических полей)
- [ ] 3.3 Обновить defaults.ts
  - [ ] 3.3.1 Добавить дефолтную секцию plugins
- [ ] 3.4 Обновить ConfigHelper.normalizeConfig()
- [ ] 3.5 Unit тесты

---

## ✅ Ключевые возможности

### 1. Секция plugins в конфиге
- ✅ `plugins` — объект `{ [pluginId]: PluginConfigEntry }`
- ✅ `PluginConfigEntry.enabled` — включён/выключен (default: true)
- ✅ `PluginConfigEntry.options` — произвольные опции для плагина
- ✅ `PluginConfigEntry.path` — кастомный путь к плагину (для discovery)

### 2. configModifier
- ✅ Вызывается ДО normalizeConfig
- ✅ Может добавлять models, sections, navbar links
- ✅ НЕ может менять: routePrefix, auth, administrator
- ✅ Результат — deep merge с основным конфигом

---

## Псевдокод ключевых компонентов

### Расширение AdminpanelConfig
**Файл:** `src/interfaces/adminpanelConfig.ts`

```typescript
// ПСЕВДОКОД
export interface PluginConfigEntry {
  /** Enable/disable plugin (default: true) */
  enabled?: boolean
  /** Custom options passed to the plugin */
  options?: Record<string, any>
  /** Custom path to plugin directory */
  path?: string
}

export interface AdminpanelConfig {
  // ... existing fields ...

  /** Plugin configurations */
  plugins?: {
    /** Path to plugins directory (default: './plugins') */
    directory?: string
    /** Per-plugin configuration */
    registry?: {
      [pluginId: string]: PluginConfigEntry
    }
  }
}
```

### Protected fields
```typescript
// ПСЕВДОКОД
const PROTECTED_CONFIG_FIELDS = ['routePrefix', 'auth', 'administrator', 'rootPath'] as const
```

---

## Тесты для этой фазы

### Unit тесты
- [ ] Конфиг с plugins секцией парсится корректно
- [ ] configModifier добавляет model → модель появляется в нормализованном конфиге
- [ ] configModifier пытается изменить routePrefix → изменение игнорируется
- [ ] Плагин с enabled: false → не загружается

### Coverage цель: 85%+
