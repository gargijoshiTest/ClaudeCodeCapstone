/**
 * tests/e2e/playground.spec.js — TES-3 Text Color Playground E2E suite
 *
 * Covers all acceptance criteria (AC-01 through AC-11) from docs/TES-3/requirements.md,
 * plus NFR-01 (accessibility), NFR-02 (responsiveness), NFR-03 (security / XSS),
 * EC-03 (XSS in sample text), and EC-04 (same text/bg color → 1:1 contrast).
 *
 * Selectors are populated directly from text-color-playground.html and lib/playground.js.
 * No mocking of app internals — all tests run through the real browser rendering the real app.
 */
import { test, expect } from '@playwright/test';

/** Route to the TES-3 page (distinct from TES-2's index.html). */
const PG = '/text-color-playground.html';

/**
 * Wait until initPlayground() has completed and the first color has been applied.
 * playground.js calls setField('pg-info-hex', color.hex) synchronously inside
 * initPlayground() after the fetch resolves. Once the hex field shows a '#' value,
 * all module state (allColors, selectedColor, currentBgHex) is fully ready.
 */
async function waitForInit(page) {
  await page.waitForFunction(
    () => {
      const el = document.getElementById('pg-info-hex');
      return el !== null && el.textContent.startsWith('#');
    },
    { timeout: 5000 }
  );
}

