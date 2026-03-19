import { api } from './api-client';

export const uploadApi = {
  uploadImage: (file: File, hidePlates?: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    if (hidePlates !== undefined) {
      formData.append('hidePlates', String(hidePlates));
    }
    return api.post<{
      url: string;
      path: string;
      blurhash?: string | null;
      plateMaskResult?: string | null;
      deleteToken?: string | null;
    }>('/api/upload/image', formData, {
      headers: {
        'X-Skip-Error-Handling': 'true',
      },
    });
  },
  deleteImage: (path: string, deleteToken: string) =>
    api.delete<{ success: boolean }>('/api/upload/image', {
      data: { path, deleteToken },
      headers: {
        'X-Skip-Error-Handling': 'true',
      },
    }),
};
