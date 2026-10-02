import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface TenantTheme {
  tenantId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  fontFamily: string;
  borderRadius: string;
  darkMode?: boolean;
}

const defaultTheme: TenantTheme = {
  tenantId: 'default',
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  accentColor: '#06b6d4',
  logoUrl: '/assets/logo.svg',
  fontFamily: "'Inter', system-ui, sans-serif",
  borderRadius: '8px',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);
  private _theme = signal<TenantTheme>(defaultTheme);

  theme = this._theme.asReadonly();
  isDark = computed(() => this._theme().darkMode ?? false);

  constructor() {
    effect(() => this.applyTheme(this._theme()));
  }

  setTheme(theme: Partial<TenantTheme>): void {
    this._theme.update((current) => ({ ...current, ...theme }));
  }

  loadTenantTheme(tenantId: string): void {
    const root = this.document.documentElement;
    root.dataset['tenant'] = tenantId;
    // In production, fetch from API and call setTheme()
  }

  toggleDarkMode(): void {
    this._theme.update((t) => ({ ...t, darkMode: !t.darkMode }));
  }

  private applyTheme(theme: TenantTheme): void {
    const root = this.document.documentElement;
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-secondary', theme.secondaryColor);
    root.style.setProperty('--color-accent', theme.accentColor);
    root.style.setProperty('--font-family', theme.fontFamily);
    root.style.setProperty('--border-radius', theme.borderRadius);

    if (theme.darkMode) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }
}
