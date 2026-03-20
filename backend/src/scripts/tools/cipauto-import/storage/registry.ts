import { JsonRegistryStore } from '../../partner-import-shared/storage/json-registry-store';
import type { RegistryItem } from '../types';

export class RegistryStore extends JsonRegistryStore<RegistryItem> {
  constructor(registryPath: string) {
    super(registryPath, 'cipauto');
  }
}
