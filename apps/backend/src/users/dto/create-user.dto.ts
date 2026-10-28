import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'O e-mail deve ser válido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  nome!: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  senha!: string;
}
