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
