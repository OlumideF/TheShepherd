import { Platform } from 'react-native';
import type { SupportedStorage } from '@supabase/supabase-js';

/**
 * SecureStore on native; localStorage on web.
 * SecureStore has a ~2KB value limit — large sessions fall back to memory.
 */
export function createAuthStorage(): SupportedStorage {
  if (Platform.OS === 'web') {
    return {
      getItem: (key) => {
        if (typeof localStorage === 'undefined') {
          return Promise.resolve(null);
        }
        return Promise.resolve(localStorage.getItem(key));
      },
      setItem: (key, value) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
        return Promise.resolve();
      },
      removeItem: (key) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
        return Promise.resolve();
      },
    };
  }

  // Lazy-require so web bundling never pulls in SecureStore.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');

  return {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
  };
}
