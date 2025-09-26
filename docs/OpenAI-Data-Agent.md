# OpenAI Data Agent for the Fixture

The fixture now ships with an OpenAI-powered AI assistant that can read data directly from the Adminizer database. The agent is implemented on top of the `@openai/agents` SDK and extends the `AbstractAiModelService` provided by Adminizer. All database access flows through the existing `DataAccessor`, so field-level permissions and ownership rules continue to apply automatically.

## Prerequisites

1. Install the new runtime dependencies:
   - `@openai/agents`
   - `zod`
2. Expose your OpenAI API key as an environment variable before starting the fixture:

   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

3. (Optional) Override the default model (`gpt-4.1-mini`) by setting `OPENAI_AGENT_MODEL`.

## Registered Tools

The agent exposes two tools to the language model:

| Tool | Purpose | Parameters |
| ---- | ------- | ---------- |
| `list_records` | Returns multiple records from a model with optional equality filters. | `model` (string), `limit` (1-50, default 5), `filters` (record of field → value). |
| `get_record` | Fetches a single record by its primary key. | `model` (string), `id` (string or number). |

### Filter Coercion

Filters are validated against the model field configuration that `DataAccessor` exposes. Numbers, booleans, and JSON payloads are coerced into the correct types before the ORM is queried. Unknown fields are ignored automatically.

## Runtime Behaviour

- The agent is registered after `adminizer.init` inside `fixture/index.ts`, so the service is available as soon as the server starts.
- If `OPENAI_API_KEY` is missing, the assistant responds with a clear error message instead of attempting a remote call.
- The fixture keeps the legacy dummy assistant enabled for reference but promotes the OpenAI agent as the default model once it is registered.
- Conversation history (up to 20 latest messages) is forwarded to the OpenAI agent on every run to preserve context.

## Usage Tips

- Ask explicit questions such as “List the latest Example records where `sort` is true”. The model will call `list_records` with the correct filters and return a summarized preview.
- To inspect a single record, request “Show Example with id 5” which triggers the `get_record` tool.
- When the dataset is large, the assistant summarizes the first three rows and reports how many records matched overall.

## Troubleshooting

- **No response from the assistant** – verify that the `OPENAI_API_KEY` environment variable is set and valid.
- **Permission errors** – ensure the authenticated Adminizer user has read access to the requested model; the agent will respect the same policy checks as the UI.
- **Model choice** – define `OPENAI_AGENT_MODEL` if you need to switch to a different OpenAI Responses-capable model.

