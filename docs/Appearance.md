# Appearance Settings

Adminizer allows users to switch between **light**, **dark**, and **system** themes. The system option follows the operating system preference.

The theme selector stores the chosen mode in `localStorage` and a cookie so that the preference persists between sessions and across browser tabs.

Use the ThemeSwitcher component in your layout to present a single toggle button. Each click cycles between light, dark, and system themes. The component relies on `useAppearance` to manage the current mode and applies the appropriate classes to the document root.

### Sidebar scrollbars

The primary navigation uses the `SidebarContent` container, which now applies theme-aware scrollbar styling. The track color follows `--sidebar`, while the thumb uses `--sidebar-border`. This keeps the scrollbar legible in both light and dark modes without introducing a separate configuration.
