import { test, expect } from '@playwright/test';

test.describe('Shopping Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('#user-name', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');
    await expect(page).toHaveURL(/inventory/);
  });

  test('adding an item updates cart badge', { tag: ['@app', '@smoke'], annotation: { type: 'id', description: 'CART-001' } }, async ({ page }) => {
    await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');

    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
  });

  test('adding multiple items shows correct count', { tag: ['@app', '@regression'], annotation: { type: 'id', description: 'CART-002' } }, async ({ page }) => {
    await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
    await page.click('[data-test="add-to-cart-sauce-labs-bike-light"]');

    await expect(page.locator('.shopping_cart_badge')).toHaveText('2');
  });

  test('removing an item decreases cart badge', { tag: ['@app', '@regression'], annotation: { type: 'id', description: 'CART-003' } }, async ({ page }) => {
    await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
    await page.click('[data-test="remove-sauce-labs-backpack"]');

    await expect(page.locator('.shopping_cart_badge')).not.toBeVisible();
  });

  test('cart page shows added items', { tag: ['@app', '@smoke'], annotation: { type: 'id', description: 'CART-004' } }, async ({ page }) => {
    await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
    await page.click('.shopping_cart_link');

    await expect(page).toHaveURL(/cart/);
    await expect(page.locator('.cart_item')).toHaveCount(1);
    await expect(page.locator('.inventory_item_name')).toHaveText('Sauce Labs Backpack');
  });
});
