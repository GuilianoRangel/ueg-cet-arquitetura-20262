import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { BusinessException } from '../common/exceptions/business.exception';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'senha'> | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BusinessException(
        'E-mail/senha não confere',
        'AUTH_INVALID_CREDENTIALS',
      );
    }

    const isMatch = await bcrypt.compare(pass, user.senha);
    if (!isMatch) {
      throw new BusinessException(
        'E-mail/senha não confere',
        'AUTH_INVALID_CREDENTIALS',
      );
    }

    if (!user.ativo) {
      throw new BusinessException(
        'Conta aguardando liberação do administrador',
        'AUTH_USER_INACTIVE',
      );
    }

    const result = { ...user } as Partial<User>;
    delete result.senha;
    return result as Omit<User, 'senha'>;
  }

  async login(user: Omit<User, 'senha'>): Promise<{ access_token: string }> {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      nome: user.nome,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
