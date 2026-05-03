export type UserRole = 'CUSTOMER' | 'RESTAURANT_ADMIN' | 'SUPER_ADMIN';

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type NotificationType =
  | 'RESERVATION_CREATED'
  | 'RESERVATION_CANCELLED_BY_CUSTOMER'
  | 'RESERVATION_CONFIRMED_BY_OWNER'
  | 'RESERVATION_COMPLETED_BY_OWNER'
  | 'RESERVATION_REJECTED_BY_OWNER'
  | 'RESERVATION_CANCELLED_BY_OWNER';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type MeResponse = {
  id: string;
  email: string;
  role: UserRole;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: User;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

export type RegisterResponse = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
};

export type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  phone: string | null;
  image: string | null;
  openTime: string | null;
  closeTime: string | null;
  ownerId: string;
  createdAt: string;
};

export type AvailabilityTable = {
  id: string;
  name: string;
  capacity: number;
  isActive: boolean;
  restaurantId: string;
  createdAt: string;
  isAvailable: boolean;
};

export type CreateReservationRequest = {
  restaurantId: string;
  tableId: string;
  reservationDate: string;
  guestsCount: number;
  notes?: string;
};

export type Reservation = {
  id: string;
  userId: string;
  restaurantId: string;
  tableId: string;
  reservationDate: string;
  guestsCount: number;
  notes: string | null;
  status: ReservationStatus;
  createdAt: string;
};

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  reservationId: string | null;
  restaurantId: string | null;
  actorUserId: string | null;
};

export type MarkAllNotificationsReadResponse = {
  updatedCount: number;
};
