'use client';

import Image from 'next/image';
import { toast } from 'react-hot-toast';

import type { ListingFormSectionProps } from './types';

export function PhotosSection({
  formData,
  setFormData,
  t,
  uploading = false,
  onFileUpload,
}: ListingFormSectionProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (formData.images.length < 20) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          toast.error(t('listings.imageFormatError'));
          return;
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(t('listings.imageSizeError'));
          return;
        }

        if (file.size === 0) {
          toast.error(t('listings.imageEmptyError'));
          return;
        }

        if (onFileUpload) {
          onFileUpload(file);
        }
      } else {
        toast.error(t('listings.imageMaxCountError'));
      }
    });
  };

  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.photos')}
      </h2>
      <div className="mb-4">
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          multiple
          onChange={handleFileChange}
          disabled={uploading || formData.images.length >= 20}
          id="image-upload"
          className="hidden"
        />
        <label
          htmlFor="image-upload"
          className={`inline-flex items-center justify-center gap-2 md:gap-2.5 min-h-12 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 font-medium text-base transition-colors duration-200 whitespace-nowrap select-none ${
            uploading || formData.images.length >= 20
              ? 'text-primary-700/50 border-primary-700/30 bg-primary-500/10 cursor-not-allowed'
              : 'text-primary-700 hover:text-primary-900 border-primary-700/30 hover:border-primary-700 bg-primary-500/10 cursor-pointer'
          }`}
        >
          {uploading ? t('common.loading') : t('listings.addPhotos')}
        </label>
      </div>
      {formData.images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {formData.images.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative">
                <Image
                  src={url}
                  alt={t('listings.imageAlt', {
                    title: t('listings.defaultTitle'),
                    index: String(index + 1),
                  })}
                  width={200}
                  height={96}
                  className="w-full h-24 object-cover rounded"
                  draggable={false}
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
                    className="bg-primary-600 hover:text-primary-100 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded p-1.5 transition-colors"
                    title={t('listings.moveUp')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="bg-primary-600 hover:text-primary-100 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded p-1.5 transition-colors"
                    title={t('listings.moveDown')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                title={t('listings.deleteImage')}
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
        {t('listings.uploadedCount', { count: formData.images.length })}{' '}
        {formData.images.length < 2 && (
          <span className="text-red-400">{t('listings.minPhotosRequired')}</span>
        )}
      </p>
    </div>
  );
}
