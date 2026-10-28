import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@ueg.br',
    description: 'E-mail de acesso do usuário',
  })
  @IsEmail({}, { message: 'O e-mail deve ser válido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email!: string;

  @ApiProperty({
    example: 'admin123',
    description: 'Senha de acesso',
  })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  senha!: string;
}
