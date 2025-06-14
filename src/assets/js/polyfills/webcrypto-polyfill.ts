import WebCrypto from 'isomorphic-webcrypto';

if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto?.subtle) {
  (globalThis as any).crypto = WebCrypto as unknown as Crypto;
}

export default globalThis.crypto as Crypto;
