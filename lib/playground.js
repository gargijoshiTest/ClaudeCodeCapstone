/**
 * lib/playground.js — TES-3 Text Color Playground orchestrator
 *
 * DD-08: Module-level state: allColors[], selectedColor, currentBgHex
 * DD-09: 150ms trailing-edge debounce; listbox capped at MAX_OPTIONS (50)
 * DD-10: Zero document.* / window.* calls at module top level —
 *        all DOM access is deferred to function bodies so Node.js CI
 *        can import this module without a DOM environment.
 */

import { filterColors } from './filter.js';
import { hexToRgb, rgbToHsl, getContrastRatio } from './colorUtils.js';

// ---- Constants ----

const MAX_OPTIONS = 50;
const DEBOUNCE_MS = 150;
/** Milliseconds the "Copied!" label persists before reverting to "Copy HEX" */
const COPY_FEEDBACK_MS = 1500;
/** Milliseconds to delay listbox close on blur so mousedown on an option can fire first */
const BLUR_CLOSE_DELAY_MS = 150;

// ---- Embedded fallback dataset (EC-01) ----

const FALLBACK_COLORS = [
  { name: 'Crimson',      hex: '#DC143C', family: 'Red'     },
  { name: 'Royal Blue',   hex: '#4169E1', family: 'Blue'    },
  { name: 'Forest Green', hex: '#228B22', family: 'Green'   },
  { name: 'Gold',         hex: '#FFD700', family: 'Yellow'  },
  { name: 'Indigo',       hex: '#4B0082', family: 'Purple'  },
  { name: 'Silver',       hex: '#C0C0C0', family: 'Neutral' },
];

// ---- Module-level state (DD-08) ----

let allColors = [];
let selectedColor = null;
let currentBgHex = '#FFFFFF';

// ---- Pure utility functions (exported for CI smoke tests) ----

/**
 * Returns an rgb() string for a given HEX value.
 * Pure function — no DOM dependency.
 */
export function buildRgbString(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Returns an hsl() string for a given HEX value.
 * Pure function — no DOM dependency.
 */
export function buildHslString(hex) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Returns true if the contrast ratio meets WCAG AA normal-text threshold (>= 4.5:1).
 * Pure function — no DOM dependency.
 * @param {number} ratio
 * @returns {boolean}
 */
export function evalWcagAA(ratio) {
  return ratio >= 4.5;
}

// ---- Internal utility: trailing-edge debounce ----

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ---- Internal: normalise raw JSON ----

function normalise(raw) {
  if (!Array.isArray(raw)) {
    console.warn('Color data is not an array; using fallback.');
    return [];
  }
  return raw.filter(c => {
    const ok = c && typeof c.name === 'string' && typeof c.hex === 'string' && typeof c.family === 'string';
    if (!ok) console.warn('Dropping malformed color entry:', c);
    return ok;
  });
}

// ---- ARIA live announcer ----

function announce(msg) {
  const el = document.getElementById('pg-aria-live');
  if (el) el.textContent = msg;
}

// ---- Listbox open / close helpers ----

function openListbox() {
  const input   = document.getElementById('pg-combobox-input');
  const listbox = document.getElementById('pg-listbox');
  if (!input || !listbox) return;
  listbox.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}

function closeListbox() {
  const input   = document.getElementById('pg-combobox-input');
  const listbox = document.getElementById('pg-listbox');
  if (!input || !listbox) return;
  listbox.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
}

// ---- Combobox population (DD-09: capped at MAX_OPTIONS) ----

export function populateCombobox(colors, query) {
  const listbox = document.getElementById('pg-listbox');
  if (!listbox) return;
  const filtered = filterColors(colors, query || '', 'All').slice(0, MAX_OPTIONS);
  listbox.replaceChildren();         // safe DOM API — replaces innerHTML = '' (R-01)
  if (filtered.length === 0) {       // empty-state for no search results (R-03)
    const li = document.createElement('li');
    li.className = 'combobox-option';
    li.setAttribute('aria-disabled', 'true');
    li.style.color = 'var(--text-muted)';
    li.style.fontStyle = 'italic';
    li.textContent = 'No results found';
    listbox.appendChild(li);
    return;
  }
  filtered.forEach((color, idx) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.setAttribute('id', `pg-option-${idx}`);
    li.className = 'combobox-option';
    li.dataset.hex    = color.hex;
    li.dataset.name   = color.name;
    li.dataset.family = color.family;
    li.textContent = color.name;          // NFR-03: textContent, never innerHTML
    li.addEventListener('mousedown', e => {
      e.preventDefault(); // Prevent blur firing before selection
      selectColor({ name: color.name, hex: color.hex, family: color.family });
      closeListbox();
    });
    listbox.appendChild(li);
  });
}

