import path from 'path';
import dotenv from 'dotenv';
import { defineConfig } from '@prisma/config';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  schema: path.resolve(__dirname, 'prisma'),
  migrations: {
    path: path.resolve(__dirname, 'prisma/migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
