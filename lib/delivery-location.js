export const MATUCANA_CENTER = [-11.844, -76.386];

export function validLocation(location) {
  return Boolean(location && Number.isFinite(location.lat) && Number.isFinite(location.lng) && Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180);
}
export function locationLink(location) {
  if (!validLocation(location)) return null;
  return `https://www.google.com/maps?q=${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
}
