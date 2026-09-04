import bcrypt from 'bcryptjs';
import { platformPrisma } from '../src/lib/prisma-core';

async function seed() {
  console.log('🌱 Sembrando planes y SuperAdmin en la plataforma OnlyMob...');

  // 1. SuperAdmin
  const superPasswordHash = await bcrypt.hash('SuperAdmin2026!', 10);
  await platformPrisma.superAdminUser.upsert({
    where: { email: 'superadmin@nanolabs.com.ar' },
    update: { name: 'NanoLabs SuperAdmin' },
    create: {
      email: 'superadmin@nanolabs.com.ar',
      passwordHash: superPasswordHash,
      name: 'NanoLabs SuperAdmin',
      role: 'SUPERADMIN',
    },
  });

  // 2. Planes SaaS
  const plans = [
    {
      code: 'INMOBILIARIA_STARTER',
      name: 'Plan Starter',
      description: 'Ideal para inmobiliarias independientes con hasta 30 propiedades',
      priceMonthly: 25000,
      priceYearly: 250000,
      maxProperties: 30,
      maxGarages: 5,
      maxUsers: 2,
    },
    {
      code: 'INMOBILIARIA_PRO',
      name: 'Plan Profesional',
      description: 'Gestión completa de inmuebles, cocheras, ajustes BCRA y cobranzas',
      priceMonthly: 45000,
      priceYearly: 450000,
      maxProperties: 150,
      maxGarages: 30,
      maxUsers: 5,
    },
    {
      code: 'INMOBILIARIA_ENTERPRISE',
      name: 'Plan Enterprise',
      description: 'Propiedades ilimitadas, múltiples sucursales y soporte prioritario',
      priceMonthly: 85000,
      priceYearly: 850000,
      maxProperties: 1000,
      maxGarages: 200,
      maxUsers: 20,
    },
  ];

  for (const p of plans) {
    await platformPrisma.plan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        maxProperties: p.maxProperties,
        maxGarages: p.maxGarages,
        maxUsers: p.maxUsers,
      },
      create: p,
    });
  }

  console.log('✅ Planes y SuperAdmin inicializados exitosamente.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await platformPrisma.$disconnect();
  });
