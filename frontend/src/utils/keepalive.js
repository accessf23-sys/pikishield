// Add this to frontend/src/utils/keepalive.js
const BACKEND = process.env.REACT_APP_API_URL || '';

export function startKeepalive() {
  // Ping backend every 5 minutes to prevent Railway sleep
  const ping = () => {
    fetch(`${BACKEND}/api/health`).catch(() => {});
  };
  ping(); // immediate ping on load
  setInterval(ping, 5 * 60 * 1000); // every 5 min
}
