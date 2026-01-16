import {
  isOnModuleDestroy,
  isOnModuleInit,
  type OnModuleDestroy,
  type OnModuleInit,
} from 'core/types/lifecycle';
import type { AppContainer } from './di';
import { logger } from './logger';

type LifecycleAware = OnModuleInit | OnModuleDestroy;

export class ModuleLifecycle {
  private readonly modules: LifecycleAware[] = [];
  private destroying = false;

  constructor(private readonly container: AppContainer) {}

  public async init(): Promise<void> {
    this.modules.push(...this.resolveLifecycleModules());

    for (const module of this.modules) {
      if (isOnModuleInit(module)) {
        await module.onModuleInit();
      }
    }
  }

  public registerShutdownHooks(): void {
    const shutdown = (signal?: NodeJS.Signals) => {
      void this.destroy(signal).catch((err) => {
        logger.error({ err, signal }, 'Failed to shutdown modules gracefully');
        process.exitCode = 1;
      });
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('beforeExit', () => shutdown());
  }

  public async destroy(signal?: NodeJS.Signals): Promise<void> {
    if (this.destroying) return;
    this.destroying = true;

    for (const module of [...this.modules].reverse()) {
      if (!isOnModuleDestroy(module)) continue;

      try {
        await module.onModuleDestroy();
      } catch (err) {
        logger.error(
          { err, signal },
          'Failed to run onModuleDestroy on a module',
        );
      }
    }
  }

  private resolveLifecycleModules(): LifecycleAware[] {
    const registry =
      (this.container as unknown as { _registry?: Map<unknown, unknown> })
        ._registry ??
      (this.container as unknown as { registrations?: Map<unknown, unknown> })
        .registrations;

    if (!registry) {
      return [];
    }

    const modules: LifecycleAware[] = [];
    const seen = new Set<LifecycleAware>();

    for (const [token] of registry.entries()) {
      const instance = this.safeResolve(token);
      if (!instance) continue;

      if (isOnModuleInit(instance) || isOnModuleDestroy(instance)) {
        if (seen.has(instance)) continue;
        seen.add(instance);
        modules.push(instance);
      }
    }

    return modules;
  }

  private safeResolve(token: unknown): LifecycleAware | null {
    try {
      return this.container.resolve(token as never);
    } catch (err) {
      logger.error(
        { err, token },
        'Failed to resolve dependency for lifecycle',
      );
      return null;
    }
  }
}
