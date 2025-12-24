import { useEffect, useState } from 'react';

import { citiesApi, City } from '@/lib/api';
import { sortByName } from '@/lib/utils';

export function useCities() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    citiesApi
      .getAll()
      .then((res) => {
        setCities(sortByName(res.data));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return { cities, loading };
}
