import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Perfil } from '../perfis/entities/perfil.entity';
import { Categoria } from '../categorias/entities/categoria.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'sqlite',
  database: process.env.DATABASE_NAME || 'database.sqlite',
  entities: [User, Perfil, Categoria],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false,
  migrationsRun: true,
  logging: ['error', 'warn', 'migration'],
};

export default new DataSource(dataSourceOptions);
