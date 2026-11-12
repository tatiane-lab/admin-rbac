import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ToastService } from './toast.service';

/** Anexa o bearer token em toda chamada para /api. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (token && req.url.startsWith('/api/')) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};

/** Tratamento global: 401 derruba a sessão; 403 e falhas de rede viram toast. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && !req.url.endsWith('/auth/login')) {
        if (err.status === 401) {
          auth.logout();
          toast.error('Sua sessão expirou. Entre novamente.');
        } else if (err.status === 403) {
          toast.error('Você não tem permissão para esta ação.');
        } else if (err.status === 0 || err.status >= 500) {
          toast.error('Falha de comunicação com o servidor.');
        }
      }
      return throwError(() => err);
    }),
  );
};

export const apiMessage = (err: unknown, fallback = 'Algo deu errado. Tente novamente.'): string => {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string } | null;
    return body?.message ?? fallback;
  }
  return fallback;
};
