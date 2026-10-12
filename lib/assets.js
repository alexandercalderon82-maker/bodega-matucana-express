export function assetUrl(path) {
  if (typeof window !== 'undefined') return window.__MATUMARKET_ASSETS__?.[path] || path;
  return path;
}
