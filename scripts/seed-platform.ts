import bcrypt from 'bcryptjs';
import { platformPrisma } from '../src/lib/prisma-core';

const SYSTEM_ROLES = [
  ['OWNER', 'Propietario / Administrador', 'Acceso total a la inmobiliaria'],
  ['ADMIN', 'Administrador', 'Administración general del tenant'],
  ['MANAGER', 'Responsable', 'Gestión operativa y del equipo'],
  ['AGENT', 'Agente', 'Gestión comercial y de propiedades'],
  ['COLLECTIONS', 'Cobranzas', 'Cobranzas, pagos y cuenta corriente'],
  ['MAINTENANCE', 'Mantenimiento', 'Gestión operativa y mantenimiento'],
  ['ACCOUNTING', 'Contabilidad', 'Información financiera y reportes'],
  ['READ_ONLY', 'Solo lectura', 'Consulta sin permisos de modificación'],
] as const;

const ALL_MODULES = ['dashboard','crm','agenda','properties','operations','garages','leases','collections','property_management','renters','contacts','settings','audit'];
const ALL_ACTIONS = ['read','create','update','delete','export','manage'];

function permissionsFor(roleKey: string) {
  if (roleKey === 'OWNER' || roleKey === 'ADMIN') {
    return ALL_MODULES.flatMap((module) => ALL_ACTIONS.map((action) => [module, action] as const));
  }
  if (roleKey === 'READ_ONLY') return ALL_MODULES.map((module) => [module, 'read'] as const);
  if (roleKey === 'COLLECTIONS') {
    return ['dashboard','collections','property_management','renters','leases'].flatMap((module) => ['read','create','update','export'].map((action) => [module, action] as const));
  }
  if (roleKey === 'ACCOUNTING') {
    return ['dashboard','collections','property_management','leases','properties','renters'].flatMap((module) => ['read','export'].map((action) => [module, action] as const));
  }
  if (roleKey === 'MAINTENANCE') {
    return ['dashboard','properties','property_management','garages','agenda'].flatMap((module) => ['read','update'].map((action) => [module, action] as const));
  }
  if (roleKey === 'AGENT') {
    return ['dashboard','crm','agenda','properties','operations','renters','contacts'].flatMap((module) => ['read','create','update'].map((action) => [module, action] as const));
  }
  return ALL_MODULES.flatMap((module) => ['read','create','update','export'].map((action) => [module, action] as const));
}

async function seed() {
  console.log('Sembrando plataforma OnlyMob...');

  const superEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const superPassword = process.env.SUPERADMIN_PASSWORD;
  const superName = process.env.SUPERADMIN_NAME?.trim() || 'NanoLabs SuperAdmin';

  if (superEmail && superPassword) {
    if (superPassword.length < 12) throw new Error('SUPERADMIN_PASSWORD debe tener al menos 12 caracteres.');
    const existing = await platformPrisma.superAdminUser.findUnique({ where: { email: superEmail } });
    if (!existing) {
      await platformPrisma.superAdminUser.create({
        data: {
          email: superEmail,
          passwordHash: await bcrypt.hash(superPassword, 12),
          name: superName,
          role: 'SUPERADMIN',
        },
      });
      console.log(`SuperAdmin creado: ${superEmail}`);
    } else {
      await platformPrisma.superAdminUser.update({ where: { id: existing.id }, data: { name: superName } });
    }
  } else {
    console.log('SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD no definidos: no se crea ni modifica SuperAdmin.');
  }

  const plans = [
    {
      code: 'INMOBILIARIA_STARTER', name: 'Plan Starter',
      description: 'Ideal para inmobiliarias independientes con hasta 30 propiedades',
      priceMonthly: 25000, priceYearly: 250000, maxProperties: 30, maxGarages: 5, maxUsers: 2,
    },
    {
      code: 'INMOBILIARIA_PRO', name: 'Plan Profesional',
      description: 'Gestión completa de inmuebles, CRM, contratos, cobranzas y liquidaciones',
      priceMonthly: 45000, priceYearly: 450000, maxProperties: 150, maxGarages: 30, maxUsers: 5,
    },
    {
      code: 'INMOBILIARIA_ENTERPRISE', name: 'Plan Enterprise',
      description: 'Operación ampliada, múltiples usuarios y soporte prioritario',
      priceMonthly: 85000, priceYearly: 850000, maxProperties: 1000, maxGarages: 200, maxUsers: 20,
    },
  ];

  for (const plan of plans) {
    await platformPrisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }

  const tenants = await platformPrisma.tenant.findMany({ select: { id: true } });
  for (const tenant of tenants) {
    const roleIds = new Map<string, string>();
    for (const [key, name, description] of SYSTEM_ROLES) {
      const role = await platformPrisma.roleProfile.upsert({
        where: { tenantId_key: { tenantId: tenant.id, key } },
        update: { name, description, isSystem: true },
        create: { tenantId: tenant.id, key, name, description, isSystem: true },
      });
      roleIds.set(key, role.id);

      for (const [module, action] of permissionsFor(key)) {
        await platformPrisma.rolePermission.upsert({
          where: { roleId_module_action: { roleId: role.id, module, action } },
          update: {},
          create: { roleId: role.id, module, action },
        });
      }
    }

    const ownerRoleId = roleIds.get('OWNER');
    const agentRoleId = roleIds.get('AGENT');
    if (ownerRoleId) {
      await platformPrisma.user.updateMany({
        where: { tenantId: tenant.id, role: 'ADMIN', roleProfileId: null },
        data: { roleProfileId: ownerRoleId },
      });
    }
    if (agentRoleId) {
      await platformPrisma.user.updateMany({
        where: { tenantId: tenant.id, role: 'STAFF', roleProfileId: null },
        data: { roleProfileId: agentRoleId },
      });
    }
  }

  console.log('Planes, perfiles de rol y permisos inicializados correctamente.');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await platformPrisma.$disconnect();
  });
