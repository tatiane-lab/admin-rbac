import { expect, Page, test } from '@playwright/test';

const loginAs = async (page: Page, role: 'admin' | 'manager' | 'viewer') => {
  await page.goto('/login');
  await page.getByTestId(`demo-${role}`).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

test.describe('Login e sessão', () => {
  test('rota protegida redireciona anônimo para o login', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fadmin%2Fusers/);
  });

  test('credenciais inválidas mostram erro', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('admin@acme.dev');
    await page.getByLabel('Senha').fill('errada');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos');
  });
});

test.describe('RBAC - Viewer', () => {
  test.beforeEach(async ({ page }) => loginAs(page, 'viewer'));

  test('vê o dashboard mas não os indicadores de usuários', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.getByTestId('stats-locked')).toBeVisible();
  });

  test('é redirecionado ao acessar rota de admin', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(page.getByTestId('forbidden')).toBeVisible();
  });

  test('diretiva esconde ações destrutivas', async ({ page }) => {
    await expect(page.getByTestId('delete-btn')).toHaveCount(0);
  });
});

test.describe('RBAC - Manager', () => {
  test.beforeEach(async ({ page }) => loginAs(page, 'manager'));

  test('gerencia usuários, mas não exclui nem vê papéis', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('h1')).toContainText('Usuários');
    await expect(page.getByTestId('new-user-btn')).toBeVisible();
    await expect(page.getByTestId('row-delete-btn')).toHaveCount(0);
    await page.goto('/admin/roles');
    await expect(page).toHaveURL(/\/forbidden$/);
  });

  test('cria um usuário e mostra toast', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByTestId('new-user-btn').click();
    await page.getByLabel('Nome').fill('Pessoa Nova');
    await page.getByLabel('E-mail').fill(`nova.${Date.now()}@acme.dev`);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Usuário criado.')).toBeVisible();
    await expect(page.getByText('Pessoa Nova')).toBeVisible();
  });
});

test.describe('RBAC - Admin', () => {
  test.beforeEach(async ({ page }) => loginAs(page, 'admin'));

  test('vê ações de exclusão e a matriz de papéis', async ({ page }) => {
    await expect(page.getByTestId('delete-btn')).toBeVisible();
    await page.goto('/admin/users');
    await expect(page.getByTestId('row-delete-btn').first()).toBeVisible();
    await page.goto('/admin/roles');
    await expect(page.locator('h1')).toContainText('Papéis e permissões');
    await expect(page.getByTestId('toggle-admin-users:delete')).toBeDisabled();
  });

  test('busca sem resultado mostra estado vazio', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByPlaceholder('Buscar por nome ou e-mail').fill('zzzzzz');
    await expect(page.getByTestId('empty-state')).toBeVisible();
  });
});

test.describe('Tema multi-tenant', () => {
  test('tenant-b aplica a cor primária esmeralda', async ({ page }) => {
    await page.goto('/login?tenantId=tenant-b');
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary'),
    );
    expect(primary.trim()).toBe('#059669');
  });
});