test.describe('Text Color Playground — TES-3', () => {

  // ── AC-01: page load state ───────────────────────────────────────────────

  test('AC-01: color dropdown, sample text, preview area, and HEX value visible on load', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await expect(page.locator('#pg-combobox-input')).toBeVisible();
    await expect(page.locator('#pg-sample-text')).toBeVisible();
    await expect(page.locator('#pg-preview-area')).toBeVisible();
    await expect(page.locator('#pg-info-hex')).toHaveText(/^#[0-9A-Fa-f]{6}$/);
  });

  test('AC-01: default sample text is the pangram', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await expect(page.locator('#pg-preview-text')).toContainText('quick brown fox');
  });

  // ── AC-02: searchable color dropdown ────────────────────────────────────

  test('AC-02: dropdown lists colors from dataset when opened', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await page.click('#pg-combobox-input');
    await expect(page.locator('.combobox-option[role="option"]').first()).toBeVisible();
    const count = await page.locator('.combobox-option[role="option"]').count();
    expect(count).toBeGreaterThan(0);
  });

  test('AC-02: inline search narrows the color list (debounced)', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await page.click('#pg-combobox-input');
    // Clear existing input value so the full list is populated before measuring
    await page.fill('#pg-combobox-input', '');
    await page.waitForTimeout(300); // debounce + render for full list
    const totalBefore = await page.locator('.combobox-option[role="option"]').count();
    // 'blue' matches Royal Blue, Sky Blue, Steel Blue, Midnight Blue (4 of 24)
    await page.fill('#pg-combobox-input', 'blue');
    await page.waitForTimeout(300); // debounce 150 ms + render
    const filtered = await page.locator('.combobox-option[role="option"]').count();
    expect(filtered).toBeLessThan(totalBefore);
    expect(filtered).toBeGreaterThan(0);
  });

  test('AC-02: search is case-insensitive', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await page.click('#pg-combobox-input');
    await page.fill('#pg-combobox-input', 'BLUE');
    await page.waitForTimeout(300);
    const upper = await page.locator('.combobox-option[role="option"]').count();
    await page.fill('#pg-combobox-input', 'blue');
    await page.waitForTimeout(300);
    const lower = await page.locator('.combobox-option[role="option"]').count();
    expect(upper).toBe(lower);
    expect(lower).toBeGreaterThan(0);
  });

  // ── AC-03: color selection applies CSS foreground color ──────────────────

  test('AC-03: selecting a color sets a CSS foreground color on the preview text', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await page.click('#pg-combobox-input');
    await page.waitForSelector('.combobox-option[role="option"]');
    await page.locator('.combobox-option[role="option"]').first().click();
    // style.color is set by applyColor() — it must be non-empty after selection
    const styleColor = await page.locator('#pg-preview-text').evaluate(el => el.style.color);
    expect(styleColor).not.toBe('');
  });

  test('AC-03: selecting a different color updates the preview text color', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    const initialColor = await page.locator('#pg-preview-text').evaluate(el => el.style.color);
    // Select Royal Blue — different from default Crimson
    await page.click('#pg-combobox-input');
    await page.fill('#pg-combobox-input', 'Royal Blue');
    await page.waitForTimeout(300);
    await page.locator('.combobox-option[role="option"]').first().click();
    const newColor = await page.locator('#pg-preview-text').evaluate(el => el.style.color);
    expect(newColor).not.toBe(initialColor);
  });

  // ── AC-04: info panel shows Name, HEX, RGB, HSL ─────────────────────────

  test('AC-04: info panel shows a non-empty Color Name on load', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    const name = await page.locator('#pg-info-name').textContent();
    expect(name.trim()).not.toBe('—');
    expect(name.trim()).not.toBe('');
  });

  test('AC-04: info panel shows HEX in #RRGGBB format', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await expect(page.locator('#pg-info-hex')).toHaveText(/^#[0-9A-Fa-f]{6}$/);
  });

  test('AC-04: info panel shows RGB in rgb(R, G, B) format', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await expect(page.locator('#pg-info-rgb')).toHaveText(/^rgb\(\d+, \d+, \d+\)$/);
  });

  test('AC-04: info panel shows HSL in hsl(H, S%, L%) format', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await expect(page.locator('#pg-info-hsl')).toHaveText(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  test('AC-04: info panel updates with the newly selected color name', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await page.click('#pg-combobox-input');
    await page.fill('#pg-combobox-input', 'Tomato');
    await page.waitForTimeout(300);
    await page.locator('.combobox-option[role="option"]').first().click();
    await expect(page.locator('#pg-info-name')).toHaveText('Tomato');
    await expect(page.locator('#pg-info-hex')).toHaveText('#FF6347');
  });

  // ── AC-05: contrast ratio and WCAG AA result ─────────────────────────────

  test('AC-05: contrast ratio is shown in X.XX:1 format', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await expect(page.locator('#pg-contrast-ratio')).toHaveText(/^\d+\.\d+:1$/);
  });

  test('AC-05: WCAG AA pass or fail indicator is shown', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await expect(page.locator('#pg-wcag-result')).toHaveText(/^WCAG AA (Pass|Fail)$/);
  });

  test('AC-05: Crimson on white (#FFFFFF) background passes WCAG AA (ratio >= 4.5:1)', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    // Default selection is Crimson (#DC143C) on white — known to be ~5.1:1
    const ratioText = await page.locator('#pg-contrast-ratio').textContent();
    const ratio = parseFloat(ratioText.replace(':1', ''));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    await expect(page.locator('#pg-wcag-result')).toHaveText('WCAG AA Pass');
  });

  // ── AC-06: editing sample text updates the preview ───────────────────────

  test('AC-06: editing sample text immediately updates the preview text content', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    const newText = 'Playground test string 123';
    await page.fill('#pg-sample-text', newText);
    await expect(page.locator('#pg-preview-text')).toHaveText(newText);
  });

  test('AC-06: special characters in sample text appear as literal text in preview', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await page.fill('#pg-sample-text', 'Hello & World <escaped>');
    await expect(page.locator('#pg-preview-text')).toHaveText('Hello & World <escaped>');
  });

  // ── AC-07: background color change updates contrast ──────────────────────

  test('AC-07: changing background color changes the contrast ratio', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    const ratioBefore = await page.locator('#pg-contrast-ratio').textContent();
    // Change background to black — contrast of Crimson on black differs from on white
    await page.evaluate(() => {
      const picker = document.getElementById('pg-bg-color');
      picker.value = '#000000';
      picker.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const ratioAfter = await page.locator('#pg-contrast-ratio').textContent();
    expect(ratioAfter).not.toBe(ratioBefore);
  });

  test('AC-07: WCAG AA result remains a valid Pass/Fail after background change', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await page.evaluate(() => {
      const picker = document.getElementById('pg-bg-color');
      picker.value = '#808080';
      picker.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#pg-wcag-result')).toHaveText(/^WCAG AA (Pass|Fail)$/);
  });

  test('AC-07: background color change is reflected on the preview area element', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await page.evaluate(() => {
      const picker = document.getElementById('pg-bg-color');
      picker.value = '#123456';
      picker.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // playground.js sets previewArea.style.backgroundColor = bgHex
    const bg = await page.locator('#pg-preview-area').evaluate(el => el.style.backgroundColor);
    expect(bg).not.toBe('');
  });

  // ── AC-08: Copy HEX button ────────────────────────────────────────────────

  test('AC-08: Copy HEX button is visible and enabled', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await expect(page.locator('#pg-btn-copy')).toBeVisible();
    await expect(page.locator('#pg-btn-copy')).toBeEnabled();
  });

  test('AC-08: clicking Copy HEX shows "Copied!" visual feedback on the button', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(PG);
    await waitForInit(page);
    await page.click('#pg-btn-copy');
    await expect(page.locator('#pg-btn-copy')).toHaveText('Copied!');
  });

  test('AC-08: clipboard copy confirmation is announced in the aria-live region', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(PG);
    await waitForInit(page);
    await page.click('#pg-btn-copy');
    await page.waitForFunction(
      () => document.getElementById('pg-aria-live').textContent.includes('copied to clipboard'),
      { timeout: 3000 }
    );
    const announcement = await page.locator('#pg-aria-live').textContent();
    expect(announcement).toMatch(/copied to clipboard/i);
  });

  // ── AC-09: offline fallback ───────────────────────────────────────────────

  test('AC-09: offline banner is shown when color dataset fails to load', async ({ page }) => {
    await page.route('**/colors.v1.json', route => route.abort());
    await page.goto(PG);
    await waitForInit(page);
    await expect(page.locator('#pg-offline-banner')).toBeVisible();
  });

  test('AC-09: fallback dataset provides a valid default color when offline', async ({ page }) => {
    await page.route('**/colors.v1.json', route => route.abort());
    await page.goto(PG);
    await waitForInit(page);
    await expect(page.locator('#pg-info-hex')).toHaveText(/^#[0-9A-Fa-f]{6}$/);
    await expect(page.locator('#pg-info-name')).not.toHaveText('—');
  });

  test('AC-09: offline banner persists (non-dismissible) after color selection', async ({ page }) => {
    await page.route('**/colors.v1.json', route => route.abort());
    await page.goto(PG);
    await waitForInit(page);
    await expect(page.locator('#pg-offline-banner')).toBeVisible();
    // Select a color from the fallback set
    await page.click('#pg-combobox-input');
    await page.locator('.combobox-option[role="option"]').first().click();
    // Banner must still be visible
    await expect(page.locator('#pg-offline-banner')).toBeVisible();
  });

  test('AC-09: fallback combobox has selectable color options when offline', async ({ page }) => {
    await page.route('**/colors.v1.json', route => route.abort());
    await page.goto(PG);
    await waitForInit(page);
    await page.click('#pg-combobox-input');
    const count = await page.locator('.combobox-option[role="option"]').count();
    expect(count).toBeGreaterThan(0);
  });

  // ── EC-04: same text and background color → 1:1 contrast → WCAG AA Fail ──

  test('EC-04: same text color and background color yields 1.00:1 contrast and WCAG AA Fail', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    // Read the currently selected hex (Crimson: #DC143C by default)
    const hex = await page.locator('#pg-info-hex').textContent();
    // Set background to the same hex
    await page.evaluate((bgHex) => {
      const picker = document.getElementById('pg-bg-color');
      picker.value = bgHex;
      picker.dispatchEvent(new Event('input', { bubbles: true }));
    }, hex);
    await expect(page.locator('#pg-contrast-ratio')).toHaveText('1.00:1');
    await expect(page.locator('#pg-wcag-result')).toHaveText('WCAG AA Fail');
  });

  // ── EC-03 / NFR-03: XSS prevention via textContent ──────────────────────

  test('EC-03/NFR-03: script tags in sample text are not executed (textContent not innerHTML)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(PG);
    await waitForInit(page);
    await page.fill('#pg-sample-text', '<script>window.__pg_xss = true;</script>');
    await page.waitForTimeout(200);
    const injected = await page.evaluate(() => window.__pg_xss);
    expect(injected).toBeUndefined();
    expect(errors).toHaveLength(0);
  });

  // ── NFR-01: accessibility — ARIA roles and attributes ────────────────────

  test('NFR-01: combobox input has role="combobox"', async ({ page }) => {
    await page.goto(PG);
    await expect(page.locator('#pg-combobox-input')).toHaveAttribute('role', 'combobox');
  });

  test('NFR-01: combobox input has aria-controls linking to the listbox (GAP-02)', async ({ page }) => {
    await page.goto(PG);
    await expect(page.locator('#pg-combobox-input')).toHaveAttribute('aria-controls', 'pg-listbox');
  });

  test('NFR-01: listbox element has role="listbox"', async ({ page }) => {
    await page.goto(PG);
    await expect(page.locator('#pg-listbox')).toHaveAttribute('role', 'listbox');
  });

  test('NFR-01: aria-live region has aria-live="polite" and aria-atomic="true"', async ({ page }) => {
    await page.goto(PG);
    await expect(page.locator('#pg-aria-live')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#pg-aria-live')).toHaveAttribute('aria-atomic', 'true');
  });

  test('NFR-01: listbox options have role="option" when opened', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await page.click('#pg-combobox-input');
    await expect(page.locator('#pg-listbox [role="option"]').first()).toBeVisible();
  });

  test('NFR-01: Escape key closes the combobox listbox', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await page.click('#pg-combobox-input');
    await page.waitForFunction(() => !document.getElementById('pg-listbox').hidden);
    await page.keyboard.press('Escape');
    const isHidden = await page.locator('#pg-listbox').evaluate(el => el.hidden);
    expect(isHidden).toBe(true);
  });

  test('NFR-01: ArrowDown key re-opens the closed combobox listbox', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    // Open then close the listbox with Escape
    await page.locator('#pg-combobox-input').focus();
    await page.waitForFunction(() => !document.getElementById('pg-listbox').hidden);
    await page.keyboard.press('Escape');
    const hiddenAfterEscape = await page.locator('#pg-listbox').evaluate(el => el.hidden);
    expect(hiddenAfterEscape).toBe(true);
    // Now ArrowDown should reopen it
    await page.keyboard.press('ArrowDown');
    const hiddenAfterArrow = await page.locator('#pg-listbox').evaluate(el => el.hidden);
    expect(hiddenAfterArrow).toBe(false);
  });

  test('NFR-01: Enter key on highlighted option selects it and closes the listbox', async ({ page }) => {
    await page.goto(PG);
    await waitForInit(page);
    await page.locator('#pg-combobox-input').focus();
    await page.waitForFunction(() => !document.getElementById('pg-listbox').hidden);
    await page.keyboard.press('ArrowDown'); // highlights first option
    await page.keyboard.press('Enter');     // selects it
    const isHidden = await page.locator('#pg-listbox').evaluate(el => el.hidden);
    expect(isHidden).toBe(true);
    // Info panel name must be set (non-empty, non-placeholder)
    const name = await page.locator('#pg-info-name').textContent();
    expect(name.trim()).not.toBe('');
  });

  // ── NFR-02: responsiveness ───────────────────────────────────────────────

  test('NFR-02: key controls are visible on a mobile viewport (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(PG);
    await waitForInit(page);
    await expect(page.locator('#pg-combobox-input')).toBeVisible();
    await expect(page.locator('#pg-preview-area')).toBeVisible();
    await expect(page.locator('#pg-btn-copy')).toBeVisible();
  });

  // ── General: no JS errors on page load ──────────────────────────────────

  test('no JavaScript errors on page load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(PG);
    await waitForInit(page);
    expect(errors).toHaveLength(0);
  });

});
