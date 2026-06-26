const { test } = require('node:test');
const assert = require('node:assert');
const { classifyRowColor, parseSheetColors } = require('../scripts/migrate/clean-master');

test('classifyRowColor: red xf wins', () => {
  assert.equal(classifyRowColor(new Set([0, 3])), 'red');
});
test('classifyRowColor: blue when no red', () => {
  assert.equal(classifyRowColor(new Set([0, 13])), 'blue');
});
test('classifyRowColor: plain when neither', () => {
  assert.equal(classifyRowColor(new Set([0, 1, 2])), 'plain');
});
test('parseSheetColors tallies the real file', () => {
  const { rows } = parseSheetColors('ITEM MASTER FOR WEBSITE.xlsx');
  const red = rows.filter(r => r.color === 'red').length;
  const blue = rows.filter(r => r.color === 'blue').length;
  assert.equal(rows.length, 1060);
  assert.equal(red, 238);
  assert.equal(blue, 48);
});
