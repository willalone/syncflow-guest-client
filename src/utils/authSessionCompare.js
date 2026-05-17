/** Стабильный ключ сессии для пропуска лишних записей и notify. */
export function sessionPersistenceKey(session) {
  if (session == null) return 'null';
  const accessToken = session.accessToken ?? session.token ?? '';
  const refreshToken = session.refreshToken ?? '';
  const user = session.user && typeof session.user === 'object' ? session.user : {};
  const pushDeviceToken = session.pushDeviceToken ?? user.pushDeviceToken ?? '';
  return JSON.stringify({
    accessToken,
    refreshToken,
    pushDeviceToken,
    user: {
      id: user.id != null ? String(user.id) : '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      login: user.login ?? '',
      email: user.email ?? '',
      phoneNumber: user.phoneNumber ?? user.phone ?? '',
    },
  });
}

export function authUserFieldsEqual(a, b) {
  if (a === b) return true;
  const left = a && typeof a === 'object' ? a : {};
  const right = b && typeof b === 'object' ? b : {};
  const fields = ['id', 'firstName', 'lastName', 'login', 'email', 'phoneNumber', 'phone'];
  return fields.every((key) => String(left[key] ?? '') === String(right[key] ?? ''));
}
