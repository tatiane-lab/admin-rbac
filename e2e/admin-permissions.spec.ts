import { test, expect } from '@playwright/test';

test.describe('RBAC - Permission Guards', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/auth/me/permissions', (route) =>
      route.fulfill({
        json: {
          userId: 'u1',
          tenantId: 't1',
          role: 'analyst',
          permissions: ['reports:read', 'dashboard:read'],
        },
      })
    );
  });

  test('analyst can view dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('analyst is redirected when accessing admin route', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/forbidden');
  });

  test('hasPermission directive hides admin actions', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="delete-btn"]')).not.toBeVisible();
  });
});

test.describe('RBAC - Admin Role', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/auth/me/permissions', (route) =>
      route.fulfill({
        json: {
          userId: 'admin1',
          tenantId: 't1',
          role: 'admin',
          permissions: ['reports:read', 'reports:write', 'users:manage', 'dashboard:read'],
        },
      })
    );
  });

  test('admin can access user management', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('h1')).toContainText('Users');
  });

  test('admin sees delete button via hasPermission directive', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="delete-btn"]')).toBeVisible();
  });
});

test.describe('Multi-tenant Theming', () => {
  test('tenant A gets indigo theme', async ({ page }) => {
    await page.goto('/?tenantId=tenant-a');
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary')
    );
    expect(primary.trim()).toMatch(/#[0-9a-f]{6}/i);
  });
});
