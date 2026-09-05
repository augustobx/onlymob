import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as {
  onlyMobPlatformPrisma: PrismaClient | undefined;
};

const rawUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/inmobiliaria';

function createAdapter() {
  const dbUrl = new URL(rawUrl.replace(/^mysql:/, 'mariadb:'));
  const isBuildPhase = process.env.npm_lifecycle_event === 'build';

  return new PrismaMariaDb({
    host: dbUrl.hostname === 'localhost' ? '127.0.0.1' : dbUrl.hostname,
    port: Number(dbUrl.port) || 3306,
    user: decodeURIComponent(dbUrl.username || 'root'),
    password: decodeURIComponent(dbUrl.password || ''),
    database: dbUrl.pathname.replace(/^\//, '') || 'inmobiliaria',
    connectionLimit: isBuildPhase ? 1 : 15,
    connectTimeout: 10_000,
    acquireTimeout: 10_000,
  });
}

const adapter = createAdapter();

export const platformPrisma = globalForPrisma.onlyMobPlatformPrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.onlyMobPlatformPrisma = platformPrisma;
