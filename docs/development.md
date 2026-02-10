## Development
- **`npm run dev`**
  Starts the application in development mode using Sequelize with file watching.
- **`npm run dev:waterline`**
  Starts the application in development mode using Waterline with file watching.

- **`npm run watch:backend`**  
  Watches for changes in backend files and recompiles TypeScript continuously.

## Implementation Principles
- Add a short comment (1-2 lines) above each meaningful block of code and text explaining what the block does and why it exists
- Keep controllers thin: accept the request, call the service, return the response
- Centralize all filter logic (parsing, normalization, condition building, sorting) in a single filter service used by controllers
- Do not bloat the codebase: extract repeated logic into helpers/services and avoid creating new helpers unless necessary
- During review, verify filter logic is not duplicated, controllers are not growing, and the shared filter service is used

## Build Commands
- **`npm run build:assets`**  
  Builds frontend assets using Vite.

- **`npm run build:backend`**  
  Combines backend copy and compilation steps.

- **`npm run build`**  
  Full build process: copies backend, compiles backend, and builds assets.

## Testing
- **`npm test`**
  Runs the full test suite (unit + integration). Filters API integration tests start an in-memory Waterline server and use the `x-test-user` header to emulate users.
- **`npm run test:e2e`**
  Runs Playwright end-to-end tests against the TSX server (built assets are required; run `npm run build` if `dist/assets/manifest.json` is missing). By default the config uses the locally installed Chrome (no Playwright browser download required).
  If Chrome is not installed, run `npx playwright install chromium`.
  The E2E suite disables login CAPTCHA and CSRF by setting `ADMINIZER_AUTH_CAPTCHA=false` and `ADMINIZER_CSRF=false`, and can override the server URL via `E2E_BASE_URL`.

## Module-specific Builds (this is just for tests, as an example, you should create your own commands to build modules)
- **`npm run build:module`**  
  Builds test modules using a custom Vite config.

- **`npm run build:react-quill`**  
  Builds the React-Quill WYSIWYG module using a custom Vite config.

- **`npm run copy:modules`**  
  Copies modules using `copy-modules.js` script.

- **`npm run build:assets:modules`**  
  Builds assets and copies modules.

## Demo & Seeding
- **`npm run start:seed`**  
  Starts the application with seed data enabled (using `SEED_DATA=true`).

- **`npm run demo:build`**  
  Prepares a demo build: copies backend, compiles backend, builds assets, and copies modules.

- **`npm run demo`**  
  Alias for `start:seed` - runs the demo with seeded data.

## Preview mode
- **`npm start`**  
  Starts the application using TSX with the Waterline fixture configuration.
