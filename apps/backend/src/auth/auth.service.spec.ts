import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { BusinessException } from '../common/exceptions/business.exception';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmailWithPassword: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      findByEmailWithPassword: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('token_xyz'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should use findByEmailWithPassword in validateUser and throw if user not found', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.validateUser('test@test.com', '123456'),
      ).rejects.toThrow(
        new BusinessException(
          'E-mail/senha não confere',
          'AUTH_INVALID_CREDENTIALS',
        ),
      );
      expect(usersService.findByEmailWithPassword).toHaveBeenCalledWith(
        'test@test.com',
      );
    });

    it('should throw an error if password does not match', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        senha: 'hashedPassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('test@test.com', '123456'),
      ).rejects.toThrow(
        new BusinessException(
          'E-mail/senha não confere',
          'AUTH_INVALID_CREDENTIALS',
        ),
      );
    });

    it('should throw an error if user is inactive', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        senha: 'hashedPassword',
        ativo: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.validateUser('test@test.com', '123456'),
      ).rejects.toThrow(
        new BusinessException(
          'Conta aguardando liberação do administrador',
          'AUTH_USER_INACTIVE',
        ),
      );
    });

    it('should return user without password if validation succeeds', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        senha: 'hashedPassword',
        ativo: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', '123456');
      expect(result).toEqual({ id: '1', email: 'test@test.com', ativo: true });
    });
  });

  describe('login', () => {
    it('should sign a JWT payload with sub, email and nome and without role', async () => {
      const user: Omit<User, 'senha'> = {
        email: 'test@test.com',
        id: '1',
        nome: 'Test',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        deletedAt: null,
        ultimoUsuarioId: null,
        perfis: [],
      };
      const result = await service.login(user);
      expect(result).toEqual({ access_token: 'token_xyz' });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
        nome: user.nome,
      });
      const payloadCalls = jwtService.signAsync.mock.calls as Array<
        [Record<string, unknown>]
      >;
      expect(payloadCalls[0][0].role).toBeUndefined();
    });
  });
});
