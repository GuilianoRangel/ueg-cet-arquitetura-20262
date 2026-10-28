import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from './mailer/mailer.module';
import { dataSourceOptions } from './database/data-source';
import { SeedService } from './database/seed/seed.service';
import { PermissionsModule } from './auth/permissions/permissions.module';
import { CrudModule } from './common/crud/crud.module';
import { PerfisModule } from './perfis/perfis.module';
import { CategoriasModule } from './categorias/categorias.module';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    PermissionsModule,
    CrudModule,
    PerfisModule,
    CategoriasModule,
    UsersModule,
    AuthModule,
    MailerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SeedService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
