import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BottomSheet } from './BottomSheet';

describe('BottomSheet', () => {
  it('should render title and children when open', async () => {
    render(
      <BottomSheet isOpen onClose={jest.fn()} title="Update available">
        <p>Update description</p>
      </BottomSheet>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('Update available')).toBeInTheDocument();
    expect(screen.getByText('Update description')).toBeInTheDocument();
  });

  it('should call onClose when Escape is pressed', async () => {
    const onClose = jest.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Update available">
        <p>Update description</p>
      </BottomSheet>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not render when closed', () => {
    render(
      <BottomSheet isOpen={false} onClose={jest.fn()} title="Update available">
        <p>Update description</p>
      </BottomSheet>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
