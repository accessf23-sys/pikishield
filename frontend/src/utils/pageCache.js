// Tiny in-memory cache so pages show their last data instantly while fresh data loads in the background.
const store = {};
export const getCache = (key) => store[key];
export const setCache = (key, value) => { store[key] = value; };
export const clearCache = () => { Object.keys(store).forEach(k => delete store[k]); };
