'use client';

import { CarIcon, MotoIcon, TruckIcon } from '@/ui';

interface VehicleTypeSelectorProps {
  vehicleType: 'car' | 'truck' | 'moto';
  onTypeChange: (_type: 'car' | 'truck' | 'moto') => void;
  t: (_key: string) => string;
}

export function VehicleTypeSelector({ vehicleType, onTypeChange, t }: VehicleTypeSelectorProps) {
  return (
    <div className="mb-6 border-b border-primary-700/30 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pb-4">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.vehicleTypeLabel') || 'Тип транспорта'}
      </h2>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onTypeChange('car')}
          className={`flex-1 h-14 px-4 text-base font-semibold transition-colors duration-300 rounded-lg flex items-center justify-center ${
            vehicleType === 'car'
              ? 'bg-primary-500/10 border-2 border-primary-700 text-primary-700'
              : 'bg-bg-secondary border-2 border-primary-700/30 text-primary-900 hover:border-primary-700 hover:text-primary-700'
          }`}
        >
          <CarIcon className="w-12 h-12 text-current" />
        </button>
        <button
          type="button"
          onClick={() => onTypeChange('truck')}
          className={`flex-1 h-14 px-4 text-base font-semibold transition-colors duration-300 rounded-lg flex items-center justify-center ${
            vehicleType === 'truck'
              ? 'bg-primary-500/10 border-2 border-primary-700 text-primary-700'
              : 'bg-bg-secondary border-2 border-primary-700/30 text-primary-900 hover:border-primary-700 hover:text-primary-700'
          }`}
        >
          <TruckIcon className="w-12 h-12 text-current" />
        </button>
        <button
          type="button"
          onClick={() => onTypeChange('moto')}
          className={`flex-1 h-14 px-4 text-base font-semibold transition-colors duration-300 rounded-lg flex items-center justify-center ${
            vehicleType === 'moto'
              ? 'bg-primary-500/10 border-2 border-primary-700 text-primary-700'
              : 'bg-bg-secondary border-2 border-primary-700/30 text-primary-900 hover:border-primary-700 hover:text-primary-700'
          }`}
        >
          <MotoIcon className="w-12 h-12 text-current" />
        </button>
      </div>
    </div>
  );
}
