import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

// Needed for testing
const env = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: env });

// Based on how this file itself is being executed (compiled dist/*.js vs run
// directly from src/*.ts via ts-node), not NODE_ENV - a script like seed:demo
// always runs against src/ via ts-node even when NODE_ENV=production, and
// mixing the two loads the same entity as two different classes, which makes
// TypeORM unable to find metadata for repositories built from the other one.
const compiled = __filename.endsWith('.js');

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'tooms',
  synchronize: false,
  logging: false,
  entities: compiled ? ['dist/src/models/*.js'] : ['src/models/*.ts'],
  migrations: compiled ? ['dist/src/migrations/*.js'] : ['src/migrations/*.ts'],
});

export default AppDataSource;
