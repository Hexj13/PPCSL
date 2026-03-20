import { JsonRegistryStore } from '../../partner-import-shared/storage/json-registry-store';
import type { RegistryItem999 } from '../types';

export class RegistryStore999 extends JsonRegistryStore<RegistryItem999> {
  constructor(registryPath: string) {
    super(registryPath, '999md');
  }
}
