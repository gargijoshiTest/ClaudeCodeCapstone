import { filterColors } from './lib/filter.js';
import { hexToRgb, rgbToHsl, getContrastRatio, getSwatchTextColor } from './lib/colorUtils.js';

const CHUNK_SIZE = 50;
const DEBOUNCE_MS = 150;

const FALLBACK_COLORS = [
  { name: 'Crimson',      hex: '#DC143C', family: 'Red'     },
  { name: 'Royal Blue',   hex: '#4169E1', family: 'Blue'    },
  { name: 'Forest Green', hex: '#228B22', family: 'Green'   },
  { name: 'Gold',         hex: '#FFD700', family: 'Yellow'  },
  { name: 'Indigo',       hex: '#4B0082', family: 'Purple'  },
  { name: 'Silver',       hex: '#C0C0C0', family: 'Neutral' },
];

let allColors = [];
let currentGeneration = 0;
let triggerElement = null;

// --- Utilities ---

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function normalise(raw) {
  return raw.filter(c => {
    const ok = c && typeof c.name === 'string' && typeof c.hex === 'string' && typeof c.family === 'string';
    if (!ok) console.warn('Dropping malformed color entry:', c);
    return ok;
  });
}

// --- State machine (DD-04) ---

export function setAppState(state) {
  const loading = document.getElementById('loading-state');
  const search  = document.getElementById('search');
  const family  = document.getElementById('family-filter');

  if (state === 'loading') {
    loading.hidden = false;
    search.disabled = true;
    family.disabled = true;
  } else {
    loading.hidden = true;
    search.disabled = false;
    family.disabled = false;
  }
}

// --- Family dropdown ---

function populateFamilies(colors) {
  const select = document.getElementById('family-filter');
  const families = [...new Set(colors.map(c => c.family))].sort();
  families.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    select.appendChild(opt);
  });
}

// --- Chunked render (DD-03: generation ID) ---

export function renderChunk(filtered, generation, offset) {
  if (generation !== currentGeneration) return;

  const list = document.getElementById('swatch-list');
  if (offset === 0) list.innerHTML = '';

  const chunk = filtered.slice(offset, offset + CHUNK_SIZE);
  chunk.forEach((color, i) => {
    const btn = document.createElement('button');
    btn.className = 'swatch';
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', 'false');
    btn.style.backgroundColor = color.hex;
    btn.style.color = getSwatchTextColor(color.hex);
    btn.tabIndex = (offset === 0 && i === 0) ? 0 : -1;

    const nameEl = document.createElement('span');
    nameEl.className = 'swatch-name';
    nameEl.textContent = color.name;

    const hexEl = document.createElement('span');
    hexEl.className = 'swatch-hex';
    hexEl.textContent = color.hex;

    btn.appendChild(nameEl);
    btn.appendChild(hexEl);

    btn.addEventListener('click', () => openModal(color, btn));
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter') openModal(color, btn);
    });

    list.appendChild(btn);
  });

  if (offset + CHUNK_SIZE < filtered.length) {
    requestAnimationFrame(() => renderChunk(filtered, generation, offset + CHUNK_SIZE));
  }
}

// --- Filter ---

export function applyFilter() {
  const query  = document.getElementById('search').value;
  const family = document.getElementById('family-filter').value;
  const filtered = filterColors(allColors, query, family);

  currentGeneration++;
  const gen = currentGeneration;

  const emptyState = document.getElementById('empty-state');
  if (filtered.length === 0) {
    document.getElementById('swatch-list').innerHTML = '';
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
    requestAnimationFrame(() => renderChunk(filtered, gen, 0));
  }

  updateAriaLive(filtered.length, allColors.length);
}

function updateAriaLive(n, total) {
  const el = document.getElementById('aria-announcer');
  el.textContent = `Showing ${n} of ${total} colors`;
}

// --- Modal (DD-01: focus trap, Escape, return focus) ---

export function openModal(color, trigger) {
  triggerElement = trigger;
  const modal = document.getElementById('color-modal');

  document.getElementById('modal-preview').style.backgroundColor = color.hex;
  document.getElementById('modal-title').textContent = color.name;
  document.getElementById('modal-hex').textContent = color.hex;

  const { r, g, b } = hexToRgb(color.hex);
  document.getElementById('modal-rgb').textContent = `rgb(${r}, ${g}, ${b})`;

  const { h, s, l } = rgbToHsl(r, g, b);
  document.getElementById('modal-hsl').textContent = `hsl(${h}, ${s}%, ${l}%)`;

  document.getElementById('modal-contrast-white').textContent =
    getContrastRatio(color.hex, '#FFFFFF').toFixed(2) + ':1';
  document.getElementById('modal-contrast-black').textContent =
    getContrastRatio(color.hex, '#000000').toFixed(2) + ':1';

  document.getElementById('btn-copy').onclick = () => copyHex(color.hex);
  modal.showModal();
  document.getElementById('btn-close-modal').focus();
}

export function closeModal() {
  const modal = document.getElementById('color-modal');
  modal.close();
  if (triggerElement) {
    triggerElement.focus();
    triggerElement = null;
  }
}

function copyHex(hex) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(hex).catch(() => {});
  }
}

// --- Keyboard navigation (DD-01: roving tabindex) ---

function handleSwatchKeydown(e) {
  const list = document.getElementById('swatch-list');
  const swatches = [...list.querySelectorAll('.swatch')];
  const idx = swatches.indexOf(document.activeElement);
  if (idx === -1) return;

  let next = -1;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(idx + 1, swatches.length - 1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   next = Math.max(idx - 1, 0);

  if (next !== -1) {
    e.preventDefault();
    swatches[idx].tabIndex = -1;
    swatches[next].tabIndex = 0;
    swatches[next].focus();
  }
}

// --- Init (DD-04: state machine) ---

export async function initApp() {
  setAppState('loading');

  let raw;
  try {
    const res = await fetch('colors.v1.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } catch {
    raw = FALLBACK_COLORS;
    document.getElementById('offline-banner').hidden = false;
  }

  allColors = normalise(raw);
  populateFamilies(allColors);
  setAppState('ready');

  currentGeneration++;
  renderChunk(allColors, currentGeneration, 0);
  updateAriaLive(allColors.length, allColors.length);

  const debouncedFilter = debounce(applyFilter, DEBOUNCE_MS);
  document.getElementById('search').addEventListener('input', debouncedFilter);
  document.getElementById('family-filter').addEventListener('change', applyFilter);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('swatch-list').addEventListener('keydown', handleSwatchKeydown);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('color-modal').open) closeModal();
  });
}

document.addEventListener('DOMContentLoaded', initApp);
