'use client';

import { AxiosError } from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { Dropdown } from '@/components/Dropdown';
import { RichTextEditor } from '@/components/RichTextEditor';
import {
  listingsApi,
  brandsApi,
  citiesApi,
  uploadApi,
  Brand,
  VehicleModel,
  City,
  Listing,
} from '@/lib/api';
import {
  ConditionType,
  ConditionTypeEnum,
  Currency,
  CurrencyEnum,
  DriveTypeEnum,
  ListingStatus,
  ListingStatusEnum,
  RegistrationType,
  RegistrationTypeEnum,
} from '@/lib/types';

export interface ListingFormData {
  price: string;
  currency: Currency;
  city: string;
  description: string;
  status: ListingStatus;
  images: string[];
  urgent: boolean;
  is_new: boolean;
  vin: string;
  condition: ConditionType;
  registration_type: RegistrationType;
  horsepower: string;
  is_registered: boolean;
  registration_expires_at: string;
  vehicle: {
    brand_id: string;
    model_id: string;
    year: string;
    engine_displ_l: string;
    mileage_km: string;
    fuel: string;
    transmission: string;
    drive_type: string;
    body_type: string;
    color: string;
    doors: string;
  };
}

interface ListingFormProps {
  mode: 'create' | 'edit';
  listingId?: string;
  initialData?: Listing;
  onSuccess?: (_updatedListing?: Listing) => void;
}

