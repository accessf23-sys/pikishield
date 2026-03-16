import React, { useState, useEffect } from 'react';
import { paymentsAPI, policiesAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function PaymentsPage() {
  const { user } = useAuth();
  const kycApproved = user?.kycStatus === 'approved';
  const [policies, setPolicies] = useState([]);
  const [history, setHistory] = useState([]);
  const [method, setMethod] = useState('mpesa');
  const [form, setForm] = useState({
    amount: '',
    policyId: '',
    phone: user?.phone || '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: ''
  });
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [polling, setPolling] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [stkStatus, setStkStatus] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      const [policiesResult, historyResult] = await Promise.allSettled([
        policiesAPI.getMyPolicies(),
        paymentsAPI.getHistory()
      ]);

      if (!mounted) return;

      if (policiesResult.status === 'fulfilled') {
        const active = (policiesResult.value.data || []).filter(p => p.status === 'active');
        setPolicies(active);
        if (active.length > 0) {
          setForm(f => ({
            ...f,
            policyId: active[0].id,
            amount: active[0].dailyContribution
          }));
        }
      } else {
        console.error('Failed to load policies:', policiesResult.reason);
        setPolicies([]);
      }

      if (historyResult.status === 'fulfilled') {
        setHistory(historyResult.value.data || []);
      } else {
        console.error('Failed to load payment history:', historyResult.reason);
        setHistory([]);
      }

      const firstError =
        policiesResult.status === 'rejected'
          ? policiesResult.reason
          : historyResult.status === 'rejected'
          ? historyResult.reason
          : null;

      if (firstError) {
        setError(firstError.response?.data?.error || 'Failed to load payment data');
      }

      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
      if (polling) clearInterval(polling);
    };
  }, [polling]);

  const selectedPolicy = policies.find(p => p.id === form.policyId);

  const handleMpesa = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setStkStatus(null);

    try {
      const res = await paymentsAPI.initiateMpesa({
        amount: form.amount,
        phone: form.phone,
        policyId: form.policyId,
        description: selectedPolicy ? `Contribution — ${selectedPolicy.name}` : 'PikiShield payment',
      });

      const paymentId = res.data.paymentId;
      setSuccess(res.data.message);

      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 30) {
          clearInterval(interval);
          setPolling(null);
          setError('STK Push timed out. Please check your M-Pesa messages and try again.');
          setLoading(false);
          return;
        }

        try {
          const s = await paymentsAPI.checkStatus(paymentId);
          setStkStatus(s.data);

          if (s.data.status === 'completed') {
            clearInterval(interval);
            setPolling(null);
            setSuccess(`✅ Payment of KES ${Number(form.amount).toLocaleString()} confirmed! M-Pesa ref: ${s.data.mpesaReceiptNumber}`);
            paymentsAPI.getHistory().then(r => setHistory(r.data)).catch(() => {});
            setLoading(false);
          } else if (s.data.status === 'failed') {
            clearInterval(interval);
            setPolling(null);
            setError('Payment was cancelled or declined by M-Pesa.');
            setLoading(false);
          }
        } catch {}
      }, 2000);

      setPolling(interval);
    } catch (err) {
      setError(err.response?.data?.error || 'Payment initiation failed');
      setLoading(false);
    }
  };

  const handleCard = async (e) => {
    e.preventDefault();
    if (!form.cardNumber || !form.cardExpiry || !form.cardCvv) return setError('All card details required');

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await paymentsAPI.manualPayment({
        amount: form.amount,
        method: 'card',
        policyId: form.policyId,
        cardLast4: form.cardNumber.slice(-4),
        description: selectedPolicy ? `Card payment — ${selectedPolicy.name}` : 'Card payment',
      });

      setSuccess(`✅ Card payment of KES ${Number(form.amount).toLocaleString()} processed! Ref: ${res.data.payment.reference}`);
      paymentsAPI.getHistory().then(r => setHistory(r.data)).catch(() => {});
      setForm(f => ({ ...f, cardNumber: '', cardExpiry: '', cardCvv: '' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Card payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBank = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await paymentsAPI.manualPayment({
        amount: form.amount,
        method: 'bank_transfer',
        policyId: form.policyId,
        description: selectedPolicy ? `Bank transfer — ${selectedPolicy.name}` : 'Bank transfer',
      });

      setSuccess(`✅ Bank transfer of KES ${Number(form.amount).toLocaleString()} recorded! Ref: ${res.data.payment.reference}`);
      paymentsAPI.getHistory().then(r => setHistory(r.data)).catch(() => {});
    } catch (err) {
      setError(err.response?.data?.error || 'Bank transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const fmt = n => `KES ${Number(n).toLocaleString()}`;

  if (loading && policies.length === 0 && history.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Make a Payment</h1>
          <p className="page-subtitle">Pay your daily contribution or top up via M-Pesa, card, or bank transfer</p>
        </div>
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: 13 }}>
            Loading payments…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Make a Payment</h1>
        <p className="page-subtitle">Pay your daily contribution or top up via M-Pesa, card, or bank transfer</p>
      </div>

      <div className="page-body">
        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-error">❌ {error}</div>}
        {stkStatus?.status === 'pending' && (
          <div className="alert alert-info">⏳ Waiting for M-Pesa PIN confirmation on {form.phone}...</div>
        )}



        <div className="two-col">
          <div className="card">
            <div className="form-group">
              <label className="form-label">Policy to Pay For</label>
              <select className="form-input" value={form.policyId} onChange={e => setForm(f => ({ ...f, policyId: e.target.value }))}>
                <option value="">General contribution</option>
                {policies.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — KES {p.dailyContribution}/day
                  </option>
                ))}
              </select>

              {selectedPolicy && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(f => ({ ...f, amount: selectedPolicy.dailyContribution }))}>
                    Daily (KES {selectedPolicy.dailyContribution})
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(f => ({ ...f, amount: selectedPolicy.dailyContribution * 7 }))}>
                    Weekly (KES {selectedPolicy.dailyContribution * 7})
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(f => ({ ...f, amount: selectedPolicy.dailyContribution * 30 }))}>
                    Monthly (KES {selectedPolicy.dailyContribution * 30})
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Amount (KES)</label>
              <input
                className="form-input"
                type="number"
                min="10"
                placeholder="e.g. 45"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[
                { key: 'mpesa', label: '📱 M-Pesa' },
                { key: 'card', label: '💳 Card' },
                { key: 'bank', label: '🏦 Bank' },
              ].map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  className={`btn btn-sm ${method === m.key ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {method === 'mpesa' && (
              <form onSubmit={handleMpesa}>
                <div className="form-group">
                  <label className="form-label">M-Pesa Phone Number</label>
                  <input
                    className="form-input"
                    type="tel"
                    placeholder="+254712345678"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ background: '#F0FDF9', border: '1px solid #A8EDD0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#006B42' }}>
                  📲 You will receive an STK push on your phone. Enter your M-Pesa PIN to complete.
                </div>
                <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} type="submit" disabled={loading || !form.amount || !kycApproved}>
                  {loading ? '⏳ Sending STK Push...' : `📱 Pay ${form.amount ? fmt(form.amount) : ''} via M-Pesa`}
                </button>
              </form>
            )}

            {method === 'card' && (
              <form onSubmit={handleCard}>
                <div className="form-group">
                  <label className="form-label">Card Number</label>
                  <input
                    className="form-input"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    value={form.cardNumber}
                    onChange={e => setForm(f => ({ ...f, cardNumber: e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim() }))}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Expiry</label>
                    <input className="form-input" placeholder="MM/YY" maxLength={5} value={form.cardExpiry} onChange={e => setForm(f => ({ ...f, cardExpiry: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV</label>
                    <input className="form-input" type="password" placeholder="•••" maxLength={4} value={form.cardCvv} onChange={e => setForm(f => ({ ...f, cardCvv: e.target.value }))} />
                  </div>
                </div>
                <div className="alert alert-info" style={{ fontSize: 12, marginBottom: 14 }}>
                  🔒 Card details are encrypted. Powered by Flutterwave (demo mode).
                </div>
                <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} type="submit" disabled={loading || !form.amount || !kycApproved}>
                  {loading ? 'Processing...' : `💳 Pay ${form.amount ? fmt(form.amount) : ''}`}
                </button>
              </form>
            )}

            {method === 'bank' && (
              <form onSubmit={handleBank}>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Bank Transfer Details</div>
                  {[
                    ['Bank', 'Equity Bank Kenya'],
                    ['Account Name', 'PikiShield Ltd'],
                    ['Account Number', '0201234567891'],
                    ['Branch', 'Nairobi Main'],
                    ['Reference', `PS-${user?.nationalId?.slice(0, 6) || '000000'}`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ color: 'var(--muted)' }}>{k}</span>
                      <span style={{ fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="alert alert-warning" style={{ fontSize: 12, marginBottom: 14 }}>
                  After transferring, click the button below to notify us. Processing takes 1–2 business days.
                </div>
                <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} type="submit" disabled={loading || !form.amount || !kycApproved}>
                  {loading ? 'Recording...' : `🏦 Confirm Transfer of ${form.amount ? fmt(form.amount) : ''}`}
                </button>
              </form>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Payment History</h3>
            {history.length === 0 ? (
              <div className="empty-state">
                <div className="emoji">💳</div>
                <p>No payments yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--bg)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {p.type === 'mpesa_stk' ? '📱' : p.type === 'card' ? '💳' : '🏦'}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.description}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {new Date(p.initiatedAt).toLocaleDateString('en-KE')} · {p.mpesaReceiptNumber || p.reference || '—'}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>KES {Number(p.amount).toLocaleString()}</div>
                      <span className={`status-badge status-${p.status === 'completed' ? 'approved' : 'pending'}`} style={{ fontSize: 10 }}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}