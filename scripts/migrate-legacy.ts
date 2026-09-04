import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { platformPrisma } from '../src/lib/prisma-core';

// Helper to parse values from SQL insert statement
function extractInsertValues(sql: string, tableName: string): any[][] {
  const regex = new RegExp(`INSERT INTO \`${tableName}\` [^V]*VALUES\\s*([\\s\\S]*?);`, 'gi');
  const results: any[][] = [];
  let match;

  while ((match = regex.exec(sql)) !== null) {
    const rawValues = match[1];
    // Split rows: (row1), (row2), ...
    const rows = rawValues.match(/\((?:[^)(]+|\([^)(]*\))*\)/g);
    if (!rows) continue;

    for (const row of rows) {
      // Strip outer parens
      const inner = row.slice(1, -1);
      // Parse CSV items respecting single quotes
      const parsedRow: any[] = [];
      let inQuote = false;
      let current = '';
      for (let i = 0; i < inner.length; i++) {
        const char = inner[i];
        if (char === "'" && (i === 0 || inner[i - 1] !== '\\')) {
          inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
          parsedRow.push(cleanVal(current));
          current = '';
        } else {
          current += char;
        }
      }
      parsedRow.push(cleanVal(current));
      results.push(parsedRow);
    }
  }

  return results;
}

function cleanVal(v: string): any {
  const trimmed = v.trim();
  if (trimmed === 'NULL' || trimmed === 'null') return null;
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  }
  if (!isNaN(Number(trimmed)) && trimmed !== '') {
    return Number(trimmed);
  }
  return trimmed;
}

