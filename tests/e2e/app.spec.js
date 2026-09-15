import { test, expect } from '@playwright/test';

test.describe('Color Palette Explorer', () => {

  // ── AC-01: Swatches render on load ──────────────────────────────────────
  test('AC-01: renders 24 swatches with name and HEX on load', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch', { timeout: 5000 });
    await expect(page.locator('.swatch')).toHaveCount(24);
    await expect(page.locator('.swatch').first().locator('.swatch-name')).not.toBeEmpty();
    await expect(page.locator('.swatch').first().locator('.swatch-hex'))
      .toHaveText(/^#[0-9A-Fa-f]{6}$/);
  });

  test('loading spinner is hidden after data loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await expect(page.locator('#loading-state')).toBeHidden();
  });

  // ── AC-02: Real-time search ──────────────────────────────────────────────
  test('AC-02: search filters swatches by name in real time', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.fill('#search', 'blue');
    await page.waitForTimeout(300); // debounce 150ms + render
    // Sky Blue, Royal Blue, Steel Blue, Midnight Blue = 4
    await expect(page.locator('.swatch')).toHaveCount(4);
  });

  test('AC-02: search is case-insensitive', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.fill('#search', 'GREEN');
    await page.waitForTimeout(300);
    const upper = await page.locator('.swatch').count();
    await page.fill('#search', 'green');
    await page.waitForTimeout(300);
    const lower = await page.locator('.swatch').count();
    expect(upper).toBe(lower);
    expect(lower).toBe(2); // Forest Green, Lime Green
  });

  // ── EC-02: Empty state ───────────────────────────────────────────────────
  test('EC-02: shows empty state when no swatches match', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.fill('#search', 'xyzxyz_no_match');
    await page.waitForTimeout(300);
    await expect(page.locator('#empty-state')).toBeVisible();
    await expect(page.locator('.swatch')).toHaveCount(0);
  });

  test('EC-02: clearing search restores full list', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.fill('#search', 'xyzxyz_no_match');
    await page.waitForTimeout(300);
    await page.fill('#search', '');
    await page.waitForTimeout(300);
    await expect(page.locator('#empty-state')).toBeHidden();
    await expect(page.locator('.swatch')).toHaveCount(24);
  });

  // ── AC-03: Family dropdown ───────────────────────────────────────────────
  test('AC-03: family dropdown filters to Blue family (4 swatches)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.selectOption('#family-filter', 'Blue');
    await page.waitForTimeout(200);
    await expect(page.locator('.swatch')).toHaveCount(4);
  });

  test('AC-03: selecting All families restores full list', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.selectOption('#family-filter', 'Blue');
    await page.waitForTimeout(200);
    await page.selectOption('#family-filter', 'All');
    await page.waitForTimeout(200);
    await expect(page.locator('.swatch')).toHaveCount(24);
  });

  // ── AC-04: Modal on click ────────────────────────────────────────────────
  test('AC-04: clicking a swatch opens the modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.locator('.swatch').first().click();
    await expect(page.locator('#color-modal')).toBeVisible();
  });

  test('AC-04: modal shows Name, HEX, RGB, HSL, contrast vs white and black', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.locator('.swatch').first().click(); // Crimson
    await expect(page.locator('#modal-title')).toHaveText('Crimson');
    await expect(page.locator('#modal-hex')).toHaveText('#DC143C');
    await expect(page.locator('#modal-rgb')).toHaveText(/^rgb\(\d+, \d+, \d+\)$/);
    await expect(page.locator('#modal-hsl')).toHaveText(/^hsl\(\d+, \d+%, \d+%\)$/);
    await expect(page.locator('#modal-contrast-white')).toHaveText(/^\d+\.\d+:1$/);
    await expect(page.locator('#modal-contrast-black')).toHaveText(/^\d+\.\d+:1$/);
  });

  test('AC-04: pressing Enter on a swatch opens the modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.locator('.swatch').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#color-modal')).toBeVisible();
  });

  // ── AC-05: Copy HEX ──────────────────────────────────────────────────────
  test('AC-05: Copy HEX button is visible and enabled in modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.locator('.swatch').first().click();
    await expect(page.locator('#btn-copy')).toBeVisible();
    await expect(page.locator('#btn-copy')).toBeEnabled();
  });

  // ── Modal close ──────────────────────────────────────────────────────────
  test('Close button dismisses the modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.locator('.swatch').first().click();
    await page.locator('#btn-close-modal').click();
    await expect(page.locator('#color-modal')).toBeHidden();
  });

  test('Escape key dismisses the modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.locator('.swatch').first().click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#color-modal')).toBeHidden();
  });

  test('focus returns to trigger swatch after modal close', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    const swatch = page.locator('.swatch').first();
    await swatch.click();
    await page.locator('#btn-close-modal').click();
    await expect(swatch).toBeFocused();
  });

  // ── DD-01: Keyboard navigation ───────────────────────────────────────────
  test('DD-01: ArrowRight moves focus to next swatch', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.locator('.swatch').nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.swatch').nth(1)).toBeFocused();
  });

  test('DD-01: ArrowLeft moves focus back to previous swatch', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.locator('.swatch').nth(1).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.swatch').nth(0)).toBeFocused();
  });

  // ── NFR-03: ARIA ─────────────────────────────────────────────────────────
  test('NFR-03: swatch list has role=listbox', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#swatch-list')).toHaveAttribute('role', 'listbox');
  });

  test('NFR-03: aria-live region updates after search', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.swatch');
    await page.fill('#search', 'blue');
    await page.waitForTimeout(300);
    await expect(page.locator('#aria-announcer'))
      .toHaveText(/Showing \d+ of \d+ colors/);
  });

  // ── AC-06 / EC-01: Offline fallback ──────────────────────────────────────
  test('AC-06: shows offline banner and fallback swatches when fetch fails', async ({ page }) => {
    await page.route('**/colors.v1.json', route => route.abort());
    await page.goto('/');
    await page.waitForSelector('.swatch', { timeout: 5000 });
    await expect(page.locator('#offline-banner')).toBeVisible();
    const count = await page.locator('.swatch').count();
    expect(count).toBeGreaterThan(0);
  });

  // ── DD-04: Controls disabled during loading ──────────────────────────────
  test('DD-04: controls are disabled while loading and enabled after', async ({ page }) => {
    await page.route('**/colors.v1.json', async route => {
      await new Promise(r => setTimeout(r, 400));
      await route.continue();
    });
    await page.goto('/');
    await expect(page.locator('#search')).toBeDisabled();
    await expect(page.locator('#family-filter')).toBeDisabled();
    await page.waitForSelector('.swatch');
    await expect(page.locator('#search')).toBeEnabled();
    await expect(page.locator('#family-filter')).toBeEnabled();
  });

  // ── NFR-05: No JS errors on load ─────────────────────────────────────────
  test('NFR-05: no JavaScript errors on page load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.waitForSelector('.swatch');
    expect(errors).toHaveLength(0);
  });

});
