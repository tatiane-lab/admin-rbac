import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { Session, UserPermissions } from '../core/models';

const SESSION_KEY = 'rbac.session';

const readSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
};

const writeSession = (session: Session | null): void => {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage indisponível: sessão vive só em memória
  }
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _session = signal<Session | null>(readSession());

  readonly session = this._session.asReadonly();
  readonly user = computed(() => this._session()?.user ?? null);
  readonly token = computed(() => this._session()?.token ?? null);
  readonly isAuthenticated = computed(() => this._session() !== null);

  login(email: string, password: string): Observable<Session> {
    return this.http
      .post<Session>('/api/auth/login', { email, password })
      .pipe(tap((session) => this.setSession(session)));
  }

  logout(): void {
    this.setSession(null);
    void this.router.navigateByUrl('/login');
  }

  /** Revalida permissões no servidor (ex.: matriz de papéis alterada). */
  refresh(): Observable<UserPermissions | null> {
    const current = this._session();
    if (!current) return of(null);
    return this.http.get<UserPermissions>('/api/auth/me/permissions').pipe(
      tap((perms) => this.setSession({ ...current, permissions: perms.permissions })),
      map((perms) => perms),
      catchError(() => of(null)),
    );
  }

  private setSession(session: Session | null): void {
    this._session.set(session);
    writeSession(session);
  }
}
