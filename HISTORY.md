## 4.3.7
- Exposed `DataAccessor#listAccessibleFields` so callers (including AI agents) can inspect writeable fields with metadata.
- Enabled the fixture OpenAI data agent to describe model fields and create records through `DataAccessor` respecting user permissions.
- Documented the new metadata API and AI assistant tooling updates.

## 4.3.6
- Configured OpenAI API integration through environment variables for AI assistant functionality.
- Added dotenv support for loading environment variables from .env file in fixture startup.
- Created OpenAI setup documentation with security best practices and troubleshooting guide.
- Modified fixture initialization to load and register OpenAI data agent when API key is available.
- Added the OpenAI AI assistant fixture agent that executes JSON commands through `DataAccessor` with the caller's permissions.
- Seeded an `openai` administrator account, granted AI assistant tokens to default groups, and documented the workflow.

## 4.3.5
- Anchored the AI assistant panel as a fixed overlay that shifts the entire layout width instead of living inside the content container.
- Persisted the chat open state and selected model across Inertia navigations via a shared viewport manager and updated documentation.

## 4.3.4
- Replaced the AI assistant modal with a persistent right-side workspace that claims one quarter of the viewport when opened.
- Added a dedicated panel component and layout margin handling so the main application content resizes alongside the chat.

## 4.3.3
- Enabled the AI assistant in the fixture configuration with the dummy model and ensured the backend build wires controller endpoints.
- Documented that the fixture ships with the in-memory assistant for local testing.

## 4.3.2
- Added AI assistant chat mode with header toggle, in-memory history, and backend API scaffolding.


## 4.2.1
- Renamed MediaManager parent association to `parent` to resolve Sequelize naming collision.
## 4.1.4
- Fixed Sequelize system model registration errors in tests.
## 4.1.3
- Fixed build issues when compiling media manager
- Added material-icons dependency and troubleshooting notes

## 4.1.2
- Added documentation on assigning icons using the Lucide set.
- Updated widget example to reference Lucide icons.

- Added system model tests for Waterline and Sequelize.


## 4.2.1
- Fixed failing tests by adding case-insensitive model lookup and resolving Sequelize association naming conflicts.

## 4.2.2
- Explicit foreign key names now avoid collisions between attributes and associations in Sequelize.

## 4.3.1
- Added TypeScript Umzug migration for system models at `src/migrations/umzug/0001.ts` (SQLite fixture-compatible). Join table naming normalized to lowercase (`groupapuserap`). Updated docs in `docs/Database-Migrations-Umzug.md` and examples for tsx-based runs.

## 4.3.2
- Added the `openai-data` AI assistant model to the fixture, powered by `@openai/agents` and backed by `DataAccessor` queries.
- Automatically promotes the OpenAI agent as the default fixture model when an API key is present and documents the required environment variables.
