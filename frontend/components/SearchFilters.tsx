'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { brandsApi, citiesApi, Brand, VehicleModel, City } from '@/lib/api';
import { Dropdown } from './Dropdown';

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const currentYear = new Date().getFullYear().toString();

  const hasAdvancedFilters =
    searchParams.get('mileage_gte') ||
    searchParams.get('mileage_lte') ||
    searchParams.get('fuel') ||
    searchParams.get('transmission') ||
    searchParams.get('body_type') ||
    searchParams.get('engine_displ_l_gte') ||
    searchParams.get('engine_displ_l_lte') ||
    searchParams.get('color') ||
    searchParams.get('doors');

  const [showAdvanced, setShowAdvanced] = useState(!!hasAdvancedFilters);

  const [filters, setFilters] = useState({
    brand_id: searchParams.get('brand_id') || '',
    model_id: searchParams.get('model_id') || '',
    city: searchParams.get('city') || '',
    year_gte: searchParams.get('year_gte') || '',
    year_lte: searchParams.get('year_lte') || currentYear,
    price_gte: searchParams.get('price_gte') || '',
    price_lte: searchParams.get('price_lte') || '',
    mileage_gte: searchParams.get('mileage_gte') || '',
    mileage_lte: searchParams.get('mileage_lte') || '',
    fuel: searchParams.get('fuel') || '',
    transmission: searchParams.get('transmission') || '',
    body_type: searchParams.get('body_type') || '',
    engine_displ_l_gte: searchParams.get('engine_displ_l_gte') || '',
    engine_displ_l_lte: searchParams.get('engine_displ_l_lte') || '',
    color: searchParams.get('color') || '',
    doors: searchParams.get('doors') || '',
    currency: searchParams.get('currency') || '',
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortOrder: searchParams.get('sortOrder') || 'DESC',
  });

  useEffect(() => {
    brandsApi.getAll().then((res) => {
      const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
      setBrands(sorted);
    });
    citiesApi.getAll().then((res) => {
      const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
      setCities(sorted);
    });
  }, []);

  useEffect(() => {
    if (filters.brand_id) {
      setLoadingModels(true);
      brandsApi.getModels(filters.brand_id).then((res) => {
        const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
        setModels(sorted);
        setLoadingModels(false);
        setFilters((prev) => {
          if (!res.data.find((m) => m.id === prev.model_id)) {
            return { ...prev, model_id: '' };
          }
          return prev;
        });
      });
    } else {
      setModels([]);
      setFilters((prev) => ({ ...prev, model_id: '' }));
    }
  }, [filters.brand_id]);

  const handleChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleYearBlur = (key: string, value: string) => {
    if (value === '') {
      return;
    }

    const year = parseInt(value);
    const currentYear = new Date().getFullYear();

    if (isNaN(year) || year < 1900 || year > currentYear) {
      handleChange(key, '');
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.currentTarget.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    router.push(`/?${params.toString()}`);
  };

  const handleReset = () => {
    setFilters({
      brand_id: '',
      model_id: '',
      city: '',
      year_gte: '',
      year_lte: currentYear,
      price_gte: '',
      price_lte: '',
      mileage_gte: '',
      mileage_lte: '',
      fuel: '',
      transmission: '',
      body_type: '',
      engine_displ_l_gte: '',
      engine_displ_l_lte: '',
      color: '',
      doors: '',
      currency: '',
      sortBy: 'created_at',
      sortOrder: 'DESC',
    });
    router.push('/');
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 md:p-5 mb-6">
      <h2 className="text-base md:text-lg font-bold mb-4 text-primary-400 underline">
        Основни критерии
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-primary-500/20">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Марка</label>
          <Dropdown
            value={filters.brand_id}
            onChange={(value) => handleChange('brand_id', value)}
            searchable={true}
            options={[
              { value: '', label: 'Сите марки' },
              ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Модел</label>
          <Dropdown
            value={filters.model_id}
            onChange={(value) => handleChange('model_id', value)}
            disabled={!filters.brand_id || loadingModels}
            searchable={true}
            options={[
              { value: '', label: 'Сите модели' },
              ...models.map((model) => ({ value: model.id, label: model.name })),
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Град</label>
          <Dropdown
            value={filters.city}
            onChange={(value) => handleChange('city', value)}
            searchable={true}
            options={[
              { value: '', label: 'Сите градови' },
              ...cities.map((city) => ({
                value: city.nameEn,
                label: `${city.name} (${city.nameEn})`,
              })),
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pb-4 border-b border-primary-500/20">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Година од</label>
          <input
            type="number"
            value={filters.year_gte}
            onChange={(e) => handleChange('year_gte', e.target.value)}
            onBlur={(e) => handleYearBlur('year_gte', e.target.value)}
            onWheel={handleWheel}
            className="input-field"
            placeholder="2018"
            min="1900"
            max={currentYear}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Година до</label>
          <input
            type="number"
            value={filters.year_lte}
            onChange={(e) => handleChange('year_lte', e.target.value)}
            onBlur={(e) => handleYearBlur('year_lte', e.target.value)}
            onWheel={handleWheel}
            className="input-field"
            placeholder="2023"
            min="1900"
            max={currentYear}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-primary-500/20">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Валута</label>
          <Dropdown
            value={filters.currency}
            onChange={(value) => handleChange('currency', value)}
            options={[
              { value: '', label: 'Сите валути' },
              { value: 'MKD', label: 'MKD' },
              { value: 'EUR', label: 'EUR' },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Цена од</label>
          <input
            type="number"
            value={filters.price_gte}
            onChange={(e) => handleChange('price_gte', e.target.value)}
            onWheel={handleWheel}
            className="input-field"
            placeholder="0"
            min="0"
            max="99999999"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Цена до</label>
          <input
            type="number"
            value={filters.price_lte}
            onChange={(e) => handleChange('price_lte', e.target.value)}
            onWheel={handleWheel}
            className="input-field"
            placeholder="500000"
            min="0"
            max="99999999"
          />
        </div>
      </div>

      <div className="mb-4 pb-4 border-b border-primary-500/20">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base md:text-lg font-bold text-primary-400 underline">
            Дополнителни критерии
          </h2>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm font-semibold bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/40 hover:border-primary-500/60 text-primary-300 hover:text-primary-200 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm"
          >
            <span>{showAdvanced ? 'Сокриј' : 'Прикажи'}</span>
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Поминување од (км)
                </label>
                <input
                  type="number"
                  value={filters.mileage_gte}
                  onChange={(e) => handleChange('mileage_gte', e.target.value)}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Поминување до (км)
                </label>
                <input
                  type="number"
                  value={filters.mileage_lte}
                  onChange={(e) => handleChange('mileage_lte', e.target.value)}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="200000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Запремина на моторот од (л)
                </label>
                <input
                  type="text"
                  value={filters.engine_displ_l_gte}
                  onChange={(e) => {
                    let value = e.target.value.replace(',', '.');
                    value = value.replace(/[^0-9.]/g, '');
                    const parts = value.split('.');
                    if (parts.length > 2) {
                      value = parts[0] + '.' + parts.slice(1).join('');
                    }
                    if (parts.length === 2 && parts[1].length > 2) {
                      value = parts[0] + '.' + parts[1].substring(0, 2);
                    }
                    handleChange('engine_displ_l_gte', value);
                  }}
                  onBlur={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0) {
                      const clampedValue = value > 100 ? 100 : value < 0 ? 0 : value;
                      const formattedValue = clampedValue.toFixed(2).replace(/\.?0+$/, '');
                      handleChange('engine_displ_l_gte', formattedValue);
                    } else if (e.target.value && e.target.value.trim() !== '') {
                      const numValue = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(numValue)) {
                        const clampedValue = numValue > 100 ? 100 : numValue < 0 ? 0 : numValue;
                        const formattedValue = clampedValue.toFixed(2).replace(/\.?0+$/, '');
                        handleChange('engine_displ_l_gte', formattedValue);
                      } else {
                        handleChange('engine_displ_l_gte', '');
                      }
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="1.0"
                  title="Внесете запремина на моторот во литри (на пример: 1.5)"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Запремина на моторот до (л)
                </label>
                <input
                  type="text"
                  value={filters.engine_displ_l_lte}
                  onChange={(e) => {
                    let value = e.target.value.replace(',', '.');
                    value = value.replace(/[^0-9.]/g, '');
                    const parts = value.split('.');
                    if (parts.length > 2) {
                      value = parts[0] + '.' + parts.slice(1).join('');
                    }
                    if (parts.length === 2 && parts[1].length > 2) {
                      value = parts[0] + '.' + parts[1].substring(0, 2);
                    }
                    handleChange('engine_displ_l_lte', value);
                  }}
                  onBlur={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0) {
                      const clampedValue = value > 100 ? 100 : value < 0 ? 0 : value;
                      const formattedValue = clampedValue.toFixed(2).replace(/\.?0+$/, '');
                      handleChange('engine_displ_l_lte', formattedValue);
                    } else if (e.target.value && e.target.value.trim() !== '') {
                      const numValue = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(numValue)) {
                        const clampedValue = numValue > 100 ? 100 : numValue < 0 ? 0 : numValue;
                        const formattedValue = clampedValue.toFixed(2).replace(/\.?0+$/, '');
                        handleChange('engine_displ_l_lte', formattedValue);
                      } else {
                        handleChange('engine_displ_l_lte', '');
                      }
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="6.0"
                  title="Внесете запремина на моторот во литри (на пример: 6.0)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Топливо</label>
                <Dropdown
                  value={filters.fuel}
                  onChange={(value) => handleChange('fuel', value)}
                  options={[
                    { value: '', label: 'Сите' },
                    { value: 'Petrol', label: 'Бензин' },
                    { value: 'Diesel', label: 'Дизел' },
                    { value: 'Electric', label: 'Електричен' },
                    { value: 'Hybrid', label: 'Хибриден' },
                    { value: 'LPG', label: 'LPG' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">КПП</label>
                <Dropdown
                  value={filters.transmission}
                  onChange={(value) => handleChange('transmission', value)}
                  options={[
                    { value: '', label: 'Сите' },
                    { value: 'Manual', label: 'Мануелна' },
                    { value: 'Automatic', label: 'Автоматска' },
                    { value: 'CVT', label: 'Варијатор' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Тип на каросерија
                </label>
                <Dropdown
                  value={filters.body_type}
                  onChange={(value) => handleChange('body_type', value)}
                  options={[
                    { value: '', label: 'Сите' },
                    { value: 'Sedan', label: 'Седан' },
                    { value: 'Hatchback', label: 'Хечбек' },
                    { value: 'Wagon', label: 'Караван' },
                    { value: 'SUV', label: 'SUV' },
                    { value: 'Coupe', label: 'Купе' },
                    { value: 'Convertible', label: 'Кабриолет' },
                    { value: 'Van', label: 'Фургон' },
                    { value: 'Pickup', label: 'Пикап' },
                    { value: 'Minivan', label: 'Миниван' },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Боја</label>
                <Dropdown
                  value={filters.color}
                  onChange={(value) => handleChange('color', value)}
                  options={[
                    { value: '', label: 'Сите' },
                    { value: 'Црна', label: 'Црна' },
                    { value: 'Бела', label: 'Бела' },
                    { value: 'Сива', label: 'Сива' },
                    { value: 'Сребрена', label: 'Сребрена' },
                    { value: 'Сина', label: 'Сина' },
                    { value: 'Црвена', label: 'Црвена' },
                    { value: 'Зелена', label: 'Зелена' },
                    { value: 'Жолта', label: 'Жолта' },
                    { value: 'Кафена', label: 'Кафена' },
                    { value: 'Портокалова', label: 'Портокалова' },
                    { value: 'Розова', label: 'Розова' },
                    { value: 'Виолетова', label: 'Виолетова' },
                    { value: 'Бежова', label: 'Бежова' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Врати</label>
                <Dropdown
                  value={filters.doors}
                  onChange={(value) => handleChange('doors', value)}
                  options={[
                    { value: '', label: 'Сите' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                    { value: '5', label: '5' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 pb-4 border-b border-primary-500/20">
        <label className="block text-sm font-semibold mb-2 text-primary-400">Подреди</label>
        <Dropdown
          value={`${filters.sortBy}_${filters.sortOrder}`}
          onChange={(value) => {
            const [sortBy, sortOrder] = value.split('_');
            setFilters({ ...filters, sortBy, sortOrder });
          }}
          options={[
            { value: 'created_at_DESC', label: 'Најнови прво' },
            { value: 'created_at_ASC', label: 'Најстари прво' },
            { value: 'price_ASC', label: 'Цена растечки' },
            { value: 'price_DESC', label: 'Цена опаѓачки' },
            { value: 'year_DESC', label: 'Година опаѓачки' },
            { value: 'year_ASC', label: 'Година растечки' },
          ]}
        />
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <button type="submit" className="w-full sm:w-auto btn-primary px-6 py-2.5">
          Пребарај
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="w-full sm:w-auto btn-secondary px-6 py-2.5"
        >
          Ресетирај
        </button>
      </div>
    </form>
  );
}
