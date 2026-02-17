> ⚠️ **AI-DRAFT**
>
> Этот документ сгенерирован нейронной сетью и может содержать неточности или ошибки.

# Кастомный контрол: пример интеграции, Inertia и отображение в list

Этот пример показывает полный путь:

1. как зарегистрировать **кастомный контрол**;
2. как подключить его к полю через `fields.<fieldName>.options.name`;
3. как настроить отображение в **list**;
4. как это работает в связке с **Inertia**.

---

## 1) Регистрация кастомного контрола

Ниже — минимальный класс контрола. Он наследуется от `AbstractControls` и сообщает системе:

- `name` — уникальное имя контрола;
- `type` — тип поля (например, `wysiwyg`);
- `path` — откуда грузить JS/CSS в dev/prod.

```ts
import { AbstractControls, ControlType, Config, Path } from 'adminizer';
import { Adminizer } from 'adminizer';

export class MyCustomWysiwygControl extends AbstractControls {
  readonly name: string = 'my-custom-wysiwyg';
  readonly type: ControlType = 'wysiwyg';

  readonly path: Path = {
    cssPath: `${this.routPrefix}/assets/modules/my-custom-wysiwyg.css`,
    jsPath: {
      dev: '/modules/controls/my-custom-wysiwyg.tsx',
      production: `${this.routPrefix}/assets/modules/my-custom-wysiwyg.es.js`,
    },
  };

  readonly config: Config = {};

  constructor(adminizer: Adminizer) {
    super(adminizer);
  }

  getConfig(): Config {
    return this.config;
  }

  getJsPath(): string {
    return process.env.VITE_ENV === 'dev' ? this.path.jsPath.dev : this.path.jsPath.production;
  }

  getCssPath(): string {
    return this.path.cssPath;
  }

  getName(): string {
    return this.name;
  }
}
```

Регистрация в жизненном цикле Adminizer:

```ts
adminizer.emitter.on('adminizer:loaded', () => {
  adminizer.controlsHandler.add(new MyCustomWysiwygControl(adminizer));
});
```

> Практика: используйте понятные английские имена (`MyCustomWysiwygControl`, `my-custom-wysiwyg`) и не перегружайте комментарии.

---

## 2) Подключение контрола к полю

Когда контрол зарегистрирован, его можно назначить конкретному полю:

```ts
fields: {
  description: {
    title: 'Description',
    type: 'wysiwyg',
    options: {
      name: 'my-custom-wysiwyg',
      config: {
        items: ['heading', '|', 'bold', 'italic', '|', 'link'],
      },
    },
  },
}
```

Логика простая:

- `type: 'wysiwyg'` выбирает группу контролов;
- `options.name` выбирает конкретную реализацию внутри группы;
- `options.config` уходит в UI-компонент как runtime-конфиг.

---

## 3) Как добавить поле на list и сделать кастомное отображение

Для страницы списка (`list`) поле включается через `list.fields`. Там же можно поменять отображение через `displayModifier`.

```ts
models: {
  products: {
    model: 'Product',
    fields: {
      description: {
        title: 'Description',
        type: 'wysiwyg',
        options: {
          name: 'my-custom-wysiwyg',
        },
      },
      isPublished: {
        title: 'Published',
        type: 'boolean',
        displayModifier: (value: boolean) => (value ? 'Yes' : 'No'),
      },
    },
    list: {
      fields: {
        description: true,
        isPublished: true,
      },
    },
  },
}
```

### Про «инверсию» значения

Если под «инверсией» вы имеете в виду «показывать значение наоборот», это можно сделать в `displayModifier`:

```ts
displayModifier: (value: boolean) => (value ? 'No' : 'Yes')
```

То есть:

- данные в БД остаются как есть (`true/false`);
- инверсия применяется только в визуальном выводе на list.

---

## 4) Как это работает через Inertia

В Adminizer контроллеры отдают страницу через `req.Inertia.render({ component, props })`.  
Это означает:

- сервер отдает **имя React-компонента** + `props`;
- клиент обновляет страницу без полного reload;
- конфиг поля и контрола приходит как часть `props`.

Практически для вас это значит, что кастомный контрол работает одинаково в SSR-входе и при последующих Inertia-переходах: главное — чтобы контрол был зарегистрирован до рендера страницы.

---

## 5) Рекомендации

- Для сложных UI-контролов держите конфиг в `options.config`, а не «зашивайте» значения в компонент.
- Для list используйте `displayModifier` только для форматирования (строки, бейджи, инверсия подписи), но не для изменения данных.
- Если нужно разное поведение для edit/list/view, задавайте поля на уровне конкретного action (`edit.fields`, `list.fields`, `view.fields`).
