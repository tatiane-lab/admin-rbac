import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import { Permission, Role, RoleMatrix, Session, User, UserInput } from './models';
import { DEFAULT_ROLE_MATRIX, DEMO_ACCOUNTS } from './rbac.config';

/**
 * Backend simulado (sem servidor) para a demo. Persiste em localStorage e
 * aplica RBAC no "servidor": mesmo burlando a UI, a API responde 403.
 */

type StoredUser = User & { password?: string };
interface Db {
  users: StoredUser[];
  matrix: RoleMatrix;
}

const DB_KEY = 'rbac.db.v1';
const TENANT_ID = 'acme';
const LATENCY_MS = 350;

const seed = (): Db => {
  const names: [string, Role, 'active' | 'inactive'][] = [
    ['Bruno Lima', 'manager', 'active'],
    ['Carla Mendes', 'viewer', 'active'],
    ['Diego Santos', 'viewer', 'inactive'],
    ['Elisa Rocha', 'manager', 'active'],
    ['Fabio Alves', 'viewer', 'active'],
    ['Gabriela Nunes', 'viewer', 'inactive'],
    ['Heitor Costa', 'manager', 'active'],
    ['Isabela Prado', 'viewer', 'active'],
    ['Joao Pedro', 'viewer', 'active'],
    ['Karen Dias', 'manager', 'inactive'],
  ];
  const demo: StoredUser[] = DEMO_ACCOUNTS.map((a, i) => ({
    id: `u-demo-${i + 1}`,
    name: a.name,
    email: a.email,
    role: a.role,
    status: 'active',
    createdAt: new Date(2026, 0, 5 + i).toISOString(),
    password: a.password,
  }));
  const others: StoredUser[] = names.map(([name, role, status], i) => ({
    id: `u-${i + 1}`,
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@acme.dev`,
    role,
    status,
    createdAt: new Date(2026, 1 + (i % 8), 3 + i).toISOString(),
  }));
  return { users: [...demo, ...others], matrix: structuredClone(DEFAULT_ROLE_MATRIX) };
};

const loadDb = (): Db => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    // storage indisponível: usa o seed em memória
  }
  return seed();
};

let db: Db = loadDb();

const persist = (): void => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // ignore
  }
};

const publicUser = (user: StoredUser): User => {
  const { password: _password, ...rest } = user;
  return rest;
};

const makeToken = (id: string): string => `mock.${btoa(id)}`;

const safeAtob = (value: string): string => {
  try {
    return atob(value);
  } catch {
    return '';
  }
};

const ok = <T>(req: HttpRequest<unknown>, body: T, status = 200): Observable<HttpEvent<T>> =>
  of(new HttpResponse({ status, body, url: req.url })).pipe(delay(LATENCY_MS));

const fail = (req: HttpRequest<unknown>, status: number, message: string): Observable<never> =>
  throwError(() => new HttpErrorResponse({ status, url: req.url, error: { message } })).pipe(delay(LATENCY_MS));

export const fakeBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);

  const path = req.url.replace(/\?.*$/, '');
  const route = `${req.method} ${path}`;

  if (route === 'POST /api/auth/login') {
    const { email, password } = req.body as { email: string; password: string };
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.password !== password) return fail(req, 401, 'E-mail ou senha inválidos.');
    if (user.status === 'inactive') return fail(req, 403, 'Usuário inativo.');
    const session: Session = {
      token: makeToken(user.id),
      user: publicUser(user),
      permissions: db.matrix[user.role],
    };
    return ok(req, session);
  }

  if (route === 'POST /api/demo/reset') {
    db = seed();
    persist();
    return ok(req, null, 204);
  }

  // Tudo abaixo exige autenticação.
  const bearer = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const userId = bearer.startsWith('mock.') ? safeAtob(bearer.slice(5)) : '';
  const me = db.users.find((u) => u.id === userId);
  if (!me) return fail(req, 401, 'Não autenticado.');
  const can = (p: Permission): boolean => db.matrix[me.role].includes(p);
  const deny = (): Observable<never> => fail(req, 403, 'Permissão insuficiente.');

  if (route === 'GET /api/auth/me/permissions') {
    return ok(req, { userId: me.id, tenantId: TENANT_ID, role: me.role, permissions: db.matrix[me.role] });
  }

  if (route === 'GET /api/users') {
    return can('users:read') ? ok(req, db.users.map(publicUser)) : deny();
  }

  if (route === 'POST /api/users') {
    if (!can('users:write')) return deny();
    const input = req.body as UserInput;
    if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      return fail(req, 409, 'Já existe um usuário com este e-mail.');
    }
    const created: StoredUser = { ...input, id: `u-${Date.now()}`, createdAt: new Date().toISOString() };
    db = { ...db, users: [created, ...db.users] };
    persist();
    return ok(req, publicUser(created), 201);
  }

  const userMatch = /^\/api\/users\/([^/]+)$/.exec(path);
  if (userMatch) {
    const id = userMatch[1];
    const target = db.users.find((u) => u.id === id);
    if (!target) return fail(req, 404, 'Usuário não encontrado.');

    if (req.method === 'PUT') {
      if (!can('users:write')) return deny();
      const input = req.body as UserInput;
      if (db.users.some((u) => u.id !== id && u.email.toLowerCase() === input.email.toLowerCase())) {
        return fail(req, 409, 'Já existe um usuário com este e-mail.');
      }
      if (target.id === me.id && input.role !== target.role) {
        return fail(req, 400, 'Você não pode alterar o seu próprio papel.');
      }
      const updated: StoredUser = { ...target, ...input };
      db = { ...db, users: db.users.map((u) => (u.id === id ? updated : u)) };
      persist();
      return ok(req, publicUser(updated));
    }

    if (req.method === 'DELETE') {
      if (!can('users:delete')) return deny();
      if (target.id === me.id) return fail(req, 400, 'Você não pode excluir a si mesmo.');
      db = { ...db, users: db.users.filter((u) => u.id !== id) };
      persist();
      return ok(req, null, 204);
    }
  }

  if (route === 'GET /api/roles') {
    return can('roles:read') ? ok(req, db.matrix) : deny();
  }

  const roleMatch = /^\/api\/roles\/(admin|manager|viewer)$/.exec(path);
  if (roleMatch && req.method === 'PUT') {
    if (!can('roles:manage')) return deny();
    const role = roleMatch[1] as Role;
    if (role === 'admin') return fail(req, 400, 'O papel Admin não pode ser alterado.');
    db = { ...db, matrix: { ...db.matrix, [role]: req.body as Permission[] } };
    persist();
    return ok(req, db.matrix);
  }

  return fail(req, 404, 'Rota não encontrada.');
};
