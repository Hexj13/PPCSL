'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { brandsApi, citiesApi, Brand, VehicleModel, City } from '@/lib/api';
import { ConditionType, DriveType, RegistrationType } from '@/lib/constants';

import { Dropdown } from './Dropdown';
import { MultiSelectDropdown } from './MultiSelectDropdown';

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const currentYear = new Date().getFullYear().toString();

  const parseArrayParam = (param: string | null): string[] => {
    if (!param) return [];
    return param.split(',').filter((v) => v.trim() !== '');
  };

  const hasAdvancedFilters =
    searchParams.get('mileage_gte') ||
    searchParams.get('mileage_lte') ||
    searchParams.get('fuels') ||
    searchParams.get('transmissions') ||
    searchParams.get('body_types') ||
    searchParams.get('engine_displ_l_gte') ||
    searchParams.get('engine_displ_l_lte') ||
    searchParams.get('colors') ||
    searchParams.get('doors') ||
    searchParams.get('urgent') ||
    searchParams.get('is_new') ||
    searchParams.get('fuel') ||
    searchParams.get('transmission') ||
    searchParams.get('body_type') ||
    searchParams.get('color') ||
    searchParams.get('conditions') ||
    searchParams.get('registration_types') ||
    searchParams.get('horsepower_gte') ||
    searchParams.get('horsepower_lte') ||
    searchParams.get('drive_types') ||
    searchParams.get('is_registered');

  const [showAdvanced, setShowAdvanced] = useState(!!hasAdvancedFilters);

  const [filters, setFilters] = useState({
    brand_ids: parseArrayParam(
      searchParams.get('brand_ids') || searchParams.get('brand_id') || null
    ),
    model_ids: parseArrayParam(
      searchParams.get('model_ids') || searchParams.get('model_id') || null
    ),
    cities: parseArrayParam(searchParams.get('cities') || searchParams.get('city') || null),
    year_gte: searchParams.get('year_gte') || '',
    year_lte: searchParams.get('year_lte') || currentYear,
    price_gte: searchParams.get('price_gte') || '',
    price_lte: searchParams.get('price_lte') || '',
    mileage_gte: searchParams.get('mileage_gte') || '',
    mileage_lte: searchParams.get('mileage_lte') || '',
    fuels: parseArrayParam(searchParams.get('fuels') || searchParams.get('fuel') || null),
    transmissions: parseArrayParam(
      searchParams.get('transmissions') || searchParams.get('transmission') || null
    ),
    body_types: parseArrayParam(
      searchParams.get('body_types') || searchParams.get('body_type') || null
    ),
    engine_displ_l_gte: searchParams.get('engine_displ_l_gte') || '',
    engine_displ_l_lte: searchParams.get('engine_displ_l_lte') || '',
    colors: parseArrayParam(searchParams.get('colors') || searchParams.get('color') || null),
    doors: parseArrayParam(searchParams.get('doors') || null),
    currency: searchParams.get('currency') || '',
    urgent: searchParams.get('urgent') === 'true',
    is_new: searchParams.get('is_new') === 'true',
    conditions: parseArrayParam(searchParams.get('conditions') || null),
    registration_types: parseArrayParam(searchParams.get('registration_types') || null),
    horsepower_gte: searchParams.get('horsepower_gte') || '',
    horsepower_lte: searchParams.get('horsepower_lte') || '',
    drive_types: parseArrayParam(searchParams.get('drive_types') || null),
    is_registered:
      searchParams.get('is_registered') === 'true'
        ? true
        : searchParams.get('is_registered') === 'false'
          ? false
          : undefined,
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
    if (filters.brand_ids.length > 0) {
      setLoadingModels(true);
      Promise.all(filters.brand_ids.map((brandId) => brandsApi.getModels(brandId)))
        .then((responses) => {
          const allModels = responses.flatMap((res) => res.data);
          const uniqueModels = Array.from(
            new Map(allModels.map((model) => [model.id, model])).values()
          );
          const sorted = [...uniqueModels].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
          setModels(sorted);
          setLoadingModels(false);
          setFilters((prev) => {
            const validModelIds = prev.model_ids.filter((modelId) =>
              sorted.find((m) => m.id === modelId)
            );
            return { ...prev, model_ids: validModelIds };
          });
        })
        .catch(() => {
          setLoadingModels(false);
        });
    } else {
      setModels([]);
      setFilters((prev) => ({ ...prev, model_ids: [] }));
    }
  }, [filters.brand_ids]);

  const handleChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleMultiSelectChange = (key: string, values: string[]) => {
    setFilters({ ...filters, [key]: values });
  };

  const handleCheckboxChange = (key: string, checked: boolean) => {
    setFilters({ ...filters, [key]: checked });
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
      if (key === 'sortBy' || key === 'sortOrder') {
        if (value !== '') {
          params.set(key, value as string);
        }
        return;
      }
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','));
        }
      } else if (value !== '' && value !== undefined) {
        if (typeof value === 'boolean') {
          params.set(key, value.toString());
        } else {
          params.set(key, value as string);
        }
      }
    });
    router.push(`/?${params.toString()}`);
  };

  const handleReset = () => {
    setFilters({
      brand_ids: [],
      model_ids: [],
      cities: [],
      year_gte: '',
      year_lte: currentYear,
      price_gte: '',
      price_lte: '',
      mileage_gte: '',
      mileage_lte: '',
      fuels: [],
      transmissions: [],
      body_types: [],
      engine_displ_l_gte: '',
      engine_displ_l_lte: '',
      colors: [],
      doors: [],
      currency: '',
      urgent: false,
      is_new: false,
      conditions: [],
      registration_types: [],
      horsepower_gte: '',
      horsepower_lte: '',
      drive_types: [],
      is_registered: undefined,
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
          <MultiSelectDropdown
            values={filters.brand_ids}
            onChange={(values) => handleMultiSelectChange('brand_ids', values)}
            searchable={true}
            placeholder="Избери марки"
            options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Модел</label>
          <MultiSelectDropdown
            values={filters.model_ids}
            onChange={(values) => handleMultiSelectChange('model_ids', values)}
            disabled={filters.brand_ids.length === 0 || loadingModels}
            searchable={true}
            placeholder="Избери модели"
            options={models.map((model) => ({ value: model.id, label: model.name }))}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Град</label>
          <MultiSelectDropdown
            values={filters.cities}
            onChange={(values) => handleMultiSelectChange('cities', values)}
            searchable={true}
            placeholder="Избери градови"
            options={cities.map((city) => ({
              value: city.nameEn,
              label: `${city.name} (${city.nameEn})`,
            }))}
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
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
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
                    if (parts.length === 2 && parts[1].length > 1) {
                      value = parts[0] + '.' + parts[1].substring(0, 1);
                    }
                    handleChange('engine_displ_l_gte', value);
                  }}
                  onBlur={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0) {
                      const clampedValue = value > 99 ? 99 : value < 0 ? 0 : value;
                      const formattedValue = clampedValue.toFixed(1).replace(/\.?0+$/, '');
                      handleChange('engine_displ_l_gte', formattedValue);
                    } else if (e.target.value && e.target.value.trim() !== '') {
                      const numValue = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(numValue)) {
                        const clampedValue = numValue > 99 ? 99 : numValue < 0 ? 0 : numValue;
                        const formattedValue = clampedValue.toFixed(1).replace(/\.?0+$/, '');
                        handleChange('engine_displ_l_gte', formattedValue);
                      } else {
                        handleChange('engine_displ_l_gte', '');
                      }
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="1.0"
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
                    if (parts.length === 2 && parts[1].length > 1) {
                      value = parts[0] + '.' + parts[1].substring(0, 1);
                    }
                    handleChange('engine_displ_l_lte', value);
                  }}
                  onBlur={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0) {
                      const clampedValue = value > 99 ? 99 : value < 0 ? 0 : value;
                      const formattedValue = clampedValue.toFixed(1).replace(/\.?0+$/, '');
                      handleChange('engine_displ_l_lte', formattedValue);
                    } else if (e.target.value && e.target.value.trim() !== '') {
                      const numValue = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(numValue)) {
                        const clampedValue = numValue > 99 ? 99 : numValue < 0 ? 0 : numValue;
                        const formattedValue = clampedValue.toFixed(1).replace(/\.?0+$/, '');
                        handleChange('engine_displ_l_lte', formattedValue);
                      } else {
                        handleChange('engine_displ_l_lte', '');
                      }
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="6.0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Коњски сили од
                </label>
                <input
                  type="text"
                  value={filters.horsepower_gte}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 9999)) {
                      handleChange('horsepower_gte', value);
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="100"
                  min="1"
                  max="9999"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Коњски сили до
                </label>
                <input
                  type="text"
                  value={filters.horsepower_lte}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 9999)) {
                      handleChange('horsepower_lte', value);
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="500"
                  min="1"
                  max="9999"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Поминување од (км)
                </label>
                <input
                  type="text"
                  value={filters.mileage_gte}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (
                      value === '' ||
                      (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 9999999)
                    ) {
                      handleChange('mileage_gte', value);
                    }
                  }}
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
                  type="text"
                  value={filters.mileage_lte}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (
                      value === '' ||
                      (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 9999999)
                    ) {
                      handleChange('mileage_lte', value);
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="200000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Топливо</label>
                <MultiSelectDropdown
                  values={filters.fuels}
                  onChange={(values) => handleMultiSelectChange('fuels', values)}
                  placeholder="Избери топливо"
                  options={[
                    { value: 'Petrol', label: 'Бензин' },
                    { value: 'Diesel', label: 'Дизел' },
                    { value: 'Electric', label: 'Електричен' },
                    { value: 'Hybrid', label: 'Хибриден' },
                    { value: 'LPG', label: 'LPG' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Пренос</label>
                <MultiSelectDropdown
                  values={filters.transmissions}
                  onChange={(values) => handleMultiSelectChange('transmissions', values)}
                  placeholder="Избери пренос"
                  options={[
                    { value: 'Manual', label: 'Мануелна' },
                    { value: 'Automatic', label: 'Автоматска' },
                    { value: 'CVT', label: 'Варијатор' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Тип на погон
                </label>
                <MultiSelectDropdown
                  values={filters.drive_types}
                  onChange={(values) => handleMultiSelectChange('drive_types', values)}
                  placeholder="Избери тип на погон"
                  options={[
                    { value: DriveType.FWD, label: 'Преден' },
                    { value: DriveType.RWD, label: 'Заден' },
                    { value: DriveType.AWD, label: 'Полн' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Тип на каросерија
                </label>
                <MultiSelectDropdown
                  values={filters.body_types}
                  onChange={(values) => handleMultiSelectChange('body_types', values)}
                  placeholder="Избери тип на каросерија"
                  options={[
                    { value: 'Sedan', label: 'Седан' },
                    { value: 'Hatchback', label: 'Хечбек' },
                    { value: 'Wagon', label: 'Караван' },
                    { value: 'SUV', label: 'SUV' },
                    { value: 'Coupe', label: 'Купе' },
                    { value: 'Convertible', label: 'Кабриолет' },
                    { value: 'Van', label: 'Фургон' },
                    { value: 'Pickup', label: 'Пикап' },
                    { value: 'Minivan', label: 'Миниван' },
                    { value: 'Truck', label: 'Грузовик' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Боја</label>
                <MultiSelectDropdown
                  values={filters.colors}
                  onChange={(values) => handleMultiSelectChange('colors', values)}
                  placeholder="Избери боја"
                  options={[
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
                <MultiSelectDropdown
                  values={filters.doors}
                  onChange={(values) => handleMultiSelectChange('doors', values)}
                  placeholder="Избери број на врати"
                  options={[
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                    { value: '5', label: '5' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Состојба
                </label>
                <MultiSelectDropdown
                  values={filters.conditions}
                  onChange={(values) => handleMultiSelectChange('conditions', values)}
                  placeholder="Избери состојба"
                  options={[
                    { value: ConditionType.Undamaged, label: 'Без оштетувања' },
                    { value: ConditionType.Damaged, label: 'Со оштетувања' },
                    { value: ConditionType.ForParts, label: 'За делови' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Тип на регистрација
                </label>
                <MultiSelectDropdown
                  values={filters.registration_types}
                  onChange={(values) => handleMultiSelectChange('registration_types', values)}
                  placeholder="Избери тип на регистрација"
                  options={[
                    { value: RegistrationType.Local, label: 'Местна' },
                    { value: RegistrationType.Foreign, label: 'Странска' },
                    { value: RegistrationType.Cleared, label: 'Цариниран' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Регистрација
                </label>
                <Dropdown
                  value={
                    filters.is_registered === true
                      ? 'true'
                      : filters.is_registered === false
                        ? 'false'
                        : ''
                  }
                  onChange={(value) =>
                    handleChange(
                      'is_registered',
                      value === 'true' ? 'true' : value === 'false' ? 'false' : ''
                    )
                  }
                  options={[
                    { value: '', label: 'Сите' },
                    { value: 'true', label: 'Зарегистрирано' },
                    { value: 'false', label: 'Не е зарегистрирано' },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="urgent"
                    checked={filters.urgent}
                    onChange={(e) => handleCheckboxChange('urgent', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      handleCheckboxChange('urgent', !filters.urgent);
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      filters.urgent
                        ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                        : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                    }`}
                  >
                    {filters.urgent && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <label
                  htmlFor="urgent"
                  className={`text-sm font-semibold transition-colors duration-200 flex items-center gap-2 cursor-pointer ${
                    filters.urgent
                      ? 'text-primary-400'
                      : 'text-primary-400/70 group-hover:text-primary-400'
                  }`}
                >
                  <span>🔥</span>
                  <span>Итно</span>
                </label>
              </div>

              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="is_new"
                    checked={filters.is_new}
                    onChange={(e) => handleCheckboxChange('is_new', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      handleCheckboxChange('is_new', !filters.is_new);
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      filters.is_new
                        ? 'bg-gradient-to-r from-green-700 to-green-800 border-green-500'
                        : 'border-green-500/50 bg-bg-light group-hover:border-green-500'
                    }`}
                  >
                    {filters.is_new && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <label
                  htmlFor="is_new"
                  className={`text-sm font-semibold transition-colors duration-200 flex items-center gap-2 cursor-pointer ${
                    filters.is_new
                      ? 'text-green-400'
                      : 'text-green-400/70 group-hover:text-green-400'
                  }`}
                >
                  <span>✨</span>
                  <span>Ново</span>
                </label>
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
            { value: 'views_DESC', label: 'Популарно' },
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
