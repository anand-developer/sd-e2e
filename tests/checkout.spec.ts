import { test, expect } from '@playwright/test';

test.describe('Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('#user-name', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');
    await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
    await page.click('.shopping_cart_link');
  });

  test('complete checkout flow', { tag: '@smoke' }, async ({ page }) => {
    await page.click('[data-test="checkout"]');
    await expect(page).toHaveURL(/checkout-step-one/);

    await page.fill('[data-test="firstName"]', 'John');
    await page.fill('[data-test="lastName"]', 'Doe');
    await page.fill('[data-test="postalCode"]', '10001');
    await page.click('[data-test="continue"]');

    await expect(page).toHaveURL(/checkout-step-two/);
    await expect(page.locator('.inventory_item_name')).toHaveText('Sauce Labs Backpack');

    await page.click('[data-test="finish"]');

    await expect(page).toHaveURL(/checkout-complete/);
    await expect(page.locator('.complete-header')).toHaveText('Thank you for your order!');
  });

  test('checkout blocked with empty first name', { tag: '@regression' }, async ({ page }) => {
    await page.click('[data-test="checkout"]');
    await page.fill('[data-test="lastName"]', 'Doe');
    await page.fill('[data-test="postalCode"]', '10001');
    await page.click('[data-test="continue"]');

    await expect(page.locator('[data-test="error"]')).toContainText('First Name is required');
  });

  test('cancel checkout returns to cart', { tag: '@regression' }, async ({ page }) => {
    await page.click('[data-test="checkout"]');
    await page.click('[data-test="cancel"]');

    await expect(page).toHaveURL(/cart/);
  });
});
