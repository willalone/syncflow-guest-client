import AsyncStorage from '@react-native-async-storage/async-storage';
import { compareTableIds } from './tableHallLayout';
import { runtimeConfig } from '../config/runtimeConfig';

const CACHE_KEY = '@mobile_employee/hall_table_catalog';

/**
 * Объединяет несколько списков столов по id (поздние поля перекрывают ранние).
 */
export function mergeTableCatalog(...lists) {
  const byId = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      const id = String(row?.id ?? '').trim();
      if (!id) continue;
      const prev = byId.get(id);
      byId.set(id, prev ? { ...prev, ...row, id } : { ...row, id });
    }
  }
  return [...byId.values()].sort((a, b) => compareTableIds(a.id, b.id));
}

function cacheScopeKey() {
  const restaurant = runtimeConfig.restaurantId || 'default';
  return `${CACHE_KEY}:${restaurant}`;
}

export async function readHallTableCatalog() {
  try {
    const raw = await AsyncStorage.getItem(cacheScopeKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeHallTableCatalog(tables) {
  const merged = mergeTableCatalog(tables);
  if (!merged.length) return;
  try {
    await AsyncStorage.setItem(cacheScopeKey(), JSON.stringify(merged));
  } catch {
    /* ignore */
  }
}

export async function patchHallTableCatalog(tables) {
  const cached = await readHallTableCatalog();
  const merged = mergeTableCatalog(cached, tables);
  await writeHallTableCatalog(merged);
  return merged;
}

/** Столы из app.json → extra.hallTableCatalog (запасной каталог при 403 на GET /tables). */
export function getConfiguredHallTables() {
  const raw = runtimeConfig.hallTableCatalog;
  if (!Array.isArray(raw) || !raw.length) return [];
  return raw
    .map((row) => {
      const id = String(row?.id ?? '').trim();
      if (!id) return null;
      const seats = Number(row?.seats ?? row?.seatCount);
      return {
        id,
        name: String(row?.name || '').trim() || `Стол №${id}`,
        seats: Number.isFinite(seats) ? seats : undefined,
        seatCount: Number.isFinite(seats) ? seats : undefined,
      };
    })
    .filter(Boolean);
}
