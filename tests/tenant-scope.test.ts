import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTenantScope } from '../src/lib/tenant-scope';

test('read always forces current tenant', () => {
  const result = applyTenantScope('tenant-a', 'findMany', { where: { tenantId: 'tenant-b', status: 'ACTIVE' } });
  assert.equal(result.where.tenantId, 'tenant-a'); assert.equal(result.where.status, 'ACTIVE');
});

test('create cannot inject another tenant', () => {
  const result = applyTenantScope('tenant-a', 'create', { data: { tenantId: 'tenant-b', name: 'X' } });
  assert.equal(result.data.tenantId, 'tenant-a'); assert.equal(result.data.name, 'X');
});

test('createMany scopes every row', () => {
  const result = applyTenantScope('tenant-a', 'createMany', { data: [{ tenantId:'x',name:'1' },{ tenantId:'y',name:'2' }] });
  assert.deepEqual(result.data.map((x:any)=>x.tenantId), ['tenant-a','tenant-a']);
});

test('upsert scopes where and create', () => {
  const result = applyTenantScope('tenant-a', 'upsert', { where:{ tenantId:'x', id:'1' }, create:{ tenantId:'y', id:'1' }, update:{ name:'Z' } });
  assert.equal(result.where.tenantId,'tenant-a'); assert.equal(result.create.tenantId,'tenant-a');
});
