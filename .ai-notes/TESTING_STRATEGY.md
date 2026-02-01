# Стратегия тестирования системы фильтров

## Общие принципы

### Типы тестов

1. **Unit тесты** (80% покрытие кода)
   - Тестируют отдельные функции/методы
   - Моки для всех внешних зависимостей
   - Быстрые (< 100ms на тест)

2. **Integration тесты** (ключевые сценарии)
   - Тестируют взаимодействие компонентов
   - Реальная БД (in-memory или test database)
   - Средние по времени (< 1s на тест)

3. **E2E тесты** (критичные user flows)
   - Полный цикл от UI до БД
   - Playwright для браузерных тестов
   - Медленные (5-10s на тест)

### Coverage цели

- **Минимум:** 80% code coverage
- **Критичные компоненты:** 90%+ coverage
  - ModernQueryBuilder
  - FilterService
  - CustomFieldHandler
  - Security validation

### Инструменты

```json
{
  "test": "vitest",
  "coverage": "@vitest/coverage-v8",
  "e2e": "playwright",
  "mocks": "@vitest/spy",
  "fixtures": "faker-js/faker"
}
```

---

## Тестирование по фазам

### Phase 1: Модель данных

**Unit тесты:**
- ✅ Создание моделей (CRUD)
- ✅ Валидация полей
- ✅ Уникальные constrains
- ✅ JSON сериализация
- ✅ Default values
- ✅ Связи (associations)

**Integration тесты:**
- ✅ Транзакции
- ✅ Cascade delete
- ✅ Миграции (up/down)

**Coverage:** 85%+

---

### Phase 2: Query Builder

**Unit тесты:**
- ✅ ModernQueryBuilder.buildWhere() - все операторы
- ✅ ModernQueryBuilder.buildConditionGroup() - AND/OR/NOT
- ✅ ModernQueryBuilder.buildSingleCondition() - каждый тип
- ✅ ModernQueryBuilder.buildOrder()
- ✅ ModernQueryBuilder.mapData()
- ✅ CustomFieldHandler.register()
- ✅ CustomFieldHandler.get()
- ✅ CustomFieldHandler.buildCondition() - все диалекты
- ✅ Security validation - все лимиты
- ✅ Operator mapping для каждого operator

**Integration тесты:**
- ✅ QueryBuilder + DataAccessor (PostgreSQL)
- ✅ QueryBuilder + DataAccessor (MySQL)
- ✅ QueryBuilder + DataAccessor (Waterline)
- ✅ list.ts controller
- ✅ FilterService.applyFilter()

**Performance тесты:**
- ✅ 1000 записей - < 100ms
- ✅ 10000 записей - < 500ms
- ✅ Сложный фильтр (5 уровней вложенности) - < 200ms

**Coverage:** 90%+ (критичный компонент)

---

### Phase 3: Сохранение фильтров

**Unit тесты:**
- ✅ FilterService.create()
- ✅ FilterService.update()
- ✅ FilterService.delete()
- ✅ FilterService.getById()
- ✅ FilterService.list()
- ✅ FilterService.canView() - права доступа
- ✅ FilterService.canEdit() - права доступа
- ✅ FilterMigration.isFilterValid()
- ✅ FilterMigration.migrateFilter()
- ✅ Slug generation (уникальность)
- ✅ Создание системного фильтра (isSystemFilter: true)
- ✅ Исключение системных фильтров из списка (includeSystem: false)
- ✅ Включение системных фильтров в список (includeSystem: true)

**Integration тесты:**
- ✅ CRUD через API endpoints
- ✅ Фильтр + колонки (hasMany)
- ✅ Фильтр + owner (belongsTo)
- ✅ Миграция фильтров между версиями
- ✅ GET /filters без системных фильтров
- ✅ GET /filters?includeSystem=true со всеми фильтрами
- ✅ Прямая ссылка на системный фильтр работает
- ✅ Системный фильтр доступен по slug

