import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './auth/auth.service';
import { fakeBackendInterceptor } from './core/fake-backend.interceptor';
import { authInterceptor, errorInterceptor } from './core/http.interceptors';
import { ThemeService } from './core/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // O fake backend vem por último: simula o servidor atrás dos demais interceptors.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor, fakeBackendInterceptor])),
    provideAppInitializer(() => {
      inject(ThemeService);
      // Revalida permissões de uma sessão restaurada antes de ativar as rotas.
      return inject(AuthService).refresh();
    }),
  ],
};
