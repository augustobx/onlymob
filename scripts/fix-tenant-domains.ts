import { platformPrisma } from '@/lib/prisma-core';

function normalize(value: string | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/\.$/, '')
    .replace(/:\d+$/, '');
}

const tenantBaseDomain = normalize(process.env.TENANT_BASE_DOMAIN);
const platformHost = normalize(process.env.PLATFORM_HOST);

async function main() {
  if (!tenantBaseDomain) throw new Error('TENANT_BASE_DOMAIN es obligatorio para normalizar dominios.');
  if (!platformHost) throw new Error('PLATFORM_HOST es obligatorio para normalizar dominios.');

  console.log(`==> [domains] Plataforma: ${platformHost}`);
  console.log(`==> [domains] Tenants: <slug>.${tenantBaseDomain}`);

  const tenants = await platformPrisma.tenant.findMany({
    select: {
      id: true,
      slug: true,
      domains: { select: { id: true, hostname: true, isPrimary: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const tenant of tenants) {
    const desiredHostname = `${tenant.slug}.${tenantBaseDomain}`;
    const conflict = await platformPrisma.tenantDomain.findUnique({
      where: { hostname: desiredHostname },
    });

    if (conflict && conflict.tenantId !== tenant.id) {
      throw new Error(`DOMAIN_CONFLICT: ${desiredHostname} pertenece a otro tenant.`);
    }

    await platformPrisma.$transaction(async (tx) => {
      await tx.tenantDomain.updateMany({
        where: { tenantId: tenant.id },
        data: { isPrimary: false },
      });

      await tx.tenantDomain.upsert({
        where: { hostname: desiredHostname },
        update: {
          tenantId: tenant.id,
          isPrimary: true,
          verifiedAt: new Date(),
        },
        create: {
          tenantId: tenant.id,
          hostname: desiredHostname,
          isPrimary: true,
          verifiedAt: new Date(),
        },
      });

      // Limpia únicamente el dominio canónico histórico incorrecto de NanoApps.
      if (tenantBaseDomain !== 'nanoapps.ar') {
        await tx.tenantDomain.deleteMany({
          where: {
            tenantId: tenant.id,
            hostname: `${tenant.slug}.nanoapps.ar`,
          },
        });
      }
    });

    console.log(`==> [domains] OK ${tenant.slug} -> ${desiredHostname}`);
  }

  const platformDomain = await platformPrisma.tenantDomain.findUnique({
    where: { hostname: platformHost },
  });
  if (platformDomain) {
    await platformPrisma.tenantDomain.delete({ where: { id: platformDomain.id } });
    console.log(`==> [domains] Eliminado host de plataforma asignado erróneamente a tenant: ${platformHost}`);
  }

  console.log('==> [domains] Dominios normalizados correctamente.');
}

main()
  .catch((error) => {
    console.error('[domains] Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await platformPrisma.$disconnect();
  });
