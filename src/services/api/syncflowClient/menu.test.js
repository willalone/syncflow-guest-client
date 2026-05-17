jest.mock('../../syncflowHttp', () => ({
  syncflowPublicRequest: jest.fn(),
  syncflowGuestRequest: jest.fn(),
}));

import { syncflowGuestRequest, syncflowPublicRequest } from '../../syncflowHttp';
import { fetchDishIngredients, fetchMenu, fetchMenuRecommended } from './menu';

describe('syncflowClient/menu', () => {
  beforeEach(() => jest.clearAllMocks());

  test('fetchMenu maps rows to dishes', async () => {
    syncflowPublicRequest.mockResolvedValue([
      {
        id: 1,
        totalDishPrice: 300,
        category: { name: 'Супы' },
        dish: { id: 10, name: 'Борщ', description: '', netWeight: 300, unit: { name: 'мл' } },
      },
    ]);
    const menu = await fetchMenu();
    expect(menu.categories).toContain('Все');
    expect(menu.categories).toContain('Супы');
    expect(menu.dishes[0].title).toBe('Борщ');
  });

  test('fetchMenu falls back to guest on 401', async () => {
    syncflowPublicRequest.mockRejectedValue({ status: 401 });
    syncflowGuestRequest.mockResolvedValue([]);
    const menu = await fetchMenu();
    expect(menu.dishes).toEqual([]);
    expect(syncflowGuestRequest).toHaveBeenCalledWith('/menu/client');
  });

  test('fetchMenuRecommended clamps limit', async () => {
    syncflowPublicRequest.mockResolvedValue([]);
    await fetchMenuRecommended(999);
    expect(syncflowPublicRequest).toHaveBeenCalledWith('/menu/recommended?limit=50');
  });

  test('fetchDishIngredients', async () => {
    syncflowGuestRequest.mockResolvedValue({ content: [{ id: 1 }] });
    const rows = await fetchDishIngredients('10');
    expect(syncflowGuestRequest).toHaveBeenCalledWith('/ingredient-in-dish/dish/10');
    expect(rows).toHaveLength(1);
  });
});
