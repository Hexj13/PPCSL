export interface CacheableOptions {
  ttl?: number;
  keyPrefix?: string;
  keyGenerator?: (...args: unknown[]) => string;
}

export const CACHEABLE_METADATA = 'cacheable';

export function Cacheable(options: CacheableOptions = {}) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(CACHEABLE_METADATA, options, target, propertyKey);
    return descriptor;
  };
}
