type ApiErrorShape = { message?: string };

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  let message = `Request failed (${res.status})`;
  try {
    const data = (await res.json()) as ApiErrorShape;
    if (data.message) message = data.message;
  } catch {
    try {
      const text = await res.text();
      if (text) message = text;
    } catch {}
  }
  return message;
}

export async function apiFetchJson<T>(params: {
  path: string;
  method?: string;
  token?: string | null;
  body?: unknown;
}): Promise<T> {
  const res = await fetch(`/api${params.path}`, {
    method: params.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(params.token ? { Authorization: `Bearer ${params.token}` } : {})
    },
    body: params.body ? JSON.stringify(params.body) : undefined
  });

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }

  return (await res.json()) as T;
}

export async function apiFetchBlob(params: {
  path: string;
  method?: string;
  token?: string | null;
}): Promise<Blob> {
  const res = await fetch(`/api${params.path}`, {
    method: params.method ?? 'GET',
    headers: {
      ...(params.token ? { Authorization: `Bearer ${params.token}` } : {})
    }
  });

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }

  return await res.blob();
}
