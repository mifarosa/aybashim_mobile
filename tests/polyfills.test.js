import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

const polyfillSource = readFileSync(new URL('../src/core/polyfills.js', import.meta.url), 'utf8');

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

  it('adds the other built-ins pdf.js needs on older phones', async () => {
    // Array/Object/String built-ins are removed in a separate realm so the test runner keeps working.
    const realm = vm.createContext({});
    vm.runInContext(`
      delete Object.hasOwn;
      delete Array.prototype.at;
      delete String.prototype.at;
      delete Object.getPrototypeOf(Int8Array.prototype).at;
      delete Array.prototype.findLast;
      delete Array.prototype.findLastIndex;
    `, realm);
    vm.runInContext(polyfillSource, realm);
    const results = vm.runInContext(`({
      hasOwn: [Object.hasOwn({ a: 1 }, 'a'), Object.hasOwn({}, 'toString')],
      at: [[1, 2, 3].at(-1), [1, 2, 3].at(5), 'abc'.at(-2), new Uint8Array([7, 8]).at(-1)],
      findLast: [[1, 2, 3, 4].findLast((n) => n % 2 === 1), [1, 2, 3, 4].findLastIndex((n) => n > 10)]
    })`, realm);
    expect(JSON.parse(JSON.stringify(results))).toEqual({
      hasOwn: [true, false],
      at: [3, null, 'b', 8],
      findLast: [3, -1]
    });

    // Response and AbortSignal are not used by the test runner, so they are patched in place.
    const savedBytes = Response.prototype.bytes;
    const savedAny = AbortSignal.any;
    delete Response.prototype.bytes;
    delete AbortSignal.any;
    try {
      vi.resetModules();
      await import('../src/core/polyfills.js');
      expect(Array.from(await new Response(new Uint8Array([1, 2, 3])).bytes())).toEqual([1, 2, 3]);

      const first = new AbortController();
      const second = new AbortController();
      const combined = AbortSignal.any([first.signal, second.signal]);
      expect(combined.aborted).toBe(false);
      second.abort('stop');
      expect(combined.aborted).toBe(true);
      expect(combined.reason).toBe('stop');
    } finally {
      Response.prototype.bytes = savedBytes;
      AbortSignal.any = savedAny;
    }
  });

  it('makes ReadableStream async iterable like on Safari, where it is missing', async () => {
    const proto = ReadableStream.prototype;
    const savedIterator = proto[Symbol.asyncIterator];
    const savedValues = proto.values;
    delete proto[Symbol.asyncIterator];
    delete proto.values;
    const streamOf = (items, onCancel = () => {}) => new ReadableStream({
      start(controller) {
        items.forEach((item) => controller.enqueue(item));
        controller.close();
      },
      cancel: onCancel
    });
    try {
      vi.resetModules();
      await import('../src/core/polyfills.js');

      const seen = [];
      for await (const chunk of streamOf(['a', 'b', 'c'])) seen.push(chunk);
      expect(seen).toEqual(['a', 'b', 'c']);

      // Breaking out early cancels the stream and releases the reader.
      let cancelled = false;
      const stream = streamOf([1, 2, 3], () => {
        cancelled = true;
      });
      for await (const chunk of stream) {
        if (chunk === 1) break;
      }
      expect(cancelled).toBe(true);
      expect(stream.locked).toBe(false);
    } finally {
      Object.defineProperty(proto, Symbol.asyncIterator, { configurable: true, writable: true, value: savedIterator });
      Object.defineProperty(proto, 'values', { configurable: true, writable: true, value: savedValues });
    }
  });

  it('keeps the native implementation when it exists', async () => {
    vi.resetModules();
    await import('../src/core/polyfills.js');
    expect(Promise.withResolvers).toBe(original);
  });
});
