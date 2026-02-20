# Дизайн-система Adminizer: компоненты, внешние модули и кастомные контролы

Этот гайд объясняет, как устроен UI-слой Adminizer, как переиспользовать готовые компоненты в собственных React-модулях и как подключать кастомные контролы (например, свой WYSIWYG).

## 1) Как работает дизайн-система в Adminizer

В рантайме Adminizer регистрирует React-компоненты в глобальном контейнере `window.UIComponents` через функцию `registerUIComponents`. Это позволяет внешним модулям не тащить копии базовых UI-компонентов, а использовать тот же визуальный слой, что и основной интерфейс.

Дополнительно в `window.JSComponents` регистрируются не только UI-обертки, но и более сложные JS-компоненты (`VanillaJSONEditor`, `HandsonTable`, `MonacoEditor`, `MultiSelect`).

Практический смысл:

- единый look & feel для внешних модулей;
- меньше дублирования зависимостей;
- проще поддерживать тему, отступы, состояния и поведение.

## 2) Слой компонентов и точки расширения

### 2.1 Глобальные UI-компоненты

В `window.UIComponents` уже пробрасываются базовые элементы (`Button`, `Input`, `Select`, `Dialog`, `Tooltip`, `Sidebar`, `Table`, `Textarea` и др.).

Минимальная идея:

```tsx
// Псевдокод использования глобального контейнера
const { Button, Input, Label } = window.UIComponents;

export default function ExternalForm() {
  return (
    <div className="grid gap-2">
      <Label htmlFor="name">Name</Label>
      <Input id="name" />
      <Button>Save</Button>
    </div>
  );
}
```

### 2.2 Глобальные JS-компоненты

Через `window.JSComponents` доступны интеграции, которые удобно переиспользовать во внешних формах:

- `VanillaJSONEditor`
- `HandsonTable`
- `MonacoEditor`
- `MultiSelect`

## 3) Как писать внешний модуль (React) в стиле Adminizer

Ниже — реальный паттерн из `modules/test/ComponentB.tsx`: используются компоненты UI-системы (`Button`, `Select`, `Textarea`, `Checkbox`, `Label`, `Toaster`) и `sonner`-нотификации.

```tsx
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Toaster } from '@/components/ui/sonner';
```

### Рекомендации для внешнего модуля

1. Используйте UI-примитивы Adminizer, а не сторонние аналоги, если компонент уже есть в системе.
2. Держите локальное состояние в модуле (`useState`), а сетевую логику — через `axios`.
3. Показывайте пользователю состояние запроса (`isLoading`) и результат (`toast.success / toast.error`).
4. Старайтесь писать переиспользуемые пропсы (`data`, `callback`) для модулей действий.

## 4) Как собрать внешний модуль через Vite

Для внешних модулей в репозитории уже есть рабочий `vite.config` с `viteExternalsPlugin`, который мапит зависимости на глобальные объекты окружения Adminizer.

Ключевая идея из `modules/test/vite.config.module.ts`:

- `react -> React`
- `react-dom -> ReactDOM`
- `axios -> axios`
- `sonner -> sonner`
- UI-алиасы (`@/components/ui/*`) -> `UIComponents`

Это позволяет собранному модулю работать внутри страницы Adminizer без повторного бандлинга ядра UI.

## 5) Как реализовать кастомный контрол

Кастомный контрол строится на `AbstractControls` и регистрируется в `ControlsHandler`.

### 5.1 Базовый контракт

`AbstractControls` требует:

- `name` — уникальное имя контрола;
- `type` — тип (`wysiwyg`, `jsonEditor`, `geoJson`, `markdown`, `table`, `codeEditor`);
- `path` — dev/prod js-путь + css-путь;
- `config` — конфиг контрола;
- методы `getJsPath`, `getCssPath`, `getConfig`, `getName`.

### 5.2 Реальный пример: ReactQuill

В `modules/controls/wysiwyg/ReactQuill.ts` кастомный контрол:

- задает `name = 'react-quill'`;
- задает `type = 'wysiwyg'`;
- отдает разные пути для `dev`/`production`;
- использует `routePrefix` из конфигурации Adminizer.

После регистрации контрол можно указать в поле модели по имени.

## 6) Регистрация и использование контрола

Регистрация происходит после события `adminizer:loaded`:

```ts
adminizer.emitter.on('adminizer:loaded', () => {
  adminizer.controlsHandler.add(new ReactQuill(adminizer));
});
```

Использование в конфиге поля:

```ts
editor: {
  title: 'Editor',
  type: 'wysiwyg',
  options: { name: 'react-quill' }
}
```

Таким образом поле `wysiwyg` будет рендериться через ваш модуль.

## 7) Как загрузить (подключить) свой компонент в проде

1. Создайте TSX-компонент модуля (например, `react-quill-editor.tsx`).
2. Добавьте `vite.config` под модуль и настройте externals.
3. Соберите модуль (`npm run build:react-quill` или свой script).
4. Убедитесь, что `path.jsPath.production` и `path.cssPath` указывают на собранные ассеты.
5. Зарегистрируйте контрол через `controlsHandler.add(...)`.
6. Укажите `options.name` в поле модели.

## 8) Практические гайдлайны по HI (Human Interface)

- Консистентность: используйте единый набор компонентов (`Button`, `Input`, `Label`, `Select`, `Dialog`).
- Ясные состояния: у интерактивных действий обязательно `loading/disabled/error/success`.
- Простая иерархия: форма = `Label + control + helper/error + action`.
- Предсказуемые уведомления: success/error через `sonner`.
- Без визуального дублирования: если примитив уже есть в Adminizer UI, переиспользуйте его.

## 9) Чеклист перед публикацией внешнего модуля

- [ ] Модуль собран и открывается в админке.
- [ ] Все базовые UI-элементы взяты из дизайн-системы Adminizer.
- [ ] Есть `loading/error/success` состояния.
- [ ] Проверены dev/prod пути в `AbstractControls.path`.
- [ ] Контрол зарегистрирован на `adminizer:loaded`.
- [ ] Поле модели ссылается на контрол через `options.name`.
