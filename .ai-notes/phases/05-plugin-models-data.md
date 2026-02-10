# Фаза 5: Plugin Models & Data

**Приоритет:** P1
**Зависимости:** Фаза 1, Фаза 2
**Статус:** [ ] Не начато

> ⚠️ Примечание для агента: Весь код — ПСЕВДОКОД. Реализуйте творчески,
> адаптируя под существующую кодовую базу. НЕ создавайте markdown файлы с резюме.

> ⚠️ КРИТИЧНО: Модели плагинов ДОЛЖНЫ использовать существующие ORM-адаптеры.
> Плагин выбирает адаптер по ormType или использует дефолтный.

---

## Цель
Дать плагинам возможность регистрировать собственные модели данных, которые интегрируются
с существующим ModelHandler и DataAccessor.

---

## Задачи

- [ ] 5.1 Реализовать PluginContext.registerModel()
  - [ ] 5.1.1 Регистрация через ORM-адаптер
  - [ ] 5.1.2 Namespace: при необходимости prefix модели
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

---

## ✅ Ключевые возможности

### 1. registerModel()
- ✅ Принимает: имя модели, ORM-схему, ModelConfig
- ✅ Автоматически добавляет в ModelHandler
- ✅ Для Sequelize: передаёт класс модели
- ✅ Для Waterline: передаёт определение модели
- ✅ Автоматическая регистрация access rights tokens

### 2. Регистрация в config.models
- ✅ Плагин может добавить свою ModelConfig через configModifier
- ✅ Или через registerModel() + передачу ModelConfig
- ✅ Модель появляется в CRUD-роутах, navbar (если visible)

---

## Псевдокод ключевых компонентов

### PluginContext.registerModel()
```typescript
// ПСЕВДОКОД
registerModel(
  name: string,
  modelClass: any, // Sequelize Model class or Waterline definition
  config?: Partial<ModelConfig>,
  options?: { ormType?: string }
): void {
  const ormType = options?.ormType ?? this.adminizer.config.system?.defaultORM ?? 'sequelize'
  const adapter = this.adminizer.getOrmAdapter(ormType)

  // Register model in ORM
  const registeredModel = adapter.getModel(name) ?? adapter.registerModel(name, modelClass)

  // Create AbstractModel wrapper
  const model = new adapter.Model(name, registeredModel)
  this.adminizer.modelHandler.add(name, model)

  // Register in config.models for CRUD routes
  if (config) {
    this.adminizer.config.models[name] = {
      model: name,
      title: config.title ?? name,
      ...config
    }
  }

  // Register access rights tokens
  this.adminizer.accessRightsHelper.registerToken({
    id: `model-${name.toLowerCase()}`,
    name: name,
    description: `Plugin ${this.pluginId} model: ${name}`
  })
}
```

---

## Тесты для этой фазы

### Unit тесты
- [ ] registerModel: модель появляется в ModelHandler
- [ ] registerModel с ModelConfig: модель появляется в CRUD-роутах
- [ ] Access rights token автоматически регистрируется
- [ ] DataAccessor работает с моделью плагина

### Coverage цель: 80%+
