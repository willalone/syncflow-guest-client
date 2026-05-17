import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

/** Минимальный renderHook без @testing-library — для unit-тестов хуков. */
export function renderHook(hook, { initialProps } = {}) {
  const result = { current: null };

  function Wrapper(props) {
    result.current = hook(props);
    return null;
  }

  let renderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Wrapper, initialProps));
  });

  return {
    result,
    rerender: (props) => {
      act(() => {
        renderer.update(React.createElement(Wrapper, props));
      });
    },
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
  };
}

export { act };
