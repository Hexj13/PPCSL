'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { analytics } from '@/lib/analytics';
import { savedFiltersApi } from '@/lib/api';

import { Modal } from './Modal';

interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  filters?: Record<string, unknown>;
  filterId?: string;
  initialName?: string;
}

export function SaveFilterModal({
  isOpen,
  onClose,
  onSave,
  filters,
  filterId,
  initialName = '',
}: SaveFilterModalProps) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
    }
  }, [isOpen, initialName]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Внесете име за филтерот');
      return;
    }

    if (name.length > 100) {
      toast.error('Името не може да биде подолго од 100 карактери');
      return;
    }

    if (filterId && name.trim() === initialName.trim()) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      if (filterId) {
        await savedFiltersApi.update(filterId, name.trim());
        toast.success('Филтерот е успешно ажуриран');
      } else if (filters) {
        await savedFiltersApi.create(name.trim(), filters);
        analytics.saveFilter(name.trim(), filters);
        toast.success('Филтерот е успешно зачуван');
      }
      setName('');
      onSave();
      onClose();
    } catch (error: unknown) {
      const errorMessage =
        (error && typeof error === 'object' && 'response' in error
          ? (error.response as { data?: { message?: string } })?.data?.message
          : null) ||
        (filterId ? 'Грешка при ажурирање на филтерот' : 'Грешка при зачувување на филтерот');
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName(initialName);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={filterId ? 'Уреди филтер' : 'Зачувај филтер'}
      size="small"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Име</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !saving) {
                handleSave();
              }
            }}
            maxLength={100}
            className="input-field"
            placeholder="Внесете име за филтерот"
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1">{name.length}/100</p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? filterId
                ? 'Ажурирање...'
                : 'Зачувување...'
              : filterId
                ? 'Зачувај'
                : 'Зачувај'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Откажи
          </button>
        </div>
      </div>
    </Modal>
  );
}
