import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ADMIN_PERFIL_NOME } from '@repo/utils';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Perfil } from '../perfis/entities/perfil.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { TransactionRunner } from '../common/crud/transaction-runner';
import { MaskService } from '../common/crud/masking/mask.service';
import { PermissionsService } from '../auth/permissions/permissions.service';
import { AuthenticatedUser } from '../common/crud/crud.types';
import { BusinessException } from '../common/exceptions/business.exception';
import { DtoValidationPipe } from '../common/crud/pipes/dto-validation.pipe';
import { UpdateManagedUserDto } from './dto/managed-user.dto';
import { ValidationException } from '../common/exceptions/validation.exception';

async function expectAsyncBusinessError(
  promise: Promise<unknown>,
  expectedCode: string,
) {
  try {
    await promise;
    throw new Error(
      `Expected promise to throw BusinessException with code ${expectedCode}, but it resolved`,
    );
  } catch (err: unknown) {
    expect(err).toBeInstanceOf(BusinessException);
    const be = err as BusinessException;
    expect(be.code).toBe(expectedCode);
  }
}

describe('UsersService', () => {
  let dataSource: DataSource;
  let runner: TransactionRunner;
  let permissionsServiceMock: {
    invalidate: jest.Mock;
    invalidateAll: jest.Mock;
    getEffectiveRoles: jest.Mock;
  };
  let maskService: MaskService;
  let service: UsersService;

  const defaultActor: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@ueg.br',
    nome: 'Super Admin',
  };

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [User, Perfil, Categoria],
      logging: false,
    });
    await dataSource.initialize();

    runner = new TransactionRunner(dataSource);
    maskService = new MaskService();
    permissionsServiceMock = {
      invalidate: jest.fn().mockResolvedValue(undefined),
      invalidateAll: jest.fn().mockResolvedValue(undefined),
      getEffectiveRoles: jest.fn().mockResolvedValue(new Set()),
    };

    service = new UsersService(
      {
        runner,
        mask: maskService,
        permissions: permissionsServiceMock as unknown as PermissionsService,
      },
      permissionsServiceMock as unknown as PermissionsService,
    );
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('should create a user hashing the password and linking the given perfis', async () => {
    const perfilRepo = dataSource.getRepository(Perfil);
    const perfil = await perfilRepo.save(
      perfilRepo.create({
        nome: 'Operador',
        ativo: true,
        roles: ['users:read'],
      }),
    );

    const created = await service.create(
      {
        email: 'op@ueg.br',
        nome: 'Operador Teste',
        senha: 'plainpassword123',
        perfilIds: [perfil.id],
      },
      defaultActor,
    );

    expect(created.id).toBeDefined();
    expect(created.email).toBe('op@ueg.br');
    expect(created.nome).toBe('Operador Teste');
    expect(created.ativo).toBe(true);
    expect(created.perfis).toHaveLength(1);
    expect(created.perfis[0].id).toBe(perfil.id);

    // Verify hash in database
    const rawUser = await dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.senha')
      .where('user.id = :id', { id: created.id })
      .getOne();

    expect(rawUser?.senha).toBeDefined();
    expect(rawUser?.senha).not.toBe('plainpassword123');
    const matches = await bcrypt.compare('plainpassword123', rawUser!.senha);
    expect(matches).toBe(true);
  });

  it('should never return senha in any response', async () => {
    const created = await service.create(
      {
        email: 'nosha@ueg.br',
        nome: 'No Senha',
        senha: 'supersecretpass',
      },
      defaultActor,
    );

    expect(
      (created as unknown as Record<string, unknown>).senha,
    ).toBeUndefined();

    const found = await service.findOne(created.id, defaultActor);
    expect((found as unknown as Record<string, unknown>).senha).toBeUndefined();

    const list = await service.findAll({}, defaultActor);
    expect(
      (list.items[0] as unknown as Record<string, unknown>).senha,
    ).toBeUndefined();

    const updated = await service.update(
      created.id,
      { nome: 'Updated Name', version: 1 },
      defaultActor,
    );
    expect(
      (updated as unknown as Record<string, unknown>).senha,
    ).toBeUndefined();
  });

  it('should throw 409 USER_EMAIL_EXISTS for duplicated e-mail including soft-deleted users', async () => {
    const created = await service.create(
      {
        email: 'dup@ueg.br',
        nome: 'Primeiro',
        senha: 'password123',
      },
      defaultActor,
    );

    await expectAsyncBusinessError(
      service.create(
        {
          email: 'dup@ueg.br',
          nome: 'Segundo',
          senha: 'password123',
        },
        defaultActor,
      ),
      'USER_EMAIL_EXISTS',
    );

    // Soft-delete the first user
    await service.remove(created.id, 1, defaultActor);

    // Should still reject duplicated e-mail
    await expectAsyncBusinessError(
      service.create(
        {
          email: 'dup@ueg.br',
          nome: 'Terceiro',
          senha: 'password123',
        },
        defaultActor,
      ),
      'USER_EMAIL_EXISTS',
    );
  });

  it('should throw 400 USER_PERFIL_INVALID for unknown, deleted or inactive perfil', async () => {
    const perfilRepo = dataSource.getRepository(Perfil);
    const inactivePerfil = await perfilRepo.save(
      perfilRepo.create({
        nome: 'Inativo',
        ativo: false,
        roles: ['users:read'],
      }),
    );

    const deletedPerfil = await perfilRepo.save(
      perfilRepo.create({
        nome: 'Excluido',
        ativo: true,
        deletedAt: new Date(),
        roles: ['users:read'],
      }),
    );

    // Unknown id
    await expectAsyncBusinessError(
      service.create(
        {
          email: 'u1@ueg.br',
          nome: 'U1',
          senha: 'password123',
          perfilIds: ['00000000-0000-0000-0000-000000000000'],
        },
        defaultActor,
      ),
      'USER_PERFIL_INVALID',
    );

    // Inactive perfil
    await expectAsyncBusinessError(
      service.create(
        {
          email: 'u2@ueg.br',
          nome: 'U2',
          senha: 'password123',
          perfilIds: [inactivePerfil.id],
        },
        defaultActor,
      ),
      'USER_PERFIL_INVALID',
    );

    // Soft-deleted perfil
    await expectAsyncBusinessError(
      service.create(
        {
          email: 'u3@ueg.br',
          nome: 'U3',
          senha: 'password123',
          perfilIds: [deletedPerfil.id],
        },
        defaultActor,
      ),
      'USER_PERFIL_INVALID',
    );
  });

  it('should replace perfis on update when perfilIds is provided', async () => {
    const perfilRepo = dataSource.getRepository(Perfil);
    const p1 = await perfilRepo.save(
      perfilRepo.create({ nome: 'P1', ativo: true, roles: ['users:read'] }),
    );
    const p2 = await perfilRepo.save(
      perfilRepo.create({ nome: 'P2', ativo: true, roles: ['users:read'] }),
    );

    const created = await service.create(
      {
        email: 'replace@ueg.br',
        nome: 'Replace Perfis',
        senha: 'password123',
        perfilIds: [p1.id],
      },
      defaultActor,
    );
    expect(created.perfis).toHaveLength(1);
    expect(created.perfis[0].id).toBe(p1.id);

    const updated = await service.update(
      created.id,
      { perfilIds: [p2.id], version: 1 },
      defaultActor,
    );
    expect(updated.perfis).toHaveLength(1);
    expect(updated.perfis[0].id).toBe(p2.id);
  });

  it('should keep perfis on update when perfilIds is undefined and remove all when []', async () => {
    const perfilRepo = dataSource.getRepository(Perfil);
    const p1 = await perfilRepo.save(
      perfilRepo.create({ nome: 'P1', ativo: true, roles: ['users:read'] }),
    );

    const created = await service.create(
      {
        email: 'keep@ueg.br',
        nome: 'Keep Perfis',
        senha: 'password123',
        perfilIds: [p1.id],
      },
      defaultActor,
    );

    // undefined perfilIds keeps perfis
    const updatedKeep = await service.update(
      created.id,
      { nome: 'New Nome', version: 1 },
      defaultActor,
    );
    expect(updatedKeep.perfis).toHaveLength(1);
    expect(updatedKeep.perfis[0].id).toBe(p1.id);

    // [] removes all perfis
    const updatedRemove = await service.update(
      created.id,
      { perfilIds: [], version: 2 },
      defaultActor,
    );
    expect(updatedRemove.perfis).toHaveLength(0);
  });

  it('should reject senha on update (400 VALIDATION_ERROR)', async () => {
    const pipe = new DtoValidationPipe(UpdateManagedUserDto);

    await expect(
      pipe.transform({
        nome: 'Tentando Mudar Senha',
        senha: 'newpass',
        version: 1,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('should throw 409 USER_LAST_ADMIN when deactivating the only active Administrador', async () => {
    const perfilRepo = dataSource.getRepository(Perfil);
    const adminPerfil = await perfilRepo.save(
      perfilRepo.create({
        nome: ADMIN_PERFIL_NOME,
        sistema: true,
        ativo: true,
        roles: ['users:read'],
      }),
    );

    const admin = await service.create(
      {
        email: 'soleadmin@ueg.br',
        nome: 'Sole Admin',
        senha: 'password123',
        perfilIds: [adminPerfil.id],
      },
      defaultActor,
    );

    await expectAsyncBusinessError(
      service.update(admin.id, { ativo: false, version: 1 }, defaultActor),
      'USER_LAST_ADMIN',
    );
  });

  it('should throw 409 USER_LAST_ADMIN when removing the Administrador perfil of the only active admin', async () => {
    const perfilRepo = dataSource.getRepository(Perfil);
    const adminPerfil = await perfilRepo.save(
      perfilRepo.create({
        nome: ADMIN_PERFIL_NOME,
        sistema: true,
        ativo: true,
        roles: ['users:read'],
      }),
    );

    const admin = await service.create(
      {
        email: 'adminrem@ueg.br',
        nome: 'Admin Rem',
        senha: 'password123',
        perfilIds: [adminPerfil.id],
      },
      defaultActor,
    );

    await expectAsyncBusinessError(
      service.update(admin.id, { perfilIds: [], version: 1 }, defaultActor),
      'USER_LAST_ADMIN',
    );
  });

  it('should throw 409 USER_LAST_ADMIN when removing the only active admin', async () => {
    const perfilRepo = dataSource.getRepository(Perfil);
    const adminPerfil = await perfilRepo.save(
      perfilRepo.create({
        nome: ADMIN_PERFIL_NOME,
        sistema: true,
        ativo: true,
        roles: ['users:read'],
      }),
    );

    const admin = await service.create(
      {
        email: 'admindelete@ueg.br',
        nome: 'Admin Del',
        senha: 'password123',
        perfilIds: [adminPerfil.id],
      },
      defaultActor,
    );

    await expectAsyncBusinessError(
      service.remove(admin.id, 1, defaultActor),
      'USER_LAST_ADMIN',
    );
  });

  it('should allow deactivating an admin when another active admin exists', async () => {
    const perfilRepo = dataSource.getRepository(Perfil);
    const adminPerfil = await perfilRepo.save(
      perfilRepo.create({
        nome: ADMIN_PERFIL_NOME,
        sistema: true,
        ativo: true,
        roles: ['users:read'],
      }),
    );

    const admin1 = await service.create(
      {
        email: 'admin1@ueg.br',
        nome: 'Admin 1',
        senha: 'password123',
        perfilIds: [adminPerfil.id],
      },
      defaultActor,
    );

    await service.create(
      {
        email: 'admin2@ueg.br',
        nome: 'Admin 2',
        senha: 'password123',
        perfilIds: [adminPerfil.id],
      },
      defaultActor,
    );

    const deactivated = await service.update(
      admin1.id,
      { ativo: false, version: 1 },
      defaultActor,
    );
    expect(deactivated.ativo).toBe(false);
  });

  it('should call permissionsService.invalidate(userId) after commit of create, update, and remove', async () => {
    const created = await service.create(
      {
        email: 'inv@ueg.br',
        nome: 'Invalidate',
        senha: 'password123',
      },
      defaultActor,
    );
    expect(permissionsServiceMock.invalidate).toHaveBeenCalledWith(created.id);

    await service.update(
      created.id,
      { nome: 'Invalidate 2', version: 1 },
      defaultActor,
    );
    expect(permissionsServiceMock.invalidate).toHaveBeenCalledWith(created.id);

    await service.remove(created.id, 2, defaultActor);
    expect(permissionsServiceMock.invalidate).toHaveBeenCalledWith(created.id);
  });

  it('registerSelf should create inactive user without perfis and ultimoUsuarioId null', async () => {
    const result = await service.registerSelf({
      email: 'self@ueg.br',
      nome: 'Self Register',
      senha: 'password123',
    });

    expect(result.id).toBeDefined();
    expect(result.email).toBe('self@ueg.br');
    expect(result.nome).toBe('Self Register');
    expect(result.ativo).toBe(false);

    const dbUser = await dataSource.getRepository(User).findOne({
      where: { id: result.id },
      relations: ['perfis'],
    });

    expect(dbUser?.ativo).toBe(false);
    expect(dbUser?.ultimoUsuarioId).toBeNull();
    expect(dbUser?.perfis).toEqual([]);
  });

  it('registerSelf should throw AUTH_EMAIL_EXISTS (400) when e-mail exists', async () => {
    await service.registerSelf({
      email: 'same@ueg.br',
      nome: 'User One',
      senha: 'password123',
    });

    await expectAsyncBusinessError(
      service.registerSelf({
        email: 'same@ueg.br',
        nome: 'User Two',
        senha: 'password123',
      }),
      'AUTH_EMAIL_EXISTS',
    );
  });

  it('registerSelf should return only id, email, nome, ativo', async () => {
    const result = await service.registerSelf({
      email: 'clean@ueg.br',
      nome: 'Clean Result',
      senha: 'password123',
    });

    expect(Object.keys(result).sort()).toEqual([
      'ativo',
      'email',
      'id',
      'nome',
    ]);
  });

  it('findByEmailWithPassword should include senha; findByEmail should not', async () => {
    await service.create(
      {
        email: 'authcheck@ueg.br',
        nome: 'Auth Check',
        senha: 'mysecretpassword',
      },
      defaultActor,
    );

    const withPass = await service.findByEmailWithPassword('authcheck@ueg.br');
    expect(withPass).toBeDefined();
    expect(withPass?.senha).toBeDefined();
    expect(withPass?.senha.length).toBeGreaterThan(0);

    const withoutPass = await service.findByEmail('authcheck@ueg.br');
    expect(withoutPass).toBeDefined();
    expect(withoutPass?.senha).toBeUndefined();
  });

  it('activate should set ativo=true, set ultimoUsuarioId, increment version and invalidate cache', async () => {
    const registered = await service.registerSelf({
      email: 'toactivate@ueg.br',
      nome: 'To Activate',
      senha: 'password123',
    });

    const activated = await service.activate(registered.id, defaultActor);

    expect(activated.ativo).toBe(true);
    expect(activated.ultimoUsuarioId).toBe(defaultActor.id);
    expect(activated.version).toBe(2);
    expect(permissionsServiceMock.invalidate).toHaveBeenCalledWith(
      registered.id,
    );
  });

  it('activate should throw USER_NOT_FOUND with status 404 for unknown id', async () => {
    await expectAsyncBusinessError(
      service.activate('00000000-0000-0000-0000-000000000000', defaultActor),
      'USER_NOT_FOUND',
    );
  });

  it('updatePassword should update only the hash', async () => {
    const created = await service.create(
      {
        email: 'resetpass@ueg.br',
        nome: 'Reset Pass',
        senha: 'oldpassword',
      },
      defaultActor,
    );

    const newHash = await bcrypt.hash('newpassword123', 10);
    await service.updatePassword(created.id, newHash);

    const userWithPass =
      await service.findByEmailWithPassword('resetpass@ueg.br');
    expect(userWithPass?.senha).toBe(newHash);
    const matches = await bcrypt.compare('newpassword123', userWithPass!.senha);
    expect(matches).toBe(true);
  });
});
