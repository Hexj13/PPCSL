import { api } from '@/api/client';

export const mobileDevicesApi = {
  register: (body: { pushToken: string; platform: 'android' | 'ios' }) =>
    api.post<{ ok: boolean }>('/api/devices', body),
};
