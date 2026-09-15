import assert from 'node:assert/strict';
import { filterColors } from '../lib/filter.js';

const colors = [
  { name: 'Crimson Red',  hex: '#DC143C', family: 'Red'   },
  { name: 'Sky Blue',     hex: '#87CEEB', family: 'Blue'  },
  { name: 'Forest Green', hex: '#228B22', family: 'Green' },
  { name: 'Rose Red',     hex: '#FF007F', family: 'Red'   },
];

assert.equal(filterColors(colors, '',    'All').length, 4);
assert.equal(filterColors(colors, 'red', 'All').length, 2);
assert.equal(filterColors(colors, 'xyz', 'All').length, 0);
assert.equal(filterColors(colors, '',    'Red').length, 2);
assert.equal(filterColors(colors, 'sky', 'Blue').length, 1);
assert.equal(filterColors(colors, 'sky', 'Red').length, 0);
assert.equal(filterColors(colors, 'RED', 'All').length, 2, 'case-insensitive');

console.log('filter: all assertions passed');
