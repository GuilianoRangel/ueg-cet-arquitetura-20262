import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'd84b2c8a-1c32-45c1-8409-51a43ffb90a1',
    description: 'Token de recuperação enviado por e-mail',
  })
  @IsString({ message: 'O token deve ser uma string válida' })
  @IsNotEmpty({ message: 'O token é obrigatório' })
  token!: string;

  @ApiProperty({
    example: 'novaSenhaSegura456',
    description: 'Nova senha do usuário (mínimo 6 caracteres)',
    minLength: 6,
  })
  @IsString({ message: 'A nova senha deve ser uma string válida' })
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres' })
  @IsNotEmpty({ message: 'A nova senha é obrigatória' })
  newPassword!: string;
}
