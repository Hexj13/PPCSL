import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

import { savedFiltersApi, SavedFilter } from '@/lib/api';

import { SavedFiltersList } from './SavedFiltersList';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  savedFiltersApi: {
    getAll: jest.fn(),
    remove: jest.fn(),
  },
}));

interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  filterId?: string;
  initialName?: string;
}

jest.mock('./SaveFilterModal', () => ({
  SaveFilterModal: ({ isOpen, onClose, onSave, filterId, initialName }: SaveFilterModalProps) => {
    if (!isOpen) return null;
    return (
      <div data-testid="save-filter-modal">
        <div data-testid="modal-filter-id">{filterId}</div>
        <div data-testid="modal-initial-name">{initialName}</div>
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
        <button data-testid="modal-save" onClick={onSave}>
          Save
        </button>
      </div>
    );
  },
}));

describe('SavedFiltersList', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  const mockFilters: SavedFilter[] = [
    {
      id: 'filter-1',
      user_id: 'user-1',
      name: 'Мој филтер 1',
      filters: { brand_ids: ['brand-1'], price_gte: '10000' },
      created_at: '2024-01-02T10:00:00Z',
    },
    {
      id: 'filter-2',
      user_id: 'user-1',
      name: 'Мој филтер 2',
      filters: { brand_ids: ['brand-2'], city: 'Skopje' },
      created_at: '2024-01-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
  });

  describe('Loading state', () => {
    it('should show loading state initially', () => {
      (savedFiltersApi.getAll as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<SavedFiltersList />);

      expect(screen.getByText('Вчитување...')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no filters', async () => {
      (savedFiltersApi.getAll as jest.Mock).mockResolvedValue({ data: [] });

      render(<SavedFiltersList />);

      await waitFor(() => {
        expect(screen.getByText('Немате зачувани филтри')).toBeInTheDocument();
      });
    });
  });

  describe('Filter list', () => {
    it('should display saved filters', async () => {
      (savedFiltersApi.getAll as jest.Mock).mockResolvedValue({ data: mockFilters });

      render(<SavedFiltersList />);

      await waitFor(() => {
        expect(screen.getByText('Мој филтер 1')).toBeInTheDocument();
        expect(screen.getByText('Мој филтер 2')).toBeInTheDocument();
      });
    });

    it('should display filter numbers', async () => {
      (savedFiltersApi.getAll as jest.Mock).mockResolvedValue({ data: mockFilters });

      render(<SavedFiltersList />);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('#2')).toBeInTheDocument();
      });
    });

    it('should display creation dates', async () => {
      (savedFiltersApi.getAll as jest.Mock).mockResolvedValue({ data: mockFilters });

      render(<SavedFiltersList />);

      await waitFor(() => {
        expect(screen.getByText(/Креиран:/)).toBeInTheDocument();
      });
    });
  });

  describe('Apply filter', () => {
    it('should apply filter when clicked', async () => {
      (savedFiltersApi.getAll as jest.Mock).mockResolvedValue({ data: [mockFilters[0]] });

      render(<SavedFiltersList />);

      await waitFor(() => {
        expect(screen.getByText('Мој филтер 1')).toBeInTheDocument();
      });

      const filterCard = screen.getByText('Мој филтер 1').closest('div[class*="card"]');
      if (filterCard) {
        fireEvent.click(filterCard);
      }

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('brand_ids=brand-1'));
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('price_gte=10000'));
      });
    });
  });

  describe('Delete filter', () => {
    it('should delete filter when delete button clicked', async () => {
      (savedFiltersApi.getAll as jest.Mock).mockResolvedValue({ data: [mockFilters[0]] });
      (savedFiltersApi.remove as jest.Mock).mockResolvedValue(undefined);

      render(<SavedFiltersList />);

      await waitFor(() => {
        expect(screen.getByText('Мој филтер 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Избриши');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(savedFiltersApi.remove).toHaveBeenCalledWith('filter-1');
        expect(toast.success).toHaveBeenCalledWith('Филтерот е успешно избришан');
      });
    });

    it('should prevent applying filter when delete button clicked', async () => {
      (savedFiltersApi.getAll as jest.Mock).mockResolvedValue({ data: [mockFilters[0]] });
      (savedFiltersApi.remove as jest.Mock).mockResolvedValue(undefined);

      render(<SavedFiltersList />);

      await waitFor(() => {
        expect(screen.getByText('Мој филтер 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Избриши');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockReplace).not.toHaveBeenCalled();
      });
    });

    it('should handle delete error', async () => {
      (savedFiltersApi.getAll as jest.Mock).mockResolvedValue({ data: [mockFilters[0]] });
      (savedFiltersApi.remove as jest.Mock).mockRejectedValue({
        response: { data: { message: 'Грешка при бришење' } },
      });

      render(<SavedFiltersList />);

      await waitFor(() => {
        expect(screen.getByText('Мој филтер 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Избриши');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Грешка при бришење');
      });
    });
  });

  describe('Edit filter', () => {
    it('should open edit modal when edit button clicked', async () => {
      (savedFiltersApi.getAll as jest.Mock).mockResolvedValue({ data: [mockFilters[0]] });

      render(<SavedFiltersList />);

      await waitFor(() => {
        expect(screen.getByText('Мој филтер 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('Уреди');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('save-filter-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-filter-id')).toHaveTextContent('filter-1');
        expect(screen.getByTestId('modal-initial-name')).toHaveTextContent('Мој филтер 1');
      });
    });

    it('should reload filters after edit', async () => {
      (savedFiltersApi.getAll as jest.Mock).mockResolvedValue({ data: [mockFilters[0]] });

      render(<SavedFiltersList />);

      await waitFor(() => {
        expect(screen.getByText('Мој филтер 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('Уреди');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('save-filter-modal')).toBeInTheDocument();
      });

      const saveButton = screen.getByTestId('modal-save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(savedFiltersApi.getAll).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle API error when loading filters', async () => {
      (savedFiltersApi.getAll as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<SavedFiltersList />);

      await waitFor(() => {
        expect(screen.getByText('Немате зачувани филтри')).toBeInTheDocument();
      });
    });
  });
});
