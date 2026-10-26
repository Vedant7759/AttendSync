import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from './app.js';

test('health endpoint reports when MongoDB is unavailable', async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'database-unavailable', database: 'disconnected' });
});

test('unknown API route returns a safe not-found response', async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const response = await fetch(`http://127.0.0.1:${address.port}/api/not-a-route`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'API route not found.' });
});

test('attendance filters reject malformed identifiers and impossible dates', async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  const badId = await fetch(`http://127.0.0.1:${address.port}/api/attendance?studentId=not-an-id`);
  assert.equal(badId.status, 400);
  assert.deepEqual(await badId.json(), { error: 'studentId must be a valid identifier.' });

  const badDate = await fetch(`http://127.0.0.1:${address.port}/api/attendance?date=2026-02-30`);
  assert.equal(badDate.status, 400);
  assert.deepEqual(await badDate.json(), { error: 'date is not a valid calendar date.' });
});

test('bulk attendance rejects unsupported statuses before database access', async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const response = await fetch(`http://127.0.0.1:${address.port}/api/attendance/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjectId: '507f1f77bcf86cd799439011',
      date: '2026-10-26',
      records: [{ studentId: '507f1f77bcf86cd799439012', status: 'excused' }]
    })
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Status must be present, absent, or late.' });
});
