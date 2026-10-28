import { DataSource } from 'typeorm';
import { TransactionRunner } from './transaction-runner';

describe('TransactionRunner', () => {
  let dataSource: DataSource;
  let runner: TransactionRunner;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      logging: false,
    });
    await dataSource.initialize();
    await dataSource.query('CREATE TABLE counter (val INTEGER)');
    await dataSource.query('INSERT INTO counter VALUES (0)');
    runner = new TransactionRunner(dataSource);
  });

  afterEach(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('should execute transactions strictly in sequence even when started concurrently', async () => {
    const order: number[] = [];

    const task1 = runner.runInTransaction(async () => {
      order.push(1);
      await new Promise((resolve) => setTimeout(resolve, 50));
      order.push(2);
      return 'task1';
    });

    const task2 = runner.runInTransaction((): Promise<string> => {
      order.push(3);
      order.push(4);
      return Promise.resolve('task2');
    });

    const results = await Promise.all([task1, task2]);
    expect(results).toEqual(['task1', 'task2']);
    expect(order).toEqual([1, 2, 3, 4]);
  });

  it('should commit when fn resolves and rollback when fn rejects', async () => {
    // 1. Success commits
    await runner.runInTransaction(async (manager) => {
      await manager.query('UPDATE counter SET val = val + 1');
    });

    const res1 = await dataSource.query<Array<{ val: number }>>(
      'SELECT val FROM counter',
    );
    expect(res1[0]?.val).toBe(1);

    // 2. Reject rolls back
    await expect(
      runner.runInTransaction(async (manager) => {
        await manager.query('UPDATE counter SET val = val + 10');
        throw new Error('Rollback test');
      }),
    ).rejects.toThrow('Rollback test');

    const res2 = await dataSource.query<Array<{ val: number }>>(
      'SELECT val FROM counter',
    );
    expect(res2[0]?.val).toBe(1);
  });

  it('should keep processing the queue after a failed transaction', async () => {
    const failTask = runner.runInTransaction((): Promise<never> => {
      return Promise.reject(new Error('Failed task'));
    });

    const successTask = runner.runInTransaction((): Promise<string> => {
      return Promise.resolve('recovered');
    });

    await expect(failTask).rejects.toThrow('Failed task');
    await expect(successTask).resolves.toBe('recovered');
  });

  it('runExclusive should be serialized with transactions', async () => {
    const order: string[] = [];

    const p1 = runner.runInTransaction(async () => {
      order.push('tx_start');
      await new Promise((resolve) => setTimeout(resolve, 40));
      order.push('tx_end');
    });

    const p2 = runner.runExclusive((): Promise<void> => {
      order.push('exclusive');
      return Promise.resolve();
    });

    await Promise.all([p1, p2]);
    expect(order).toEqual(['tx_start', 'tx_end', 'exclusive']);
  });
});
