import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, parseStatus, requireObjectId } from './validation.js';

test('parseDate accepts a real ISO calendar date', () => {
  assert.equal(parseDate('2026-10-26').toISOString(), '2026-10-26T00:00:00.000Z');
});

test('parseDate rejects malformed and impossible dates', () => {
  assert.throws(() => parseDate('26-10-2026'), /YYYY-MM-DD/);
  assert.throws(() => parseDate('2026-02-30'), /valid calendar date/);
});

test('parseStatus only accepts supported attendance states', () => {
  for (const status of ['present', 'absent', 'late']) assert.equal(parseStatus(status), status);
  assert.throws(() => parseStatus('excused'), /present, absent, or late/);
});

test('requireObjectId rejects malformed Mongo identifiers', () => {
  assert.equal(requireObjectId('507f1f77bcf86cd799439011'), '507f1f77bcf86cd799439011');
  assert.throws(() => requireObjectId('not-an-id', 'studentId'), /studentId/);
});

