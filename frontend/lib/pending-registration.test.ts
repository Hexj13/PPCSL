import type { RegisterDto } from '@/lib/api';

import {
  clearPendingRegistration,
  loadPendingRegistration,
  savePendingRegistration,
} from './pending-registration';

const sampleDto: RegisterDto = {
  type: 'Individual',
  phone: '+37360123456',
  password: 'SecretPass1!',
  companyName: '',
  emailNotifications: false,
  viber: false,
  whatsapp: false,
  telegram: false,
  termsAccepted: true,
};

describe('pending-registration', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    clearPendingRegistration();
  });

  it('stores registration data without password in session payload', () => {
    savePendingRegistration(sampleDto);
    const raw = window.sessionStorage.getItem('pendingRegistration');
    expect(raw).toBeTruthy();
    expect(raw).not.toContain('SecretPass1!');
    expect(window.sessionStorage.getItem('pendingRegistrationPassword')).toBeNull();
  });

  it('loads full RegisterDto including in-memory password', () => {
    savePendingRegistration(sampleDto);
    expect(loadPendingRegistration()).toEqual(sampleDto);
  });

  it('clears session and legacy local storage keys', () => {
    savePendingRegistration(sampleDto);
    window.localStorage.setItem('pendingRegistration', JSON.stringify(sampleDto));
    clearPendingRegistration();
    expect(window.sessionStorage.getItem('pendingRegistration')).toBeNull();
    expect(window.sessionStorage.getItem('pendingRegistrationPassword')).toBeNull();
    expect(window.localStorage.getItem('pendingRegistration')).toBeNull();
    expect(loadPendingRegistration()).toBeNull();
  });

  it('migrates legacy localStorage entry into session storage without persisting password in data key', () => {
    window.localStorage.setItem('pendingRegistration', JSON.stringify(sampleDto));
    const loaded = loadPendingRegistration();
    expect(loaded).toEqual(sampleDto);
    expect(window.localStorage.getItem('pendingRegistration')).toBeNull();
    const raw = window.sessionStorage.getItem('pendingRegistration');
    expect(raw).not.toContain('SecretPass1!');
    expect(window.sessionStorage.getItem('pendingRegistrationPassword')).toBeNull();
  });
});
