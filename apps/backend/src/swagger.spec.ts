import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

describe('Swagger / OpenAPI Configuration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-swagger-secret-key-12345';
    process.env.DATABASE_NAME = ':memory:';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should generate a valid OpenAPI document containing all endpoints and tags', () => {
    const config = new DocumentBuilder()
      .setTitle('Portal UEG API')
      .setDescription('Documentação da API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);

    expect(document).toBeDefined();
    expect(document.openapi).toMatch(/^3\./);
    expect(document.info.title).toBe('Portal UEG API');

    // Check security schemes
    expect(document.components?.securitySchemes?.['JWT-auth']).toBeDefined();

    // Check paths for existing controllers
    const paths = Object.keys(document.paths);
    expect(paths).toContain('/auth/login');
    expect(paths).toContain('/auth/register');
    expect(paths).toContain('/auth/me/roles');
    expect(paths).toContain('/auth/forgot-password');
    expect(paths).toContain('/auth/reset-password');
    expect(paths).toContain('/roles');
    expect(paths).toContain('/');

    // Check generic CRUD paths
    expect(paths).toContain('/categorias');
    expect(paths).toContain('/categorias/{id}');
    expect(paths).toContain('/perfis');
    expect(paths).toContain('/perfis/{id}');
    expect(paths).toContain('/users');
    expect(paths).toContain('/users/{id}');
    expect(paths).toContain('/users/{id}/activate');
    expect(paths).toContain('/users/{id}/reset-password');

    // Check generic CRUD operations and OpenAPI tags
    const categoriasGet = document.paths['/categorias']?.get;
    expect(categoriasGet).toBeDefined();
    expect(categoriasGet?.tags).toContain('categorias');
    expect(categoriasGet?.summary).toBe('Listar categorias');

    const categoriasPost = document.paths['/categorias']?.post;
    expect(categoriasPost).toBeDefined();
    expect(categoriasPost?.tags).toContain('categorias');
    expect(categoriasPost?.summary).toBe('Criar categorias');

    const categoriasDelete = document.paths['/categorias/{id}']?.delete;
    expect(categoriasDelete).toBeDefined();
    expect(
      categoriasDelete?.parameters?.some(
        (p) => 'name' in p && p.name === 'version',
      ),
    ).toBe(true);

    const perfisGet = document.paths['/perfis']?.get;
    expect(perfisGet).toBeDefined();
    expect(perfisGet?.tags).toContain('perfis');

    const usersActivate = document.paths['/users/{id}/activate']?.patch;
    expect(usersActivate).toBeDefined();
    expect(usersActivate?.tags).toContain('users');
    expect(usersActivate?.summary).toBe('Ativar usuário');
  });
});
