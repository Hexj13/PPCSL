export type ModelIndexItem = {
  brand: string;
  model: string;
  listingCount: number;
};

export type ModelIndexData = {
  generatedAt: string;
  items: ModelIndexItem[];
};
