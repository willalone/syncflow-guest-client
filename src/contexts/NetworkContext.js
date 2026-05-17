import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getTransportDown, subscribeNetworkConnection } from '../services/syncflowHttp';

const NetworkContext = createContext({
  isOffline: false,
  isConnected: true,
  transportDown: false,
});

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return ctx;
}

export function NetworkProvider({ children }) {
  const [isConnected, setIsConnected] = useState(true);
  const [transportDown, setTransportDown] = useState(getTransportDown());

  useEffect(() => {
    let mounted = true;
    const resolveOnline = (state) => {
      if (state.isConnected === false) return false;
      // null = «неизвестно» на iOS — не считаем офлайн, иначе ложная блокировка кнопок.
      if (state.isInternetReachable === false) return false;
      return true;
    };

    NetInfo.fetch().then((state) => {
      if (!mounted) return;
      setIsConnected(resolveOnline(state));
    });

    const unsubNet = NetInfo.addEventListener((state) => {
      setIsConnected(resolveOnline(state));
    });
    const unsubTransport = subscribeNetworkConnection((event) => {
      setTransportDown(event === 'down' || getTransportDown());
      if (event === 'restored') {
        setTransportDown(false);
      }
    });
    return () => {
      mounted = false;
      unsubNet();
      unsubTransport();
    };
  }, []);

  const value = useMemo(() => {
    const isOffline = !isConnected || transportDown;
    return { isOffline, isConnected, transportDown };
  }, [isConnected, transportDown]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
