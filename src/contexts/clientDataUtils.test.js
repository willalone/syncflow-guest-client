import {
  buildCartItemId,
  cartKey,
  mergeUniqueById,
  normalizeModifiers,
  uniqueStringArray,
  userScopedCacheKey,
} from './clientDataUtils';

describe('clientDataUtils', () => {
  test('cache keys include user id', () => {
    expect(cartKey('u1')).toBe('client_cart_u1');
    expect(userScopedCacheKey(null)).toContain('guest');
  });

  test('uniqueStringArray deduplicates strings', () => {
    expect(uniqueStringArray(['a', 'a', 1, 1])).toEqual(['a', '1']);
  });

  test('mergeUniqueById merges without duplicates', () => {
    const merged = mergeUniqueById([{ id: '1' }], [{ id: '1' }, { id: '2' }]);
    expect(merged).toHaveLength(2);
    expect(merged.map((x) => x.id)).toEqual(['1', '2']);
  });

  test('normalizeModifiers filters invalid rows', () => {
    expect(
      normalizeModifiers([
        { id: 'm1', name: 'Сыр', price: 50 },
        { id: '', name: 'x' },
      ]),
    ).toEqual([{ id: 'm1', name: 'Сыр', price: 50, weight: '' }]);
  });

  test('buildCartItemId encodes dish and modifiers', () => {
    const id = buildCartItemId('7', [{ id: 'm1', name: 'X', price: 10 }], 11);
    expect(id).toMatch(/^mc11::/);
    expect(buildCartItemId('7', [])).toMatch(/^d7::$/);
  });
});
