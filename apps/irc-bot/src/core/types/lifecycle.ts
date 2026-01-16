export interface OnModuleInit {
  onModuleInit(): void | Promise<void>;
}

export interface OnModuleDestroy {
  onModuleDestroy(): void | Promise<void>;
}

export const isOnModuleInit = (candidate: unknown): candidate is OnModuleInit =>
  typeof candidate === 'object' &&
  candidate !== null &&
  typeof (candidate as OnModuleInit).onModuleInit === 'function';

export const isOnModuleDestroy = (
  candidate: unknown,
): candidate is OnModuleDestroy =>
  typeof candidate === 'object' &&
  candidate !== null &&
  typeof (candidate as OnModuleDestroy).onModuleDestroy === 'function';
