export interface VehicleForTitle {
  brand_id?: string | null;
  model_id?: string | null;
  year?: number | null;
  transmission?: string | null;
}

export interface BrandModelResolver {
  getBrandName(brandId: string): Promise<string | null>;
  getModelName(modelId: string): Promise<string | null>;
  getModelVehicleType(modelId: string): Promise<string | null>;
  getTransmissionLabel(transmissionKey: string): Promise<string | null>;
}

export class ListingTitleService {
  async generate(vehicle: VehicleForTitle, resolver: BrandModelResolver): Promise<string> {
    const brandName = vehicle.brand_id ? await resolver.getBrandName(vehicle.brand_id) : null;
    const modelName = vehicle.model_id ? await resolver.getModelName(vehicle.model_id) : null;
    const vehicleType = vehicle.model_id
      ? await resolver.getModelVehicleType(vehicle.model_id)
      : null;

    const titleParts: string[] = [];
    if (brandName) titleParts.push(brandName);
    if (modelName) titleParts.push(modelName);
    if (vehicle.year) titleParts.push(vehicle.year.toString());

    const baseTitle = titleParts.join(' ');

    if (vehicleType === 'moto') {
      return baseTitle;
    }

    if (vehicle.transmission) {
      const transmissionKey = `vehicleOptions.transmission.${vehicle.transmission}`;
      const transmissionStr = await resolver.getTransmissionLabel(transmissionKey);
      if (transmissionStr && transmissionStr !== transmissionKey) {
        return `${baseTitle} (${transmissionStr})`;
      }
    }

    return baseTitle;
  }
}
