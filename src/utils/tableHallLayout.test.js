import { assignTablesToLayout, compareTableIds, hallTableLabel, tableIdSortKey } from './tableHallLayout';

describe('tableHallLayout', () => {
  it('sorts table ids numerically', () => {
    expect(tableIdSortKey('t10')).toBe(10);
    expect(compareTableIds('t2', 't10')).toBeLessThan(0);
  });

  it('places 8 tables in a 2×4 grid with equal cell size', () => {
    const tables = Array.from({ length: 8 }, (_, i) => ({ id: `t${i + 1}` }));
    const out = assignTablesToLayout(tables);
    expect(out).toHaveLength(8);
    const { w, h } = out[0].layout;
    expect(out.every((t) => t.layout.w === w && t.layout.h === h)).toBe(true);
    expect(out[0].layout.hallNumber).toBe(1);
    expect(out[1].layout.hallNumber).toBe(2);
    expect(out[0].layout.col).toBe(0);
    expect(out[1].layout.col).toBe(1);
    expect(out[2].layout.row).toBe(1);
    const gapX = out[1].layout.x - (out[0].layout.x + w);
    const gapY = out[2].layout.y - (out[0].layout.y + h);
    expect(out[3].layout.x - (out[2].layout.x + w)).toBeCloseTo(gapX, 5);
    expect(out[4].layout.y - (out[2].layout.y + h)).toBeCloseTo(gapY, 5);
  });

  it('labels tables by hall number', () => {
    expect(hallTableLabel(3)).toBe('Стол 3');
  });
});
