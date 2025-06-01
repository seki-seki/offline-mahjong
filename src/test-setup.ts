import { Crypto } from '@peculiar/webcrypto';

// Polyfill WebCrypto API for tests
const cryptoPolyfill = new Crypto();

// @ts-expect-error crypto property is not defined in globalThis type
globalThis.crypto = cryptoPolyfill;
// @ts-expect-error crypto property is not defined in global type
global.crypto = cryptoPolyfill;

// Ensure window.crypto exists in jsdom environment
if (typeof window !== 'undefined' && !window.crypto) {
  // @ts-expect-error window.crypto assignment
  window.crypto = cryptoPolyfill;
}

// Polyfill for crypto.randomUUID if not available
if (!crypto.randomUUID) {
  // @ts-expect-error adding randomUUID method
  crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}