import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('Prisma schema declares every production platform surface', () => {
  const schema = read('prisma/schema.prisma');
  for (const marker of [
    'maxPublications Int',
    'model NotificationLog',
    'model DocumentTemplate',
    'model ApiCredential',
    'model WebhookEndpoint',
    'model WebhookDelivery',
    'model SubscriptionEvent',
    'model ImpersonationGrant',
    'model ActivityEvent',
    'model CommunicationThread',
    'model CommunicationMessage',
    'model FinancialAccount',
    'model FinancialMovement',
    'workflowStatus',
    'nextAttemptAt',
  ]) {
    assert.ok(schema.includes(marker), `Falta en schema.prisma: ${marker}`);
  }
});

test('tenant admin guard is fail-closed and permissions use tenant user context', () => {
  const guard = read('src/lib/tenant-guard.ts');
  const permissions = read('src/lib/permissions.ts');
  assert.ok(guard.includes("context.session.role !== 'ADMIN'"), 'requireTenantAdmin debe rechazar STAFF');
  assert.ok(permissions.includes("requireTenantUser()"), 'requirePermission debe partir de una sesión tenant válida');
  assert.ok(permissions.includes("permission.action === action || permission.action === 'manage'"), 'RBAC debe exigir acción o manage');
});

test('legacy tenant actions cannot silently bypass RBAC', () => {
  const actionDir = join(root, 'src/actions');
  const allowedAdminOnly = new Set(['owner-portal.ts']);
  const offenders = readdirSync(actionDir)
    .filter((name) => name.endsWith('.ts'))
    .filter((name) => readFileSync(join(actionDir, name), 'utf8').includes('requireTenantAdmin'))
    .filter((name) => !allowedAdminOnly.has(name));
  assert.deepEqual(offenders, [], `Actions legacy con requireTenantAdmin fuera de allowlist: ${offenders.join(', ')}`);
});

test('portal sessions and automation obey SaaS feature flags', () => {
  const auth = read('src/lib/auth.ts');
  const renterAuth = read('src/actions/auth-actions.ts');
  const ownerAuth = read('src/actions/owner-portal.ts');
  const automation = read('src/lib/automation-runner.ts');

  assert.ok(auth.includes("isTenantFeatureEnabled(tenantId, 'renter_portal')"));
  assert.ok(auth.includes("isTenantFeatureEnabled(tenantId, 'owner_portal')"));
  assert.ok(renterAuth.includes("isTenantFeatureEnabled(tenant.id, 'renter_portal')"));
  assert.ok(ownerAuth.includes("isTenantFeatureEnabled(tenant.id, 'owner_portal')"));
  assert.ok(automation.includes("isTenantFeatureEnabled(tenant.id, 'automation')"));
});

test('SaaS plan limits cover all sellable capacity resources', () => {
  const saas = read('src/lib/saas.ts');
  const prisma = read('src/lib/prisma.ts');
  const garages = read('src/actions/garages.ts');
  const operations = read('src/actions/operations.ts');

  for (const resource of ['properties', 'garages', 'users', 'publications']) {
    assert.ok(saas.includes(`'${resource}'`), `Falta recurso de plan: ${resource}`);
  }
  assert.ok(saas.includes('maxGarages'));
  assert.ok(saas.includes('maxPublications'));
  assert.ok(prisma.includes("garage: { $allOperations: tenantOperation(tenant.id, 'garages') }"));
  assert.ok(garages.includes("assertTenantPlanLimit(tenant.id, 'garages')"));
  assert.ok(operations.includes("assertTenantPlanLimit(tenant.id,'publications')"));
});

test('bulk rent increases never touch ICL contracts', () => {
  const leases = read('src/actions/leases.ts');
  assert.ok(leases.includes("const MANUAL_BULK_METHODS: AdjustmentMethod[] = ['MANUAL', 'FIXED_PERCENT']"));
  assert.ok(leases.includes('adjustmentMethod: { in: MANUAL_BULK_METHODS }'));
  assert.ok(leases.includes('adjustmentMethod,'), 'El alta de contrato debe persistir modalidad de ajuste');
  assert.ok(leases.includes('nextAdjustmentDate,'), 'El alta de contrato debe persistir próximo ajuste');
});

test('webhook semantics distinguish won deals and settlement readiness', () => {
  const domainEvents = read('src/lib/domain-events.ts');
  const integrations = read('src/lib/integrations.ts');

  assert.ok(domainEvents.includes("input.action === 'DEAL_STATUS_CHANGED'"));
  assert.ok(domainEvents.includes("input.metadata?.status === 'WON'"));
  assert.ok(domainEvents.includes("eventKey: 'deal.won'"));
  assert.ok(domainEvents.includes("eventKey: 'deal.updated'"));
  assert.ok(domainEvents.includes("OWNER_SETTLEMENT_CREATED: { eventKey: 'settlement.ready'"));
  assert.ok(domainEvents.includes("eventKey: 'settlement.updated'"));
  assert.ok(domainEvents.includes("LEAD_INTERACTION_CREATED: { eventKey: 'lead.updated'"));
  assert.ok(domainEvents.includes("DOCUMENT_REGISTERED: { eventKey: 'document.created'"));

  for (const event of ['deal.updated', 'deal.won', 'settlement.ready', 'settlement.updated']) {
    assert.ok(integrations.includes(`'${event}'`), `Evento no expuesto en WEBHOOK_EVENTS: ${event}`);
  }
});
