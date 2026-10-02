// pdf.js 6 calls Promise.withResolvers in the page and in its worker, but its legacy build
// does not polyfill it. Browsers without it (iOS Safari < 17.4, Chrome < 119) failed to read
// any PDF with "undefined is not a function". This module must be imported before pdf.js.

if (typeof Promise.withResolvers !== 'function') {
  Object.defineProperty(Promise, 'withResolvers', {
    configurable: true,
    writable: true,
    value: function withResolvers() {
      let resolve;
      let reject;
      const promise = new this((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }
  });
}
