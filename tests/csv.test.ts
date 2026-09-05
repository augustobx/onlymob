import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, toCsv } from '../src/lib/csv';

test('csv parser supports quotes commas and escaped quotes', () => {
  const rows = parseCsv('firstName,lastName,notes\r\nAna,Perez,"Hola, mundo"\r\nJuan,Gomez,"Dijo ""hola"""');
  assert.equal(rows[1][2], 'Hola, mundo');
  assert.equal(rows[2][2], 'Dijo "hola"');
});

test('csv exporter escapes fields safely', () => {
  const csv = toCsv(['a','b'], [['uno','dos, tres'], ['x','"hola"']]);
  assert.match(csv, /"dos, tres"/);
  assert.match(csv, /"""hola"""/);
});
