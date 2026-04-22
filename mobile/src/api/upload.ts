import { api } from '@/api/client';

export function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  uri: string,
  filename: string,
  mimeType: string,
): void {
  formData.append(fieldName, { uri, name: filename, type: mimeType } as unknown as Blob);
}

export const mobileUploadApi = {
  uploadImage: (formData: FormData, hidePlates?: boolean) => {
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
      headers: { 'X-Skip-Error-Handling': 'true' },
    });
  },
  deleteImage: (path: string, deleteToken: string) =>
    api.delete<{ success: boolean }>('/api/upload/image', {
      data: { path, deleteToken },
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
};
