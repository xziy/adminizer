# DataAccessor Integration для системы фильтров

**Дата:** 31 января 2026  
**Статус:** ✅ Применено в плане

> **🔄 СТРАТЕГИЯ:** Только pull (запросы по требованию)
> 
> Система фильтров работает **ТОЛЬКО** по явным запросам от клиента.
> НЕТ автоматических обновлений, push-уведомлений или подписок.

---

## 🔴 Проблема

Исходный план системы фильтров **не интегрировал DataAccessor**, что создавало критическую уязвимость безопасности:

- Пользователи могли видеть чужие приватные фильтры через прямые API запросы
- Нужны были ручные проверки прав в каждом методе (дублирование кода)
- Нарушение архитектуры Adminizer, где DataAccessor - центральный слой для работы с данными

---

## ✅ Решение

### 1. Модель FilterAP теперь включает `userAccessRelation`

```typescript
export const FilterAPSchema = {
  // ... поля ...
  
  // ✅ КРИТИЧНО: Обеспечивает автоматическую фильтрацию по владельцу
  userAccessRelation: 'owner',
  
  associations: {
    owner: {                    // ← Было: ownerId (number)
      model: 'UserAP',          // Теперь: owner (BelongsTo)
      type: 'belongsTo',
      foreignKey: 'owner'
    },
    columns: {
      model: 'FilterColumnAP',
      type: 'hasMany',
      foreignKey: 'filterId'
    }
  }
};
```

### 2. FilterService использует DataAccessor

```typescript
class FilterService {
  constructor(
    private adminizer: Adminizer,
    private dataAccessor: DataAccessor  // ← Добавлено
  ) {}

  // ✅ Теперь через DataAccessor - автоматическая проверка прав
  async getById(filterId: string, user: UserAP): Promise<FilterAP | null> {
    return this.dataAccessor.process('FilterAP', { id: filterId }, user);
  }

  // ✅ Автоматическая фильтрация: where.owner = user.id
  async getForUser(user: UserAP, options = {}): Promise<FilterAP[]> {
    const where: any = {};
    
    if (options.modelName) {
      where.modelName = options.modelName;
    }

    // DataAccessor автоматически добавит: where.owner = user.id
    // если пользователь не администратор
    let privateFilters = await this.dataAccessor.processMany('FilterAP', where, user);

    // Для публичных фильтров нужен отдельный запрос
    if (!user.isAdministrator) {
      const publicWhere = { ...where, visibility: 'public' };
      const publicFilters = await this.filterModel.find({ where: publicWhere });
      
      privateFilters = [...privateFilters, ...publicFilters];
      
      // Удалить дубликаты
      return Array.from(new Map(privateFilters.map(f => [f.id, f])).values());
    }

    return privateFilters;
  }

  // ✅ Создание через DataAccessor
  async create(data: Partial<FilterAPAttributes>, user: UserAP): Promise<FilterAP> {
    data.owner = user.id;  // ← Было: data.ownerId
    return this.dataAccessor.create('FilterAP', data, user);
  }

  // ✅ Обновление через DataAccessor - автоматическая проверка прав
  async update(filterId: string, data: Partial<FilterAPAttributes>, user: UserAP): Promise<FilterAP> {
    await this.dataAccessor.update('FilterAP', { id: filterId }, data, user);
    return this.getById(filterId, user);
  }

  // ✅ Удаление через DataAccessor - автоматическая проверка прав
  async delete(filterId: string, user: UserAP): Promise<void> {
    await this.dataAccessor.destroy('FilterAP', { id: filterId }, user);
  }
}
```

---

## 📋 Что было изменено в плане

### Фаза 1: Модель данных
- ✅ `ownerId` → `owner` (BelongsTo вместо number)
- ✅ Добавлено `userAccessRelation: 'owner'`
- ✅ Обновлены миграции

### Фаза 3: CRUD фильтров
- ✅ `FilterService` принимает `DataAccessor` в конструкторе
- ✅ Все методы используют `dataAccessor.process/processMany/create/update/destroy`
- ✅ Убраны ручные проверки `canView/canEdit/canDelete`

### Фаза 13: Права доступа
- ✅ Удалён `FilterAccessService` (дублирование DataAccessor)
- ✅ Упрощена логика - базовая безопасность через DataAccessor
- ✅ Добавлены примечания про публичные и групповые фильтры

---

## 🔒 Безопасность

### Автоматически обеспечивается через userAccessRelation:

✅ **Фильтрация по владельцу** - пользователь видит только свои фильтры  
✅ **Запрет редактирования** - нельзя изменить чужой фильтр  
✅ **Запрет удаления** - нельзя удалить чужой фильтр  
✅ **Полный доступ админа** - администратор видит все фильтры  

### Требует дополнительной логики:

⚠️ **Публичные фильтры** (`visibility: 'public'`) - доступны всем для чтения  
⚠️ **Групповые фильтры** (`visibility: 'groups'`) - нужна проверка пересечения groupIds  

---

## 📚 Документация

См. документацию Adminizer:
- `docs/AccessRights/user-owned-records.md` - userAccessRelation
- `docs/AccessRights/AccessRightsModelFields.md` - DataAccessor

---

## ⚠️ Важно для реализации

1. **ВСЕГДА используйте DataAccessor** для операций с фильтрами пользователя
2. **НЕ используйте прямые вызовы ORM** (`filterModel.find()`) кроме:
   - Публичных фильтров
   - API доступа по ключу (`apiKey`)
   - Административных операций
3. **Поле owner должно быть BelongsTo**, а не просто number
4. **userAccessRelation обязателен** в схеме модели

---

## Пример правильной и неправильной реализации

### ❌ НЕПРАВИЛЬНО (уязвимо):
```typescript
async getFilterById(filterId: string): Promise<FilterAP> {
  const filterModel = this.adminizer.modelHandler.getModel('FilterAP');
  return filterModel.findOne({ where: { id: filterId } });
  // ⚠️ Пользователь может получить доступ к ЛЮБОМУ фильтру!
}
```

### ✅ ПРАВИЛЬНО (безопасно):
```typescript
async getFilterById(filterId: string, user: UserAP): Promise<FilterAP> {
  return this.dataAccessor.process('FilterAP', { id: filterId }, user);
  // ✅ DataAccessor автоматически проверит права через userAccessRelation
}
```

---

## Итог

Интеграция с DataAccessor:
- ✅ Обеспечивает безопасность из коробки
- ✅ Соответствует архитектуре Adminizer
- ✅ Избавляет от дублирования кода проверки прав
- ✅ Автоматическая фильтрация по владельцу
- ✅ Единообразный подход ко всем моделям
