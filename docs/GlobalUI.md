# Global UI Components

All React UI elements are exported to the global `window.UIComponents` object. This allows external modules compiled with Vite to reference the components without bundling them.

Each UI component from `src/assets/js/components/ui` is available by name. For example, `window.UIComponents.Button` exposes the button component used across the project.

## Using from another project

When building your own module you can mark Adminizer UI components as external dependencies so that they are resolved from the `window.UIComponents` container. A minimal `vite.config.js` looks like this:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteExternalsPlugin } from 'vite-plugin-externals';

export default defineConfig({
  plugins: [
    react(),
    viteExternalsPlugin({
      '@/components/ui/button.tsx': 'UIComponents',
      '@/components/ui/dialog.tsx': 'UIComponents',
    }),
  ],
});
```

In your module you can read components from the global container:

```tsx
const { Button } = window.UIComponents;

export default function Example() {
  return <Button onClick={() => alert('Hi!')}>Click me</Button>;
}
```

Make sure the Adminizer bundle is loaded before your module so that `registerUIComponents()` has populated `window.UIComponents`.
