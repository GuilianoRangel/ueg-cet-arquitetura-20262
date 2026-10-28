import { Test } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';

describe('JWT_SECRET requirement', () => {
  it('should fail to start AuthModule when JWT_SECRET is missing', async () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    try {
      const modulePromise = Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            ignoreEnvFile: true,
            ignoreEnvVars: true,
            isGlobal: true,
            load: [() => ({})],
          }),
          UsersModule,
          AuthModule,
        ],
      }).compile();

      await expect(modulePromise).rejects.toThrow();
    } finally {
      if (originalSecret !== undefined) {
        process.env.JWT_SECRET = originalSecret;
      }
    }
  });
});
