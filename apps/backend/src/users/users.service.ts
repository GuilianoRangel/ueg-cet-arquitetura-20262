import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { BusinessException } from '../common/exceptions/business.exception';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BusinessException('E-mail já está em uso', 'AUTH_EMAIL_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.senha, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      senha: hashedPassword,
      ativo: false,
      role: Role.USER,
    });

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new BusinessException('Usuário não encontrado', 'USER_NOT_FOUND');
    }
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        'id',
        'email',
        'nome',
        'ativo',
        'role',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async activate(id: string): Promise<User> {
    const user = await this.findById(id);
    user.ativo = true;
    return this.userRepository.save(user);
  }

  async updatePassword(id: string, novaSenhaHash: string): Promise<User> {
    const user = await this.findById(id);
    user.senha = novaSenhaHash;
    return this.userRepository.save(user);
  }

  async createAdmin(email: string, nome: string, senha: string): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      return existing;
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const admin = this.userRepository.create({
      email,
      nome,
      senha: hashedPassword,
      ativo: true,
      role: Role.ADMIN,
    });

    return this.userRepository.save(admin);
  }
}
