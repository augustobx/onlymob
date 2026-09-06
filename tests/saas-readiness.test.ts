import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { featureEnabledFromMap, SAAS_FEATURE_KEYS } from '../src/lib/feature-catalog';
import { subscriptionStatusAllowsAccess } from '../src/lib/saas-policy';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('subscription access policy is fail-closed for suspended and canceled tenants', () => {
  const now = new Date('2026-09-06T12:00:00-03:00');
  assert.equal(subscriptionStatusAllowsAccess('ACTIVE', null, now), true);
  assert.equal(subscriptionStatusAllowsAccess('PAST_DUE', null, now), true, 'PAST_DUE conserva acceso como período de gracia');
  assert.equal(subscriptionStatusAllowsAccess('SUSPENDED', null, now), false);
  assert.equal(subscriptionStatusAllowsAccess('CANCELED', null, now), false);
  assert.equal(subscriptionStatusAllowsAccess('TRIAL', '2026-09-07T12:00:00-03:00', now), true);
  assert.equal(subscriptionStatusAllowsAccess('TRIAL', '2026-09-05T12:00:00-03:00', now), false);
});

test('OnlyMob SaaS feature catalog is explicit and tenant overrides work both ways', () => {
  assert.deepEqual([...SAAS_FEATURE_KEYS].sort(), ['analytics', 'automation', 'integrations', 'owner_portal', 'renter_portal'].sort());
  assert.equal(new Set(SAAS_FEATURE_KEYS).size, SAAS_FEATURE_KEYS.length, 'No debe haber feature keys duplicadas');
  assert.equal(featureEnabledFromMap({ analytics: false }, 'analytics'), false);
  assert.equal(featureEnabledFromMap({ analytics: true }, 'analytics'), true);
  assert.equal(featureEnabledFromMap({}, 'analytics'), true, 'Sin override la compatibilidad actual permanece habilitada');
});

test('SuperAdmin invalidates tenant resolution cache after access-changing mutations', () => {
  const superadmin = read('src/actions/superadmin.ts');
  const saasAdmin = read('src/actions/saas-admin.ts');
  assert.ok(superadmin.includes('clearTenantResolutionCache()'), 'Suspender/reactivar tenant debe invalidar cache');
  assert.ok(saasAdmin.includes('clearTenantResolutionCache()'), 'Cambiar suscripción debe invalidar cache');
  assert.ok(saasAdmin.includes('isSaasFeatureKey(featureKey)'), 'Los overrides deben limitarse al catálogo SaaS');
});

test('disabled admin modules disappear from navigation while page guards remain in place', () => {
  const layout = read('src/app/(tenant)/(admin)/layout.tsx');
  const sidebar = read('src/components/layout/collapsible-sidebar.tsx');
  const mobile = read('src/components/layout/mobile-nav.tsx');
  const analytics = read('src/app/(tenant)/(admin)/analytics/page.tsx');
  const integrations = read('src/app/(tenant)/(admin)/integraciones/page.tsx');

  assert.ok(layout.includes('getTenantFeatureFlags(tenant.id)'));
  assert.ok(sidebar.includes("feature:'analytics'"));
  assert.ok(sidebar.includes("feature:'integrations'"));
  assert.ok(mobile.includes("feature:'analytics'"));
  assert.ok(analytics.includes("isTenantFeatureEnabled(tenant.id, 'analytics'"));
  assert.ok(integrations.includes("isTenantFeatureEnabled(tenant.id, 'integrations'"));
});

test('portal and automation feature switches are enforced beyond the SuperAdmin UI', () => {
  const auth = read('src/lib/auth.ts');
  const renterPortal = read('src/actions/renter-portal.ts');
  const ownerPortal = read('src/actions/owner-portal.ts');
  const automation = read('src/lib/automation-runner.ts');

  assert.ok(auth.includes("isTenantFeatureEnabled(tenantId, 'renter_portal')"));
  assert.ok(auth.includes("isTenantFeatureEnabled(tenantId, 'owner_portal')"));
  assert.ok(renterPortal.includes("isTenantFeatureEnabled(session.tenantId, 'renter_portal')"));
  assert.ok(ownerPortal.includes("isTenantFeatureEnabled(session.tenantId, 'owner_portal')"));
  assert.ok(automation.includes("isTenantFeatureEnabled(tenant.id, 'automation')"));
});

test('quick rental cards expose Property 360 for property leases', () => {
  const action = read('src/actions/quick-rentals.ts');
  const client = read('src/app/(tenant)/(admin)/rapidos/alquileres/rentals-cards-client.tsx');
  assert.ok(action.includes('propertyHref: `/propiedades/${lease.property.id}`'));
  assert.ok(action.includes('propertyHref: null'));
  assert.ok(client.includes('Propiedad 360'));
  assert.ok(client.includes('item.propertyHref'));
});

test('SaaS panel manages all current plan capacity limits', () => {
  const panel = read('src/app/(platform)/superadmin/saas-panel.tsx');
  const actions = read('src/actions/saas-admin.ts');
  for (const field of ['maxProperties', 'maxGarages', 'maxUsers', 'maxPublications']) {
    assert.ok(panel.includes(field), `El panel debe exponer ${field}`);
    assert.ok(actions.includes(field), `Las actions deben persistir ${field}`);
  }
  assert.ok(actions.includes('!plan.isActive'), 'No debe poder asignarse un plan inactivo a un tenant nuevo');
});