// ---- Set keyboard-active option in listbox ----

function setActiveOption(options, idx, input) {
  options.forEach(o => {
    o.dataset.active = 'false';
    o.setAttribute('aria-selected', 'false');
  });
  if (idx < 0 || idx >= options.length) return;
  const opt = options[idx];
  opt.dataset.active = 'true';
  opt.setAttribute('aria-selected', 'true');
  input.setAttribute('aria-activedescendant', opt.id);
  opt.scrollIntoView({ block: 'nearest' });
}

// ---- Keyboard navigation (NFR-01: ArrowUp/Down, Enter, Escape) ----

function handleComboboxKeydown(e) {
  const input   = document.getElementById('pg-combobox-input');
  const listbox = document.getElementById('pg-listbox');
  if (!input || !listbox) return;

  const options  = [...listbox.querySelectorAll('.combobox-option')];
  const activeId = input.getAttribute('aria-activedescendant');
  const activeIdx = activeId ? options.findIndex(o => o.id === activeId) : -1;

  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      closeListbox();
      break;
    case 'ArrowDown':
      e.preventDefault();
      if (listbox.hidden) {
        openListbox();
        populateCombobox(allColors, input.value);
        return;
      }
      setActiveOption(options, Math.min(activeIdx + 1, options.length - 1), input);
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (activeIdx > 0) setActiveOption(options, activeIdx - 1, input);
      break;
    case 'Enter':
      e.preventDefault();
      if (!listbox.hidden && activeIdx !== -1) {
        const opt = options[activeIdx];
        selectColor({ name: opt.dataset.name, hex: opt.dataset.hex, family: opt.dataset.family });
        closeListbox();
      }
      break;
    default:
      break;
  }
}

// ---- DRY helper: set a single DOM element's textContent by id (R-01) ----

function setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ---- Info panel update (NFR-03 / RISK-02: all values via textContent) ----

export function updateInfoPanel(color) {
  // Guard: require both name and hex to be strings (R-05: asymmetric guard fix)
  if (!color || typeof color.hex !== 'string' || typeof color.name !== 'string') return;
  setField('pg-info-name', color.name);
  setField('pg-info-hex',  color.hex);
  setField('pg-info-rgb',  buildRgbString(color.hex));
  setField('pg-info-hsl',  buildHslString(color.hex));
}

// ---- Contrast update ----
//
// R-02: calledFromBg flag selects announcement phrasing:
//   - color selection:  "Selected Crimson #DC143C. Contrast 4.56:1 — WCAG AA Pass"
//   - background change:"Background changed. Contrast 2.10:1 — WCAG AA Fail"

export function updateContrast(bgHex, calledFromBg = false) {
  currentBgHex = bgHex;

  // Update preview background
  const previewArea = document.getElementById('pg-preview-area');
  if (previewArea) previewArea.style.backgroundColor = bgHex;

  if (!selectedColor) return;

  const ratio = getContrastRatio(selectedColor.hex, bgHex);
  const pass  = evalWcagAA(ratio);

  const ratioEl  = document.getElementById('pg-contrast-ratio');
  const badge    = document.getElementById('pg-contrast-badge');
  const wcagEl   = document.getElementById('pg-wcag-result');

  if (ratioEl) ratioEl.textContent = ratio.toFixed(2) + ':1';
  if (badge) {
    badge.className = 'contrast-badge ' + (pass ? 'contrast-pass' : 'contrast-fail');
  }
  if (wcagEl) wcagEl.textContent = pass ? 'WCAG AA Pass' : 'WCAG AA Fail';

  const action = calledFromBg
    ? 'Background changed.'
    : `Selected ${selectedColor.name} ${selectedColor.hex}.`;
  announce(`${action} Contrast ${ratio.toFixed(2)}:1 — ${pass ? 'WCAG AA Pass' : 'WCAG AA Fail'}`);
}

