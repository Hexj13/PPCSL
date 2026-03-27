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

export interface TireTitleInput {
  brandName: string;
  modelName?: string | null;
  isOtherModel?: boolean;
  width_mm: number;
  aspect_ratio: number;
  diameter_inch: number;
  load_index?: string | null;
  speed_index?: string | null;
}

function formatRimDiameterInches(d: number): string {
  const rounded = Math.round(d * 10) / 10;
  if (Number.isInteger(rounded)) {
    return String(Math.trunc(rounded));
  }
  return rounded.toFixed(1).replace(/\.0$/, '');
}

function formatLoadSpeedMarking(
  loadIndex: string | null | undefined,
  speedIndex: string | null | undefined,
): string {
  const li = loadIndex?.trim() ?? '';
  const si = (speedIndex?.trim() ?? '').toUpperCase();
  return `${li}${si}`.trim();
}

export class ListingTitleService {
  generateForTire(input: TireTitleInput): string {
    let modelPart = '';
    if (!input.isOtherModel && input.modelName?.trim()) {
      modelPart = input.modelName.trim();
    }
    const r = formatRimDiameterInches(input.diameter_inch);
    const marking = `${input.width_mm}/${input.aspect_ratio} R${r}`;
    const loadSpeed = formatLoadSpeedMarking(input.load_index, input.speed_index);
    const parts: string[] = [input.brandName.trim()];
    if (modelPart) parts.push(modelPart);
    parts.push(marking);
    if (loadSpeed) parts.push(loadSpeed);
    return parts.join(' ');
  }

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
