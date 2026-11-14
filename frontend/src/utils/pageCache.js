// Page cache: shows the last data instantly while fresh data loads in the background.
// Kept in memory and mirrored to localStorage so it also survives closing and reopening the app.
const store = {};
const PREFIX = 'pc_';
export const getCache = (key) => {
  if (store[key] !== undefined) return store[key];
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw) { store[key] = JSON.parse(raw); return store[key]; }
  } catch {}
  return undefined;
};
export const setCache = (key, value) => {
  store[key] = value;
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {}
};
export const clearCache = () => {
  Object.keys(store).forEach(k => delete store[k]);
  try {
    Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
  } catch {}
};
