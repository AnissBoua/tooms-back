import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'tooms',
  synchronize: true,
  logging: true,
  entities: ['src/models/*{.ts,.js}'],
  migrations: ['dist/migrations/*{.ts,.js}'],
});

export default AppDataSource;
