# Отключение фильтров (Backward Compatibility)

## Обзор

Новая система фильтров может быть отключена глобально или для конкретных моделей, с автоматическим fallback на старый глобальный поиск. Это обеспечивает плавную миграцию для существующих проектов.

## Уровни конфигурации

### 1. Глобальное отключение

Отключить фильтры для всей админ-панели:

```typescript
const adminizer = new Adminizer({
  filtersEnabled: false,  // Все модели используют старый поиск
  // ... остальные настройки
});
```

**Результат:**
- ❌ API `/adminizer/filters/*` возвращает `403 Forbidden`
- ✅ Все модели используют legacy global search
- ✅ UI показывает только старый поисковый input

---

### 2. Отключение для конкретной модели

Включить фильтры глобально, но отключить для определённых моделей:

```typescript
const adminizer = new Adminizer({
  filtersEnabled: true,  // Глобально включены
  
  modelFilters: {
    // Отключить для UserAP - использовать старый поиск
    UserAP: {
      enabled: false,
      useLegacySearch: true
    },
    
    // Отключить для OrderAP
    OrderAP: {
      enabled: false,
      useLegacySearch: true
    },
    
    // ProductAP использует новые фильтры (не указан = enabled по умолчанию)
  }
});
```

**Результат:**
- ✅ UserAP и OrderAP: legacy search
- ✅ ProductAP и остальные: новые фильтры
- ✅ UI автоматически переключается между моделями

---

### 3. Постепенная миграция (рекомендуется)

Идеальный подход для плавной миграции:

```typescript
const adminizer = new Adminizer({
  filtersEnabled: true,
  
  modelFilters: {
    // Этап 1: Старые сложные модели остаются на legacy
    UserAP: { enabled: false, useLegacySearch: true },
    OrderAP: { enabled: false, useLegacySearch: true },
    InvoiceAP: { enabled: false, useLegacySearch: true },
    
    // Этап 2: Новые/простые модели используют фильтры
    ProductAP: { enabled: true },
    CategoryAP: { enabled: true },
    TagAP: { enabled: true }
  }
});
```

**План миграции:**
1. Включить фильтры только для новых/простых моделей
2. Протестировать работу на реальных пользователях
3. Постепенно переключать сложные модели
4. Убрать `modelFilters` конфиг когда все модели мигрированы

---

## Интерфейс конфигурации

```typescript
interface AdminizerConfig {
  // Глобальное включение/отключение фильтров
  filtersEnabled?: boolean;  // по умолчанию: true
  
  // Настройки для конкретных моделей
  modelFilters?: {
    [modelName: string]: {
      // Включены ли фильтры для этой модели
      enabled: boolean;
      
      // Использовать ли старый глобальный поиск (fallback)
      useLegacySearch?: boolean;  // по умолчанию: false
    };
  };
}
```

---

## Поведение API

### Когда фильтры отключены

**Запрос:**
```http
GET /adminizer/filters?modelName=UserAP
```

**Ответ (403 Forbidden):**
```json
{
  "success": false,
  "error": "Filters are disabled for this model",
  "filtersEnabled": false
}
```

**Запрос:**
```http
POST /adminizer/filters
Content-Type: application/json

{
  "name": "Active Users",
  "modelName": "UserAP",
  "conditions": [...]
}
```

**Ответ (403 Forbidden):**
```json
{
  "success": false,
  "error": "Filters are disabled for model UserAP",
  "filtersEnabled": false
}
```

### Игнорирование filterSlug

Если фильтры отключены, параметры `filter` и `filterSlug` игнорируются:

```http
GET /adminizer/users/list?filter=active-users
GET /adminizer/users/list?filterSlug=active-users
```

**Поведение:**
- ⚠️ `filter=active-users` или `filterSlug=active-users` игнорируются
- ✅ Используется legacy global search
- ✅ Логируется warning: `Filters disabled for model UserAP, ignoring filter slug 'active-users'`

---

## Поведение UI

### Компонент List.tsx

UI автоматически адаптируется на основе флагов:

- `filtersEnabled`
- `useLegacySearch`
- `appliedFilter` (slug активного фильтра, если он применен)

Пример:

```tsx
import { usePage } from '@inertiajs/react';

export default function List() {
  const { filtersEnabled, useLegacySearch, appliedFilter } = usePage().props;
  
  return (
    <div className="list-container">
      {/* Условный рендеринг на основе флагов */}
      <div className="list-toolbar">
        {useLegacySearch ? (
          // Старый поиск
          <input
            type="text"
            placeholder="Search..."
            onChange={(e) => handleGlobalSearch(e.target.value)}
          />
        ) : (
          // Новые фильтры
          <>
            {filtersEnabled && (
              <button onClick={() => openFilterBuilder()}>
                + Create Filter
              </button>
            )}
            <FilterDropdown />
          </>
        )}
      </div>
      
      <DataTable {...props} />
    </div>
  );
}
```

### Видимость элементов

| Элемент UI | filtersEnabled=true | filtersEnabled=false |
|-----------|---------------------|----------------------|
| Кнопка "Create Filter" | ✅ Видна | ❌ Скрыта |
| FilterDropdown | ✅ Видимый | ❌ Скрыт |
| Legacy search input | ❌ Скрыт | ✅ Видимый |
| Кнопка "Save Filter" | ✅ Видна | ❌ Скрыта |

---

## Проверка в коде

### Backend (FilterService)

