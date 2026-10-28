import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Status da aplicação',
    description: 'Endpoint básico de verificação de disponibilidade da API.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API ativa e operante.',
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
