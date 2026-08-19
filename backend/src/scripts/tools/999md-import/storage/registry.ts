import { normalizeSourceStatus } from '../../partner-import-shared/registry-lifecycle';
import { JsonRegistryStore } from '../../partner-import-shared/storage/json-registry-store';
import { normalize999ProfileLogin } from '../../partner-import-shared/storage/load-999md-plp-scope';
import type { ParsedPlpItem999 } from '../types';
import type { RegistryItem999 } from '../types';

export class RegistryStore999 extends JsonRegistryStore<RegistryItem999> {
  constructor(registryPath: string) {
    super(registryPath, '999md');
  }

  replaceAllItems(items: RegistryItem999[]): void {
    this.replaceAll(items);
  }

  touchProfileListing(
    item: ParsedPlpItem999,
    seenAt: string,
    profileLogin: string,
  ): RegistryItem999 {
    const existing = this.getBySourceId(item.sourceListingId);
    const nextState =
      existing && normalizeSourceStatus(existing) === 'closed'
        ? 'discovered'
        : (existing?.state ?? 'discovered');
    const normalizedLogin = normalize999ProfileLogin(profileLogin);

    return this.upsert({
      source: '999md',
      sourceListingId: item.sourceListingId,
      url: item.url,
      canonicalUrl: item.canonicalUrl,
      profileLogin: normalizedLogin,
      sourceStatus: 'active',
      title: item.title,
      brand: item.brand,
      model: item.model,
      year: item.year,
      price: item.price,
      currency: item.currency,
      subCategoryId: item.subCategoryId,
      subCategoryUrl: item.subCategoryUrl,
      vehicleType: existing?.vehicleType,
      parsedData: existing?.parsedData,
      state: nextState,
      platformListingId: existing?.platformListingId,
      ownerUserId: existing?.ownerUserId,
      createdStatus: existing?.createdStatus,
      imageCount: existing?.imageCount,
      imageFailures: existing?.imageFailures,
      error: existing?.error,
      warnings: existing?.warnings,
      retryCount: existing?.retryCount,
      lastSeenAt: seenAt,
      lastImportedAt: existing?.lastImportedAt,
      missingSince: undefined,
      missingCount: 0,
      closedAt: undefined,
      closeReason: undefined,
      closeOutcome: undefined,
    });
  }
}
