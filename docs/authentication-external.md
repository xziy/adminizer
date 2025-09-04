External Authentication Handler

Overview
- Adminizer can authenticate users against an external user store when they are not present in `UserAP`.
- Use `Adminizer.setAuthHandler(handler)` to register an async handler that verifies credentials and returns a User-like object.

API
- `adminizer.setAuthHandler((req, login, password) => Promise<Partial<UserAP> | null>)`
  - Return an object compatible with `UserAP` fields (at minimum: `id`, `login`).
  - Optionally include `groups` with `tokens` to enable fine-grained access rights.
  - Return `null` to signal authentication failure.

Login Flow
- Adminizer first tries to find a user in `UserAP`.
- If not found and an external handler is set, Adminizer invokes it.
- If the handler returns a user, Adminizer issues a JWT for that user (including any extra fields like `groups`).

Example (Fixture)
- The fixture registers a Sequelize model `User` and configures an auth handler in `fixture/index.ts`:
  - Authenticates against the `User` table using the same salted hash (`login + password + AP_PASSWORD_SALT`).
  - Grants permissions via an in-memory group whose `tokens` list is populated from `AccessRightsHelper`.

Notes
- If you need group-level permissions for external users, populate `user.groups` with entries of shape `{ id: number, name: string, tokens: string[] }`.
- The JWT includes any extra fields you provide; downstream code can use `user.groups` for permission checks.
- If you rely on explicit confirmation, note the login flow only blocks when `isConfirmed === false`. Omitted/undefined means no explicit block.

Minimal Handler Template
```
adminizer.setAuthHandler(async (req, login, password) => {
  const external = await req.adminizer.modelHandler.model.get('User')?.["_findOne"]({ login });
  if (!external) return null;
  const passwordHash = (await import('password-hash')).default;
  if (!passwordHash.verify(login + password + process.env.AP_PASSWORD_SALT, external.passwordHashed)) return null;
  const tokens = req.adminizer.accessRightsHelper.getTokens().map(t => t.id);
  return {
    id: external.id,
    login: external.login,
    fullName: external.fullName,
    groups: [{ id: -1, name: 'external', tokens }],
  };
});
```

