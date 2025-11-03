'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { listingsApi, brandsApi, citiesApi, Brand, VehicleModel, City } from '@/lib/api';
import { Currency, CurrencyEnum, ListingStatus, ListingStatusEnum } from '@/lib/types';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Dropdown } from '@/components/Dropdown';
import { RichTextEditor } from '@/components/RichTextEditor';

export default function NewListingPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showVinHint, setShowVinHint] = useState(false);

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/login');
      return;
    }

    if (isInitialized && user) {
      brandsApi.getAll().then((res) => {
        const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
        setBrands(sorted);
      });
      citiesApi.getAll().then((res) => {
        const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
        setCities(sorted);
      });
    }
  }, [user, isInitialized, router]);

  const [formData, setFormData] = useState<{
    price: string;
    currency: Currency;
    city: string;
    description: string;
    status: ListingStatus;
    images: string[];
    urgent: boolean;
    vin: string;
    vehicle: {
      brand_id: string;
      model_id: string;
      year: string;
      engine_displ_l: string;
      mileage_km: string;
      fuel: string;
      transmission: string;
      body_type: string;
      color: string;
      doors: string;
    };
  }>({
    price: '',
    currency: CurrencyEnum.EUR,
    city: '',
    description: '',
    status: ListingStatusEnum.Active,
    images: [] as string[],
    urgent: false,
    vin: '',
    vehicle: {
      brand_id: '',
      model_id: '',
      year: '',
      engine_displ_l: '',
      mileage_km: '',
      fuel: '',
      transmission: '',
      body_type: '',
      color: '',
      doors: '',
    },
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (formData.vehicle.brand_id) {
      setLoadingModels(true);
      brandsApi.getModels(formData.vehicle.brand_id).then((res) => {
        const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
        setModels(sorted);
        setLoadingModels(false);
        setFormData((prev) => {
          if (!res.data.find((m) => m.id === prev.vehicle.model_id)) {
            return {
              ...prev,
              vehicle: { ...prev.vehicle, model_id: '' },
            };
          }
          return prev;
        });
      });
    } else {
      setModels([]);
      setFormData((prev) => ({
        ...prev,
        vehicle: { ...prev.vehicle, model_id: '' },
      }));
    }
  }, [formData.vehicle.brand_id]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:4000/api/upload/image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Грешка при вчитување на датотека');
      }

      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, data.url],
      }));
      toast.success('Фото е вчитано');
    } catch {
      toast.error('Грешка при вчитување на фото');
    } finally {
      setUploading(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.currentTarget.blur();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.vehicle.brand_id) {
      toast.error('Потребно е да изберете марка');
      return;
    }

    if (!formData.vehicle.model_id) {
      toast.error('Потребно е да изберете модел');
      return;
    }

    if (!formData.vehicle.year) {
      toast.error('Потребно е да внесете година');
      return;
    }

    if (!formData.vehicle.engine_displ_l) {
      toast.error('Потребно е да внесете запремина на моторот');
      return;
    }

    if (!formData.vehicle.mileage_km) {
      toast.error('Потребно е да внесете поминување');
      return;
    }

    if (!formData.vehicle.fuel) {
      toast.error('Потребно е да изберете топливо');
      return;
    }

    if (!formData.vehicle.transmission) {
      toast.error('Потребно е да изберете КПП');
      return;
    }

    if (!formData.vehicle.body_type) {
      toast.error('Потребно е да изберете тип на каросерија');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Потребно е да внесете валидна цена');
      return;
    }

    if (!formData.city) {
      toast.error('Потребно е да изберете град');
      return;
    }

    if (formData.images.length < 2) {
      toast.error('Потребно е да вчитате минимум 2 фотографии');
      return;
    }

    if (formData.vin && formData.vin.length !== 17) {
      toast.error('VIN мора да биде точно 17 карактери');
      return;
    }

    if (formData.vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(formData.vin)) {
      toast.error('VIN мора да содржи само букви и бројки (без I, O, Q)');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        price: parseFloat(formData.price),
        currency: formData.currency,
        city: formData.city,
        description: formData.description || undefined,
        status: formData.status,
        images: formData.images,
        urgent: formData.urgent,
        vin: formData.vin ? formData.vin.toUpperCase() : undefined,
        vehicle: {
          brand_id: formData.vehicle.brand_id,
          model_id: formData.vehicle.model_id,
          year: parseInt(formData.vehicle.year),
          engine_displ_l: formData.vehicle.engine_displ_l
            ? parseFloat(formData.vehicle.engine_displ_l)
            : undefined,
          mileage_km: formData.vehicle.mileage_km
            ? parseInt(formData.vehicle.mileage_km)
            : undefined,
          fuel: (formData.vehicle.fuel || undefined) as
            | 'Petrol'
            | 'Diesel'
            | 'Electric'
            | 'Hybrid'
            | 'LPG'
            | undefined,
          transmission: (formData.vehicle.transmission || undefined) as
            | 'Manual'
            | 'Automatic'
            | 'CVT'
            | undefined,
          body_type: formData.vehicle.body_type as
            | 'Sedan'
            | 'Hatchback'
            | 'Wagon'
            | 'SUV'
            | 'Coupe'
            | 'Convertible'
            | 'Van'
            | 'Pickup'
            | 'Minivan',
          color: formData.vehicle.color || undefined,
          doors: formData.vehicle.doors ? parseInt(formData.vehicle.doors) : undefined,
        },
      };

      const res = await listingsApi.create(payload);
      toast.success('Објавата е креирана');
      router.push(`/listings/${res.data.id}`);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        Додади објава
      </h1>
      <form onSubmit={handleSubmit} className="card p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-green-400">Основна информација</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">Марка *</label>
              <Dropdown
                value={formData.vehicle.brand_id}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    vehicle: { ...formData.vehicle, brand_id: value },
                  })
                }
                searchable={true}
                placeholder="Изберете марка"
                options={[
                  { value: '', label: 'Изберете марка' },
                  ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">Модел *</label>
              <Dropdown
                value={formData.vehicle.model_id}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    vehicle: { ...formData.vehicle, model_id: value },
                  })
                }
                disabled={!formData.vehicle.brand_id || loadingModels}
                searchable={true}
                placeholder={loadingModels ? 'Вчитување...' : 'Изберете модел'}
                options={[
                  { value: '', label: 'Изберете модел' },
                  ...models.map((model) => ({ value: model.id, label: model.name })),
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">Година *</label>
              <input
                type="number"
                required
                min="1900"
                max={new Date().getFullYear() + 1}
                value={formData.vehicle.year}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vehicle: { ...formData.vehicle, year: e.target.value },
                  })
                }
                onWheel={handleWheel}
                className="input-field h-[48px]"
                placeholder="2020"
                title="Внесете година на производство на автомобилот"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center justify-between">
                <span>VIN</span>
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => setShowVinHint(!showVinHint)}
                    className="focus:outline-none"
                  >
                    <svg
                      className="w-4 h-4 text-green-400 hover:text-green-300 cursor-help transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  <div
                    className={`absolute right-0 bottom-full mb-2 ${showVinHint ? 'block' : 'hidden group-hover:block'} z-10 w-64`}
                  >
                    <div className="bg-bg-darker border-2 border-primary-500/50 rounded-lg p-3 shadow-lg">
                      <p className="text-xs text-gray-300 leading-relaxed">
                        VIN кодот се користи за креирање на историја на возилото на веб-страницата.
                        Во историјата не се чуваат персональни податоци, туку само историјата на
                        возилото
                      </p>
                      <div className="absolute right-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-primary-500/50"></div>
                    </div>
                  </div>
                </div>
              </label>
              <input
                type="text"
                maxLength={17}
                value={formData.vin}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
                  setFormData({ ...formData, vin: value });
                }}
                className="input-field h-[48px]"
                placeholder="17 карактери (без I, O, Q)"
                title="Внесете VIN код (17 карактери, без буквите I, O, Q)"
              />
              {formData.vin && formData.vin.length > 0 && formData.vin.length < 17 && (
                <p className="mt-1 text-sm text-gray-400">
                  Остануваат {17 - formData.vin.length} карактери
                </p>
              )}
              {formData.vin && formData.vin.length === 17 && (
                <p className="mt-1 text-sm text-green-400">✓ VIN е валиден</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-primary-500/20 pt-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-green-400">
            Технички карактеристики
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Запремина на моторот (л) *
              </label>
              <input
                type="text"
                required
                step="0.1"
                min="0.1"
                max="100"
                value={formData.vehicle.engine_displ_l}
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
                  setFormData({
                    ...formData,
                    vehicle: { ...formData.vehicle, engine_displ_l: value },
                  });
                }}
                onBlur={(e) => {
                  let value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    if (value < 0.1) {
                      value = 0.1;
                    } else if (value > 100) {
                      value = 100;
                    }
                    setFormData({
                      ...formData,
                      vehicle: { ...formData.vehicle, engine_displ_l: value.toFixed(1) },
                    });
                  } else if (e.target.value && e.target.value.trim() !== '') {
                    const numValue = parseFloat(e.target.value);
                    if (!isNaN(numValue)) {
                      setFormData({
                        ...formData,
                        vehicle: { ...formData.vehicle, engine_displ_l: numValue.toFixed(1) },
                      });
                    }
                  }
                }}
                className="input-field h-[48px]"
                placeholder="2.0"
                title="Внесете запремина на моторот во литри (на пример: 2.0)"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Поминување (км) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.vehicle.mileage_km}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vehicle: { ...formData.vehicle, mileage_km: e.target.value },
                  })
                }
                onWheel={handleWheel}
                className="input-field h-[48px]"
                placeholder="50000"
                title="Внесете поминување на автомобилот во километри"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">Топливо *</label>
              <Dropdown
                value={formData.vehicle.fuel}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    vehicle: { ...formData.vehicle, fuel: value },
                  })
                }
                options={[
                  { value: '', label: 'Изберете' },
                  { value: 'Petrol', label: 'Бензин' },
                  { value: 'Diesel', label: 'Дизел' },
                  { value: 'Electric', label: 'Електричен' },
                  { value: 'Hybrid', label: 'Хибриден' },
                  { value: 'LPG', label: 'LPG' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">КПП *</label>
              <Dropdown
                value={formData.vehicle.transmission}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    vehicle: { ...formData.vehicle, transmission: value },
                  })
                }
                options={[
                  { value: '', label: 'Изберете' },
                  { value: 'Manual', label: 'Мануелна' },
                  { value: 'Automatic', label: 'Автоматска' },
                  { value: 'CVT', label: 'Варијатор' },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-primary-500/20 pt-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-green-400">Надворешен изглед</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Тип на каросерија *
              </label>
              <Dropdown
                value={formData.vehicle.body_type}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    vehicle: { ...formData.vehicle, body_type: value },
                  })
                }
                options={[
                  { value: '', label: 'Изберете' },
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

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">Боја</label>
              <Dropdown
                value={formData.vehicle.color}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    vehicle: { ...formData.vehicle, color: value },
                  })
                }
                options={[
                  { value: '', label: 'Изберете боја' },
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
                  { value: 'Златна', label: 'Златна' },
                  { value: 'Бронзена', label: 'Бронзена' },
                  { value: 'Темносина', label: 'Темносина' },
                  { value: 'Светлосина', label: 'Светлосина' },
                  { value: 'Темносива', label: 'Темносива' },
                  { value: 'Светлосива', label: 'Светлосива' },
                  { value: 'Металик црна', label: 'Металик црна' },
                  { value: 'Металик бела', label: 'Металик бела' },
                  { value: 'Металик сива', label: 'Металик сива' },
                  { value: 'Металик сребрена', label: 'Металик сребрена' },
                  { value: 'Металик сина', label: 'Металик сина' },
                  { value: 'Металик црвена', label: 'Металик црвена' },
                  { value: 'Перла', label: 'Перла' },
                  { value: 'Металик перла', label: 'Металик перла' },
                  { value: 'Матирана црна', label: 'Матирана црна' },
                  { value: 'Матирана сива', label: 'Матирана сива' },
                  { value: 'Матирана сина', label: 'Матирана сина' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Број на врати
              </label>
              <Dropdown
                value={formData.vehicle.doors}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    vehicle: { ...formData.vehicle, doors: value },
                  })
                }
                options={[
                  { value: '', label: 'Изберете' },
                  { value: '2', label: '2 врати' },
                  { value: '3', label: '3 врати' },
                  { value: '4', label: '4 врати' },
                  { value: '5', label: '5 врати' },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-primary-500/20 pt-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-green-400">Цена и локација</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">Цена *</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  max="999999999"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  onWheel={handleWheel}
                  className="input-field flex-1 h-[48px]"
                  placeholder="0"
                  title="Внесете цена на автомобилот"
                />
                <Dropdown
                  value={formData.currency}
                  onChange={(value) => setFormData({ ...formData, currency: value as Currency })}
                  className="w-32 flex-shrink-0"
                  options={[
                    { value: CurrencyEnum.MKD, label: 'MKD' },
                    { value: CurrencyEnum.EUR, label: 'EUR' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">Град *</label>
              <Dropdown
                value={formData.city}
                onChange={(value) => setFormData({ ...formData, city: value })}
                searchable={true}
                placeholder="Изберете град"
                options={[
                  { value: '', label: 'Изберете град' },
                  ...cities.map((city) => ({
                    value: city.nameEn,
                    label: `${city.name} (${city.nameEn})`,
                  })),
                ]}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-primary-500/20 pt-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-green-400">
            Дополнителна информација
          </h2>
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2 text-primary-400">Опис</label>
            <RichTextEditor
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              placeholder="Додадете опис на автомобилот..."
              maxLength={5000}
              rows={4}
            />
          </div>

          <div>
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.urgent}
                  onChange={(e) => setFormData({ ...formData, urgent: e.target.checked })}
                  className="sr-only"
                />
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    setFormData({ ...formData, urgent: !formData.urgent });
                  }}
                  className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                    formData.urgent
                      ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                      : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                  }`}
                >
                  {formData.urgent && (
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
              <span
                className={`text-sm font-semibold transition-colors duration-200 flex items-center gap-2 ${
                  formData.urgent
                    ? 'text-primary-400'
                    : 'text-primary-400/70 group-hover:text-primary-400'
                }`}
              >
                <span>🔥</span>
                <span>Итно</span>
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-500/20 pt-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-green-400">Фотографии</h2>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            Фотографии на автомобилот *
          </label>
          <p className="text-sm text-gray-400 mb-3">
            Потребно е да вчитате минимум 2 фотографии (максимум 20)
          </p>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach((file) => {
                if (formData.images.length < 20) {
                  const allowedTypes = [
                    'image/jpeg',
                    'image/jpg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                  ];
                  if (!allowedTypes.includes(file.type)) {
                    toast.error('Поддржани се само слики (JPEG, PNG, GIF, WebP)');
                    return;
                  }
                  handleFileUpload(file);
                } else {
                  toast.error('Максимум 20 фотографии');
                }
              });
            }}
            disabled={uploading || formData.images.length >= 20}
            className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
          />
          {formData.images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {formData.images.map((url, index) => (
                <div key={index} className="relative">
                  <Image
                    src={url}
                    alt={`Photo ${index + 1}`}
                    width={200}
                    height={96}
                    className="w-full h-24 object-cover rounded"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        images: prev.images.filter((_, i) => i !== index),
                      }));
                    }}
                    className="absolute top-0 right-0 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:shadow-md transition-all"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-sm text-gray-400">
            Вчитано: {formData.images.length}/20{' '}
            {formData.images.length < 2 && (
              <span className="text-red-400">(потребно минимум 2)</span>
            )}
          </p>
        </div>

        <div className="border-t border-primary-500/20 pt-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-green-400">
            Нагодувања на објавата
          </h2>
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              Статус на објавата *
            </label>
            <Dropdown
              value={formData.status}
              onChange={(value) =>
                setFormData({ ...formData, status: value as 'Active' | 'Paused' })
              }
              options={[
                { value: 'Active', label: 'Објавено (се прикажува во каталог)' },
                { value: 'Paused', label: 'Привремено застарено (не се прикажува во каталог)' },
              ]}
            />
            <p className="mt-2 text-sm text-gray-400">
              {formData.status === 'Active' && 'Објавата веднаш ќе биде видлива за сите корисници'}
              {formData.status === 'Paused' &&
                'Објавата ќе биде скриена, но можете да ја објавите подоцна'}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? 'Креирање...' : 'Креирај објава'}
        </button>
      </form>
    </div>
  );
}
