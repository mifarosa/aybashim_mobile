// pdf.js 6 relies on built-ins that its legacy build does not polyfill. Browsers without
// them (older iOS Safari and Android Chrome) failed to read any PDF with
// "undefined is not a function". This module is imported before pdf.js, in the page and
// in the pdf.js worker. Every polyfill is installed only when the native one is missing.

function define(target, name, value) {
  if (!target || typeof target[name] === 'function') return;
  Object.defineProperty(target, name, { configurable: true, writable: true, value });
}

// iOS Safari < 17.4, Chrome < 119
define(Promise, 'withResolvers', function withResolvers() {
  let resolve;
  let reject;
  const promise = new this((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
});

// iOS Safari < 18, Chrome < 132; used when pdf.js fetches fonts and character maps.
async function bytes() {
  return new Uint8Array(await this.arrayBuffer());
}
if (typeof Response !== 'undefined') define(Response.prototype, 'bytes', bytes);
if (typeof Blob !== 'undefined') define(Blob.prototype, 'bytes', bytes);

// iOS Safari < 17.4, Chrome < 116
if (typeof AbortSignal !== 'undefined' && typeof AbortController !== 'undefined') {
  define(AbortSignal, 'any', function any(signals) {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
    }
    for (const signal of signals) {
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true, signal: controller.signal });
    }
    return controller.signal;
  });
}

// iOS Safari < 15.4, Chrome < 93
define(Object, 'hasOwn', function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(Object(object), key);
});

function at(index) {
  const length = this.length >>> 0;
  let relative = Math.trunc(index) || 0;
  if (relative < 0) relative += length;
  return relative < 0 || relative >= length ? undefined : this[relative];
}
define(Array.prototype, 'at', at);
define(String.prototype, 'at', function stringAt(index) {
  return at.call(String(this), index);
});
define(Object.getPrototypeOf(Int8Array.prototype), 'at', at);

define(Array.prototype, 'findLast', function findLast(predicate, thisArg) {
  for (let i = this.length - 1; i >= 0; i--) {
    if (predicate.call(thisArg, this[i], i, this)) return this[i];
  }
  return undefined;
});
define(Array.prototype, 'findLastIndex', function findLastIndex(predicate, thisArg) {
  for (let i = this.length - 1; i >= 0; i--) {
    if (predicate.call(thisArg, this[i], i, this)) return i;
  }
  return -1;
});
