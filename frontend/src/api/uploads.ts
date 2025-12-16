export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export function uploadFileWithProgress(params: {
  path: string;
  token: string;
  file: File;
  onProgress: (p: UploadProgress) => void;
}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api${params.path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${params.token}`);

    xhr.upload.onprogress = (evt) => {
      const total = evt.total ?? params.file.size ?? 0;
      const loaded = evt.loaded ?? 0;
      const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
      params.onProgress({ loaded, total, percent });
    };

    xhr.onerror = () => reject(new Error('Upload failed'));

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string };
          reject(new Error(parsed.message ?? `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
        return;
      }

      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        resolve(xhr.responseText);
      }
    };

    const form = new FormData();
    form.append('file', params.file);
    xhr.send(form);
  });
}
