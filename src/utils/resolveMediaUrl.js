import { runtimeConfig } from '../config/runtimeConfig';
import { bookingTables, dishes as catalogDishes } from '../data/menu';

/** Хосты внешних картинок, которые подменяем на /api/media/proxy (см. server). */
const PROXY_IMAGE_HOSTS = new Set(['images.unsplash.com', 'plus.unsplash.com']);

const UNSPLASH_MAX_W = 720;
const UNSPLASH_MAX_Q = 75;

function normTitle(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const dishImageByTitle = new Map(catalogDishes.map((d) => [normTitle(d.title), d.imageUrl]));

function allowCatalogImageFallback() {
  // For real SyncFlow backend we should trust server media only.
  // Local catalog fallbacks are kept only for mock/local scenarios.
  if (runtimeConfig.integratedBackend === 'syncflow' && !runtimeConfig.useMockApi) {
    return false;
  }
  return true;
}

/** Если в БД нет URL и название не совпало с каталогом — берём Unsplash из каталога по стабильному индексу (единый стиль). */
function catalogImageByStableIndex(dish) {
  if (!catalogDishes.length) return '';
  let h = 0;
  const key = String(dish?.id ?? dish?.title ?? dish?.name ?? '');
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % catalogDishes.length;
  return resolveMediaUrl(catalogDishes[idx].imageUrl);
}

function coerceImageUrlInput(url) {
  if (url == null) return '';
  if (typeof url === 'string') {
    return url
      .trim()
      .replace(/^\uFEFF/, '')
      .replace(/^["']|["']$/g, '');
  }
  if (typeof url === 'number' && Number.isFinite(url)) return String(url);
  return '';
}

function googleDriveDirectUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (!/^(drive|docs)\.google\.com$/i.test(u.hostname)) return null;

    let fileId = '';
    const byQuery = String(u.searchParams.get('id') || '').trim();
    if (byQuery) fileId = byQuery;

    if (!fileId) {
      const match = u.pathname.match(/\/file\/d\/([^/]+)/i);
      if (match?.[1]) {
        fileId = String(match[1]).trim();
      }
    }

    if (!fileId) return null;
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
  } catch {
    return null;
  }
}

function currentApiOriginParts() {
  const apiBase = runtimeConfig.apiBaseUrl.replace(/\/+$/, '');
  let origin = apiBase.replace(/\/api$/i, '');
  if (!origin) origin = apiBase;
  try {
    const o = new URL(origin.includes('://') ? origin : `http://${origin}`);
    return { protocol: o.protocol, hostname: o.hostname, port: o.port || '' };
  } catch {
    return null;
  }
}

/**
 * Кэш AsyncStorage хранит уже нормализованные URL со старым LAN-IP — перепривязываем к текущему apiBaseUrl.
 */
function rewriteOurHostedAbsoluteUrl(raw) {
  const s = coerceImageUrlInput(raw);
  if (!s || /^data:image\//i.test(s)) return s;
  try {
    const u = new URL(s);
    const parts = currentApiOriginParts();
    if (!parts) return s;
    const path = u.pathname || '';
    const isProxy = /\/media\/proxy$/i.test(path.replace(/\/+$/, '')) && u.searchParams.has('u');
    const isUploads = path.startsWith('/uploads/');
    if (!isProxy && !isUploads) return s;
    u.protocol = parts.protocol;
    u.hostname = parts.hostname;
    u.port = parts.port;
    return u.toString();
  } catch {
    return s;
  }
}

function tightenUnsplashUrl(absUrl) {
  try {
    const u = new URL(absUrl);
    if (!PROXY_IMAGE_HOSTS.has(u.hostname)) return absUrl;
    const wParam = u.searchParams.get('w');
    if (wParam != null) {
      const w = Number(wParam);
      if (Number.isFinite(w) && w > UNSPLASH_MAX_W) u.searchParams.set('w', String(UNSPLASH_MAX_W));
    } else {
      u.searchParams.set('w', String(UNSPLASH_MAX_W));
    }
    const qParam = u.searchParams.get('q');
    if (qParam != null) {
      const q = Number(qParam);
      if (Number.isFinite(q) && q > UNSPLASH_MAX_Q) u.searchParams.set('q', String(UNSPLASH_MAX_Q));
    } else {
      u.searchParams.set('q', String(UNSPLASH_MAX_Q));
    }
    return u.toString();
  } catch {
    return absUrl;
  }
}

/**
 * Приводит URL картинки к абсолютному адресу, доступному с устройства.
 * — относительные пути (/uploads/...) → origin API без суффикса /api
 * — http://localhost или 127.0.0.1 → хост из extra.apiBaseUrl (LAN)
 */
export function resolveMediaUrl(url) {
  const raw = coerceImageUrlInput(url);
  if (!raw) return '';

  if (/^data:image\//i.test(raw)) return raw;

  const apiBase = runtimeConfig.apiBaseUrl.replace(/\/+$/, '');
  let origin = apiBase.replace(/\/api$/i, '');
  if (!origin) origin = apiBase;

  const tryRewriteLocalhost = (absolute) => {
    try {
      const u = new URL(absolute);
      if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') {
        return absolute;
      }
      const o = new URL(origin.includes('://') ? origin : `http://${origin}`);
      u.protocol = o.protocol;
      u.hostname = o.hostname;
      u.port = o.port || '';
      return u.toString();
    } catch {
      return absolute;
    }
  };

  if (/^https?:\/\//i.test(raw)) {
    const gdrive = googleDriveDirectUrl(raw);
    if (gdrive) return gdrive;
    const rebound = rewriteOurHostedAbsoluteUrl(raw);
    return tryRewriteLocalhost(rebound);
  }

  if (raw.startsWith('//')) {
    return tryRewriteLocalhost(`https:${raw}`);
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  try {
    const base = origin.includes('://') ? origin : `http://${origin}`;
    return new URL(path, base).toString();
  } catch {
    return `${origin.replace(/\/+$/, '')}${path}`;
  }
}

/**
 * Подмена внешних URL на прокси через ваш API (тот же хост, что и /menu).
 * Иначе с мобильной сети images.unsplash.com часто недоступен → onError и плейсхолдер с инициалами.
 */
function clientLoadableImageUrl(absoluteUrl) {
  const u = coerceImageUrlInput(absoluteUrl);
  if (!u || /^data:image\//i.test(u)) return u;
  try {
    const parsed = new URL(u);
    if (
      runtimeConfig.useBackendImageProxy &&
      parsed.protocol === 'https:' &&
      PROXY_IMAGE_HOSTS.has(parsed.hostname)
    ) {
      const apiBase = runtimeConfig.apiBaseUrl.replace(/\/+$/, '');
      const tuned = tightenUnsplashUrl(parsed.toString());
      return `${apiBase}/media/proxy?u=${encodeURIComponent(tuned)}`;
    }
  } catch {
    return u;
  }
  return u;
}

/** URL для блюда: API → нормализация; если пусто — тот же Unsplash, что в локальном каталоге (единый стиль). */
function finalDishImageUrl(dish) {
  const raw = dish.imageUrl ?? dish.image_url ?? dish.photo ?? dish.picture ?? dish.image;
  let u = resolveMediaUrl(raw);
  if (!u && allowCatalogImageFallback()) {
    const cat = dishImageByTitle.get(normTitle(dish.title ?? dish.name));
    if (cat) u = resolveMediaUrl(cat);
  }
  if (!u && allowCatalogImageFallback()) u = catalogImageByStableIndex(dish);
  return clientLoadableImageUrl(u);
}

function finalTableImageUrl(table) {
  const raw = table.imageUrl ?? table.image_url;
  let u = resolveMediaUrl(raw);
  if (!u) {
    const match = bookingTables.find(
      (t) => String(t.id) === String(table.id) || normTitle(t.name) === normTitle(table.name)
    );
    if (match?.imageUrl) u = resolveMediaUrl(match.imageUrl);
  }
  return clientLoadableImageUrl(u);
}

function coercePayloadShape(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  if (Array.isArray(payload.dishes)) return payload;
  if (payload.data && Array.isArray(payload.data.dishes)) return payload.data;
  return payload;
}

export function normalizeMenuClientPayload(payload) {
  const shaped = coercePayloadShape(payload);
  if (!shaped || !Array.isArray(shaped.dishes)) return payload;
  return {
    ...shaped,
    dishes: shaped.dishes.map((d) => ({
      ...d,
      imageUrl: finalDishImageUrl(d),
    })),
  };
}

export function normalizeTablesClientPayload(tables) {
  if (!Array.isArray(tables)) return tables;
  return tables.map((t) => ({
    ...t,
    imageUrl: finalTableImageUrl(t),
  }));
}
