# Admin RBAC Dashboard

Painel administrativo em **Angular 22** com controle de acesso por papéis (RBAC) aplicado em três camadas: rotas (guards funcionais), interface (diretiva estrutural `*hasPermission`) e API (o backend simulado responde 403 mesmo se a UI for burlada). Inclui tema multi-tenant via CSS custom properties, modo escuro e testes unitários e E2E.

> Não há servidor real: um `HttpInterceptorFn` (`fake-backend.interceptor.ts`) simula a API com latência e persiste os dados em `localStorage`.

## Como rodar

```bash
npm install --legacy-peer-deps   # ou apenas npm install, se o resolver não reclamar
npm start                        # http://localhost:4200  (ng serve --port 4213 para outra porta)
npm run build                    # build de produção em dist/
npm test                         # testes unitários (Vitest)
npx playwright install chromium  # uma vez
npm run e2e                      # E2E (sobe o dev server na porta 4213)
```

## Credenciais demo

A tela de login mostra os três perfis com o que cada um pode ou não fazer e botões **Entrar como ...** que preenchem e autenticam.

| Papel | E-mail | Senha |
|---|---|---|
| Admin | `admin@acme.dev` | `admin123` |
| Manager | `manager@acme.dev` | `manager123` |
| Viewer | `viewer@acme.dev` | `viewer123` |

## Matriz de permissões

| Permissão | Admin | Manager | Viewer | Efeito na UI |
|---|:-:|:-:|:-:|---|
| `dashboard:read` | sim | sim | sim | Acessa o dashboard |
| `reports:read` | sim | sim | sim | Botão "Exportar relatório" |
| `users:read` | sim | sim | não | Página Usuários e indicadores do dashboard |
| `users:write` | sim | sim | não | Novo usuário e editar |
| `users:delete` | sim | não | não | Excluir usuário e "Remover inativos" |
| `roles:read` | sim | não | não | Página Papéis e permissões |
| `roles:manage` | sim | não | não | Alterar a matriz (papel Admin é fixo) |

O Admin pode editar a matriz de Manager e Viewer em **Papéis e permissões**; as alterações valem imediatamente (a sessão revalida as permissões em `/api/auth/me/permissions`).

## Funcionalidades

- Login com contas demo, redirecionamento `returnUrl` e sessão persistida.
- Dashboard com indicadores (restritos por permissão), painel "Seu acesso" e exportação de CSV.
- CRUD de usuários: busca, filtro por papel, paginação, modal de criar/editar com validação, confirmação de exclusão, estados de carregamento (skeleton), vazio e erro com "tentar de novo".
- Matriz de papéis e permissões editável.
- Toasts, páginas de acesso negado (`/forbidden`) e 404.
- Tema por tenant (indigo, esmeralda, laranja; também por `?tenantId=tenant-b`) e modo claro/escuro, ambos persistidos.
- Layout responsivo com sidebar em drawer no mobile; modais com `<dialog>` nativo (foco, Esc e backdrop).

## Stack

Angular 22 (standalone, signals, `input()`/`viewChild()`, control flow, `OnPush`, `provideAppInitializer`), RxJS 7, Reactive Forms, SCSS, Vitest + jsdom, Playwright, TypeScript estrito (`strictTemplates`).

## Decisões de arquitetura

- **PermissionsService** é a fonte única de verdade: deriva de um `computed` sobre a sessão do `AuthService`, então guards, diretiva e templates reagem às mesmas mudanças.
- **Guards funcionais**: `authGuard`, `guestGuard` e `permissionGuard` (lê `data.permissions`/`data.role`; falha leva a `/forbidden`). Rotas com `loadComponent` (lazy).
- **`*hasPermission`**: diretiva com `input()` e `effect()`, semântica de `*ngIf` com `else`, aceita uma ou várias permissões (`hasPermissionAll` exige todas). Reage em tempo real a mudanças de papel.
- **Interceptors**: `authInterceptor` (Bearer), `errorInterceptor` (401 encerra a sessão, 403 e falhas de rede viram toast) e o fake backend por último na cadeia.
- **Defesa em profundidade**: esconder um botão não é segurança; o backend simulado valida a permissão de cada endpoint.
- **Estado**: signals nos serviços (`UsersService`, `RolesService`, `ToastService`), sem biblioteca de store.
- **Tema multi-tenant**: `ThemeService` guarda o tenant em um signal e um `effect()` aplica as variáveis CSS (`--color-primary` etc.) no `:root`.

## Estrutura

```
src/app/
  auth/       auth.service, permissions.service, guards, has-permission.directive
  core/       models, rbac.config, interceptors, fake backend, theme e toast services
  features/   login, dashboard, users, roles, errors
  layout/     shell (sidebar + topbar)
  shared/     icon, modal, toast-container, role-badge
e2e/          cenários Playwright por papel
```

## Notas

- `@angular/build` e `@angular/cli` foram alinhados à versão 22 (antes 21, incompatível com `@angular/core` 22) e o TypeScript a 6.0, exigido pelo builder.
- Para recomeçar os dados da demo, limpe o `localStorage` do site.
