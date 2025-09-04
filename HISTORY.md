
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
## 4.2.3
- Added `Adminizer.setAuthHandler` to support external authentication fallback.
- Updated login flow to use the external auth handler when `UserAP` lookup fails.
- Added fixture Sequelize model `fixture/models/sequelize/User.ts` and wired it into the fixture app.
- Implemented example auth handler in `fixture/index.ts` that authenticates against the external `User` model and grants permissions via an in‑memory group.
- Docs: new guide `docs/authentication-external.md`.

## 4.3.0
- Login: added optional bottom link via `auth.addishinalLoginPage` (config-driven).
- i18n: added `"Additional login page"` to all bundled locales.
- Docs: `docs/login-additional-link.md` explains configuration and behavior.
