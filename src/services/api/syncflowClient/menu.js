import { syncflowGuestRequest, syncflowPublicRequest } from '../../syncflowHttp';
import { mapMenuClientRowToDish, normalizeSyncflowListResponse } from '../syncflowMappers';

export async function fetchMenu() {
  let raw;
  try {
    raw = await syncflowPublicRequest('/menu/client');
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status === 401 || status === 403) {
      raw = await syncflowGuestRequest('/menu/client');
    } else {
      throw error;
    }
  }
  if (!Array.isArray(raw)) {
    return { categories: ['Все'], dishes: [] };
  }
  const dishes = raw.map(mapMenuClientRowToDish).filter(Boolean);
  const categories = ['Все', ...new Set(dishes.map((d) => d.category).filter(Boolean))];
  return { categories, dishes };
}

export async function fetchMenuRecommended(limit = 5) {
  const q = Math.max(1, Math.min(50, Number(limit) || 5));
  let raw;
  try {
    raw = await syncflowPublicRequest(`/menu/recommended?limit=${encodeURIComponent(q)}`);
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status === 401 || status === 403) {
      raw = await syncflowGuestRequest(`/menu/recommended?limit=${encodeURIComponent(q)}`);
    } else {
      throw error;
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(mapMenuClientRowToDish).filter(Boolean);
}

export async function fetchDishIngredients(dishId) {
  const raw = await syncflowGuestRequest(`/ingredient-in-dish/dish/${encodeURIComponent(dishId)}`);
  return normalizeSyncflowListResponse(raw);
}

export async function fetchDishModifiers(dishId) {
  const raw = await syncflowGuestRequest(`/modificator-in-dish/dish/${encodeURIComponent(dishId)}`);
  return normalizeSyncflowListResponse(raw);
}
