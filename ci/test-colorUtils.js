import assert from 'node:assert/strict';
import { hexToRgb, rgbToHsl, getContrastRatio, getSwatchTextColor } from '../lib/colorUtils.js';

const { deepEqual, equal, ok } = assert;

deepEqual(hexToRgb('#FF0000'), { r: 255, g: 0, b: 0 });
deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
deepEqual(hexToRgb('#FFFFFF'), { r: 255, g: 255, b: 255 });

deepEqual(rgbToHsl(255, 0, 0), { h: 0, s: 100, l: 50 });
deepEqual(rgbToHsl(0, 0, 0),   { h: 0, s: 0,   l: 0  });

ok(getContrastRatio('#000000', '#FFFFFF') >= 21, 'black/white contrast >= 21');
ok(getContrastRatio('#FFFFFF', '#FFFFFF') < 2,   'same colour contrast < 2');

equal(getSwatchTextColor('#FFFFFF'), '#000000');         // white → black text (luminance 1.0 > 0.179)
equal(getSwatchTextColor('#000000'), '#ffffff');         // black → white text (luminance 0.0 ≤ 0.179)
equal(getSwatchTextColor('#FF0000'), '#000000');         // red → black text  (luminance 0.2126 > 0.179)

console.log('colorUtils: all assertions passed');
