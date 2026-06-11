import '@testing-library/jest-dom/vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = global.ResizeObserver ?? (ResizeObserverMock as unknown as typeof ResizeObserver);

Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 400 });
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 360 });

HTMLElement.prototype.getBoundingClientRect = function () {
  return {
    width: 400,
    height: 360,
    top: 0,
    left: 0,
    bottom: 360,
    right: 400,
    x: 0,
    y: 0,
    toJSON: () => {},
  } as DOMRect;
};
