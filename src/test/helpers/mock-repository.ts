import { Repository, ObjectLiteral } from 'typeorm';

export type MockRepository<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

export const createMockRepository = <
  T extends ObjectLiteral = any,
>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softRemove: jest.fn(),
  remove: jest.fn(),
  increment: jest.fn(),
  decrement: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});
