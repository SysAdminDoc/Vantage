// Unified extension API namespace.
//
// Chrome 99+ MV3 already returns Promises from chrome.* APIs, and
// Firefox exposes the same APIs under browser.*. This module picks
// whichever is available and re-exports it so new code has a single
// import instead of repeating the detection inline.
//
// In local dev (file:// or HTTP server), the browser-shim.js IIFE
// populates globalThis.chrome with a localStorage-backed stub, so
// `ext` here is never null after the shim runs.

export const ext = globalThis.browser || globalThis.chrome || {};

export const isFirefox =
  typeof globalThis.browser !== "undefined" &&
  typeof globalThis.browser.runtime !== "undefined";
