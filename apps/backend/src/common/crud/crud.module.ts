import { Global, Module } from '@nestjs/common';
import { TransactionRunner } from './transaction-runner';
import { MaskService } from './masking/mask.service';
import { CrudDeps } from './crud.service';

@Global()
@Module({
  providers: [TransactionRunner, MaskService, CrudDeps],
  exports: [TransactionRunner, MaskService, CrudDeps],
})
export class CrudModule {}
