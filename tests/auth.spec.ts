import { test, expect } from '@playwright/test';

const VALID_USER = 'standard_user';
const VALID_PASS = 'secret_sauce';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('valid login lands on inventory page', { tag: '@smoke' }, async ({ page }) => {
    await page.fill('#user-name', VALID_USER);
    await page.fill('#password', VALID_PASS);
    await page.click('#login-button');

    await expect(page).toHaveURL(/inventory/);
    await expect(page.locator('.title')).toHaveText('Products');
  });

  test('invalid password shows error message', { tag: '@regression' }, async ({ page }) => {
    await page.fill('#user-name', VALID_USER);
    await page.fill('#password', 'wrong_password');
    await page.click('#login-button');

    await expect(page.locator('[data-test="error"]')).toBeVisible();
    await expect(page.locator('[data-test="error"]')).toContainText('Username and password do not match');
  });

  test('locked out user sees lock error', { tag: '@regression' }, async ({ page }) => {
    await page.fill('#user-name', 'locked_out_user');
    await page.fill('#password', VALID_PASS);
    await page.click('#login-button');

    await expect(page.locator('[data-test="error"]')).toContainText('locked out');
  });

  test('logout returns to login page', { tag: '@smoke' }, async ({ page }) => {
    await page.fill('#user-name', VALID_USER);
    await page.fill('#password', VALID_PASS);
    await page.click('#login-button');

    await page.click('#react-burger-menu-btn');
    await page.click('#logout_sidebar_link');

    await expect(page).toHaveURL('/');
    await expect(page.locator('#login-button')).toBeVisible();
  });
});
