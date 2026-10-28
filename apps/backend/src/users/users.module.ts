import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SeedService } from './seed';
import { User } from './entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => AuthModule),
    MailerModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, SeedService],
  exports: [UsersService],
})
export class UsersModule {}
