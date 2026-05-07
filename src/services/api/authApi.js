import { runtimeConfig } from '../../config/runtimeConfig';
import * as mockApi from './authApi.mock';
import * as localHttp from './authApi.local.http';
import * as syncflowHttp from './authApi.syncflow.http';

const httpApi = runtimeConfig.integratedBackend === 'syncflow' ? syncflowHttp : localHttp;
const api = runtimeConfig.useMockApi ? mockApi : httpApi;

export const signIn = (...args) => api.signIn(...args);
export const signUp = (...args) => api.signUp(...args);
export const updateAccount = (...args) => (api.updateAccount ? api.updateAccount(...args) : null);
export const deleteAccount = (...args) => (api.deleteAccount ? api.deleteAccount(...args) : Promise.reject(new Error('Недоступно')));
export const requestPasswordRecovery = (...args) =>
  (api.requestPasswordRecovery
    ? api.requestPasswordRecovery(...args)
    : Promise.reject(new Error('Восстановление пароля пока недоступно.')));
export const confirmPasswordRecovery = (...args) =>
  (api.confirmPasswordRecovery
    ? api.confirmPasswordRecovery(...args)
    : Promise.reject(new Error('Восстановление пароля пока недоступно.')));
