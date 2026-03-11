import { render, screen, fireEvent } from '@testing-library/react';

import { PhotosSection } from './PhotosSection';
import type { ListingFormSectionProps } from './types';

jest.mock('@/components/ListingPage/ListingPageImageModal', () => ({
  ListingPageImageModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div role="dialog" aria-label="Close">
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- mock for test
    <img src={src} alt={alt} />
  ),
}));

jest.mock('@/lib/utils', () => ({
  getOptimizedImageUrl: (url: string) => url,
}));

const mockT = (key: string, params?: Record<string, string | number>) => {
  if (key === 'listings.mainPhoto') return 'Main photo';
  if (key === 'listings.deleteImage') return 'Delete';
  if (key === 'listings.moveUp') return 'Move up';
  if (key === 'listings.moveDown') return 'Move down';
  if (key === 'listings.photos') return 'Photos';
  if (key === 'listings.hidePlates') return 'Hide plates';
  if (key === 'listings.hidePlatesHelper') return 'Helper text';
  if (key === 'listings.addPhotos') return 'Add photos';
  if (key === 'listings.uploadedCount' && params?.count !== undefined)
    return `Uploaded: ${params.count}/20`;
  if (key === 'listings.minPhotosRequired') return '(min 2 required)';
  if (key === 'listings.imageAlt' && params) return `${params.title} - Image ${params.index}`;
  if (key === 'listings.defaultTitle') return 'Default title';
  if (key === 'listings.closeImageModal') return 'Close';
  if (key === 'common.loading') return 'Loading';
  return key;
};

const defaultFormData = {
  images: ['https://example.com/img1.webp', 'https://example.com/img2.webp'],
  vehicle: {
    brand_id: '',
    model_id: '',
    year: '',
    engine_displ_l: '',
    mileage_km: '',
    fuel: '',
    transmission: '',
    body_type: '',
    drive_type: '',
    color: '',
    doors: '',
  },
  price: '',
  currency: 'MDL' as const,
  city: '',
  description: '',
  status: 'Active' as const,
  urgent: false,
  is_new: false,
  vin: '',
  condition: 'Undamaged' as const,
  registration_type: 'Local' as const,
  horsepower: '',
  power_kw: '',
  equipment: [],
  assignedUserId: '',
  negotiable: false,
  available_in_credit: false,
  down_payment_amount: '',
};

const defaultProps: ListingFormSectionProps = {
  formData: defaultFormData,
  setFormData: jest.fn(),
  errors: {},
  clearError: jest.fn(),
  t: mockT,
};

describe('PhotosSection', () => {
  it('should render grid with 3 columns on desktop and 2 on mobile', () => {
    render(<PhotosSection {...defaultProps} />);
    const grid = screen.getByTestId('photos-grid');
    expect(grid).toHaveClass('grid-cols-2');
    expect(grid).toHaveClass('md:grid-cols-3');
  });

  it('should show main photo badge on first image only', () => {
    render(<PhotosSection {...defaultProps} />);
    const mainBadges = screen.getAllByText('Main photo');
    expect(mainBadges).toHaveLength(1);
  });

  it('should show delete button below each photo', () => {
    render(<PhotosSection {...defaultProps} />);
    const deleteButtons = screen.getAllByLabelText('Delete');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('should move photo up and down with action buttons', () => {
    const setFormData = jest.fn();
    render(<PhotosSection {...defaultProps} setFormData={setFormData} />);

    const moveDownButtons = screen.getAllByLabelText('Move down');
    fireEvent.click(moveDownButtons[0]);

    expect(setFormData).toHaveBeenCalledTimes(1);
    const moveDownCall = setFormData.mock.calls[0][0];
    const movedDown = moveDownCall({
      ...defaultProps.formData,
      images: defaultProps.formData.images,
    });
    expect(movedDown.images).toEqual([
      'https://example.com/img2.webp',
      'https://example.com/img1.webp',
    ]);

    const moveUpButtons = screen.getAllByLabelText('Move up');
    fireEvent.click(moveUpButtons[1]);

    expect(setFormData).toHaveBeenCalledTimes(2);
    const moveUpCall = setFormData.mock.calls[1][0];
    const movedUp = moveUpCall({ ...defaultProps.formData, images: defaultProps.formData.images });
    expect(movedUp.images).toEqual([
      'https://example.com/img2.webp',
      'https://example.com/img1.webp',
    ]);
  });

  it('should open preview when clicking first photo', () => {
    render(<PhotosSection {...defaultProps} />);
    const firstCardButton = screen.getByRole('button', { name: /Default title - Image 1/i });
    fireEvent.click(firstCardButton);
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]).toHaveAttribute('aria-label', 'Close');
  });

  it('should call setFormData when delete is clicked', () => {
    const setFormData = jest.fn();
    render(<PhotosSection {...defaultProps} setFormData={setFormData} />);
    const deleteButtons = screen.getAllByLabelText('Delete');
    fireEvent.click(deleteButtons[0]);
    expect(setFormData).toHaveBeenCalled();
    const call = setFormData.mock.calls[0][0];
    expect(typeof call).toBe('function');
    const prev = { images: defaultProps.formData.images };
    const next = call(prev);
    expect(next.images).toHaveLength(1);
  });

  it('should call onImageDelete when provided', () => {
    const onImageDelete = jest.fn();
    render(<PhotosSection {...defaultProps} onImageDelete={onImageDelete} />);

    const deleteButtons = screen.getAllByLabelText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(onImageDelete).toHaveBeenCalledWith('https://example.com/img1.webp');
  });

  it('should render upload slots when provided', () => {
    render(
      <PhotosSection
        {...defaultProps}
        uploadSlots={[
          {
            id: 'slot-1',
            status: 'uploading',
            file: new File([], 'test.jpg', { type: 'image/jpeg' }),
            previewUrl: 'blob:test',
          },
        ]}
      />,
    );
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });
});
