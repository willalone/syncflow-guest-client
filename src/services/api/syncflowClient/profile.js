import { syncflowGuestRequest } from '../../syncflowHttp';
import { readAuthSession, writeAuthSession } from '../../authSessionStorage';
import { authUserFieldsEqual } from '../../../utils/authSessionCompare';
import { mapBonusTransactionToClient, normalizeSyncflowListResponse } from '../syncflowMappers';
import { apiDateToDdMmYyyy, birthDdMmYyyyToApiIso, pickFirstFinite } from './shared';

const PROFILE_FETCH_COOLDOWN_MS = 5000;

const profileCoalesce = {
  inflight: null,
  inflightUserId: null,
  lastAt: 0,
  lastUserId: null,
  lastValue: null,
};

export function resetProfileFetchCoalescing() {
  profileCoalesce.inflight = null;
  profileCoalesce.inflightUserId = null;
  profileCoalesce.lastAt = 0;
  profileCoalesce.lastUserId = null;
  profileCoalesce.lastValue = null;
}

function buildProfileFromSources({ profileRaw, sessionUser, balance }) {
  const u = sessionUser || {};
  const resolvedFirstName = profileRaw?.firstName ?? u.firstName;
  const resolvedLastName = profileRaw?.lastName ?? u.lastName;
  const resolvedEmail = profileRaw?.email ?? u.email ?? '';
  const resolvedLogin = profileRaw?.login ?? u.login;
  const resolvedPhone = profileRaw?.phoneNumber ?? u.phoneNumber ?? u.phone ?? '';
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
    id: String(profileRaw?.id != null ? profileRaw.id : u.id ?? ''),
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
    sessionUser: {
      ...u,
      id: profileRaw?.id != null ? String(profileRaw.id) : String(u.id ?? ''),
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      login: resolvedLogin,
      email: resolvedEmail,
      phoneNumber: resolvedPhone,
    },
  };
}

async function fetchUserProfileUncached(_userId) {
  const session = await readAuthSession();
  const u = session?.user || {};
  let profileRaw = {};
  let profileFetchOk = false;
  try {
    profileRaw = (await syncflowGuestRequest('/guest/profile')) || {};
    profileFetchOk = true;
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

  const built = buildProfileFromSources({ profileRaw, sessionUser: u, balance });
  const nextUser = built.sessionUser;
  delete built.sessionUser;

  if (session && profileFetchOk && !authUserFieldsEqual(session.user, nextUser)) {
    await writeAuthSession({ ...session, user: nextUser });
  }

  return built;
}

export async function fetchUserProfile(userId, options = {}) {
  const uid = String(userId ?? '');
  const force = options.force === true;
  const now = Date.now();

  if (
    profileCoalesce.inflight &&
    profileCoalesce.inflightUserId === uid
  ) {
    return profileCoalesce.inflight;
  }

  if (
    !force &&
    profileCoalesce.lastValue &&
    profileCoalesce.lastUserId === uid &&
    now - profileCoalesce.lastAt < PROFILE_FETCH_COOLDOWN_MS
  ) {
    return profileCoalesce.lastValue;
  }

  const promise = fetchUserProfileUncached(uid)
    .then((value) => {
      profileCoalesce.lastAt = Date.now();
      profileCoalesce.lastUserId = uid;
      profileCoalesce.lastValue = value;
      return value;
    })
    .finally(() => {
      if (profileCoalesce.inflight === promise) {
        profileCoalesce.inflight = null;
        profileCoalesce.inflightUserId = null;
      }
    });

  profileCoalesce.inflight = promise;
  profileCoalesce.inflightUserId = uid;
  return promise;
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
  return fetchUserProfile(_userId, { force: true });
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
