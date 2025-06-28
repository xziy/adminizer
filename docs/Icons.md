[Back](index.md)
# Icon Usage

Adminizer relies on the [Lucide](https://lucide.dev/icons/) icon set for UI elements. Icons are loaded globally so external modules can use them without additional imports.

## Finding Icons
Browse the available icons at [lucide.dev/icons](https://lucide.dev/icons/) and note the name of the icon you want to use. For example `activity`, `user`, or `rocket`.

## Assigning Icons in Configuration
Specify the icon name in your Adminizer configuration. The icon is referenced by its id from Lucide:

```javascript
module.exports.adminpanel = {
    models: {
        post: {
            title: 'Posts',
            icon: 'file-text', // Name from lucide.dev
        }
    }
};
```

## Using Icons in Components
Icons are also accessible in React components via the `lucide-react` package or through the global object. Example using a direct import:

```tsx
import { Activity } from 'lucide-react';

export function MyButton() {
    return <Activity />;
}
```

The same icon is available globally as `window.lucide.Activity`, enabling usage inside external modules:

```tsx
export function External() {
    const { Activity } = window.lucide;
    return <Activity />;
}
```

These global exports allow modules outside of Adminizer to reuse the same icon set.