**Security тесты:**
- ✅ Нельзя удалить чужой private фильтр
- ✅ Можно просмотреть public фильтр
- ✅ Доступ к groups фильтру только для членов группы
- ✅ API key валидация
- ✅ Системные фильтры не отображаются в списке UI по умолчанию
- ✅ Системные фильтры доступны через прямую ссылку/slug
- ✅ Переключение isSystemFilter работает корректно

**Coverage:** 85%+

---

### Phase 4: Кастомизация колонок

**Unit тесты:**
- ✅ FilterColumnService.updateColumns()
- ✅ Сортировка колонок (drag&drop logic)
- ✅ Видимость колонок
- ✅ Ширина колонок

**Integration тесты:**
- ✅ Сохранение порядка колонок
- ✅ Применение к таблице

**Coverage:** 80%+

---

### Phase 5: Inline редактирование

**Unit тесты:**
- ✅ Валидация значений по типу поля
- ✅ handleInlineEdit() для каждого типа
- ✅ Optimistic updates

**Integration тесты:**
- ✅ Редактирование + автосохранение
- ✅ Rollback при ошибке

**E2E тесты:**
- ✅ Клик → редактирование → сохранение
- ✅ ESC → отмена

**Coverage:** 80%+

---

### Phase 6: Экспорт данных

**Unit тесты:**
- ✅ ExportService.toCSV()
- ✅ ExportService.toXLSX()
- ✅ ExportService.toJSON()
- ✅ Форматирование значений
- ✅ Escape специальных символов

**Integration тесты:**
- ✅ Экспорт с фильтром
- ✅ Экспорт с кастомными колонками
- ✅ Большие датасеты (10k+ записей)

**Coverage:** 85%+

---

### Phase 7: API фильтры (Atom/JSON)

**Unit тесты:**
- ✅ Atom feed generation
- ✅ JSON API response format
- ✅ Pagination в API

**Integration тесты:**
- ✅ GET /api/filters/:slug/atom
- ✅ GET /api/filters/:slug/json
- ✅ API key authentication

**Security тесты:**
- ✅ Rate limiting
- ✅ Invalid API key → 401
- ✅ Disabled API → 403

**Coverage:** 85%+

---

### Phase 8: Уведомления

**Unit тесты:**
- ✅ NotificationService.checkChanges()
- ✅ NotificationService.sendEmail()
- ✅ Diff calculation

**Integration тесты:**
- ✅ Email отправка (mock SMTP)
- ✅ Webhook отправка (mock HTTP)
- ✅ Cron job execution

**Coverage:** 80%+

---

### Phase 9: UI интеграция

**Unit тесты:**
- ✅ React компоненты (React Testing Library)
- ✅ FilterBuilder.tsx
- ✅ FilterList.tsx
- ✅ FilterConditionRow.tsx
- ✅ State management (hooks)

**Integration тесты:**
- ✅ Компонент + backend API

**E2E тесты:**
- ✅ Создание фильтра через UI
- ✅ Редактирование фильтра
- ✅ Применение фильтра
- ✅ Drag & drop колонок

**Coverage:** 75%+ (UI тяжело тестировать)

---

### Phase 10: Виджеты дашборда

**Unit тесты:**
- ✅ Widget.render() для каждого типа
- ✅ Data aggregation
- ✅ Chart data preparation

**Integration тесты:**
- ✅ Widget + фильтр
- ✅ Real-time updates

**Visual regression тесты:**
- ✅ Скриншоты виджетов (Playwright)

**Coverage:** 80%+

---

### Phase 11: Программный API

**Unit тесты:**
- ✅ FilterAPI.create()
- ✅ FilterAPI.apply()
- ✅ FilterAPI.export()
- ✅ TypeScript types

**Integration тесты:**
- ✅ Использование из пользовательского кода

**Coverage:** 85%+

---

### Phase 12: Кастомные операторы

**Unit тесты:**
- ✅ CustomConditionRegistry.register()
- ✅ Каждый встроенный оператор
- ✅ buildCondition() для разных диалектов

**Integration тесты:**
- ✅ Custom operator в запросе

**Coverage:** 85%+

---

### Phase 13: Права доступа

