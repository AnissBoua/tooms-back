import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

// Needed for testing
const env = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: env });

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'tooms',
  synchronize: false,
  logging: false,
  entities: ['src/models/*{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
});

export default AppDataSource;
