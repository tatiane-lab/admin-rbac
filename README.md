# Admin RBAC Dashboard

> Angular 22 · `PermissionsService` (signals) · Custom Structural Directive · Multi-tenant CSS Variables · Transloco i18n · Playwright E2E

A multi-tenant admin panel with role-based access control at route and component level, per-tenant theming via CSS custom properties, and full Playwright E2E coverage.

## Features

- **Structural Directive `*hasPermission`** – `HasPermissionDirective` mirrors `*ngIf` semantics: renders the main template when the user has any listed permission, renders `hasPermissionElse` otherwise; powered by `PermissionsService` (signal-based, no store boilerplate).
- **Functional Permission Guard** – `permissionGuard` reads `route.data.permissions` and `route.data.role`, delegates to `PermissionsService`, and redirects to `/forbidden` on failure; no class-based guard.
- **Multi-tenant Theming** – `ThemeService` stores the active `TenantTheme` in a `signal`; an `effect()` applies CSS custom properties (`--color-primary`, `--font-family`, etc.) to `:root` whenever the theme changes; `toggleDarkMode()` sets `data-theme="dark"`.
- **Transloco i18n** – translations loaded lazily per route; locale is derived from the tenant config to support per-tenant language defaults.
- **Playwright E2E** – covers analyst and admin roles: guard redirects, directive visibility, and CSS variable injection; API routes are mocked with `page.route()`.

## Tech Stack

| Package | Version |
|---|---|
| `@angular/core` | ^22.3.0 |
| `@jsverse/transloco` | ^8.0.0 |
| `@playwright/test` | ^1.50.0 |

## Running E2E

```bash
npm install
npx playwright install --with-deps
npx playwright test
```
