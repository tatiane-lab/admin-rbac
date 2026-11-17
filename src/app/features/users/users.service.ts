import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { User, UserInput } from '../../core/models';

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  private readonly _users = signal<User[]>([]);
  private readonly _state = signal<LoadState>('idle');

  readonly users = this._users.asReadonly();
  readonly state = this._state.asReadonly();

  load(): void {
    this._state.set('loading');
    this.http.get<User[]>('/api/users').subscribe({
      next: (users) => {
        this._users.set(users);
        this._state.set('ready');
      },
      error: () => this._state.set('error'),
    });
  }

  create(input: UserInput): Observable<User> {
    return this.http.post<User>('/api/users', input).pipe(tap((u) => this._users.update((list) => [u, ...list])));
  }

  update(id: string, input: UserInput): Observable<User> {
    return this.http
      .put<User>(`/api/users/${id}`, input)
      .pipe(tap((u) => this._users.update((list) => list.map((x) => (x.id === id ? u : x)))));
  }

  remove(id: string): Observable<void> {
    return this.http
      .delete<void>(`/api/users/${id}`)
      .pipe(tap(() => this._users.update((list) => list.filter((x) => x.id !== id))));
  }
}
