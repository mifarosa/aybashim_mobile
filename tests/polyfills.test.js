import { afterEach, describe, expect, it, vi } from 'vitest';

const original = Promise.withResolvers;

afterEach(() => {
  Object.defineProperty(Promise, 'withResolvers', { configurable: true, writable: true, value: original });
});

describe('polyfills', () => {
  it('adds Promise.withResolvers when the browser lacks it', async () => {
    delete Promise.withResolvers;
    vi.resetModules();
    await import('../src/core/polyfills.js');

    const { promise, resolve } = Promise.withResolvers();
    resolve(42);
    await expect(promise).resolves.toBe(42);

    const rejected = Promise.withResolvers();
    rejected.reject(new Error('boom'));
    await expect(rejected.promise).rejects.toThrow('boom');
  });

  it('keeps the native implementation when it exists', async () => {
    vi.resetModules();
    await import('../src/core/polyfills.js');
    expect(Promise.withResolvers).toBe(original);
  });
});
