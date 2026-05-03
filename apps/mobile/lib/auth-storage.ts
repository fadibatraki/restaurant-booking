import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { User } from './types';

const ACCESS_TOKEN_KEY = 'restaurant_booking_access_token';
const USER_KEY = 'restaurant_booking_user';

export type StoredAuth = {
  accessToken: string;
  user: User;
};

async function getItem(key: string) {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function loadStoredAuth(): Promise<StoredAuth | null> {
  const [accessToken, userJson] = await Promise.all([getItem(ACCESS_TOKEN_KEY), getItem(USER_KEY)]);

  if (!accessToken || !userJson) {
    return null;
  }

  try {
    return {
      accessToken,
      user: JSON.parse(userJson) as User,
    };
  } catch {
    await clearStoredAuth();
    return null;
  }
}

export async function saveStoredAuth(auth: StoredAuth) {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, auth.accessToken),
    setItem(USER_KEY, JSON.stringify(auth.user)),
  ]);
}

export async function clearStoredAuth() {
  await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(USER_KEY)]);
}
