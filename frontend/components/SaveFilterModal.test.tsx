import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'react-hot-toast';

import { savedFiltersApi } from '@/lib/api';

import { SaveFilterModal } from './SaveFilterModal';

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  savedFiltersApi: {
    create: jest.fn(),
    update: jest.fn(),
  },
}));

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

jest.mock('./Modal', () => ({
  Modal: ({ isOpen, onClose, title, children }: ModalProps) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    );
  },
}));

describe('SaveFilterModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Creating new filter', () => {
    it('should render modal with create title', () => {
      render(
        <SaveFilterModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          filters={{ brand_ids: ['brand-1'] }}
        />
      );

      expect(screen.getByTestId('modal-title')).toHaveTextContent('Зачувај филтер');
      expect(screen.getByPlaceholderText('Внесете име за филтерот')).toBeInTheDocument();
    });

    it('should create filter when save button clicked', async () => {
      (savedFiltersApi.create as jest.Mock).mockResolvedValue({
        data: { id: 'filter-1', name: 'Мој филтер' },
      });

      render(
        <SaveFilterModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          filters={{ brand_ids: ['brand-1'] }}
        />
      );

      const input = screen.getByPlaceholderText('Внесете име за филтерот');
      fireEvent.change(input, { target: { value: 'Мој филтер' } });

      const saveButton = screen.getByText('Зачувај');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(savedFiltersApi.create).toHaveBeenCalledWith('Мој филтер', {
          brand_ids: ['brand-1'],
        });
        expect(toast.success).toHaveBeenCalledWith('Филтерот е успешно зачуван');
        expect(mockOnSave).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show error when name is empty', async () => {
      render(
        <SaveFilterModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          filters={{ brand_ids: ['brand-1'] }}
        />
      );

      const saveButton = screen.getByText('Зачувај');
      expect(saveButton).toBeDisabled();

      const input = screen.getByPlaceholderText('Внесете име за филтерот');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Внесете име за филтерот');
        expect(savedFiltersApi.create).not.toHaveBeenCalled();
      });
    });

    it('should show error when name exceeds 100 characters', async () => {
      render(
        <SaveFilterModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          filters={{ brand_ids: ['brand-1'] }}
        />
      );

      const input = screen.getByPlaceholderText('Внесете име за филтерот');
      fireEvent.change(input, { target: { value: 'a'.repeat(101) } });

      const saveButton = screen.getByText('Зачувај');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Името не може да биде подолго од 100 карактери');
        expect(savedFiltersApi.create).not.toHaveBeenCalled();
      });
    });

    it('should handle API error when creating', async () => {
      (savedFiltersApi.create as jest.Mock).mockRejectedValue({
        response: { data: { message: 'Максимален лимит достигнат' } },
      });

      render(
        <SaveFilterModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          filters={{ brand_ids: ['brand-1'] }}
        />
      );

      const input = screen.getByPlaceholderText('Внесете име за филтерот');
      fireEvent.change(input, { target: { value: 'Мој филтер' } });

      const saveButton = screen.getByText('Зачувај');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Максимален лимит достигнат');
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });
  });

  describe('Editing existing filter', () => {
    it('should render modal with edit title', () => {
      render(
        <SaveFilterModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          filterId="filter-1"
          initialName="Старо име"
        />
      );

      expect(screen.getByTestId('modal-title')).toHaveTextContent('Уреди филтер');
      expect(screen.getByDisplayValue('Старо име')).toBeInTheDocument();
    });

    it('should update filter when save button clicked', async () => {
      (savedFiltersApi.update as jest.Mock).mockResolvedValue({
        data: { id: 'filter-1', name: 'Ново име' },
      });

      render(
        <SaveFilterModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          filterId="filter-1"
          initialName="Старо име"
        />
      );

      const input = screen.getByDisplayValue('Старо име');
      fireEvent.change(input, { target: { value: 'Ново име' } });

      const saveButton = screen.getByText('Зачувај');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(savedFiltersApi.update).toHaveBeenCalledWith('filter-1', 'Ново име');
        expect(toast.success).toHaveBeenCalledWith('Филтерот е успешно ажуриран');
        expect(mockOnSave).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should close modal without saving when name unchanged', async () => {
      render(
        <SaveFilterModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          filterId="filter-1"
          initialName="Старо име"
        />
      );

      const saveButton = screen.getByText('Зачувај');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(savedFiltersApi.update).not.toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockOnSave).not.toHaveBeenCalled();
      });
    });

    it('should handle API error when updating', async () => {
      (savedFiltersApi.update as jest.Mock).mockRejectedValue({
        response: { data: { message: 'Филтерот не е пронајден' } },
      });

      render(
        <SaveFilterModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          filterId="filter-1"
          initialName="Старо име"
        />
      );

      const input = screen.getByDisplayValue('Старо име');
      fireEvent.change(input, { target: { value: 'Ново име' } });

      const saveButton = screen.getByText('Зачувај');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Филтерот не е пронајден');
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });
  });

  describe('Character counter', () => {
    it('should display character count', () => {
      render(
        <SaveFilterModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          filters={{ brand_ids: ['brand-1'] }}
        />
      );

      const input = screen.getByPlaceholderText('Внесете име за филтерот');
      fireEvent.change(input, { target: { value: 'Тест' } });

      expect(screen.getByText('4/100')).toBeInTheDocument();
    });
  });

  describe('Keyboard shortcuts', () => {
    it('should save on Enter key press', async () => {
      (savedFiltersApi.create as jest.Mock).mockResolvedValue({
        data: { id: 'filter-1', name: 'Мој филтер' },
      });

      render(
        <SaveFilterModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          filters={{ brand_ids: ['brand-1'] }}
        />
      );

      const input = screen.getByPlaceholderText('Внесете име за филтерот');
      fireEvent.change(input, { target: { value: 'Мој филтер' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(savedFiltersApi.create).toHaveBeenCalled();
      });
    });
  });
});
