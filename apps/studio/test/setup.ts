import { webcrypto } from "node:crypto";
import { TextDecoder, TextEncoder } from "node:util";
import "@testing-library/jest-dom/vitest";

Object.defineProperty(globalThis, "TextEncoder", { value: TextEncoder, configurable: true });
Object.defineProperty(globalThis, "TextDecoder", { value: TextDecoder, configurable: true });
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: () => null,
  configurable: true,
});
Object.defineProperty(window, "requestAnimationFrame", {
  value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16),
  configurable: true,
});
Object.defineProperty(window, "cancelAnimationFrame", {
  value: (id: number) => window.clearTimeout(id),
  configurable: true,
});
