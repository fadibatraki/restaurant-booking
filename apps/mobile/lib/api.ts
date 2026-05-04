import type {
  AvailabilityTable,
  CreateReservationRequest,
  LoginRequest,
  LoginResponse,
  MarkAllNotificationsReadResponse,
  MeResponse,
  Notification,
  Reservation,
  RegisterRequest,
  RegisterResponse,
  Restaurant,
} from './types';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://ehjoz.app/api').replace(/\/+$/, '');
const JSON_CONTENT_TYPE_PATTERN = /\bjson\b/i;

type RequestOptions = {
  accessToken?: string;
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function buildApiUrl(path: string) {
  if (!path.startsWith('/')) {
    throw new ApiError('مسار طلب API غير صحيح.', 0);
  }

  return `${API_BASE_URL}${path}`;
}

function isJsonResponse(response: Response) {
  return JSON_CONTENT_TYPE_PATTERN.test(response.headers.get('content-type') ?? '');
}

function getErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (Array.isArray(message)) {
      const messages = message.filter((item): item is string => typeof item === 'string' && item.trim());

      if (messages.length > 0) {
        return messages.join('\n');
      }
    }
  }

  return fallback;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(
      'تعذر الوصول إلى الخادم. تحقق من اتصال الإنترنت أو حاول مرة أخرى بعد قليل.',
      0
    );
  }

  let data: unknown;

  if (isJsonResponse(response)) {
    const text = await response.text();

    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      throw new ApiError('استجابة الخادم غير صالحة. حاول مرة أخرى بعد قليل.', response.status);
    }
  } else if (!response.ok) {
    throw new ApiError('تعذر الوصول إلى خدمة API. تحقق من رابط الخادم وحاول مرة أخرى.', response.status);
  } else {
    throw new ApiError('استجابة غير متوقعة من الخادم.', response.status);
  }

  if (!response.ok) {
    throw new ApiError(getErrorMessage(data, 'تعذر إكمال الطلب حالياً.'), response.status);
  }

  return data as T;
}

export function login(body: LoginRequest) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body,
  });
}

export function register(body: RegisterRequest) {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body,
  });
}

export function getMe(accessToken: string) {
  return request<MeResponse>('/auth/me', {
    accessToken,
  });
}

export function getRestaurants() {
  return request<Restaurant[]>('/restaurants');
}

export function getRestaurant(id: string) {
  return request<Restaurant>(`/restaurants/${encodeURIComponent(id)}`);
}

export function getAvailability(restaurantId: string, date: string, guestsCount: number) {
  const query = new URLSearchParams({
    date,
    guestsCount: String(guestsCount),
  });

  return request<AvailabilityTable[]>(
    `/restaurants/${encodeURIComponent(restaurantId)}/availability?${query.toString()}`
  );
}

export function createReservation(body: CreateReservationRequest, accessToken: string) {
  return request<Reservation>('/reservations', {
    method: 'POST',
    accessToken,
    body,
  });
}

export function getMyReservations(accessToken: string) {
  return request<Reservation[]>('/reservations/my', {
    accessToken,
  });
}

export function cancelReservation(id: string, accessToken: string) {
  return request<Reservation>(`/reservations/${encodeURIComponent(id)}/cancel`, {
    method: 'PATCH',
    accessToken,
  });
}

export function getMyNotifications(accessToken: string) {
  return request<Notification[]>('/notifications/my', {
    accessToken,
  });
}

export function markNotificationRead(id: string, accessToken: string) {
  return request<Notification>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    accessToken,
  });
}

export function markAllNotificationsRead(accessToken: string) {
  return request<MarkAllNotificationsReadResponse>('/notifications/read-all', {
    method: 'PATCH',
    accessToken,
  });
}
