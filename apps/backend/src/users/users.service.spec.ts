import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, Role } from './entities/user.entity';
import { BusinessException } from '../common/exceptions/business.exception';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw an error if email already exists', async () => {
      repository.findOne.mockResolvedValue({ id: '1' });
      await expect(
        service.create({ email: 'test@test.com', nome: 'Test', senha: '123' }),
      ).rejects.toThrow(
        new BusinessException('E-mail já está em uso', 'AUTH_EMAIL_EXISTS'),
      );
    });

    it('should create a user with ativo false', async () => {
      repository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      const newUser = {
        email: 'test@test.com',
        nome: 'Test',
        senha: 'hashed',
        ativo: false,
        role: Role.USER,
      };
      repository.create.mockReturnValue(newUser);
      repository.save.mockResolvedValue({ id: '1', ...newUser });

      const result = await service.create({
        email: 'test@test.com',
        nome: 'Test',
        senha: '123',
      });
      expect(result.ativo).toBe(false);
      expect(repository.create).toHaveBeenCalledWith({
        email: 'test@test.com',
        nome: 'Test',
        senha: 'hashed',
        ativo: false,
        role: Role.USER,
      });
      expect(repository.save).toHaveBeenCalled();
    });
  });

  // Tests for findByEmail, findById, findAll, activate, updatePassword...
});
