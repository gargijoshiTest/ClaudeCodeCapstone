/**
 * ci/test-playground.js — TES-3 smoke tests
 *
 * Tests pure functions exported from lib/playground.js and lib/colorUtils.js.
 * No DOM required — playground.js defers all document.* calls to function
 * bodies (DD-10), so this file can import it safely in Node.js.
 *
 * Covers: FR-15, AC-10
 */

import assert from 'node:assert/strict';
import { buildRgbString, buildHslString, evalWcagAA, debounce } from '../lib/playground.js';
import { getContrastRatio } from '../lib/colorUtils.js';

const { equal, ok } = assert;

// ---- buildRgbString: hex-to-RGB conversion ----

equal(
  buildRgbString('#DC143C'),
  'rgb(220, 20, 60)',
  'buildRgbString: Crimson #DC143C → rgb(220, 20, 60)'
);

equal(
  buildRgbString('#FFFFFF'),
  'rgb(255, 255, 255)',
  'buildRgbString: white #FFFFFF → rgb(255, 255, 255)'
);

equal(
  buildRgbString('#000000'),
  'rgb(0, 0, 0)',
  'buildRgbString: black #000000 → rgb(0, 0, 0)'
);

// R-02: lowercase hex input must produce the same result (case-insensitive handling)
equal(
  buildRgbString('#dc143c'),
  'rgb(220, 20, 60)',
  'buildRgbString: lowercase hex #dc143c → rgb(220, 20, 60)'
);

// ---- buildHslString: hex-to-HSL conversion ----

ok(
  buildHslString('#DC143C').startsWith('hsl('),
  'buildHslString: result starts with hsl('
);

ok(
  buildHslString('#FFFFFF').includes('%'),
  'buildHslString: white result contains % for saturation/lightness'
);

// Crimson is a red hue — HSL hue should be near 348° (accept 340–360 or 0)
const crimsonHsl = buildHslString('#DC143C');
const hueMatch   = crimsonHsl.match(/^hsl\((\d+),/);
ok(hueMatch, 'buildHslString: Crimson HSL matches hsl(H, ...) pattern');
const hue = parseInt(hueMatch[1], 10);
ok(hue >= 340 || hue === 0, `buildHslString: Crimson hue ${hue}° is in red range`);

// ---- evalWcagAA: WCAG AA threshold (4.5:1) ----

equal(evalWcagAA(4.5),  true,  'evalWcagAA(4.5) === true  (exact boundary — PASS)');
equal(evalWcagAA(4.49), false, 'evalWcagAA(4.49) === false (just below boundary — FAIL)');
equal(evalWcagAA(21),   true,  'evalWcagAA(21) === true   (black on white)');
equal(evalWcagAA(1),    false, 'evalWcagAA(1) === false   (EC-04: same color, ratio 1:1)');
equal(evalWcagAA(7),    true,  'evalWcagAA(7) === true    (WCAG AAA range also passes AA)');

// ---- getContrastRatio: contrast calculation ----

ok(
  getContrastRatio('#000000', '#FFFFFF') >= 21,
  'contrast black/white >= 21 (maximum contrast)'
);

ok(
  getContrastRatio('#FFFFFF', '#FFFFFF') < 2,
  'contrast same color < 2 (EC-04: 1:1 ratio)'
);

// Crimson on white — verify evalWcagAA correctly reports pass/fail
// Crimson (#DC143C) on white is known to produce ~5.1:1, passing WCAG AA.
// Assert a meaningful range to detect calculation regressions (R-06).
const crimsonOnWhite = getContrastRatio('#DC143C', '#FFFFFF');
ok(
  crimsonOnWhite >= 4.5 && crimsonOnWhite <= 7,
  `getContrastRatio('#DC143C', '#FFFFFF') is in range [4.5, 7]: got ${crimsonOnWhite}`
);

// Black on white always passes WCAG AA
equal(
  evalWcagAA(getContrastRatio('#000000', '#FFFFFF')),
  true,
  'black on white passes WCAG AA'
);

// Same foreground and background always fails WCAG AA (EC-04)
equal(
  evalWcagAA(getContrastRatio('#FFFFFF', '#FFFFFF')),
  false,
  'same color fg/bg fails WCAG AA (EC-04)'
);

// Royal Blue (#4169E1) on white — test a known color from dataset
const royalBlueRatio = getContrastRatio('#4169E1', '#FFFFFF');
ok(royalBlueRatio > 0, `Royal Blue on white contrast ratio is positive: ${royalBlueRatio}`);

// ---- debounce: trailing-edge delay ----

await new Promise((resolve, reject) => {
  let callCount = 0;
  const fn = debounce(() => { callCount++; }, 50);

  // Fire three times in rapid succession
  fn(); fn(); fn();

  // After delay, callback should have fired exactly once
  setTimeout(() => {
    try {
      assert.equal(callCount, 1, 'debounce: rapid calls collapse to one invocation');
      resolve();
    } catch (err) {
      reject(err);
    }
  }, 100);
});

console.log('playground: all assertions passed');
