import React, { useState, useEffect, useRef } from 'react';
import { authAPI } from '../utils/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread]               = useState(0);
  const [open, setOpen]                   = useState(false);
  const ref = useRef();

  const load = async () => {
    try {
      const res = await authAPI.getNotifications();
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unread || 0);
    } catch {}
  };

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const markAll = async () => {
    await authAPI.markAllRead();
    setNotifications(n => n.map(x => ({ ...x, read: true })));
    setUnread(0);
  };
  const markOne = async (id) => {
    await authAPI.markRead(id);
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    setUnread(u => Math.max(0, u - 1));
  };

  const icon = (type) => ({ new_user: '👤', new_claim: '📋', new_nok: '🔗', payment: '💰', system: '🔔' }[type] || '🔔');
  const ago = (iso) => {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? 'rgba(34,197,94,.25)' : 'rgba(255,255,255,.1)',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 9, width: 36, height: 36,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 15, position: 'relative',
          transition: 'all .15s', flexShrink: 0,
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#EF4444', color: 'white',
            borderRadius: '50%', minWidth: 17, height: 17,
            fontSize: 9, fontWeight: 800, padding: '0 3px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #0F172A', lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown — positioned FIXED so it escapes the sidebar and never clips */}
      {open && (
        <NotificationPanel
          notifications={notifications}
          unread={unread}
          onMarkAll={markAll}
          onMarkOne={markOne}
          icon={icon}
          ago={ago}
          bellRef={ref}
        />
      )}
    </div>
  );
}

function NotificationPanel({ notifications, unread, onMarkAll, onMarkOne, icon, ago, bellRef }) {
  const [pos, setPos] = useState({ top: 60, left: 240 });

  useEffect(() => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        left: rect.left,   // align to LEFT edge of bell, so it opens to the right
      });
    }
  }, [bellRef]);

  return (
    <div style={{
      position: 'fixed',
      top: pos.top,
      left: pos.left,
      width: 360,
      maxWidth: 'calc(100vw - 24px)',
      background: 'white',
      borderRadius: 14,
      boxShadow: '0 12px 40px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.10)',
      border: '1px solid var(--border)',
      zIndex: 99999,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '13px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'white',
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          Notifications
          {unread > 0 && (
            <span style={{
              background: '#EF4444', color: 'white',
              borderRadius: 10, padding: '1px 7px',
              fontSize: 11, fontWeight: 700,
            }}>{unread} new</span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={onMarkAll}
            style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
            No notifications yet
          </div>
        ) : notifications.map(n => (
          <div
            key={n.id}
            onClick={() => !n.read && onMarkOne(n.id)}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #F1F5F9',
              background: n.read ? 'white' : '#F0FDF4',
              cursor: n.read ? 'default' : 'pointer',
              display: 'flex', gap: 11, alignItems: 'flex-start',
              transition: 'background .15s',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: n.read ? '#F1F5F9' : 'var(--green-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>
              {icon(n.type)}
            </div>

            {/* Text — NO ellipsis, full wrapping */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: n.read ? 500 : 700,
                color: 'var(--text)', lineHeight: 1.35, marginBottom: 3,
              }}>
                {n.title}
              </div>
              <div style={{
                fontSize: 12, color: 'var(--muted)',
                lineHeight: 1.5,
                whiteSpace: 'normal',   /* ← allow full wrap, no truncation */
                wordBreak: 'break-word',
              }}>
                {n.body}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{ago(n.createdAt)}</div>
            </div>

            {/* Unread dot */}
            {!n.read && (
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--green)', flexShrink: 0, marginTop: 5,
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {notifications.length} total · {unread} unread
          </span>
        </div>
      )}
    </div>
  );
}
