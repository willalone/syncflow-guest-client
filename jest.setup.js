jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      useMockApi: false,
      integratedBackend: 'syncflow',
      apiBaseUrl: 'http://127.0.0.1:3000/api',
    },
  },
  appOwnership: 'expo',
}));

jest.mock('expo-notifications', () => ({}));

const secureStoreMemory = {};
jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  getItemAsync: jest.fn((key) => Promise.resolve(secureStoreMemory[key] ?? null)),
  setItemAsync: jest.fn((key, value) => {
    secureStoreMemory[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key) => {
    delete secureStoreMemory[key];
    return Promise.resolve();
  }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn(() => jest.fn()),
}));
