// Quiet background helpers: wake the server and load every tab's data before the user opens it.
import { usersAPI, policiesAPI, claimsAPI, paymentsAPI } from './api';
import { setCache } from './pageCache';

// The free server host sleeps when idle. A tiny request on app start wakes it while the user is still on the first screen.
export const wakeServer = () => {
  try { fetch('/api/health', { cache: 'no-store' }).catch(() => {}); } catch (e) { /* ignore */ }
};

// Fills the same page caches the tabs read, so each tab opens with data already on screen. Failures are ignored.
export const prefetchTabs = () => {
  const quiet = (p, fn) => Promise.resolve(p).then(fn).catch(() => {});
  quiet(usersAPI.getDashboard(), r => setCache('dash', r.data));
  quiet(policiesAPI.getMyPolicies(), r => {
    setCache('policies', r.data || []);
    setCache('pay_policies', (r.data || []).filter(p => p.status === 'active'));
  });
  quiet(claimsAPI.getMyClaims(), r => setCache('claims', r.data || []));
  quiet(paymentsAPI.getHistory(), r => setCache('pay_history', r.data || []));
  quiet(usersAPI.getTransactions(), r => setCache('txns', r.data));
};