**Unit тесты:**
- ✅ AccessControl.canView()
- ✅ AccessControl.canEdit()
- ✅ AccessControl.canDelete()
- ✅ Field-level permissions

**Integration тесты:**
- ✅ Фильтрация полей по правам
- ✅ Row-level security

**Security тесты:**
- ✅ Попытка доступа к запрещенному фильтру
- ✅ Попытка редактирования readonly поля
- ✅ SQL injection через фильтры

**Coverage:** 90%+ (безопасность критична)

---

## Общие тесты

### Regression тесты

После каждой фазы запускаются все предыдущие тесты:

```bash
npm test -- --coverage
```

### Load тесты

**Критичные эндпоинты:**
- `POST /adminizer/:entity/list` - 100 req/s
- `GET /api/filters/:slug/json` - 50 req/s

**Инструмент:** Artillery или k6

### Security тесты

**OWASP Top 10:**
- ✅ SQL Injection
- ✅ XSS
- ✅ CSRF
- ✅ Broken Authentication
- ✅ Sensitive Data Exposure

**Инструмент:** OWASP ZAP

---

## CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

---

## Test Data

### Fixtures

**Файл:** `tests/fixtures/filters.ts`

```typescript
import { faker } from '@faker-js/faker';

export const createTestUser = () => ({
  login: faker.internet.userName(),
  email: faker.internet.email(),
  passwordHashed: 'test-hash'
});

export const createTestFilter = (ownerId: number) => ({
  name: faker.lorem.words(3),
  modelName: 'UserAP',
  slug: faker.helpers.slugify(faker.lorem.words(3)),
  conditions: [],
  ownerId,
  visibility: 'private' as const
});

export const createComplexConditions = () => [
  {
    id: faker.string.uuid(),
    logic: 'AND',
    children: [
      {
        id: faker.string.uuid(),
        field: 'status',
        operator: 'eq',
        value: 'active'
      },
      {
        id: faker.string.uuid(),
        logic: 'OR',
        children: [
          {
            id: faker.string.uuid(),
            field: 'role',
            operator: 'in',
            value: ['admin', 'moderator']
          }
        ]
      }
    ]
  }
];
```

---

## Отчетность

### Coverage Report

После запуска тестов генерируется HTML отчет:

```bash
npm test -- --coverage
open coverage/index.html
```

### Metrics

**Отслеживаемые метрики:**
- Code coverage (by phase)
- Test execution time
- Flaky tests rate
- Bug escape rate

**Dashboard:** GitHub Actions + Codecov

---

## Checklist перед релизом

- [ ] Все unit тесты проходят (100%)
- [ ] All integration тесты проходят (100%)
- [ ] E2E тесты для критичных flow проходят
- [ ] Code coverage >= 80%
- [ ] Критичные компоненты coverage >= 90%
- [ ] Security тесты пройдены (OWASP)
- [ ] Load тесты пройдены (SLA выполнены)
- [ ] Visual regression тесты пройдены
- [ ] Документация обновлена
- [ ] Migration guide создан

---

## Примеры запуска

```bash
# Все тесты
npm test

# Только unit
npm run test:unit

# Только integration
npm run test:integration

# Только E2E
npm run test:e2e

# С coverage
npm test -- --coverage

# Watch mode (для разработки)
npm test -- --watch

# Конкретная фаза
npm test -- tests/phases/phase1

# Конкретный файл
npm test -- tests/models/FilterAP.test.ts

# Обновить snapshots
npm test -- -u
```

---

## Поддержка и обслуживание

### Регулярные задачи

- **Ежедневно:** Запуск всех тестов в CI
- **Еженедельно:** Обзор flaky tests
- **Ежемесячно:** Анализ code coverage трендов
- **Per release:** Full regression + load testing

### Обновление тестов

При добавлении новой функциональности:

1. Написать тесты ДО реализации (TDD)
2. Убедиться что тесты fail
3. Реализовать функциональность
4. Тесты должны пройти
5. Refactor при необходимости
6. Обновить документацию

---

**Эта стратегия обеспечивает высокое качество кода и минимизирует regression bugs.**
