import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useDebouncedValue } from './useDebouncedValue';

function DebouncedProbe({ value, delayMs, onValue }) {
  const debounced = useDebouncedValue(value, delayMs);
  React.useEffect(() => {
    onValue(debounced);
  }, [debounced, onValue]);
  return null;
}

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('updates after delay', () => {
    const seen = [];
    let renderer;
    act(() => {
      renderer = TestRenderer.create(
        <DebouncedProbe value="a" delayMs={200} onValue={(v) => seen.push(v)} />,
      );
    });
    expect(seen[seen.length - 1]).toBe('a');

    act(() => {
      renderer.update(<DebouncedProbe value="ab" delayMs={200} onValue={(v) => seen.push(v)} />);
    });
    expect(seen[seen.length - 1]).toBe('a');

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(seen[seen.length - 1]).toBe('ab');
  });
});
