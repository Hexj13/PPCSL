import { useEffect, useState } from 'react';

import type { TireBrand } from '@/lib/api';
import { tiresApi } from '@/lib/api';

export function useTireBrandsCatalog(): TireBrand[] {
  const [tireBrands, setTireBrands] = useState<TireBrand[]>([]);

  useEffect(() => {
    tiresApi
      .getBrands()
      .then((res) => setTireBrands(res.data))
      .catch(() => {});
  }, []);

  return tireBrands;
}
