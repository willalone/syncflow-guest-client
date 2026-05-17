import { unwrapSyncflowList } from './syncflowList';

describe('unwrapSyncflowList', () => {
  test('unwraps arrays and Spring wrappers', () => {
    expect(unwrapSyncflowList([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(unwrapSyncflowList({ content: [{ id: 2 }] })).toEqual([{ id: 2 }]);
    expect(unwrapSyncflowList({ data: [{ id: 3 }] })).toEqual([{ id: 3 }]);
    expect(unwrapSyncflowList({ items: [{ id: 4 }] })).toEqual([{ id: 4 }]);
    expect(unwrapSyncflowList({ results: [{ id: 5 }] })).toEqual([{ id: 5 }]);
  });

  test('unwraps HAL _embedded', () => {
    expect(unwrapSyncflowList({ _embedded: { rows: [{ id: 6 }] } })).toEqual([{ id: 6 }]);
  });

  test('returns empty for nullish', () => {
    expect(unwrapSyncflowList(null)).toEqual([]);
    expect(unwrapSyncflowList('x')).toEqual([]);
  });
});
