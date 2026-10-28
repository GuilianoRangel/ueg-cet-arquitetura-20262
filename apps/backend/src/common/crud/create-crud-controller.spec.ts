import {
  Controller,
  Get,
  INestApplication,
  ExecutionContext,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { IsNotEmpty, IsString } from 'class-validator';
import { createCrudController } from './create-crud-controller';
import { CrudService } from './crud.service';
import { BaseEntity } from './base.entity';
import { createUpdateDto } from './create-update-dto';
import { AuthenticatedUser, CrudConfig } from './crud.types';
import { RolesCatalog } from '../../auth/permissions/roles-catalog';
import { PermissionsService } from '../../auth/permissions/permissions.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Operation } from '../../auth/permissions/operation.decorator';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';
import { toValidationException } from './pipes/validation-errors';

class TestItem extends BaseEntity {
  nome!: string;
}

class CreateTestItemDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;
}

const UpdateTestItemDto = createUpdateDto(CreateTestItemDto);

type UpdateTestItemType = InstanceType<typeof UpdateTestItemDto>;

const testConfig: CrudConfig<TestItem, CreateTestItemDto, UpdateTestItemType> =
  {
    resource: 'items',
    entity: TestItem,
    createDto: CreateTestItemDto,
    updateDto: UpdateTestItemDto,
  };

@Controller('items')
class TestItemController extends createCrudController(testConfig) {
  constructor(
    service: CrudService<TestItem, CreateTestItemDto, UpdateTestItemType>,
  ) {
    super(service);
  }

  @Get('custom')
  @Operation('items:custom')
  customAction() {
    return { ok: true };
  }
}

describe('createCrudController', () => {
  let app: INestApplication;
  let mockService: Partial<
    CrudService<TestItem, CreateTestItemDto, UpdateTestItemType>
  >;
  let userRoles: Set<string>;
  const mockUser: AuthenticatedUser = {
    id: 'u1',
    email: 'test@ueg.br',
    nome: 'Tester',
  };

  beforeEach(async () => {
    userRoles = new Set();

    mockService = {
      create: jest
        .fn()
        .mockImplementation(
          (dto: CreateTestItemDto, user: AuthenticatedUser | null) =>
            Promise.resolve({
              id: '11111111-1111-1111-1111-111111111111',
              ...dto,
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
              ultimoUsuarioId: user?.id ?? null,
            } as TestItem),
        ),
      findAll: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 }),
      findOne: jest.fn().mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        nome: 'Item 1',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        ultimoUsuarioId: null,
      }),
      update: jest
        .fn()
        .mockImplementation((id: string, dto: UpdateTestItemType) =>
          Promise.resolve({
            id,
            ...dto,
            version: dto.version + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            ultimoUsuarioId: null,
          } as TestItem),
        ),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TestItemController],
      providers: [
        {
          provide: CrudService,
          useValue: mockService,
        },
        {
          provide: PermissionsService,
          useValue: {
            getEffectiveRoles: jest
              .fn()
              .mockImplementation(() => Promise.resolve(userRoles)),
          },
        },
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx
            .switchToHttp()
            .getRequest<{ user: AuthenticatedUser }>();
          req.user = mockUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: toValidationException,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should register the four CRUD roles in RolesCatalog', () => {
    const roles = RolesCatalog.all();
    expect(roles).toContain('items:create');
    expect(roles).toContain('items:read');
    expect(roles).toContain('items:update');
    expect(roles).toContain('items:delete');
  });

  it('should require <resource>:create|read|update|delete roles (403 without them)', async () => {
    // No roles assigned
    await request(app.getHttpServer() as never)
      .post('/items')
      .send({ nome: 'Item A' })
      .expect(403);

    await request(app.getHttpServer() as never)
      .get('/items')
      .expect(403);
    await request(app.getHttpServer() as never)
      .get('/items/11111111-1111-1111-1111-111111111111')
      .expect(403);
    await request(app.getHttpServer() as never)
      .patch('/items/11111111-1111-1111-1111-111111111111')
      .send({ nome: 'B', version: 1 })
      .expect(403);
    await request(app.getHttpServer() as never)
      .delete('/items/11111111-1111-1111-1111-111111111111?version=1')
      .expect(403);
  });

  it('findAll and findOne should require the same read role', async () => {
    userRoles.add('items:read');

    await request(app.getHttpServer() as never)
      .get('/items')
      .expect(200);
    await request(app.getHttpServer() as never)
      .get('/items/11111111-1111-1111-1111-111111111111')
      .expect(200);
  });

  it('should return 201 on create, 200 on update, 204 on delete', async () => {
    userRoles.add('items:create');
    userRoles.add('items:update');
    userRoles.add('items:delete');

    await request(app.getHttpServer() as never)
      .post('/items')
      .send({ nome: 'Created' })
      .expect(201);

    await request(app.getHttpServer() as never)
      .patch('/items/11111111-1111-1111-1111-111111111111')
      .send({ nome: 'Updated', version: 1 })
      .expect(200);

    await request(app.getHttpServer() as never)
      .delete('/items/11111111-1111-1111-1111-111111111111?version=1')
      .expect(204);
  });

  it('should reject non-UUID :id with 400 VALIDATION_ERROR', async () => {
    userRoles.add('items:read');

    const res = await request(app.getHttpServer() as never)
      .get('/items/not-a-uuid')
      .expect(400);

    const body = res.body as { error: string; details: { field: string }[] };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'id' })]),
    );
  });

  it('DELETE without ?version should return 400 VALIDATION_ERROR', async () => {
    userRoles.add('items:delete');

    const res = await request(app.getHttpServer() as never)
      .delete('/items/11111111-1111-1111-1111-111111111111')
      .expect(400);

    const body = res.body as { error: string; details: { field: string }[] };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'version' })]),
    );
  });

  it('DELETE with ?version=abc should return 400 VALIDATION_ERROR', async () => {
    userRoles.add('items:delete');

    const res = await request(app.getHttpServer() as never)
      .delete('/items/11111111-1111-1111-1111-111111111111?version=abc')
      .expect(400);

    const body = res.body as { error: string };
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should pass the authenticated user to the service', async () => {
    userRoles.add('items:create');

    await request(app.getHttpServer() as never)
      .post('/items')
      .send({ nome: 'Created' })
      .expect(201);

    expect(mockService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'u1', email: 'test@ueg.br' }),
    );
  });

  it('a custom route decorated with @Operation in a subclass should be protected by its own role', async () => {
    // Without role
    await request(app.getHttpServer() as never)
      .get('/items/custom')
      .expect(403);

    // With custom role
    userRoles.add('items:custom');
    await request(app.getHttpServer() as never)
      .get('/items/custom')
      .expect(200);
  });
});
