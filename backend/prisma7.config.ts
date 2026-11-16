import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Commands such as generate and validate do not connect. Migration commands
    // will fail clearly until DATABASE_URL is provided.
    url: process.env.DATABASE_URL ?? '',
  },
});
