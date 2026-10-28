import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class TransactionRunner {
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly dataSource: DataSource) {}

  public async runInTransaction<T>(
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const run = async (): Promise<T> => {
      return this.dataSource.transaction(fn);
    };

    const result = this.tail.then(run, run);
    this.tail = result.catch(() => {});
    return result;
  }

  public async runExclusive<T>(
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const run = async (): Promise<T> => {
      return fn(this.dataSource.manager);
    };

    const result = this.tail.then(run, run);
    this.tail = result.catch(() => {});
    return result;
  }
}