```typescript
class FilterService {
  /**
   * Проверка: включены ли фильтры глобально
   */
  isFiltersEnabled(): boolean {
    return this.config.filtersEnabled !== false;
  }
  
  /**
   * Проверка: включены ли фильтры для модели
   */
  isFiltersEnabledForModel(modelName: string): boolean {
    if (!this.isFiltersEnabled()) {
      return false;  // Глобально отключены
    }
    
    const modelConfig = this.config.modelFilters?.[modelName];
    if (!modelConfig) {
      return true;  // Нет конфига = включены
    }
    
    return modelConfig.enabled !== false;
  }
  
  /**
   * Проверка: нужен ли fallback на legacy search
   */
  shouldUseLegacySearch(modelName: string): boolean {
    const modelConfig = this.config.modelFilters?.[modelName];
    return modelConfig?.useLegacySearch === true;
  }
}
```

### Controller (list.ts)

```typescript
export async function getHandler(req: ReqType, res: Response) {
  const modelName = req.entity.model.identity;
  
  // Проверка включенности фильтров
  const filtersEnabled = req.adminizer.filterService
    .isFiltersEnabledForModel(modelName);
  
  if (!filtersEnabled) {
    // Использовать legacy search
    return renderWithLegacySearch(req, res);
  }
  
  // Использовать новые фильтры
  return renderWithModernFilters(req, res);
}
```

---

## Сценарии использования

### ✅ Сценарий 1: Новый проект

```typescript
// Просто используйте дефолты - фильтры включены
const adminizer = new Adminizer({
  // filtersEnabled: true - по умолчанию
});
```

---

### ✅ Сценарий 2: Полное отключение (для тестирования)

```typescript
const adminizer = new Adminizer({
  filtersEnabled: false  // Все работает как раньше
});
```

---

### ✅ Сценарий 3: Постепенная миграция большого проекта

**Шаг 1:** Отключить фильтры для всех критичных моделей

```typescript
const adminizer = new Adminizer({
  filtersEnabled: true,
  modelFilters: {
    UserAP: { enabled: false, useLegacySearch: true },
    OrderAP: { enabled: false, useLegacySearch: true },
    PaymentAP: { enabled: false, useLegacySearch: true }
  }
});
```

**Шаг 2:** Включить фильтры для 1-2 некритичных моделей

```typescript
const adminizer = new Adminizer({
  filtersEnabled: true,
  modelFilters: {
    UserAP: { enabled: false, useLegacySearch: true },
    OrderAP: { enabled: false, useLegacySearch: true },
    PaymentAP: { enabled: false, useLegacySearch: true },
    
    // Протестировать на этих моделях
    CategoryAP: { enabled: true },
    TagAP: { enabled: true }
  }
});
```

**Шаг 3:** Постепенно переключать остальные

```typescript
const adminizer = new Adminizer({
  filtersEnabled: true,
  modelFilters: {
    // Остались только самые сложные
    UserAP: { enabled: false, useLegacySearch: true },
    
    // Остальные уже используют фильтры
  }
});
```

**Шаг 4:** Убрать конфиг когда все модели мигрированы

```typescript
const adminizer = new Adminizer({
  // filtersEnabled: true - по умолчанию
  // modelFilters не нужен - все модели используют фильтры
});
```

---

## Логи и мониторинг

### Warning когда фильтры отключены

```
[WARN] Filters disabled for model UserAP, ignoring filter slug 'active-users'
```

### Попытка создать фильтр для отключенной модели

```
[WARN] Attempt to create filter for disabled model UserAP by user #123
```

### Проверка статуса в логах

```typescript
Adminizer.log.info('Filters configuration:', {
  globalEnabled: config.filtersEnabled,
  modelOverrides: Object.keys(config.modelFilters || {})
});
```

---

## Тестирование

### Unit тесты

```typescript
describe('FilterService - filtersEnabled', () => {
  it('should return false when globally disabled', () => {
    const service = new FilterService({ filtersEnabled: false });
    expect(service.isFiltersEnabled()).toBe(false);
  });
  
  it('should return false for specific model', () => {
    const service = new FilterService({
      filtersEnabled: true,
      modelFilters: {
        UserAP: { enabled: false, useLegacySearch: true }
      }
    });
    expect(service.isFiltersEnabledForModel('UserAP')).toBe(false);
  });
});
```

### Integration тесты

```typescript
describe('list.ts with filters disabled', () => {
  it('should use legacy search when filtersEnabled=false', async () => {
    const res = await request(app)
      .get('/adminizer/users/list?globalSearch=john')
      .expect(200);
    
    expect(res.body.filtersEnabled).toBe(false);
    expect(res.body.useLegacySearch).toBe(true);
  });
});
```

---

## FAQ

### Q: Что происходит с существующими сохраненными фильтрами?

**A:** Они остаются в базе данных, но API возвращает `403` при попытке их использовать. Когда фильтры снова включите - фильтры заработают.

---

### Q: Можно ли отключить фильтры без useLegacySearch?

**A:** Да, но тогда поиск вообще не будет работать:

```typescript
modelFilters: {
  UserAP: { enabled: false }  // useLegacySearch: false
}
```

**Результат:** UI не показывает ни фильтры, ни legacy search.

---

### Q: Как временно отключить фильтры для отладки?

**A:** Используйте environment variable:

```bash
ADMINIZER_FILTERS_ENABLED=false npm run dev
```

```typescript
const adminizer = new Adminizer({
  filtersEnabled: process.env.ADMINIZER_FILTERS_ENABLED !== 'false'
});
```

---

## См. также

- [Phase 1: Data Model](../.ai-notes/phases/01-data-model.md) - Конфигурация фильтров
- [Phase 2: Query Builder](../.ai-notes/phases/02-query-builder.md) - Fallback в list.ts
- [Phase 3: Filter CRUD](../.ai-notes/phases/03-filter-crud.md) - Проверки в контроллерах
