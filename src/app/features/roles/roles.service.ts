import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Permission, Role, RoleMatrix } from '../../core/models';
import { LoadState } from '../users/users.service';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);

  private readonly _matrix = signal<RoleMatrix | null>(null);
  private readonly _state = signal<LoadState>('idle');

  readonly matrix = this._matrix.asReadonly();
  readonly state = this._state.asReadonly();

  load(): void {
    this._state.set('loading');
    this.http.get<RoleMatrix>('/api/roles').subscribe({
      next: (matrix) => {
        this._matrix.set(matrix);
        this._state.set('ready');
      },
      error: () => this._state.set('error'),
    });
  }

  save(role: Role, permissions: Permission[]): Observable<RoleMatrix> {
    return this.http.put<RoleMatrix>(`/api/roles/${role}`, permissions).pipe(tap((m) => this._matrix.set(m)));
  }
}
