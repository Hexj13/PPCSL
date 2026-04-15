import { ListingStatus, RegistrationType } from '../../../../common/types';
import type { KupitoImportClientConfig } from '../kupito-import-types';
import type {
  BrandInfo,
  KupitoCreateListingPayload,
  KupitoListingResponse,
  ModelInfo,
} from '../listing-types';
import { requestJson } from '../utils/http';

import type { AuthClient } from './auth-client';

export class KupitoApiClient {
  constructor(
    private readonly config: KupitoImportClientConfig,
    private readonly authClient: AuthClient,
  ) {}

  async getBrands(vehicleType: 'car' | 'truck' | 'moto' = 'car'): Promise<BrandInfo[]> {
    return this.authorizedRequest<BrandInfo[]>(
      `${this.config.kupitoApiUrl}/api/brands?vehicleType=${vehicleType}`,
      'GET',
    );
  }

  async getModelsByBrand(
    brandId: string,
    vehicleType: 'car' | 'truck' | 'moto' = 'car',
  ): Promise<ModelInfo[]> {
    return this.authorizedRequest<ModelInfo[]>(
      `${this.config.kupitoApiUrl}/api/brands/${brandId}/models?vehicleType=${vehicleType}`,
      'GET',
    );
  }

  async createListing(payload: KupitoCreateListingPayload): Promise<KupitoListingResponse> {
    return this.authorizedRequest<KupitoListingResponse>(
      `${this.config.kupitoApiUrl}/api/listings`,
      'POST',
      payload,
    );
  }

  async updateListing(
    listingId: string,
    payload: Partial<KupitoCreateListingPayload>,
  ): Promise<KupitoListingResponse> {
    return this.authorizedRequest<KupitoListingResponse>(
      `${this.config.kupitoApiUrl}/api/listings/${listingId}`,
      'PATCH',
      payload,
    );
  }

  async pauseListing(listingId: string): Promise<void> {
    await this.authorizedRequest(
      `${this.config.kupitoApiUrl}/api/listings/${listingId}/pause`,
      'POST',
    );
  }

  async closeListing(listingId: string): Promise<KupitoListingResponse> {
    return this.authorizedRequest<KupitoListingResponse>(
      `${this.config.kupitoApiUrl}/api/admin/listings/${listingId}/status`,
      'PATCH',
      { status: ListingStatus.Closed },
    );
  }

  async publishListing(listingId: string): Promise<void> {
    await this.authorizedRequest(
      `${this.config.kupitoApiUrl}/api/listings/${listingId}/publish`,
      'POST',
    );
  }

  async enforceStatus(listingId: string, status: ListingStatus): Promise<void> {
    if (status === ListingStatus.Active) {
      await this.publishListing(listingId);
      return;
    }
    if (status === ListingStatus.Closed) {
      await this.closeListing(listingId);
      return;
    }
    if (status === ListingStatus.Paused) {
      await this.pauseListing(listingId);
    }
  }

  getDefaultRegistrationType(): RegistrationType {
    return RegistrationType.Cleared;
  }

  private async authorizedRequest<T>(
    url: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    body?: unknown,
  ): Promise<T> {
    const call = async (): Promise<T> => {
      const { data } = await requestJson<T>({
        url,
        method,
        timeoutMs: this.config.requestTimeoutMs,
        retries: this.config.maxRetries,
        headers: {
          Authorization: `Bearer ${this.authClient.getAccessToken()}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return data;
    };

    try {
      return await call();
    } catch (error) {
      const text = String(error);
      const unauthorized = text.includes('HTTP 401');
      if (!unauthorized) {
        throw error;
      }
      await this.authClient.refresh();
      return call();
    }
  }
}
