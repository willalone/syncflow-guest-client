import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../services/api/authApi';
import * as clientApi from '../services/api/clientApi';
import { runtimeConfig } from '../config/runtimeConfig';
import { readAuthSession, writeAuthSession } from '../services/authSessionStorage';

const AuthContext = createContext();

function normalizeSession(payload) {
  if (!payload) return null;
  const accessToken = payload.accessToken ?? payload.token ?? null;
  return {
    ...payload,
    accessToken,
    token: accessToken,
  };
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    async function restore() {
      try {
        const stored = await readAuthSession();
        if (stored) {
          setSession(normalizeSession(stored));
        }
      } finally {
        setIsLoadingSession(false);
      }
    }
    restore();
  }, []);

  const signIn = async (fields) => {
    setAuthError('');
    const payload =
      runtimeConfig.integratedBackend === 'syncflow'
        ? await authApi.signIn({ login: fields.login, password: fields.password })
        : await authApi.signIn({ phone: fields.phone, password: fields.password });
    const normalized = normalizeSession(payload);
    setSession(normalized);
    await writeAuthSession(normalized);
  };

  const signUp = async (fields) => {
    setAuthError('');
    const payload =
      runtimeConfig.integratedBackend === 'syncflow'
        ? await authApi.signUp({
            firstName: fields.firstName,
            lastName: fields.lastName,
            login: fields.login,
            password: fields.password,
            phoneNumber: fields.phoneNumber || undefined,
            email: fields.email || undefined,
          })
        : await authApi.signUp({ name: fields.name, phone: fields.phone, password: fields.password });
    const normalized = normalizeSession(payload);
    setSession(normalized);
    await writeAuthSession(normalized);
  };

  const signOut = async () => {
    try {
      const pushToken = String(session?.pushDeviceToken || '').trim();
      if (pushToken) {
        await clientApi.unregisterPushDevice(pushToken);
      }
    } catch {
      // no-op: logout must continue even if token cleanup failed
    }
    setSession(null);
    await writeAuthSession(null);
  };

  const updateAccount = async (patch) => {
    if (!session?.user?.id) {
      return null;
    }
    const nextUser = await authApi.updateAccount(session.user.id, patch);
    if (!nextUser) {
      return null;
    }
    const nextSession = normalizeSession({ ...session, user: nextUser });
    setSession(nextSession);
    await writeAuthSession(nextSession);
    return nextUser;
  };

  const deleteAccount = async () => {
    if (!session?.user?.id) {
      return null;
    }
    const token = session.accessToken || session.token;
    await authApi.deleteAccount(session.user.id, token);
    setSession(null);
    await writeAuthSession(null);
    return true;
  };

  /** Подтянуть сессию из хранилища (например после PATCH /guest/profile, который обновляет user в AsyncStorage). */
  const refreshSessionFromStorage = useCallback(async () => {
    const stored = await readAuthSession();
    if (stored) {
      setSession(normalizeSession(stored));
    }
  }, []);

  const requestPasswordRecovery = async ({ email, signal }) => {
    setAuthError('');
    return authApi.requestPasswordRecovery({ email, signal });
  };

  const confirmPasswordRecovery = async ({ email, code, newPassword, signal }) => {
    setAuthError('');
    return authApi.confirmPasswordRecovery({ email, code, newPassword, signal });
  };

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      token: session?.accessToken || session?.token || null,
      isLoadingSession,
      authError,
      setAuthError,
      signIn,
      signUp,
      signOut,
      updateAccount,
      deleteAccount,
      refreshSessionFromStorage,
      requestPasswordRecovery,
      confirmPasswordRecovery,
      isAuthenticated: Boolean(session?.accessToken || session?.token),
    }),
    [session, isLoadingSession, authError, refreshSessionFromStorage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