// ---- Apply color to preview and panels ----

export function applyColor(color) {
  selectedColor = color;
  const previewText = document.getElementById('pg-preview-text');
  if (previewText) previewText.style.color = color.hex;   // CSS property assignment, not innerHTML
  updateInfoPanel(color);
  updateContrast(currentBgHex);
}

// ---- Internal: select color and update combobox input ----

function selectColor(color) {
  const input = document.getElementById('pg-combobox-input');
  if (input) input.value = color.name;                    // textContent equivalent for <input>
  applyColor(color);
}

// ---- Copy HEX (EC-02 / GAP-04: .catch(()=>{}) silences both absence and rejection) ----

export function copyHex() {
  if (!selectedColor) return;
  const hex = selectedColor.hex;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(hex).then(() => {
      announce(`HEX ${hex} copied to clipboard`);
      const btn = document.getElementById('pg-btn-copy');
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy HEX'; }, COPY_FEEDBACK_MS); // R-06
      }
    }).catch(() => {});
  }
}

// ---- initPlayground — all DOM access is inside this function body (DD-10) ----

export async function initPlayground() {
  const offlineBanner = document.getElementById('pg-offline-banner');
  let raw;

  // Fetch color data with response.ok guard (RISK-04)
  try {
    const res = await fetch('colors.v1.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } catch {
    raw = FALLBACK_COLORS;
    if (offlineBanner) offlineBanner.hidden = false;
  }

  allColors = normalise(raw);
  if (allColors.length === 0) {
    allColors = FALLBACK_COLORS;
    if (offlineBanner) offlineBanner.hidden = false;
  }

  // Populate combobox (initial full list, DD-09: capped at 50)
  populateCombobox(allColors, '');

  // Default selection: first color in normalised dataset (AD-02)
  selectColor(allColors[0]);
  closeListbox();

  // Wire combobox input events
  const comboInput = document.getElementById('pg-combobox-input');
  if (comboInput) {
    const debouncedSearch = debounce(e => {
      openListbox();
      populateCombobox(allColors, e.target.value);
    }, DEBOUNCE_MS);

    comboInput.addEventListener('input', debouncedSearch);
    comboInput.addEventListener('keydown', handleComboboxKeydown);
    comboInput.addEventListener('focus', () => {
      openListbox();
      populateCombobox(allColors, comboInput.value);
    });
    comboInput.addEventListener('blur', () => {
      // Delay allows mousedown on a listbox option to register before blur fires (R-07)
      setTimeout(closeListbox, BLUR_CLOSE_DELAY_MS);
    });
  }

  // Wire sample text textarea (FR-09 / AC-06 / AD-03)
  const textarea    = document.getElementById('pg-sample-text');
  const previewText = document.getElementById('pg-preview-text');
  if (textarea && previewText) {
    textarea.addEventListener('input', () => {
      previewText.textContent = textarea.value;  // NFR-03: textContent, never innerHTML
    });
  }

  // Wire background color picker (FR-10 / AC-07)
  const bgPicker = document.getElementById('pg-bg-color');
  if (bgPicker) {
    bgPicker.addEventListener('input', e => {
      updateContrast(e.target.value, true);   // R-02: calledFromBg=true for correct announcement
    });
  }

  // Wire Copy HEX button (FR-11 / AC-08)
  const btnCopy = document.getElementById('pg-btn-copy');
  if (btnCopy) {
    btnCopy.addEventListener('click', copyHex);
  }
}

// ---- Bootstrap: guard ensures Node.js CI import succeeds (DD-10 / RISK-03) ----
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initPlayground);
}
