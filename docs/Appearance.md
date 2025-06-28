# Appearance Settings

Adminizer allows users to switch between **light**, **dark**, and **system** themes. The system option follows the operating system preference.

The theme selector stores the chosen mode in `localStorage` and a cookie so that the preference persists between sessions and across browser tabs.

Use the ThemeSwitcher component in your layout to present the selection buttons. It relies on `useAppearance` to manage the current mode and applies the appropriate classes to the document root.
