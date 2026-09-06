import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { subscriptionStatusAllowsAccess } from '../src/lib/saas-policy';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('membresía vence por fecha para sesiones nuevas y existentes', () => {
  const now = new Date('2026-09-06T12:00:00-03:00');
  assert.equal(subscriptionStatusAllowsAccess('ACTIVE', null, '2026-09-07T12:00:00-03:00', now), true);
  assert.equal(subscriptionStatusAllowsAccess('ACTIVE', null, '2026-09-05T12:00:00-03:00', now), false);
  assert.equal(subscriptionStatusAllowsAccess('PAST_DUE', null, '2026-09-05T12:00:00-03:00', now), false);
  assert.equal(subscriptionStatusAllowsAccess('TRIAL', '2026-09-07T12:00:00-03:00', '2026-09-30T12:00:00-03:00', now), true);
  assert.equal(subscriptionStatusAllowsAccess('TRIAL', '2026-09-05T12:00:00-03:00', '2026-09-30T12:00:00-03:00', now), false);
  assert.equal(subscriptionStatusAllowsAccess('SUSPENDED', null, '2026-09-30T12:00:00-03:00', now), false);
  assert.equal(subscriptionStatusAllowsAccess('CANCELED', null, '2026-09-30T12:00:00-03:00', now), false);
});

test('Prisma modela capacidades por plan sin drift intencional', () => {
  const config = read('prisma.config.ts');
  const model = read('prisma/platform-saas.prisma');
  const migration = read('prisma/migrations/20260906170000_onlyerp_superadmin_standard/migration.sql');
  assert.ok(config.includes("schema: path.resolve(__dirname, 'prisma')"));
  assert.ok(model.includes('model PlanFeature'));
  assert.ok(model.includes('@@unique([planId, featureKey])'));
  assert.ok(migration.includes('CREATE TABLE `PlanFeature`'));
  for (const key of ['analytics','integrations','owner_portal','renter_portal','automation']) assert.ok(migration.includes(`'${key}'`));
});

test('SuperAdmin adopta arquitectura de rutas equivalente a OnlyERP', () => {
  for (const path of [
    'src/app/(platform)/superadmin/layout.tsx',
    'src/app/(platform)/superadmin/page.tsx',
    'src/app/(platform)/superadmin/tenants/page.tsx',
    'src/app/(platform)/superadmin/tenants/tenants-client.tsx',
    'src/app/(platform)/superadmin/tenants/[id]/page.tsx',
    'src/app/(platform)/superadmin/tenants/[id]/tenant-detail-client.tsx',
    'src/app/(platform)/superadmin/planes/page.tsx',
    'src/app/(platform)/superadmin/planes/plans-client.tsx',
    'src/app/suspendido/page.tsx',
  ]) assert.ok(read(path).length > 40, `Falta superficie SaaS: ${path}`);

  const layout = read('src/app/(platform)/superadmin/layout.tsx');
  assert.ok(layout.includes("href: '/superadmin/tenants'"));
  assert.ok(layout.includes("href: '/superadmin/planes'"));
  assert.ok(layout.includes('h-screen w-64'));
});

test('planes heredan módulos y tenant admite override tri-state', () => {
  const saas = read('src/lib/saas.ts');
  const actions = read('src/actions/saas-admin.ts');
  const plans = read('src/app/(platform)/superadmin/planes/plans-client.tsx');
  const detail = read('src/app/(platform)/superadmin/tenants/[id]/tenant-detail-client.tsx');
  assert.ok(saas.includes('platformPrisma.planFeature'));
  assert.ok(saas.includes('overrideMap.get(key) ?? planDefaults.get(key) ?? true'));
  assert.ok(actions.includes("state: TenantFeatureState"));
  assert.ok(actions.includes("state === 'INHERIT'"));
  assert.ok(plans.includes('Módulos incluidos'));
  assert.ok(detail.includes('Heredar del plan'));
  assert.ok(detail.includes('Forzar ON'));
  assert.ok(detail.includes('Forzar OFF'));
});

test('vencimiento se reconcilia por request y por cron de plataforma', () => {
  const membership = read('src/lib/membership.ts');
  const tenantContext = read('src/lib/tenant-context.ts');
  const automation = read('src/app/api/internal/automation/run/route.ts');
  const publicLayout = read('src/app/(public)/layout.tsx');
  const adminLayout = read('src/app/(tenant)/(admin)/layout.tsx');
  assert.ok(membership.includes('MEMBERSHIP_AUTO_SUSPENDED'));
  assert.ok(tenantContext.includes("TenantResolutionError('TENANT_SUSPENDED')"));
  assert.ok(automation.includes('reconcileExpiredMemberships'));
  assert.ok(publicLayout.includes("redirect('/suspendido')"));
  assert.ok(adminLayout.includes("redirect('/suspendido')"));
});

test('cobro SaaS reactiva y extiende la membresía', () => {
  const actions = read('src/actions/saas-admin.ts');
  assert.ok(actions.includes('recordSaasPaymentAction'));
  assert.ok(actions.includes("status: 'PAID'"));
  assert.ok(actions.includes("status: 'ACTIVE', currentPeriodEnd: newEnd"));
  assert.ok(actions.includes("data: { status: 'ACTIVE', archivedAt: null }"));
});

test('UI de plataforma muestra sólo dominio canónico nanoapps y no precarga credenciales', () => {
  const actions = read('src/actions/saas-admin.ts');
  const superLogin = read('src/app/(platform)/superadmin/login/page.tsx');
  const adminLogin = read('src/app/login/page.tsx');
  assert.ok(actions.includes("const baseDomain = process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar'"));
  assert.ok(!superLogin.includes('SuperAdmin2026!'));
  assert.ok(!adminLogin.includes('admin123'));
});
