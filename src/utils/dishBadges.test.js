import { getRoleBadge, getRoleColor, getRoleLabel } from './dishBadges';

describe('dishBadges', () => {
  test('getRoleBadge uses explicit role or category heuristics', () => {
    expect(getRoleBadge({ role: 'Детское' })).toBe('Детское');
    expect(getRoleBadge({ category: 'Основные блюда', price: 1500 })).toBe('Премиум-якорь');
    expect(getRoleBadge({ category: 'Закуски' })).toBe('Беспроигрышное');
    expect(getRoleBadge({ category: 'Салаты' })).toBe('Дойная корова');
  });

  test('getRoleColor and getRoleLabel', () => {
    expect(getRoleLabel('Локомотив')).toBe('ХИТ');
    expect(getRoleColor('Локомотив')).toMatch(/^#/);
    expect(getRoleLabel('unknown')).toBe('ВЫГОДНО');
  });
});
