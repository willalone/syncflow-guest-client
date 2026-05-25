import { getConfiguredHallTables, mergeTableCatalog } from './tableCatalog';

jest.mock('../config/runtimeConfig', () => ({
  runtimeConfig: {
    restaurantId: 'r1',
    hallTableCatalog: [
      { id: 3, seats: 4, name: 'VIP' },
      { id: '1', seatCount: 2 },
    ],
  },
}));

describe('mergeTableCatalog', () => {
  it('unions tables by id and keeps richest fields', () => {
    const merged = mergeTableCatalog(
      [{ id: '2', name: 'B', seats: 4 }],
      [{ id: '1', seats: 2 }],
      [{ id: '2', seats: 6, from: '10:00' }]
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((t) => t.id === '2')).toMatchObject({ name: 'B', seats: 6, from: '10:00' });
  });

  it('sorts by numeric table id', () => {
    const merged = mergeTableCatalog([{ id: '10' }, { id: '2' }, { id: '1' }]);
    expect(merged.map((t) => t.id)).toEqual(['1', '2', '10']);
  });

  it('reads configured hall tables from runtime config', () => {
    const rows = getConfiguredHallTables();
    expect(rows).toHaveLength(2);
    expect(rows.find((t) => t.id === '1')).toMatchObject({ seats: 2 });
    expect(rows.find((t) => t.id === '3')).toMatchObject({ name: 'VIP', seats: 4 });
  });
});
