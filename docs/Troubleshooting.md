### 🔧 Issue with Model Name Casing in Config (Waterline, Sequelize, TypeORM)

**Description:**

In different external resource modules (ORMs), model names can vary in casing — some use lowercase (`userresource`), while others use PascalCase (`UserResource`). This inconsistency causes configuration resolution issues and can result in the following error:

```
type error: model config of resourceprototype is undefined expected object
```

**Cause:**

Currently, models are referenced in the config using their name as-is — without normalization. For now, the `Models` object should have **lowercase** keys:

```ts
models: {
  userresource: { ...config },
  groupcatalog: { ...config }
}
```

The configuration system looks up the model config by exact key match. If the key casing doesn't match what the ERM uses internally, the config is not found, and an error is thrown.

**Temporary Rule:**

* Use **lowercase model names** as keys in the `models` config section.
* Match the model name exactly as it is referenced internally by your ERM (Waterline, Sequelize, TypeORM).

**Planned Improvements:**

In the future, we will introduce the concept of a *model entity*, which will allow for more flexible and case-independent model resolution.

### 🛠️ "Cannot convert undefined or null to object" when starting

**Description:**

If `window.UIComponents` is not initialized before calling `registerUIComponents()`, the application may fail with the following error:

```
Uncaught TypeError: Cannot convert undefined or null to object
```

**Solution:**

As of version 4.1.0, `registerUIComponents()` now creates `window.UIComponents` automatically when it is missing. Ensure you are using the latest code and simply call `registerUIComponents()` once during app startup.
