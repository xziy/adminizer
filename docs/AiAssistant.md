# AI Assistant Integration

The AI assistant feature introduces a chat experience that can be toggled from the main header. It is disabled by default and can be enabled through the admin panel configuration.

## Configuration

The `AdminpanelConfig` accepts an optional `aiAssistant` section:

```ts
aiAssistant?: {
    enabled: boolean;
    defaultModel?: string;
    models?: string[];
}
```

* `enabled` — toggles the feature on or off (defaults to `false`).
* `defaultModel` — preferred model identifier that will be preselected on the client.
* `models` — list of model identifiers to register. Unknown identifiers are ignored with a warning.

The default configuration registers the in-memory `dummy` model that always replies with `Ai-assystant dummy in deveploment`.

The fixture configuration enables the assistant with this dummy model so the chat can be exercised locally without any external
dependencies.

## Fixture OpenAI Agent

The fixture now also registers an `openai` model that executes structured commands against the database. The agent expects JSON instructions and uses `DataAccessor` under the hood, so every operation is filtered by the requesting user's permissions.

Example payload for creating a record:

```json
{
  "action": "create",
  "entity": "Example",
  "data": {
    "title": "Hello from the assistant",
    "description": "Generated through the OpenAI agent"
  }
}
```

If the user lacks the required access token (for example, `create-example-model`), the agent responds with an authorization error instead of touching the database. The `openai` fixture user (`login: openai`, `password: openai`) belongs to the administrators group, granting full access for experimentation. Regular users can be granted permissions by assigning the `ai-assistant-openai` token to their groups.

### Discovering available fields

Before issuing a `create` command the agent can now describe the exact payload shape that is accepted for the chosen model. This
is achieved through the `fields` action which asks `DataAccessor` for the list of writable fields, their types, requirements, and
association hints. The agent trims any values that are not allowed and will stop execution if mandatory properties are missing.

Example request for the schema:

```json
{
  "action": "fields",
  "entity": "Example"
}
```

The response enumerates each accessible field, including required flags, optional descriptions (taken from field tooltips),
allowed enums, and association targets. When a `create` command is executed afterwards the agent automatically reuses this
metadata to validate the payload and report missing values instead of failing with a generic database error.

## Backend Overview

* `AiAssistantHandler` keeps registered model services and in-memory conversation history per user and model.
* Model services extend `AbstractAiModelService`, which automatically registers the corresponding access right (token pattern: `ai-assistant-<modelId>`).
* The binder (`bindAiAssistant`) attaches the handler to `Adminizer` and registers models declared in the configuration.
* `AiAssistantController` exposes REST endpoints under `/api/ai-assistant` for:
  * Listing available models (`GET /models`).
  * Fetching conversation history (`GET /history/:modelId`).
  * Sending prompts (`POST /query`).
  * Resetting history (`DELETE /history/:modelId`).

All endpoints require the user to have the access token generated for the model.

## Frontend Overview

* `AiAssistantProvider` handles fetching models/history, sending prompts, and exposing chat state via `useAiAssistant`. The provider also keeps the open state and last selected model in memory across Inertia navigations so the dialog stays available while browsing.
* `AiAssistantToggle` renders the sparkles button in the header and toggles the assistant workspace. The button displays a spinner while a request is in flight and disables itself if no models are accessible.
* `AiAssistantViewport` shifts the root application container when the assistant opens so the entire interface slides left and keeps room for the chat.
* `AiAssistantPanel` anchors a full-height chat interface to the right quarter of the viewport as a fixed workspace, rendering conversation history and the compose form outside of the main layout.
* Conversation history is stored client-side for rendering while the server keeps the authoritative in-memory copy.

## Extending With New Models

To register a new model:

1. Create a class that extends `AbstractAiModelService` and implement `generateReply`.
2. Add a factory entry to `modelFactories` in `bindAiAssistant.ts`.
3. Reference the new model identifier in `aiAssistant.models` within your configuration.
4. Assign the generated access token (`ai-assistant-<modelId>`) to the user groups that should have access.

## OpenAI Data Agent (fixture)

The fixture now ships with an `openai-data` model that demonstrates how to integrate the SDK with
OpenAI's Agents API while still relying on Adminizer's abstractions:

* The agent implementation lives in `fixture/helpers/ai/OpenAiDataAgentService.ts` and extends
  `AbstractAiModelService`.
* Database reads are performed through `DataAccessor`, which means the usual access control and field
  sanitisation rules are enforced automatically.
* Conversation history is converted into the `@openai/agents` protocol so follow-up questions can
  build on previous answers.

To enable the agent locally, set the following environment variables before starting the fixture:

```bash
export OPENAI_API_KEY="sk-..."          # required
export OPENAI_AGENT_MODEL="gpt-4.1-mini" # optional override
```

`ADMINIZER_OPENAI_KEY` can be used as an alternative variable name for the API key. When a key is
available the fixture automatically registers the model, exposes it in the assistant model list, and
prefers it as the default chat model. If the key is missing the agent stays disabled and a warning is
logged during boot.
