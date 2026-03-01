'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { verifyGovtId } from '@/lib/api';

const ID_TYPES = [
    { id: 'aadhaar', label: 'Aadhaar Card', icon: '🪪', placeholder: '1234 5678 9012', hint: '12-digit number' },
    { id: 'pan', label: 'PAN Card', icon: '💳', placeholder: 'ABCDE1234F', hint: '5 letters + 4 digits + 1 letter' },
    { id: 'voter', label: 'Voter ID', icon: '🗳️', placeholder: 'ABC1234567', hint: '3 letters + 7 digits' },
];

export default function GovtIDModal({ phone, onVerified, onSkip }) {
    const [idType, setIdType] = useState('aadhaar');
    const [idNumber, setIdNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const selected = ID_TYPES.find(t => t.id === idType);

    const handleVerify = async () => {
        if (!idNumber.trim()) return toast.error('Please enter your ID number');
        setLoading(true);
        try {
            const res = await verifyGovtId(phone, idType, idNumber.trim());
            setResult(res.data);
            if (res.data.success) {
                toast.success(`${idType.toUpperCase()} verified! ✅`);
                setTimeout(() => onVerified(res.data), 1200);
            }
        } catch (e) {
            toast.error(e.response?.data?.message || 'Verification failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: 480 }}>
                <div className="tricolor-bar" style={{ marginBottom: 24 }} />

                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🇮🇳</div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 }}>Verify Your Identity</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        Verify a government-issued ID to get a <strong style={{ color: 'var(--india-green)' }}>✓ Verified Citizen</strong> badge
                        and access priority complaint handling.
                    </p>
                </div>

                {/* ID Type selector */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                    {ID_TYPES.map(t => (
                        <button key={t.id} type="button" onClick={() => { setIdType(t.id); setIdNumber(''); setResult(null); }}
                            style={{
                                padding: '12px 8px', borderRadius: 10, border: `2px solid ${idType === t.id ? 'var(--saffron)' : 'var(--border)'}`,
                                background: idType === t.id ? 'rgba(255,153,51,0.1)' : 'transparent',
                                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                            }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{t.icon}</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: idType === t.id ? 'var(--saffron)' : 'var(--text-muted)' }}>{t.label}</div>
                        </button>
                    ))}
                </div>

                {/* ID number input */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                        {selected?.label} Number
                    </label>
                    <input className="inp" placeholder={selected?.placeholder} value={idNumber}
                        onChange={e => { setIdNumber(e.target.value); setResult(null); }}
                        style={{ fontFamily: 'monospace', fontSize: '1rem', letterSpacing: 2 }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 6 }}>
                        Format: {selected?.hint} &nbsp;•&nbsp; Your ID is masked before storage (e.g. XXXX-XXXX-1234)
                    </p>
                </div>

                {/* Privacy note */}
                <div style={{ background: 'rgba(19,136,8,0.08)', border: '1px solid rgba(19,136,8,0.2)', borderRadius: 10, padding: 12, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 18 }}>
                    🔒 <strong>Privacy:</strong> We only store the <em>last 4 characters</em> of your ID. The full number is never saved.
                </div>

                {/* Result */}
                {result?.success && (
                    <div style={{ background: 'rgba(19,136,8,0.12)', border: '1px solid rgba(19,136,8,0.3)', borderRadius: 10, padding: 14, marginBottom: 16, textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 4 }}>✅</div>
                        <p style={{ color: '#4caf50', fontWeight: 700 }}>{idType.toUpperCase()} Verified!</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Stored as: <code style={{ color: 'var(--saffron)' }}>{result.masked}</code></p>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn-ghost" onClick={onSkip} style={{ flex: 1 }}>
                        Skip for now
                    </button>
                    <button type="button" className="btn-primary" onClick={handleVerify} disabled={loading} style={{ flex: 2 }}>
                        {loading ? <><span className="spinner" /> Verifying...</> : `✓ Verify ${selected?.label}`}
                    </button>
                </div>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 14 }}>
                    You can verify later from your profile. Verification is optional.
                </p>
            </div>
        </div>
    );
}
