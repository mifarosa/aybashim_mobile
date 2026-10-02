// Builds a short, copyable report of an error so that problems on other devices can be diagnosed.

export const APP_VERSION = __APP_VERSION__;
export const APP_BUILD = __APP_BUILD__;

export function describeError(error) {
  const message = error?.message || String(error);
  const stack = typeof error?.stack === 'string'
    ? error.stack.split('\n').map((line) => line.trim()).filter(Boolean)
      // Chrome repeats "Name: message" as the first stack line.
      .filter((line, index) => !(index === 0 && line.includes(message)))
      .slice(0, 6)
    : [];
  return [
    `Hata: ${error?.name && error.name !== 'Error' ? `${error.name}: ` : ''}${message}`,
    ...stack.map((line) => `  ${line}`),
    `Sürüm: ${APP_VERSION} (${APP_BUILD})`,
    `Tarayıcı: ${navigator.userAgent}`
  ].join('\n');
}
