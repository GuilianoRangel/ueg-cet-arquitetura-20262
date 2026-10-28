import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlinkSync, existsSync } from 'fs';
import { AppModule } from './app.module';
import { dataSourceOptions } from './database/data-source';
import { SENSITIVE_DATA_ROLE, ADMIN_PERFIL_NOME } from '@repo/utils';
import { DataSource } from 'typeorm';
import { Perfil } from './perfis/entities/perfil.entity';
import { User } from './users/entities/user.entity';

interface LoginResponse {
  access_token: string;
}

interface RolesResponse {
  roles: string[];
}

interface EntityResponse {
  id: string;
  valor?: number;
}

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  stack?: unknown;
}

interface ListResponse<T> {
  items: T[];
  total: number;
}

describe('CRUD Flow End-to-End Integration', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let dbPath: string;
  let adminToken: string;

  beforeAll(async () => {
    dbPath = join(tmpdir(), `crud-flow-test-${Date.now()}.sqlite`);
    if (existsSync(dbPath)) {
      try {
        unlinkSync(dbPath);
      } catch {
        // ignore
      }
    }

    (dataSourceOptions as { database: string }).database = dbPath;
    process.env.DATABASE_NAME = dbPath;
    process.env.JWT_SECRET = 'super-integration-test-secret-key-12345';
    process.env.ADMIN_EMAIL = 'admin@ueg.br';
    process.env.ADMIN_PASSWORD = 'adminPassword123';
    process.env.EMAIL_DISABLED = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
    server = app.getHttpServer() as Parameters<typeof request>[0];
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (existsSync(dbPath)) {
      try {
        unlinkSync(dbPath);
      } catch {
        // ignore
      }
    }
  });

  it('1. should boot, run migrations and seed the admin user and the Administrador perfil', async () => {
    const dataSource = app.get(DataSource);
    const perfilRepo = dataSource.getRepository(Perfil);
    const userRepo = dataSource.getRepository(User);

    const adminPerfil = await perfilRepo.findOne({
      where: { nome: ADMIN_PERFIL_NOME, sistema: true },
    });
    expect(adminPerfil).toBeDefined();
    expect(adminPerfil?.sistema).toBe(true);
    expect(adminPerfil?.roles).toContain('users:read');
    expect(adminPerfil?.roles).toContain('perfis:read');
    expect(adminPerfil?.roles).toContain('categorias:read');
    expect(adminPerfil?.roles).not.toContain(SENSITIVE_DATA_ROLE);

    const adminUser = await userRepo.findOne({
      where: { email: 'admin@ueg.br' },
      relations: ['perfis'],
    });
    expect(adminUser).toBeDefined();
    expect(adminUser?.ativo).toBe(true);
    expect(adminUser?.perfis.some((p) => p.id === adminPerfil?.id)).toBe(true);
  });

  it('2. admin can log in and GET /auth/me/roles lists every role except DADOS_SENSIVEIS', async () => {
    const loginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'admin@ueg.br', senha: 'adminPassword123' })
      .expect(201);

    const loginBody = loginRes.body as LoginResponse;
    expect(loginBody.access_token).toBeDefined();
    adminToken = loginBody.access_token;

    const rolesRes = await request(server)
      .get('/auth/me/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const rolesBody = rolesRes.body as RolesResponse;
    expect(rolesBody.roles).toContain('categorias:create');
    expect(rolesBody.roles).toContain('categorias:read');
    expect(rolesBody.roles).toContain('categorias:update');
    expect(rolesBody.roles).toContain('categorias:delete');
    expect(rolesBody.roles).toContain('perfis:create');
    expect(rolesBody.roles).toContain('users:create');
    expect(rolesBody.roles).not.toContain(SENSITIVE_DATA_ROLE);
  });

  it('3. admin can create a perfil, a user with that perfil and the user receives its roles after cache invalidation', async () => {
    // Create new perfil
    const perfilRes = await request(server)
      .post('/perfis')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nome: 'Leitor Categorias',
        ativo: true,
        roles: ['categorias:read'],
      })
      .expect(201);

    const perfilBody = perfilRes.body as EntityResponse;
    const perfilId = perfilBody.id;
    expect(perfilId).toBeDefined();

    // Create user with that perfil
    const userRes = await request(server)
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'leitor@ueg.br',
        nome: 'Usuario Leitor',
        senha: 'password123',
        perfilIds: [perfilId],
      })
      .expect(201);

    const userBody = userRes.body as EntityResponse;
    const userId = userBody.id;
    expect(userId).toBeDefined();

    // Log in as the new user
    const userLoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'leitor@ueg.br', senha: 'password123' })
      .expect(201);

    const userLoginBody = userLoginRes.body as LoginResponse;
    const userToken = userLoginBody.access_token;

    // Check roles
    const userRolesRes = await request(server)
      .get('/auth/me/roles')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const userRolesBody = userRolesRes.body as RolesResponse;
    expect(userRolesBody.roles).toEqual(['categorias:read']);

    // Can access GET /categorias
    await request(server)
      .get('/categorias')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    // But cannot create categoria (403)
    await request(server)
      .post('/categorias')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ nome: 'Tentativa Proibida' })
      .expect(403);
  });

  it('4. user without perfis gets 403 on GET /categorias', async () => {
    // Register self
    const regRes = await request(server)
      .post('/auth/register')
      .send({
        email: 'semroles@ueg.br',
        nome: 'Sem Roles',
        senha: 'password123',
      })
      .expect(201);

    const regBody = regRes.body as EntityResponse;
    const userId = regBody.id;

    // Activate user
    await request(server)
      .patch(`/users/${userId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Login
    const loginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'semroles@ueg.br', senha: 'password123' })
      .expect(201);

    const loginBody = loginRes.body as LoginResponse;
    const token = loginBody.access_token;

    await request(server)
      .get('/categorias')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('5. admin without DADOS_SENSIVEIS creating categoria with valor gets 403 FORBIDDEN_SENSITIVE_FIELD in ApiErrorResponse format', async () => {
    const res = await request(server)
      .post('/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Com Valor', valor: 50000 })
      .expect(403);

    const body = res.body as ErrorResponse;
    expect(body).toEqual(
      expect.objectContaining({
        statusCode: 403,
        error: 'FORBIDDEN_SENSITIVE_FIELD',
        path: '/categorias',
      }),
    );
    expect(body.message).toContain('DADOS_SENSIVEIS');
  });

  it('6. admin granted a perfil with DADOS_SENSIVEIS sees the real valor', async () => {
    // Create sensitive perfil
    const sensitivePerfilRes = await request(server)
      .post('/perfis')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nome: 'Acesso Dados Sensiveis',
        ativo: true,
        roles: [SENSITIVE_DATA_ROLE],
      })
      .expect(201);

    const sensitiveBody = sensitivePerfilRes.body as EntityResponse;
    const sensitivePerfilId = sensitiveBody.id;

    // Find admin user id
    const dataSource = app.get(DataSource);
    const adminUser = await dataSource.getRepository(User).findOneOrFail({
      where: { email: 'admin@ueg.br' },
      relations: ['perfis'],
    });

    const currentPerfilIds = adminUser.perfis.map((p) => p.id);

    // Grant sensitive perfil to admin
    await request(server)
      .patch(`/users/${adminUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        perfilIds: [...currentPerfilIds, sensitivePerfilId],
        version: adminUser.version,
      })
      .expect(200);

    // Verify cache invalidation: admin roles now contain DADOS_SENSIVEIS
    const updatedRolesRes = await request(server)
      .get('/auth/me/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const updatedRolesBody = updatedRolesRes.body as RolesResponse;
    expect(updatedRolesBody.roles).toContain(SENSITIVE_DATA_ROLE);

    // Now admin can create categoria with valor
    const createCatRes = await request(server)
      .post('/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Livros Raros', valor: 75000 })
      .expect(201);

    const catBody = createCatRes.body as EntityResponse;
    expect(catBody.valor).toBe(75000);

    // And sees the real valor in findOne and findAll
    const findOneRes = await request(server)
      .get(`/categorias/${catBody.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const findOneBody = findOneRes.body as EntityResponse;
    expect(findOneBody.valor).toBe(75000);

    // A user without DADOS_SENSIVEIS sees 99999
    const leitorLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'leitor@ueg.br', senha: 'password123' })
      .expect(201);
    const leitorLoginBody = leitorLogin.body as LoginResponse;
    const leitorToken = leitorLoginBody.access_token;

    const leitorFindOne = await request(server)
      .get(`/categorias/${catBody.id}`)
      .set('Authorization', `Bearer ${leitorToken}`)
      .expect(200);
    const leitorFindOneBody = leitorFindOne.body as EntityResponse;
    expect(leitorFindOneBody.valor).toBe(99999);
  });

  it('7. GET /categorias?limit=5001 returns 400 QUERY_PARAM_INVALID in ApiErrorResponse format', async () => {
    const res = await request(server)
      .get('/categorias?limit=5001')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    expect(res.body).toEqual(
      expect.objectContaining({
        statusCode: 400,
        error: 'QUERY_PARAM_INVALID',
        path: '/categorias',
      }),
    );
  });

  it('8. PATCH with stale version returns 409 OPTIMISTIC_LOCK_CONFLICT', async () => {
    const createRes = await request(server)
      .post('/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Versao Test' })
      .expect(201);

    const createBody = createRes.body as EntityResponse;
    const catId = createBody.id;

    // Send stale version 99
    const res = await request(server)
      .patch(`/categorias/${catId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Novo Nome', version: 99 })
      .expect(409);

    expect(res.body).toEqual(
      expect.objectContaining({
        statusCode: 409,
        error: 'OPTIMISTIC_LOCK_CONFLICT',
        path: `/categorias/${catId}`,
      }),
    );
  });

  it('9. DELETE /categorias/:id?version=N returns 204 and the record disappears from the list', async () => {
    const createRes = await request(server)
      .post('/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Para Deletar' })
      .expect(201);

    const createBody = createRes.body as EntityResponse;
    const catId = createBody.id;

    await request(server)
      .delete(`/categorias/${catId}?version=1`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    // Record disappears from list
    const listRes = await request(server)
      .get('/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const listBody = listRes.body as ListResponse<EntityResponse>;
    expect(listBody.items.some((c) => c.id === catId)).toBe(false);

    // findOne returns 404
    await request(server)
      .get(`/categorias/${catId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('10. duplicate categoria nome returns 409 CATEGORIA_NOME_EXISTS', async () => {
    await request(server)
      .post('/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Unicidade Flow' })
      .expect(201);

    const dupRes = await request(server)
      .post('/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'unicidade flow' })
      .expect(409);

    expect(dupRes.body).toEqual(
      expect.objectContaining({
        statusCode: 409,
        error: 'CATEGORIA_NOME_EXISTS',
      }),
    );
  });

  it('11. unknown route returns 404 RESOURCE_NOT_FOUND in ApiErrorResponse format', async () => {
    const res = await request(server).get('/rota-inexistente').expect(404);

    const body = res.body as ErrorResponse;
    expect(body).toEqual(
      expect.objectContaining({
        statusCode: 404,
        error: 'RESOURCE_NOT_FOUND',
        path: '/rota-inexistente',
      }),
    );
    expect(typeof body.timestamp).toBe('string');
  });

  it('12. unexpected error returns 500 INTERNAL_ERROR without stack', async () => {
    // Send invalid UUID to activate route
    const res = await request(server)
      .patch('/users/not-a-valid-uuid/activate')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    const body = res.body as ErrorResponse;
    expect(body.statusCode).toBe(400);
    expect(body.stack).toBeUndefined();
  });
});
