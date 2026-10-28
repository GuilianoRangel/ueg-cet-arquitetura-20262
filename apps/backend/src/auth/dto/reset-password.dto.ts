import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'O token deve ser uma string válida' })
  @IsNotEmpty({ message: 'O token é obrigatório' })
  token!: string;

  @IsString({ message: 'A nova senha deve ser uma string válida' })
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres' })
  @IsNotEmpty({ message: 'A nova senha é obrigatória' })
  newPassword!: string;
}
