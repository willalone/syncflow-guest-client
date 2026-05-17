import { syncflowGuestRequest } from '../../syncflowHttp';
import { readAuthSession, writeAuthSession } from '../../authSessionStorage';
import { mapBonusTransactionToClient, normalizeSyncflowListResponse } from '../syncflowMappers';
import { apiDateToDdMmYyyy, birthDdMmYyyyToApiIso, pickFirstFinite } from './shared';

export async function fetchUserProfile(_userId) {
  const session = await readAuthSession();
  const u = session?.user || {};
  let profileRaw = {};
  try {
    profileRaw = await syncflowGuestRequest('/guest/profile');
  } catch {
    profileRaw = {};
  }
  let balance = NaN;
  try {
    const raw = await syncflowGuestRequest('/bonus/my/balance');
    if (typeof raw === 'number' || typeof raw === 'string') {
      balance = Number(raw);
    } else if (raw && typeof raw === 'object') {
      balance = pickFirstFinite([raw.balance, raw.amount, raw.value], NaN);
    }
  } catch {
    balance = NaN;
  }
  if (!Number.isFinite(balance)) {
    balance = pickFirstFinite([profileRaw.bonusBalance, profileRaw.bonus_balance, profileRaw.loyaltyPoints], 0);
  }
  const resolvedFirstName = profileRaw?.firstName ?? u.firstName;
  const resolvedLastName = profileRaw?.lastName ?? u.lastName;
  const resolvedEmail = profileRaw?.email ?? u.email ?? '';
  const resolvedLogin = profileRaw?.login ?? u.login;
  const resolvedPhone = profileRaw?.phoneNumber ?? u.phoneNumber ?? u.phone ?? '';
  const nextUser = {
    ...u,
    id: profileRaw?.id != null ? String(profileRaw.id) : String(u.id ?? ''),
    firstName: resolvedFirstName,
    lastName: resolvedLastName,
    login: resolvedLogin,
    email: resolvedEmail,
    phoneNumber: resolvedPhone,
  };
  if (session) await writeAuthSession({ ...session, user: nextUser });
  const displayName =
    [resolvedFirstName, resolvedLastName].filter(Boolean).join(' ').trim() || resolvedLogin || '';
  const roleRaw = profileRaw?.role != null ? String(profileRaw.role).trim() : '';
  const xpRaw = profileRaw?.xpPoints ?? profileRaw?.xp ?? profileRaw?.experiencePoints;
  const xpPoints = xpRaw != null && Number.isFinite(Number(xpRaw)) ? Number(xpRaw) : undefined;
  const discountPctRaw = Number(
    profileRaw?.discountPercentage ?? profileRaw?.personalDiscountPercent ?? profileRaw?.guestDiscountPercent
  );
  const discountPercentage =
    Number.isFinite(discountPctRaw) && discountPctRaw >= 0 && discountPctRaw <= 100 ? discountPctRaw : undefined;
  const visitCandidates = [
    profileRaw?.visitsCount,
    profileRaw?.visitCount,
    profileRaw?.completedVisits,
    profileRaw?.guestVisits,
    profileRaw?.visits,
  ];
  let visitCount;
  for (const v of visitCandidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) {
      visitCount = Math.floor(n);
      break;
    }
  }
  const birthDate = apiDateToDdMmYyyy(profileRaw?.dateOfBirth) || undefined;
  const patronymic =
    profileRaw?.patronymic != null && String(profileRaw.patronymic).trim()
      ? String(profileRaw.patronymic).trim()
      : undefined;
  const registrationDate =
    profileRaw?.registrationDate != null ? String(profileRaw.registrationDate).trim() : undefined;

  return {
    id: String(nextUser.id || u.id || ''),
    firstName: resolvedFirstName,
    lastName: resolvedLastName,
    patronymic,
    birthDate,
    displayName,
    email: resolvedEmail,
    phone: resolvedPhone,
    phoneNumber: resolvedPhone,
    login: resolvedLogin,
    loyaltyPoints: balance,
    role: roleRaw || undefined,
    xpPoints,
    discountPercentage,
    visitCount,
    registrationDate,
  };
}

export async function updateUserProfile(_userId, patch) {
  const payload = {};
  const first = patch?.firstName != null ? String(patch.firstName).trim() : '';
  const last = patch?.lastName != null ? String(patch.lastName).trim() : '';
  const email = patch?.email != null ? String(patch.email).trim() : '';
  if (first) payload.firstName = first;
  if (last) payload.lastName = last;
  if (email) payload.email = email;
  if (patch?.phoneNumber !== undefined) {
    payload.phoneNumber = String(patch.phoneNumber ?? '').trim();
  }
  const dobIso =
    birthDdMmYyyyToApiIso(patch?.birthDate) ||
    (patch?.dateOfBirth != null && /^\d{4}-\d{2}-\d{2}$/.test(String(patch.dateOfBirth).trim())
      ? String(patch.dateOfBirth).trim()
      : null);
  if (dobIso) payload.dateOfBirth = dobIso;
  if (Object.keys(payload).length) {
    await syncflowGuestRequest('/guest/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
  return fetchUserProfile(_userId);
}

export async function fetchFavorites(_userId) {
  const rows = await syncflowGuestRequest('/guest/favorites');
  if (!Array.isArray(rows)) return [];
  return rows.map((d) => String(d?.id ?? '')).filter(Boolean);
}

export async function toggleFavorite(_userId, dishId) {
  const id = Number(dishId);
  if (!Number.isFinite(id)) {
    throw new Error('Некорректное блюдо для избранного.');
  }
  const current = await fetchFavorites(_userId);
  const set = new Set(current.map(String));
  if (set.has(String(id))) {
    await syncflowGuestRequest(`/guest/favorites/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } else {
    await syncflowGuestRequest(`/guest/favorites/${encodeURIComponent(id)}`, { method: 'POST' });
  }
  return fetchFavorites(_userId);
}

export async function fetchBonusTransactions(_userId) {
  const raw = await syncflowGuestRequest('/bonus/my/transactions');
  const list = normalizeSyncflowListResponse(raw);
  return list.map(mapBonusTransactionToClient);
}
