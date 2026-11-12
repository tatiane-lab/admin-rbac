import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export interface TenantTheme {
  tenantId: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: string;
  darkMode?: boolean;
}

const BASE = {
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  borderRadius: '10px',
};

export const TENANTS: readonly TenantTheme[] = [
  { tenantId: 'tenant-a', name: 'Acme (indigo)', primaryColor: '#4f46e5', secondaryColor: '#8b5cf6', accentColor: '#06b6d4', ...BASE },
  { tenantId: 'tenant-b', name: 'Globex (esmeralda)', primaryColor: '#059669', secondaryColor: '#0d9488', accentColor: '#f59e0b', ...BASE },
  { tenantId: 'tenant-c', name: 'Initech (laranja)', primaryColor: '#ea580c', secondaryColor: '#dc2626', accentColor: '#2563eb', ...BASE, borderRadius: '6px' },
];

const STORAGE_KEY = 'rbac.theme';

interface Persisted {
  tenantId: string;
  darkMode: boolean;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly _theme = signal<TenantTheme>(TENANTS[0]);

  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this._theme().darkMode ?? false);
  readonly tenants = TENANTS;

  constructor() {
    this.restore();
    effect(() => {
      const theme = this._theme();
      this.applyTheme(theme);
      this.persist({ tenantId: theme.tenantId, darkMode: theme.darkMode ?? false });
    });
  }

  setTheme(theme: Partial<TenantTheme>): void {
    this._theme.update((current) => ({ ...current, ...theme }));
  }

  loadTenantTheme(tenantId: string): void {
    const tenant = TENANTS.find((t) => t.tenantId === tenantId);
    if (!tenant) return;
    this._theme.update((current) => ({ ...tenant, darkMode: current.darkMode }));
  }

  toggleDarkMode(): void {
    this._theme.update((t) => ({ ...t, darkMode: !t.darkMode }));
  }

  private restore(): void {
    let saved: Persisted | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Persisted | null;
    } catch {
      saved = null;
    }
    const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    const fromQuery = new URLSearchParams(this.document.location?.search ?? '').get('tenantId');
    const tenant = TENANTS.find((t) => t.tenantId === (fromQuery ?? saved?.tenantId)) ?? TENANTS[0];
    this._theme.set({ ...tenant, darkMode: saved?.darkMode ?? prefersDark });
  }

  private persist(value: Persisted): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  private applyTheme(theme: TenantTheme): void {
    const root = this.document.documentElement;
    root.dataset['tenant'] = theme.tenantId;
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-secondary', theme.secondaryColor);
    root.style.setProperty('--color-accent', theme.accentColor);
    root.style.setProperty('--font-family', theme.fontFamily);
    root.style.setProperty('--border-radius', theme.borderRadius);
    if (theme.darkMode) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
  }
}