async function run() {
  console.log('🚀 Iniciando proceso de migración de datos legacy a OnlyMob...');

  // 1. Buscar dumps SQL en orden de preferencia
  const dumpPath1 = path.resolve(__dirname, '../db/c2801249_sm2.sql');
  const dumpPath2 = path.resolve(__dirname, '../db/inmobiliaria v5_prd.sql');

  if (!fs.existsSync(dumpPath1)) {
    console.error(`❌ No se encontró el dump: ${dumpPath1}`);
    process.exit(1);
  }

  const sql1 = fs.readFileSync(dumpPath1, 'utf-8');
  const sql2 = fs.existsSync(dumpPath2) ? fs.readFileSync(dumpPath2, 'utf-8') : '';

  // 2. Crear o actualizar Tenant Taurizano Propiedades
  console.log('🏢 Configurando Tenant inicial (Taurizano Propiedades)...');
  const tenant = await platformPrisma.tenant.upsert({
    where: { slug: 'taurizano' },
    update: {
      name: 'Taurizano Propiedades',
      address: 'Bottaro 1760, San Pedro',
      phone: '3329684696',
      receiptHeader: 'TRES DE FEBRERO',
      timezone: 'America/Argentina/Buenos_Aires',
    },
    create: {
      slug: 'taurizano',
      name: 'Taurizano Propiedades',
      address: 'Bottaro 1760, San Pedro',
      phone: '3329684696',
      receiptHeader: 'TRES DE FEBRERO',
      timezone: 'America/Argentina/Buenos_Aires',
    },
  });

  // Dominio base del tenant
  await platformPrisma.tenantDomain.upsert({
    where: { hostname: 'taurizano.nanoapps.ar' },
    update: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      hostname: 'taurizano.nanoapps.ar',
      isPrimary: true,
      verifiedAt: new Date(),
    },
  });

  // 3. Crear usuario SuperAdmin de la plataforma
  console.log('👑 Configurando SuperAdmin global...');
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

  // 4. Crear usuario Administrador del Tenant
  console.log('👤 Configurando Administrador de Taurizano Propiedades...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await platformPrisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@admin.com' } },
    update: { name: 'Marcos Taurizano', role: 'ADMIN', isActive: true },
    create: {
      tenantId: tenant.id,
      email: 'admin@admin.com',
      passwordHash: adminPasswordHash,
      name: 'Marcos Taurizano',
      role: 'ADMIN',
      isActive: true,
    },
  });

  // Crear usuario con email taurizano si no existe
  await platformPrisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'taurizano@nanolabs.com.ar' } },
    update: { name: 'Marcos Taurizano', role: 'ADMIN', isActive: true },
    create: {
      tenantId: tenant.id,
      email: 'taurizano@nanolabs.com.ar',
      passwordHash: adminPasswordHash,
      name: 'Marcos Taurizano',
      role: 'ADMIN',
      isActive: true,
    },
  });

  // 5. Planes de la Plataforma
  console.log('📋 Configurando planes SaaS...');
  const planPro = await platformPrisma.plan.upsert({
    where: { code: 'INMOBILIARIA_PRO' },
    update: {},
    create: {
      code: 'INMOBILIARIA_PRO',
      name: 'Plan Inmobiliaria Profesional',
      description: 'Gestión completa de inmuebles, cocheras, ajustes BCRA y cobranzas',
      priceMonthly: 35000,
      priceYearly: 350000,
      maxProperties: 200,
      maxGarages: 50,
      maxUsers: 10,
    },
  });

  // Asignar suscripción al tenant
  const existingSub = await platformPrisma.tenantSubscription.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!existingSub) {
    await platformPrisma.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: planPro.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      },
    });
  }

  // 6. Migrar Propiedades
  const existingPropsCount = await platformPrisma.property.count({ where: { tenantId: tenant.id } });
  if (existingPropsCount > 0) {
    console.log(`ℹ️ El tenant ${tenant.slug} ya cuenta con ${existingPropsCount} propiedades migradas. Omitiendo importación duplicada.`);
    return;
  }

  console.log('🏠 Migrando propiedades...');
  const propertyRows = extractInsertValues(sql1, 'properties');
  // Formato: (`id`, `code`, `address`, `type`, `rooms`, `sqm`, `price_rent`, `expenses_share`, `created_at`)
  const propertyIdMap = new Map<number, string>();
  let propertiesCount = 0;

  for (const row of propertyRows) {
    const legacyId = Number(row[0]);
    const code = String(row[1] ?? '').trim();
    const address = String(row[2] ?? '').trim();
    const typeStr = String(row[3] ?? 'Departamento').toUpperCase();
    const rooms = row[4] !== null ? Number(row[4]) : null;
    const sqm = row[5] !== null ? Number(row[5]) : null;
    const baseRent = row[6] !== null ? Number(row[6]) : null;
    const expensesShare = row[7] !== null ? Number(row[7]) : null;

    let type: any = 'DEPARTAMENTO';
    if (typeStr.includes('CASA')) type = 'CASA';
    else if (typeStr.includes('LOCAL')) type = 'LOCAL';
    else if (typeStr.includes('TERRENO')) type = 'TERRENO';
    else if (typeStr.includes('OFICINA')) type = 'OFICINA';

    const p = await platformPrisma.property.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code } },
      update: { address, type, rooms, sqm, baseRent, expensesShare },
      create: {
        tenantId: tenant.id,
        code,
        address,
        type,
        rooms,
        sqm,
        baseRent,
        expensesShare,
      },
    });

    propertyIdMap.set(legacyId, p.id);
    propertiesCount++;
  }
  console.log(`✅ ${propertiesCount} propiedades migradas.`);

  // 7. Migrar Inquilinos
  console.log('👥 Migrando inquilinos...');
  const tenantRows = extractInsertValues(sql1, 'tenants');
  // Formato: (`id`, `email`, `password_hash`, `first_name`, `last_name`, `dni`, `phone`, `status`, `created_at`)
  const renterIdMap = new Map<number, string>();
  let rentersCount = 0;

  for (const row of tenantRows) {
    const legacyId = Number(row[0]);
    const rawEmail = row[1] ? String(row[1]).trim().toLowerCase() : null;
    const firstName = String(row[3] ?? '').trim();
    const lastName = String(row[4] ?? '').trim();
    let dni = String(row[5] ?? '').trim();
    if (!dni || dni === '0') dni = `LEGACY-${legacyId}`;
    const phone = row[6] ? String(row[6]).trim() : null;
    const status = String(row[7] ?? 'active').toLowerCase() === 'active' ? 'ACTIVE' : 'INACTIVE';

    const r = await platformPrisma.propertyRenter.upsert({
      where: { tenantId_dni: { tenantId: tenant.id, dni } },
      update: { firstName, lastName, email: rawEmail, phone, status },
      create: {
        tenantId: tenant.id,
        firstName: firstName || 'Inquilino',
        lastName: lastName || `#${legacyId}`,
        dni,
        email: rawEmail,
        phone,
        status,
      },
    });

    renterIdMap.set(legacyId, r.id);
    rentersCount++;
  }
  console.log(`✅ ${rentersCount} inquilinos migrados.`);

  // 8. Migrar Garajes y Plazas
  console.log('🚗 Migrando garajes y plazas...');
  const garageRows = extractInsertValues(sql1, 'garages');
  // Formato: (`id`, `address`, `total_spaces`, `created_at`)
  const garageIdMap = new Map<number, string>();

  for (const row of garageRows) {
    const legacyId = Number(row[0]);
    const address = String(row[1] ?? 'Garaje Central').trim();
    const totalSpaces = Number(row[2] ?? 0);

    const g = await platformPrisma.garage.create({
      data: {
        tenantId: tenant.id,
        name: address,
        address,
        totalSpaces,
      },
    });
    garageIdMap.set(legacyId, g.id);
  }

  // Si no había garajes explícitos en dump 1, buscar en dump 2 o crear Garaje por defecto
  let primaryGarageId = garageIdMap.values().next().value;
  if (!primaryGarageId) {
    const g = await platformPrisma.garage.create({
      data: {
        tenantId: tenant.id,
        name: 'Bottaro 1760',
        address: 'Bottaro 1760',
        totalSpaces: 50,
      },
    });
    primaryGarageId = g.id;
  }

  // Migrar Plazas
  const spaceRows = extractInsertValues(sql1, 'garage_spaces');
  // Formato: (`id`, `garage_id`, `space_number`, `status`)
  const spaceIdMap = new Map<number, string>();
  let spacesCount = 0;

  for (const row of spaceRows) {
    const legacyId = Number(row[0]);
    const legGarageId = Number(row[1]);
    const targetGarageId = garageIdMap.get(legGarageId) || primaryGarageId;
    const spaceNumber = String(row[2] ?? legacyId).trim();
    const isOccupied = String(row[3] ?? 'free').toLowerCase() === 'occupied';

    const sp = await platformPrisma.garageSpace.upsert({
      where: { garageId_spaceNumber: { garageId: targetGarageId, spaceNumber } },
      update: { status: isOccupied ? 'OCCUPIED' : 'FREE' },
      create: {
        garageId: targetGarageId,
        spaceNumber,
        status: isOccupied ? 'OCCUPIED' : 'FREE',
      },
    });

    spaceIdMap.set(legacyId, sp.id);
    spacesCount++;
  }
  console.log(`✅ ${spacesCount} plazas de cochera migradas.`);

  // 9. Migrar Contratos de Inmuebles
  console.log('📑 Migrando contratos de inmuebles...');
  const leaseRows = extractInsertValues(sql1, 'leases');
  // Formato: (`id`, `property_id`, `tenant_id`, `start_date`, `end_date`, `rent`, `deposit`, `status`, `created_at`, `increase_percent`, `update_period`)
  const propertyLeaseIdMap = new Map<number, string>();
  let leasesCount = 0;

  for (const row of leaseRows) {
    const legacyId = Number(row[0]);
    const legPropId = Number(row[1]);
    const legTenantId = Number(row[2]);
    const propertyId = propertyIdMap.get(legPropId);
    const renterId = renterIdMap.get(legTenantId);

    if (!propertyId || !renterId) continue;

    const startDate = row[3] ? new Date(row[3]) : new Date('2025-01-01');
    const endDate = row[4] ? new Date(row[4]) : new Date('2026-12-31');
    const currentRent = Number(row[5] ?? 0);
    const deposit = Number(row[6] ?? 0);
    const status = String(row[7] ?? 'current').toLowerCase() === 'current' ? 'CURRENT' : 'TERMINATED';
    const increasePercent = Number(row[9] ?? 0);
    const updatePeriodMonths = Number(row[10] ?? 4);

    const lease = await platformPrisma.propertyLease.create({
      data: {
        tenantId: tenant.id,
        propertyId,
        renterId,
        startDate,
        endDate,
        currentRent,
        deposit,
        increasePercent,
        updatePeriodMonths,
        status,
      },
    });

    propertyLeaseIdMap.set(legacyId, lease.id);
    leasesCount++;

    // Actualizar estado de la propiedad
    if (status === 'CURRENT') {
      await platformPrisma.property.update({
        where: { id: propertyId },
        data: { status: 'ALQUILADO' },
      });
    }
  }
  console.log(`✅ ${leasesCount} contratos de inmuebles migrados.`);

  // 10. Migrar Contratos de Cocheras
  console.log('🅿️ Migrando contratos de cocheras...');
  const garageLeaseRows = extractInsertValues(sql1, 'garage_leases');
  // Formato: (`id`, `tenant_id`, `start_date`, `end_date`, `rent`, `deposit`, `increase_percent`, `status`)
  const garageLeaseIdMap = new Map<number, string>();
  let garageLeasesCount = 0;

  for (const row of garageLeaseRows) {
    const legacyId = Number(row[0]);
    const legTenantId = Number(row[1]);
    const renterId = renterIdMap.get(legTenantId);
    if (!renterId) continue;

    const startDate = row[2] ? new Date(row[2]) : new Date('2025-01-01');
    const endDate = row[3] ? new Date(row[3]) : new Date('2026-12-31');
    const totalRent = Number(row[4] ?? 0);
    const deposit = Number(row[5] ?? 0);
    const increasePercent = Number(row[6] ?? 0);
    const status = String(row[7] ?? 'current').toLowerCase() === 'current' ? 'CURRENT' : 'TERMINATED';

    const gLease = await platformPrisma.garageLease.create({
      data: {
        tenantId: tenant.id,
        renterId,
        startDate,
        endDate,
        totalRent,
        deposit,
        increasePercent,
        status,
      },
    });

    garageLeaseIdMap.set(legacyId, gLease.id);
    garageLeasesCount++;
  }

  // Mapear plazas a contratos de cocheras
  const spaceAllocRows = extractInsertValues(sql1, 'garage_lease_spaces');
  for (const row of spaceAllocRows) {
    const legLeaseId = Number(row[0]);
    const legSpaceId = Number(row[1]);
    const leaseId = garageLeaseIdMap.get(legLeaseId);
    const spaceId = spaceIdMap.get(legSpaceId);

    if (leaseId && spaceId) {
      await platformPrisma.garageLeaseSpace.upsert({
        where: { leaseId_spaceId: { leaseId, spaceId } },
        update: {},
        create: { leaseId, spaceId },
      });
    }
  }
  console.log(`✅ ${garageLeasesCount} contratos de cocheras migrados.`);

  // 11. Migrar Deudas y Pagos (desde sql2 si existen deudas de prueba o reales)
  console.log('💰 Migrando deudas y cobranzas...');
  const debtSql = sql2 || sql1;
  const debtRows = extractInsertValues(debtSql, 'debts');
  const debtIdMap = new Map<number, string>();
  let debtsCount = 0;

  for (const row of debtRows) {
    const legacyId = Number(row[0]);
    const legLeaseId = Number(row[1]);
    const propertyLeaseId = propertyLeaseIdMap.get(legLeaseId);

    const typeStr = String(row[2] ?? 'alquiler').toUpperCase();
    let type: any = 'ALQUILER';
    if (typeStr.includes('EXPENSA')) type = 'EXPENSAS';
    else if (typeStr.includes('DEPOSITO')) type = 'DEPOSITO';
    else if (typeStr.includes('LUZ')) type = 'LUZ';
    else if (typeStr.includes('GAS')) type = 'GAS';
    else if (typeStr.includes('AGUA')) type = 'AGUA';
    else if (typeStr.includes('OTRO')) type = 'OTROS';

    const description = String(row[3] ?? 'Cuota de alquiler');
    const amount = Number(row[4] ?? 0);
    const dueDate = row[6] ? new Date(row[6]) : new Date();
    const paidAmount = Number(row[7] ?? 0);

    let status: any = 'PENDING';
    if (paidAmount >= amount && amount > 0) status = 'PAID';
    else if (paidAmount > 0) status = 'PARTIAL';
    else if (dueDate < new Date()) status = 'OVERDUE';

    // Obtener inquilino del contrato
    let renterId = '';
    if (propertyLeaseId) {
      const l = await platformPrisma.propertyLease.findUnique({ where: { id: propertyLeaseId } });
      if (l) renterId = l.renterId;
    }

    if (!renterId) {
      const firstRenter = renterIdMap.values().next().value;
      if (firstRenter) renterId = firstRenter;
      else continue;
    }

    const d = await platformPrisma.debt.create({
      data: {
        tenantId: tenant.id,
        leaseType: 'PROPERTY',
        propertyLeaseId,
        renterId,
        type,
        description,
        amount,
        dueDate,
        paidAmount,
        status,
      },
    });

    debtIdMap.set(legacyId, d.id);
    debtsCount++;
  }
  console.log(`✅ ${debtsCount} deudas migradas.`);

  // Pagos
  const paymentRows = extractInsertValues(debtSql, 'debt_payments');
  let paymentsCount = 0;
  for (const row of paymentRows) {
    const legDebtId = Number(row[1]);
    const debtId = debtIdMap.get(legDebtId);
    if (!debtId) continue;

    const amount = Number(row[2] ?? 0);
    const paidAt = row[3] ? new Date(row[3]) : new Date();
    const methodStr = String(row[4] ?? 'efectivo').toLowerCase();
    let method: any = 'EFECTIVO';
    if (methodStr.includes('transf')) method = 'TRANSFERENCIA';
    else if (methodStr.includes('tarj')) method = 'TARJETA';

    await platformPrisma.payment.create({
      data: {
        tenantId: tenant.id,
        debtId,
        amount,
        paidAt,
        method,
      },
    });
    paymentsCount++;
  }
  console.log(`✅ ${paymentsCount} pagos migrados.`);

  console.log('\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
  console.log(`- Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`- Propiedades: ${propertiesCount}`);
  console.log(`- Inquilinos: ${rentersCount}`);
  console.log(`- Plazas Cocheras: ${spacesCount}`);
  console.log(`- Contratos Inmuebles: ${leasesCount}`);
  console.log(`- Contratos Cocheras: ${garageLeasesCount}`);
  console.log(`- Deudas: ${debtsCount}`);
  console.log(`- Pagos: ${paymentsCount}`);
}

run()
  .catch((err) => {
    console.error('❌ Error en script de migración:', err);
    process.exit(1);
  })
  .finally(async () => {
    await platformPrisma.$disconnect();
  });
