const { test } = require('node:test');
const assert = require('node:assert');
const { normalizeBasename } = require('../scripts/migrate/match-assets');

test('strips extension, lowercases, collapses whitespace', () => {
  assert.equal(normalizeBasename('25 Two Way Angle Valve ALIVA.jpg'), '25 two way angle valve aliva');
});
test('handles a bare source name (no extension)', () => {
  assert.equal(normalizeBasename('  Sink Cock CUBE PRIMA '), 'sink cock cube prima');
});
test('handles .png', () => {
  assert.equal(normalizeBasename('TWO WAY ANGLE VALVE ROSE GOLD.png'), 'two way angle valve rose gold');
});
