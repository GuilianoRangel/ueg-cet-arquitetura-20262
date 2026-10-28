import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { RecoveryService } from './recovery.service';
import { PermissionsService } from './permissions/permissions.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('AuthController (integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let permissionsServiceMock: {
    getEffectiveRoles: jest.Mock;
  };
  let usersServiceMock: {
    registerSelf: jest.Mock;
    findByEmail: jest.Mock;
    findByEmailWithPassword: jest.Mock;
    updatePassword: jest.Mock;
  };
  let authServiceMock: {
    login: jest.Mock;
    validateUser: jest.Mock;
  };

  const JWT_SECRET = 'test_jwt_secret_12345';

  beforeEach(async () => {
    permissionsServiceMock = {
      getEffectiveRoles: jest
        .fn()
        .mockResolvedValue(
          new Set(['users:read', 'categorias:read', 'perfis:read']),
        ),
    };

    usersServiceMock = {
      registerSelf: jest.fn().mockResolvedValue({
        id: '22222222-2222-2222-2222-222222222222',
        email: 'novo@ueg.br',
        nome: 'Novo Usuario',
        ativo: false,
      }),
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      updatePassword: jest.fn(),
    };

    authServiceMock = {
      login: jest.fn(),
      validateUser: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '60m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: MailerService, useValue: {} },
        { provide: RecoveryService, useValue: {} },
        { provide: PermissionsService, useValue: permissionsServiceMock },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'JWT_SECRET') return JWT_SECRET;
              throw new Error(`Missing config ${key}`);
            },
          },
        },
        JwtStrategy,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('register should delegate to registerSelf', async () => {
    const payload = {
      email: 'novo@ueg.br',
      nome: 'Novo Usuario',
      senha: 'password123',
    };

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const res = await request(server)
      .post('/auth/register')
      .send(payload)
      .expect(201);

    expect(usersServiceMock.registerSelf).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'novo@ueg.br',
        nome: 'Novo Usuario',
        senha: 'password123',
      }),
    );
    expect(res.body).toEqual({
      id: '22222222-2222-2222-2222-222222222222',
      email: 'novo@ueg.br',
      nome: 'Novo Usuario',
      ativo: false,
    });
  });

  it('GET /auth/me/roles should return 401 without token', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/auth/me/roles').expect(401);
  });

  it('GET /auth/me/roles should return sorted effective roles of the token user', async () => {
    const token = jwtService.sign({
      sub: '22222222-2222-2222-2222-222222222222',
      email: 'user@ueg.br',
      nome: 'Usuario Token',
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const res = await request(server)
      .get('/auth/me/roles')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(permissionsServiceMock.getEffectiveRoles).toHaveBeenCalledWith(
      '22222222-2222-2222-2222-222222222222',
    );
    expect(res.body).toEqual({
      roles: ['categorias:read', 'perfis:read', 'users:read'],
    });
  });
});
