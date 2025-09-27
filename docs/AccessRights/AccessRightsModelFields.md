### `DataAccessor` — Data Layer Mediator with Access Control


> Everything that is not prohibited is allowed, Excluding ties to the UserAP model

The `DataAccessor` class is a central utility for handling the interaction between users and the system's data models, while enforcing access control and configuration constraints.

---

#### **Purpose**

This class:

* Retrieves and merges model field configurations based on the action type (e.g., `add`, `edit`, `list`, `view`, `remove`)
* Applies user permission checks at both the model and field level
* Filters records according to configured access rules
* Dynamically includes associated models and their configurations
* Automatically applies or restricts data access based on user roles and group membership
* Helps populate or restrict relation fields (e.g., `UserAP`, `GroupAP`) depending on ownership and configuration
* Provides unified methods for reading (`process`, `processMany`), sanitizing (`sanitizeUserRelationAccess`), and updating (`setUserRelationAccess`) data records with permission logic baked in

---

#### **Key Features**

* **Access-aware field resolution**: Only exposes fields the current user is allowed to see or edit.
* **Dynamic config merging**: Combines global and action-specific model field configs, ensuring the right context is applied.
* **Association support**: Handles both `BelongsTo` and `HasMany` style associations with optional population and recursive field filtering.
* **Multi-level access logic**: Enforces both direct and intermediate relation-based access restrictions using the `userAccessRelation` model config key.
* **CRUD-agnostic**: Designed to be used with various actions (`add`, `edit`, `view`, `list`) with unified processing logic.
* **Field metadata discovery**: `listAccessibleFields()` returns sanitized metadata describing every field the current user can touch for the current action.

---

#### **Field Metadata API**

The `listAccessibleFields()` helper exposes a lightweight description of the fields that remain after
all permission checks. Each entry includes:

| Property | Description |
| --- | --- |
| `key` | Field identifier as used in payloads and criteria |
| `label` | Human-friendly title derived from the model configuration |
| `type` | Normalised field type (e.g. `string`, `association-many`, `jsoneditor`) |
| `required` | Indicates whether the field must be supplied when creating or editing records |
| `description` | Tooltip/description text from the configuration (when available) |
| `readOnly` | True if the field is marked as disabled/readonly for the current user |
| `isAssociation` | True for relation fields (`association` or `association-many`) |
| `isCollection` | True only for `association-many` relations |
| `options` | Widget-specific options (when defined) |
| `choices` | The `isIn` enumeration, useful for select-style inputs |

Because the method respects the accessor action (`add`, `edit`, `list`, or `view`), it can be used to
drive dynamic form generation, AI assistant hints, or API schema discovery without leaking fields that
the caller cannot access.

---

#### **Typical Use Cases**

* Building an admin panel or API layer where user-specific permissions restrict what data can be read, written, or modified
* Ensuring consistent permission logic across different parts of the system (e.g., listing vs viewing a single item)
* Populating complex forms or detail views that include nested associations with restricted fields

---

#### **Permission Logic and Configuration**

The `DataAccessor` supports fine-grained access control at the field level using a combination of global configuration, action-specific overrides, and user role/group validation.

**How Permissions Are Checked**

Each field passes through the `checkFieldAccess()` method, which evaluates:

1. **Explicit Disabling**
   If a field is set to `false` in the config, it will be excluded:

   ```ts
   fields: { secretField: false }
   ```

2. **Always Allowed:**

   * Primary key field (`id`)
   * All fields for admin users (`isAdministrator === true`)
   * Fields without any config object

3. **Group-Based Restrictions**
   If a field defines `groupsAccessRights`, access is granted only if the user's group is listed:

   ```ts
   fields: {
     internalNotes: {
       type: "string",
       groupsAccessRights: ["manager", "admin"]
     }
   }
   ```

4. **Default Denial for Default Group**
   If no access rights are defined, the field is denied **only** to users from the `defaultUserGroup` (defined in config):

   ```ts
   config: {
     registration: {
       defaultUserGroup: "users"
     }
   }
   ```

**Where Permissions Are Applied**

* During field config loading (`getFieldsConfig`)
* When preparing the output for individual records (`process`)
* When preparing associated models (`getAssociatedFieldsConfig`)
* During write-time operations that assign ownership/access (`sanitizeUserRelationAccess`, `setUserRelationAccess`)

---

#### **Config Example**

```ts
models: {
  Task: {
    fields: {
      title: { type: "string" },
      internalStatus: {
        type: "string",
        groupsAccessRights: ["admin", "qa"]
      },
      createdAt: false // completely hidden
    },
    userAccessRelation: "owner"
  }
}
```

In this example:

* The `title` field is visible to everyone.
* `internalStatus` is only shown to admins and QA team members.
* `createdAt` is hidden entirely.
* Only records where the current user is the `owner` are accessible to non-admins.