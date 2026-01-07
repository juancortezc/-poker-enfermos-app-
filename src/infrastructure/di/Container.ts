/**
 * Simple Dependency Injection Container
 *
 * A lightweight DI container for managing dependencies in the application.
 * Uses lazy instantiation - dependencies are created on first resolve.
 */
class Container {
  private instances: Map<string, unknown> = new Map();
  private factories: Map<string, () => unknown> = new Map();

  /**
   * Registers a factory function for creating a dependency.
   */
  register<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
    // Clear cached instance when re-registering
    this.instances.delete(key);
  }

  /**
   * Resolves a dependency by key.
   * Creates the instance on first call and caches it.
   */
  resolve<T>(key: string): T {
    if (!this.instances.has(key)) {
      const factory = this.factories.get(key);
      if (!factory) {
        throw new Error(`No registration found for "${key}"`);
      }
      this.instances.set(key, factory());
    }
    return this.instances.get(key) as T;
  }

  /**
   * Checks if a dependency is registered.
   */
  has(key: string): boolean {
    return this.factories.has(key);
  }

  /**
   * Clears all cached instances (useful for testing).
   */
  clearInstances(): void {
    this.instances.clear();
  }

  /**
   * Clears everything (useful for testing).
   */
  reset(): void {
    this.instances.clear();
    this.factories.clear();
  }
}

export const container = new Container();