const getInitialFormData = (initialData?: Listing): ListingFormData => {
  if (!initialData) {
    return {
      price: '',
      currency: CurrencyEnum.EUR,
      city: '',
      description: '',
      status: ListingStatusEnum.Active,
      images: [],
      urgent: false,
      is_new: false,
      vin: '',
      condition: ConditionTypeEnum.Undamaged,
      registration_type: RegistrationTypeEnum.Local,
      horsepower: '',
      is_registered: false,
      registration_expires_at: '',
      vehicle: {
        brand_id: '',
        model_id: '',
        year: '',
        engine_displ_l: '',
        mileage_km: '',
        fuel: '',
        transmission: '',
        drive_type: '',
        body_type: '',
        color: '',
        doors: '',
      },
    };
  }

  const registrationExpiresAtFormatted = initialData.registration_expires_at
    ? (() => {
        const date = new Date(initialData.registration_expires_at);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${month.toString().padStart(2, '0')}.${year}`;
      })()
    : '';

  return {
    price: initialData.price?.toString() || '',
    currency: initialData.currency || CurrencyEnum.EUR,
    city: initialData.city || '',
    description: initialData.description || '',
    status: initialData.status || ListingStatusEnum.Active,
    images: initialData.images || [],
    urgent: initialData.urgent || false,
    is_new: initialData.is_new || false,
    vin: initialData.vin || '',
    condition: initialData.condition || ConditionTypeEnum.Undamaged,
    registration_type: initialData.registration_type || RegistrationTypeEnum.Local,
    horsepower: initialData.horsepower?.toString() || '',
    is_registered: initialData.is_registered || false,
    registration_expires_at: registrationExpiresAtFormatted,
    vehicle: {
      brand_id: initialData.vehicle?.brand_id || '',
      model_id: initialData.vehicle?.model_id || '',
      year: initialData.vehicle?.year?.toString() || '',
      engine_displ_l: initialData.vehicle?.engine_displ_l?.toString() || '',
      mileage_km: initialData.vehicle?.mileage_km?.toString() || '',
      fuel: initialData.vehicle?.fuel || '',
      transmission: initialData.vehicle?.transmission || '',
      drive_type: initialData.vehicle?.drive_type || '',
      body_type: initialData.vehicle?.body_type || '',
      color: initialData.vehicle?.color || '',
      doors: initialData.vehicle?.doors?.toString() || '',
    },
  };
};

export function ListingForm({ mode, listingId, initialData, onSuccess }: ListingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showVinHint, setShowVinHint] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [formData, setFormData] = useState<ListingFormData>(() => getInitialFormData(initialData));

  useEffect(() => {
    Promise.all([brandsApi.getAll(), citiesApi.getAll()])
      .then(([brandsRes, citiesRes]) => {
        const sortedBrands = [...brandsRes.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
        const sortedCities = [...citiesRes.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
        setBrands(sortedBrands);
        setCities(sortedCities);
        setIsInitialLoading(false);
      })
      .catch(() => {
        setIsInitialLoading(false);
      });
  }, []);

  useEffect(() => {
    if (initialData) {
      const newFormData = getInitialFormData(initialData);
      setFormData(newFormData);
      if (initialData.vehicle?.brand_id) {
        brandsApi.getModels(initialData.vehicle.brand_id).then((res) => {
          const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
          setModels(sorted);
        });
      }
    }
  }, [initialData, listingId]);

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
      const response = await uploadApi.uploadImage(file);
      let imageUrl = response.data.url;

      if (
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:' &&
        imageUrl.startsWith('http://')
      ) {
        imageUrl = imageUrl.replace('http://', 'https://');
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, imageUrl],
      }));
      toast.success('Фото е вчитано');
    } catch {
      toast.error('Грешка при вчитување на фото');
    } finally {
      setUploading(false);
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    if (target === document.activeElement && target.type === 'number') {
      target.blur();
    }
  }, []);

  const validateForm = (): boolean => {
    if (!formData.vehicle.brand_id) {
      toast.error('Потребно е да изберете марка');
      return false;
    }

    if (!formData.vehicle.model_id) {
      toast.error('Потребно е да изберете модел');
      return false;
    }

    if (!formData.vehicle.year) {
      toast.error('Потребно е да внесете година');
      return false;
    }

    const year = parseInt(formData.vehicle.year, 10);
    if (isNaN(year) || !Number.isInteger(year) || year <= 0) {
      toast.error('Годината мора да биде позитивен цел број');
      return false;
    }

    if (year < 1900) {
      toast.error('Годината не може да биде помала од 1900');
      return false;
    }

    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 1;
    if (year > maxYear) {
      toast.error(`Годината не може да биде поголема од ${maxYear}`);
      return false;
    }

    if (!formData.vehicle.engine_displ_l) {
      toast.error('Потребно е да внесете запремина на моторот');
      return false;
    }

    if (!formData.vehicle.mileage_km) {
      toast.error('Потребно е да внесете поминување');
      return false;
    }

    if (!formData.vehicle.fuel) {
      toast.error('Потребно е да изберете топливо');
      return false;
    }

    if (!formData.vehicle.transmission) {
      toast.error('Потребно е да изберете пренос');
      return false;
    }

    if (!formData.vehicle.body_type) {
      toast.error('Потребно е да изберете тип на каросерија');
      return false;
    }

    if (!formData.vehicle.drive_type) {
      toast.error('Потребно е да изберете тип на погон');
      return false;
    }

    if (!formData.price || parseInt(formData.price, 10) <= 0) {
      toast.error('Потребно е да внесете валидна цена (само цели броеви)');
      return false;
    }

    if (!formData.city) {
      toast.error('Потребно е да изберете град');
      return false;
    }

    if (formData.images.length < 2) {
      toast.error('Потребно е да вчитате минимум 2 фотографии');
      return false;
    }

    if (formData.vin && formData.vin.length !== 17) {
      toast.error('VIN мора да биде точно 17 карактери');
      return false;
    }

    if (formData.vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(formData.vin)) {
      toast.error('VIN мора да содржи само букви и бројки (без I, O, Q)');
      return false;
    }

    if (!formData.condition) {
      toast.error('Потребно е да изберете состојба');
      return false;
    }

    if (!formData.registration_type) {
      toast.error('Потребно е да изберете тип на регистрација');
      return false;
    }

    if (!formData.horsepower || parseFloat(formData.horsepower) <= 0) {
      toast.error('Потребно е да внесете валидни коњски сили');
      return false;
    }

    if (formData.is_registered && !formData.registration_expires_at) {
      toast.error('Потребно е да внесете дата до кога е регистрирано');
      return false;
    }

    if (
      formData.is_registered &&
      formData.registration_expires_at &&
      !/^\d{2}\.\d{4}$/.test(formData.registration_expires_at)
    ) {
      toast.error(
        'Датата мора да биде во формат месец.година (на пример: 05.2025). Месецот мора да биде двоцифрен.'
      );
      return false;
    }

    if (formData.is_registered && formData.registration_expires_at) {
      const [month, year] = formData.registration_expires_at.split('.');
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const inputMonth = parseInt(month, 10);
      const inputYear = parseInt(year, 10);

      if (inputYear < currentYear || (inputYear === currentYear && inputMonth < currentMonth)) {
        toast.error('Датата на регистрација не може да биде помала од тековниот месец и година');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const registrationExpiresAt =
        formData.is_registered && formData.registration_expires_at
          ? (() => {
              const [month, year] = formData.registration_expires_at.split('.');
              return `${year}-${month.padStart(2, '0')}-01`;
            })()
          : undefined;

      if (!formData.vehicle.brand_id || !formData.vehicle.model_id) {
        toast.error('Потребно е да изберете марка и модел');
        return;
      }

      const payload = {
        price: parseInt(formData.price, 10),
        currency: formData.currency,
        city: formData.city,
        description: formData.description || undefined,
        status: formData.status,
        images: formData.images,
        urgent: formData.urgent,
        is_new: formData.is_new,
        vin: formData.vin ? formData.vin.toUpperCase() : undefined,
        condition: formData.condition,
        registration_type: formData.registration_type,
        horsepower: parseInt(formData.horsepower),
        is_registered: formData.is_registered || undefined,
        registration_expires_at: registrationExpiresAt,
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
          drive_type: formData.vehicle.drive_type as 'FWD' | 'RWD' | 'AWD',
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

      if (mode === 'create') {
        const res = await listingsApi.create(payload);
        toast.success('Објавата е креирана');
        router.push(`/listings/${res.data.id}`);
      } else {
        if (!listingId) {
          throw new Error('Listing ID is required for edit mode');
        }
        const result = await listingsApi.update(listingId, payload);
        toast.success('Промените се зачувани');
        sessionStorage.setItem(`refreshListing_${listingId}`, 'true');
        if (result.data) {
          const updatedFormData = getInitialFormData(result.data);
          setFormData(updatedFormData);
          if (result.data.vehicle?.brand_id) {
            brandsApi.getModels(result.data.vehicle.brand_id).then((res) => {
              const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
              setModels(sorted);
            });
          }
        }
        onSuccess?.(result.data);
      }
    } catch (error: unknown) {
      if (mode === 'create') {
        toast.error('Грешка при креирање на објавата');
      } else {
        const errorMessage =
          error instanceof AxiosError && error.response?.data?.message
            ? error.response.data.message
            : 'Грешка при зачувување на промените';
        toast.error(
          typeof errorMessage === 'string' ? errorMessage : 'Грешка при зачувување на промените'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="card p-4 md:p-6 lg:p-8">
        <div className="h-96" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">Основна информација</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">Марка *</label>
            <Dropdown
              value={formData.vehicle.brand_id}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, brand_id: value },
                }))
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
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, model_id: value },
                }))
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
              type="text"
              required
              value={formData.vehicle.year}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length <= 4) {
                  setFormData((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, year: value },
                  }));
                }
              }}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value) {
                  const year = parseInt(value, 10);
                  const currentYear = new Date().getFullYear();
                  const maxYear = currentYear + 1;

                  if (isNaN(year) || year < 1900 || year > maxYear) {
                    toast.error(`Годината мора да биде помеѓу 1900 и ${maxYear}`);
                    setFormData((prev) => ({
                      ...prev,
                      vehicle: { ...prev.vehicle, year: '' },
                    }));
                  }
                }
              }}
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
                    className="w-4 h-4 text-primary-400 hover:text-primary-300 cursor-help transition-colors"
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
                    <p className="text-xs text-hint leading-relaxed">
                      VIN кодот се користи за креирање на историја на возилото на веб-страницата. Во
                      историјата не се чуваат персональни податоци, туку само историјата на возилото
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
                setFormData((prev) => ({ ...prev, vin: value }));
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
              <p className="mt-1 text-sm text-primary-400">✓ VIN е валиден</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-primary-500/20 pt-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
          Технички карактеристики
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              Запремина на моторот (л) *
            </label>
            <input
              type="text"
              required
              step="0.1"
              min="0"
              max="99"
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
                const numValue = value === '' ? 0 : parseFloat(value);
                if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 99)) {
                  setFormData((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, engine_displ_l: value },
                  }));
                }
              }}
              onBlur={(e) => {
                let value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  if (value < 0) {
                    value = 0;
                  } else if (value > 99) {
                    value = 99;
                  }
                  setFormData((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, engine_displ_l: value.toFixed(1) },
                  }));
                } else if (e.target.value && e.target.value.trim() !== '') {
                  const numValue = parseFloat(e.target.value);
                  if (!isNaN(numValue)) {
                    const clampedValue = Math.max(0, Math.min(99, numValue));
                    setFormData((prev) => ({
                      ...prev,
                      vehicle: { ...prev.vehicle, engine_displ_l: clampedValue.toFixed(1) },
                    }));
                  }
                }
              }}
              className="input-field h-[48px]"
              placeholder="2.0"
              title="Внесете запремина на моторот во литри (0-99, на пример: 2.0)"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              Коњски сили *
            </label>
            <input
              type="text"
              required
              min="1"
              max="9999"
              value={formData.horsepower}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 9999)) {
                  setFormData((prev) => ({
                    ...prev,
                    horsepower: value,
                  }));
                }
              }}
              onWheel={handleWheel}
              className="input-field h-[48px]"
              placeholder="150"
              title="Внесете коњски сили на автомобилот (1-9999)"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">Топливо *</label>
            <Dropdown
              value={formData.vehicle.fuel}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, fuel: value },
                }))
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
            <label className="block text-sm font-semibold mb-2 text-primary-400">Пренос *</label>
            <Dropdown
              value={formData.vehicle.transmission}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, transmission: value },
                }))
              }
              options={[
                { value: '', label: 'Изберете' },
                { value: 'Manual', label: 'Мануелна' },
                { value: 'Automatic', label: 'Автоматска' },
                { value: 'CVT', label: 'Варијатор' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              Тип на погон *
            </label>
            <Dropdown
              value={formData.vehicle.drive_type}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, drive_type: value },
                }))
              }
              options={[
                { value: '', label: 'Изберете' },
                { value: DriveTypeEnum.FWD, label: 'Преден' },
                { value: DriveTypeEnum.RWD, label: 'Заден' },
                { value: DriveTypeEnum.AWD, label: 'Полн' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              Поминување (км) *
            </label>
            <input
              type="text"
              required
              min="0"
              max="9999999"
              value={formData.vehicle.mileage_km}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 9999999)) {
                  setFormData((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, mileage_km: value },
                  }));
                }
              }}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && /^0+$/.test(value)) {
                  setFormData((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, mileage_km: '0' },
                  }));
                }
              }}
              onWheel={handleWheel}
              className="input-field h-[48px]"
              placeholder="50000"
              title="Внесете поминување на автомобилот во километри (0-9999999)"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-primary-500/20 pt-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
          Состојба и регистрација
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">Состојба *</label>
            <Dropdown
              value={formData.condition}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  condition: value as ConditionType,
                }))
              }
              options={[
                { value: ConditionTypeEnum.Undamaged, label: 'Без оштетувања' },
                { value: ConditionTypeEnum.Damaged, label: 'Со оштетувања' },
                { value: ConditionTypeEnum.ForParts, label: 'За делови' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              Тип на регистрација *
            </label>
            <Dropdown
              value={formData.registration_type}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  registration_type: value as RegistrationType,
                }))
              }
              options={[
                { value: RegistrationTypeEnum.Local, label: 'Местна' },
                { value: RegistrationTypeEnum.Foreign, label: 'Странска' },
                { value: RegistrationTypeEnum.Cleared, label: 'Цариниран' },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.is_registered}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_registered: e.target.checked,
                    registration_expires_at: e.target.checked ? prev.registration_expires_at : '',
                  }))
                }
                className="sr-only"
              />
              <div
                onClick={(e) => {
                  e.preventDefault();
                  setFormData((prev) => ({
                    ...prev,
                    is_registered: !prev.is_registered,
                    registration_expires_at: !prev.is_registered
                      ? prev.registration_expires_at
                      : '',
                  }));
                }}
                className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  formData.is_registered
                    ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                    : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                }`}
              >
                {formData.is_registered && (
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
              className={`text-sm font-semibold transition-colors duration-200 ${
                formData.is_registered
                  ? 'text-primary-400'
                  : 'text-primary-400/70 group-hover:text-primary-400'
              }`}
            >
              Зарегистрирано
            </span>
          </div>

          {formData.is_registered && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Регистрирано до (месец.година)
              </label>
              <input
                type="text"
                value={formData.registration_expires_at}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = value.split('.');
                  if (parts.length > 2) {
                    value = parts[0] + '.' + parts[1];
                  }
                  if (parts[0] && parts[0].length > 2) {
                    value = parts[0].substring(0, 2) + (parts[1] ? '.' + parts[1] : '');
                  }
                  if (parts[1] && parts[1].length > 4) {
                    value = parts[0] + '.' + parts[1].substring(0, 4);
                  }

                  setFormData((prev) => ({
                    ...prev,
                    registration_expires_at: value,
                  }));
                }}
                onBlur={(e) => {
                  let value = e.target.value.trim();
                  if (!value) {
                    return;
                  }

                  const parts = value.split('.');
                  if (parts.length === 2) {
                    const month = parts[0];
                    const year = parts[1];
                    const monthNum = parseInt(month, 10);
                    const yearNum = parseInt(year, 10);

                    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                      const paddedMonth = monthNum.toString().padStart(2, '0');
                      value = `${paddedMonth}.${year}`;

                      if (!isNaN(yearNum) && yearNum >= 1000 && yearNum <= 9999) {
                        const currentDate = new Date();
                        const currentMonth = currentDate.getMonth() + 1;
                        const currentYear = currentDate.getFullYear();

                        if (
                          yearNum < currentYear ||
                          (yearNum === currentYear && monthNum < currentMonth)
                        ) {
                          toast.error(
                            'Датата на регистрација не може да биде помала од тековниот месец и година'
                          );
                          setFormData((prev) => ({
                            ...prev,
                            registration_expires_at: '',
                          }));
                          return;
                        }
                      }

                      setFormData((prev) => ({
                        ...prev,
                        registration_expires_at: value,
                      }));
                    }
                  }
                }}
                className="input-field h-[48px]"
                placeholder="12.2025"
                title="Внесете дата до кога е регистрирано (формат: месец.година, на пример: 12.2025). Не може да биде помала од тековниот месец и година."
              />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-primary-500/20 pt-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">Надворешен изглед</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              Тип на каросерија *
            </label>
            <Dropdown
              value={formData.vehicle.body_type}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, body_type: value },
                }))
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
                { value: 'Truck', label: 'Грузовик' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">Боја</label>
            <Dropdown
              value={formData.vehicle.color}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, color: value },
                }))
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

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              Број на врати
            </label>
            <Dropdown
              value={formData.vehicle.doors}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, doors: value },
                }))
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
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">Цена и локација</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">Цена *</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                min="0"
                max="999999999"
                value={formData.price}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData((prev) => ({ ...prev, price: value }));
                }}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && /^0+$/.test(value)) {
                    setFormData((prev) => ({
                      ...prev,
                      price: '0',
                    }));
                  }
                }}
                onWheel={handleWheel}
                className="input-field flex-1 h-[48px]"
                placeholder="0"
                title="Внесете цена на автомобилот (само цели броеви)"
              />
              <Dropdown
                value={formData.currency}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, currency: value as Currency }))
                }
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
              onChange={(value) => setFormData((prev) => ({ ...prev, city: value }))}
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
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
          Дополнителна информација
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 text-primary-400">Опис</label>
          <RichTextEditor
            value={formData.description}
            onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
            placeholder="Додадете опис на автомобилот..."
            maxLength={5000}
            rows={4}
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.urgent}
                onChange={(e) => setFormData((prev) => ({ ...prev, urgent: e.target.checked }))}
                className="sr-only"
              />
              <div
                onClick={(e) => {
                  e.preventDefault();
                  setFormData((prev) => ({ ...prev, urgent: !prev.urgent }));
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

          <div className="flex items-center gap-3 group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.is_new}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_new: e.target.checked }))}
                className="sr-only"
              />
              <div
                onClick={(e) => {
                  e.preventDefault();
                  setFormData((prev) => ({ ...prev, is_new: !prev.is_new }));
                }}
                className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  formData.is_new
                    ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                    : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                }`}
              >
                {formData.is_new && (
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
                formData.is_new
                  ? 'text-primary-400'
                  : 'text-primary-400/70 group-hover:text-primary-400'
              }`}
            >
              <span>✨</span>
              <span>Ново</span>
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-500/20 pt-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">Фотографии</h2>
        <div className="mb-4">
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

                  const maxSize = 10 * 1024 * 1024;
                  if (file.size > maxSize) {
                    toast.error('Максимална големина на фајлот е 10MB');
                    return;
                  }

                  if (file.size === 0) {
                    toast.error('Фајлот е празен');
                    return;
                  }

                  handleFileUpload(file);
                } else {
                  toast.error('Максимум 20 фотографии');
                }
              });
            }}
            disabled={uploading || formData.images.length >= 20}
            id="image-upload"
            className="hidden"
          />
          <label
            htmlFor="image-upload"
            className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
              uploading || formData.images.length >= 20
                ? 'bg-primary-500/50 text-primary-400/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-700 to-primary-800 text-white hover:from-primary-600 hover:to-primary-700'
            }`}
          >
            {uploading ? 'Вчитување...' : 'Додади фотографии'}
          </label>
        </div>
        {formData.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {formData.images.map((url, index) => (
              <div key={index} className="relative group">
                <div className="relative">
                  <Image
                    src={url}
                    alt={`Photo ${index + 1}`}
                    width={200}
                    height={96}
                    className="w-full h-24 object-cover rounded"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (index > 0) {
                          setFormData((prev) => {
                            const newImages = [...prev.images];
                            [newImages[index - 1], newImages[index]] = [
                              newImages[index],
                              newImages[index - 1],
                            ];
                            return { ...prev, images: newImages };
                          });
                        }
                      }}
                      disabled={index === 0}
                      className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded p-1.5 transition-colors"
                      title="Помести нагоре"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (index < formData.images.length - 1) {
                          setFormData((prev) => {
                            const newImages = [...prev.images];
                            [newImages[index], newImages[index + 1]] = [
                              newImages[index + 1],
                              newImages[index],
                            ];
                            return { ...prev, images: newImages };
                          });
                        }
                      }}
                      disabled={index === formData.images.length - 1}
                      className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded p-1.5 transition-colors"
                      title="Помести надолу"
                    >
                      <svg
                        className="w-4 h-4"
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
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      images: prev.images.filter((_, i) => i !== index),
                    }));
                  }}
                  className="absolute top-1 right-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:shadow-md transition-all z-10"
                  title="Избриши"
                >
                  ×
                </button>
                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-sm text-gray-400">
          Вчитано: {formData.images.length}/20{' '}
          {formData.images.length < 2 && <span className="text-red-400">(потребно минимум 2)</span>}
        </p>
      </div>

      {mode === 'create' && (
        <div className="border-t border-primary-500/20 pt-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
            Нагодувања на објавата
          </h2>
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              Статус на објавата *
            </label>
            <Dropdown
              value={formData.status}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, status: value as 'Active' | 'Paused' }))
              }
              options={[
                { value: 'Active', label: 'Објавено (се прикажува во каталог)' },
                { value: 'Paused', label: 'Привремено застарено (не се прикажува во каталог)' },
              ]}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {loading
          ? mode === 'create'
            ? 'Креирање...'
            : 'Зачувување...'
          : mode === 'create'
            ? 'Креирај објава'
            : 'Зачувај промени'}
      </button>
    </form>
  );
}
