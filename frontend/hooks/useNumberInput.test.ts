import { ChangeEvent, FocusEvent, WheelEvent } from 'react';

import { useNumberInput } from './useNumberInput';

describe('useNumberInput', () => {
  let handlers: ReturnType<typeof useNumberInput>;
  let onChange: jest.Mock;

  beforeEach(() => {
    handlers = useNumberInput();
    onChange = jest.fn();
  });

  describe('handleWheel', () => {
    it('should prevent default and blur on wheel event', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        currentTarget: {
          blur: jest.fn(),
        } as unknown as HTMLInputElement,
      } as unknown as WheelEvent<HTMLInputElement>;

      handlers.handleWheel(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.currentTarget.blur).toHaveBeenCalled();
    });
  });

  describe('handleEngineVolumeChange', () => {
    it('should replace comma with dot', () => {
      const event = {
        target: { value: '1,5' },
      } as unknown as ChangeEvent<HTMLInputElement>;

      handlers.handleEngineVolumeChange(event, onChange);

      expect(onChange).toHaveBeenCalledWith('1.5');
    });

    it('should remove non-numeric characters except dot', () => {
      const event = {
        target: { value: '1.5abc' },
      } as unknown as ChangeEvent<HTMLInputElement>;

      handlers.handleEngineVolumeChange(event, onChange);

      expect(onChange).toHaveBeenCalledWith('1.5');
    });

    it('should handle multiple dots by keeping only one', () => {
      const event = {
        target: { value: '1.5.3' },
      } as unknown as ChangeEvent<HTMLInputElement>;

      handlers.handleEngineVolumeChange(event, onChange);

      expect(onChange).toHaveBeenCalledWith('1.53');
    });

    it('should limit decimal places to one', () => {
      const event = {
        target: { value: '1.55' },
      } as unknown as ChangeEvent<HTMLInputElement>;

      handlers.handleEngineVolumeChange(event, onChange);

      expect(onChange).toHaveBeenCalledWith('1.5');
    });

    it('should handle integer values', () => {
      const event = {
        target: { value: '15' },
      } as unknown as ChangeEvent<HTMLInputElement>;

      handlers.handleEngineVolumeChange(event, onChange);

      expect(onChange).toHaveBeenCalledWith('15');
    });
  });

  describe('handleEngineVolumeBlur', () => {
    it('should set minimum value to 0.1', () => {
      const event = {
        target: { value: '0.05' },
      } as unknown as FocusEvent<HTMLInputElement>;

      handlers.handleEngineVolumeBlur(event, onChange);

      expect(onChange).toHaveBeenCalledWith('0.1');
    });

    it('should set maximum value to 100', () => {
      const event = {
        target: { value: '150' },
      } as unknown as FocusEvent<HTMLInputElement>;

      handlers.handleEngineVolumeBlur(event, onChange);

      expect(onChange).toHaveBeenCalledWith('100.0');
    });

    it('should format valid value to one decimal place', () => {
      const event = {
        target: { value: '1.6' },
      } as unknown as FocusEvent<HTMLInputElement>;

      handlers.handleEngineVolumeBlur(event, onChange);

      expect(onChange).toHaveBeenCalledWith('1.6');
    });

    it('should format integer value to one decimal place', () => {
      const event = {
        target: { value: '2' },
      } as unknown as FocusEvent<HTMLInputElement>;

      handlers.handleEngineVolumeBlur(event, onChange);

      expect(onChange).toHaveBeenCalledWith('2.0');
    });
  });

  describe('handleYearBlur', () => {
    it('should not change empty value', () => {
      handlers.handleYearBlur('', onChange);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should clear invalid year (too old)', () => {
      handlers.handleYearBlur('1899', onChange);

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should clear invalid year (too new)', () => {
      const nextYear = new Date().getFullYear() + 1;
      handlers.handleYearBlur(nextYear.toString(), onChange);

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should clear invalid year (not a number)', () => {
      handlers.handleYearBlur('abc', onChange);

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should keep valid year', () => {
      handlers.handleYearBlur('2020', onChange);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should keep year at minimum boundary (1900)', () => {
      handlers.handleYearBlur('1900', onChange);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should keep current year', () => {
      const currentYear = new Date().getFullYear();
      handlers.handleYearBlur(currentYear.toString(), onChange);

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
