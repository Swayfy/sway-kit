import { Constructor } from '../utils/interfaces/constructor.interface.ts';
import { Reflector } from '../utils/reflector.class.ts';

export abstract class Injector {
  private static cachedInstances = new WeakMap<Constructor, unknown>();

  private static resolveDependencies<TService>(
    target: Constructor<TService>,
  ): unknown[] {
    const dependencies =
      Reflector.getMetadata<Constructor[]>('dependencies', target) ?? [];

    return dependencies.map((dependency: Constructor) =>
      this.resolve(dependency),
    );
  }

  public static bind(targets: Constructor | Constructor[]): void {
    if (Array.isArray(targets)) {
      for (const target of targets) {
        const instance = this.resolve(target);

        this.cachedInstances.set(target, instance);
      }

      return;
    }

    const instance = this.resolve(targets);

    this.cachedInstances.set(targets, instance);
  }

  public static has(target: Constructor): boolean {
    return this.cachedInstances.has(target);
  }

  public static resolve<TService>(target: Constructor<TService>): TService {
    if (this.has(target)) {
      return this.cachedInstances.get(target) as TService;
    }

    const instance = new target(...this.resolveDependencies(target));

    this.cachedInstances.set(target, instance);

    return instance;
  }
}
