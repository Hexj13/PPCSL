export interface I18nTr {
  translated?: string;
}

export interface SubCategoryRaw {
  id: number;
  url: string;
  title?: I18nTr;
}

export interface FeatureValueRaw {
  id: number;
  type: string;
  value: unknown;
}

export interface ControlRaw {
  type: string;
  title: string;
  option_title: string;
  feature: FeatureValueRaw;
}

export interface GroupRaw {
  title: string;
  controls: ControlRaw[];
}

export interface AdvertRaw {
  id: string;
  title: string;
  state?: string;
  isExpired?: boolean;
  expire?: string;
  moderation?: { status?: string | null } | null;
  subCategory?: SubCategoryRaw | null;
  groups?: GroupRaw[] | null;
}
