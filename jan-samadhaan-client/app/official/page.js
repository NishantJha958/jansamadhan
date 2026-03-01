'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    officialLogin, getComplaints, updateComplaint, getAnalytics, getTransferHistory
} from '@/lib/api';

const DEPARTMENTS = [
    'All', 'General_Admin_Dept', 'Water_Supply_Dept', 'Public_Works_Dept',
    'Sanitation_Dept', 'Power_Dept', 'Health_Dept',
];

const STATUSES = ['All', 'Pending', 'In Progress', 'Forwarded', 'Resolved', 'Rejected'];

const STATUS_MAP = {
    Pending: 'badge-pending', 'In Progress': 'badge-progress',
    Resolved: 'badge-resolved', Rejected: 'badge-rejected', Forwarded: 'badge-forwarded',
};
const SLA_MAP = {
    OVERDUE: 'badge-overdue', CRITICAL: 'badge-critical',
    URGENT: 'badge-urgent', WARNING: 'badge-warning',
};

function priorityLabel(p) {
    if (p <= 2) return { label: 'P1-Emergency', cls: 'badge-p1' };
    if (p <= 3) return { label: 'P3-Critical', cls: 'badge-p2' };
    if (p <= 5) return { label: 'P5-High', cls: 'badge-p3' };
    if (p <= 7) return { label: 'P7-Medium', cls: 'badge-p5' };
    return { label: 'P10-Low', cls: 'badge-p9' };
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [govtId, setGovtId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) return toast.error('Enter credentials');
        setLoading(true);
        try {
            const res = await officialLogin(username, password, govtId);
            toast.success(`Welcome, ${res.data.user.name}! 🏛️`);
            onLogin(res.data);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Login failed');
        } finally { setLoading(false); }
    };

    return (
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 16 }}>
            <div className="glass-card slide-up" style={{ width: '100%', maxWidth: 440, padding: 40 }}>
                <div className="tricolor-bar" style={{ marginBottom: 28 }} />
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: '3rem', marginBottom: 10 }}>🏛️</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 6 }}>Official Login</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Jan Samadhaan — Dept. Dashboard</p>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Username</label>
                        <input className="inp" placeholder="admin@gov.in" value={username} onChange={e => setUsername(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Password</label>
                        <input className="inp" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Govt ID (optional)</label>
                        <input className="inp" placeholder="ADMIN001" value={govtId} onChange={e => setGovtId(e.target.value)} />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8, padding: '14px' }}>
                        {loading ? <span className="spinner" /> : '🔐 Login to Dashboard'}
                    </button>
                </form>
                <div className="divider" style={{ marginTop: 24 }}>Default credentials</div>
                <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: 14, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 2 }}>
                    <strong style={{ color: 'var(--saffron)' }}>Admin:</strong> admin@gov.in / Admin@123<br />
                    <strong style={{ color: 'var(--india-green)' }}>Water:</strong> water.official / Water@123<br />
                    <strong style={{ color: '#42a5f5' }}>Power:</strong> power.official / Power@123
                </div>
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <a href="/" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to Citizen Portal</a>
                </div>
            </div>
        </main>
    );
}

// ── Complaint Detail Modal ─────────────────────────────────────────────────────
function ComplaintModal({ complaint, official, onClose, onUpdated }) {
    const [status, setStatus] = useState(complaint.status);
    const [summary, setSummary] = useState(complaint.resolution_summary || '');
    const [forwardDept, setForwardDept] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [transfers, setTransfers] = useState([]);
    const [file, setFile] = useState(null);
    const [tab, setTab] = useState('details'); // details | update | transfers

    useEffect(() => {
        getTransferHistory(complaint._id).then(r => setTransfers(r.data.transfers || [])).catch(() => { });
    }, [complaint._id]);

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('status', status);
            fd.append('resolution_summary', summary);
            fd.append('transferred_by', official?.user?.name || 'Official');
            if (status === 'Forwarded') fd.append('forward_dept', forwardDept);
            if (status === 'Rejected') fd.append('rejection_reason', rejectionReason);
            if (file) fd.append('resolution_proof', file);
            await updateComplaint(complaint._id, fd);
            toast.success(`Complaint updated: ${status}`);
            onUpdated();
            onClose();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Update failed');
        } finally { setLoading(false); }
    };

    const p = priorityLabel(complaint.priority);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
                <div className="tricolor-bar" style={{ marginBottom: 20 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{complaint._id}</p>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{complaint.category?.replace(/_/g, ' ')}</h2>
                    </div>
                    <button className="btn-ghost" onClick={onClose} style={{ padding: '6px 12px' }}>✕</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface-3)', borderRadius: 10, padding: 4 }}>
                    {['details', 'update', 'transfers'].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            style={{
                                flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
                                background: tab === t ? 'var(--surface-2)' : 'transparent', color: tab === t ? 'var(--text)' : 'var(--text-muted)'
                            }}>
                            {t === 'details' ? '📋 Details' : t === 'update' ? '✏️ Update' : '🔄 Transfers'}
                        </button>
                    ))}
                </div>

                {tab === 'details' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span className={`badge ${STATUS_MAP[complaint.status]}`}>{complaint.status}</span>
                            <span className={`badge ${p.cls}`}>{p.label}</span>
                            {SLA_MAP[complaint.escalation_level] && <span className={`badge ${SLA_MAP[complaint.escalation_level]}`}>{complaint.escalation_level}</span>}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem' }}>
                            <div><p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Citizen</p><p style={{ fontWeight: 600 }}>{complaint.citizen_name}</p></div>
                            <div><p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Phone</p><p style={{ fontWeight: 600 }}>{complaint.citizen_phone}</p></div>
                            <div><p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Email</p><p style={{ fontWeight: 600, fontSize: '0.82rem' }}>{complaint.citizen_email}</p></div>
                            <div><p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Department</p><p style={{ fontWeight: 600, fontSize: '0.82rem' }}>{complaint.department?.replace(/_/g, ' ')}</p></div>
                            <div><p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Filed On</p><p style={{ fontWeight: 600 }}>{new Date(complaint.created_at).toLocaleString('en-IN')}</p></div>
                            <div><p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>SLA Deadline</p><p style={{ fontWeight: 600, color: complaint.escalation_level === 'OVERDUE' ? '#ff5252' : 'inherit' }}>{new Date(complaint.sla_deadline).toLocaleString('en-IN')}</p></div>
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: 6 }}>Description</p>
                            <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: 14, fontSize: '0.88rem', lineHeight: 1.7 }}>{complaint.description}</div>
                        </div>
                        {complaint.description_original !== complaint.description && (
                            <div>
                                <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: 6 }}>Original ({complaint.citizen_language?.toUpperCase()})</p>
                                <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: 14, fontSize: '0.85rem' }}>{complaint.description_original}</div>
                            </div>
                        )}
                        {complaint.location_address && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                📍 {complaint.location_address}
                                {complaint.latitude && complaint.longitude && (
                                    <a href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`} target="_blank" rel="noreferrer"
                                        style={{ color: 'var(--india-green)', fontSize: '0.78rem', textDecoration: 'none', background: 'rgba(19,136,8,0.1)', padding: '3px 10px', borderRadius: 20 }}>
                                        🗺 View Map
                                    </a>
                                )}
                            </div>
                        )}
                        {complaint.ai_analysis && (
                            <div style={{ background: 'rgba(255,153,51,0.06)', border: '1px solid rgba(255,153,51,0.2)', borderRadius: 10, padding: 12, fontSize: '0.82rem' }}>
                                🤖 <strong>AI Analysis:</strong> Priority {complaint.ai_analysis.priority} • Sentiment: {complaint.ai_analysis.sentiment} • Dept: {complaint.ai_analysis.detected_department || 'N/A'}
                            </div>
                        )}
                        {complaint.resolution_summary && (
                            <div style={{ background: 'rgba(19,136,8,0.08)', borderRadius: 10, padding: 12, fontSize: '0.85rem' }}>
                                <strong style={{ color: 'var(--india-green)' }}>Resolution:</strong> {complaint.resolution_summary}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'update' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>New Status</label>
                            <select className="inp" value={status} onChange={e => setStatus(e.target.value)}>
                                <option>Pending</option><option>In Progress</option>
                                <option>Forwarded</option><option>Resolved</option><option>Rejected</option>
                            </select>
                        </div>
                        {status === 'Forwarded' && (
                            <div>
                                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Forward to Department</label>
                                <select className="inp" value={forwardDept} onChange={e => setForwardDept(e.target.value)}>
                                    <option value="">Select Department</option>
                                    {DEPARTMENTS.filter(d => d !== 'All' && d !== complaint.department).map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                                </select>
                            </div>
                        )}
                        {status === 'Rejected' && (
                            <div>
                                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Rejection Reason</label>
                                <textarea className="inp" rows={3} placeholder="Reason for rejection..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                            </div>
                        )}
                        <div>
                            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Resolution Summary</label>
                            <textarea className="inp" rows={4} placeholder="Describe action taken..." value={summary} onChange={e => setSummary(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Resolution Proof (optional)</label>
                            <input type="file" className="inp" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} style={{ padding: '8px' }} />
                        </div>
                        <button className="btn-primary" onClick={handleUpdate} disabled={loading} style={{ marginTop: 4 }}>
                            {loading ? <span className="spinner" /> : `✓ Update to "${status}"`}
                        </button>
                    </div>
                )}

                {tab === 'transfers' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {transfers.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 30 }}>No transfer history</p>}
                        {transfers.map((t, i) => (
                            <div key={i} style={{ background: 'var(--surface-3)', borderRadius: 10, padding: 14, fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{t.from_department?.replace(/_/g, ' ')}</span>
                                    <span>→</span>
                                    <span style={{ color: 'var(--saffron)', fontWeight: 600 }}>{t.to_department?.replace(/_/g, ' ')}</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>By: {t.transferred_by} • {new Date(t.transferred_at).toLocaleString('en-IN')}</p>
                                {t.transfer_reason && <p style={{ marginTop: 4, color: 'var(--text-dim)', fontSize: '0.78rem' }}>Reason: {t.transfer_reason}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function Dashboard({ official, onLogout }) {
    const [complaints, setComplaints] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deptFilter, setDeptFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);

    const dept = official.department !== 'General_Admin_Dept' ? official.department : null;

    const loadData = async () => {
        setLoading(true);
        try {
            const [cRes, aRes] = await Promise.all([
                getComplaints(dept || (deptFilter !== 'All' ? deptFilter : null)),
                getAnalytics(dept || undefined),
            ]);
            setComplaints(cRes.data.complaints || []);
            setAnalytics(aRes.data.analytics);
        } catch (e) { toast.error('Failed to load data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [deptFilter]);

    const filtered = complaints.filter(c => {
        if (statusFilter !== 'All' && c.status !== statusFilter) return false;
        if (search && !c._id?.includes(search.toUpperCase()) && !c.citizen_name?.toLowerCase().includes(search.toLowerCase()) && !c.description?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            {/* Header */}
            <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.6rem' }}>🏛️</span>
                    <div>
                        <h1 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Jan Samadhaan — Official Dashboard</h1>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{official.user?.name} • {official.user?.department?.replace(/_/g, ' ')}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-ghost" onClick={loadData} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>🔄 Refresh</button>
                    <button className="btn-ghost" onClick={onLogout} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Logout</button>
                    <a href="/" style={{ padding: '8px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>🏠</a>
                </div>
            </div>
            <div className="tricolor-bar" />

            {/* Analytics Strip */}
            {analytics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, padding: '20px 24px 0' }}>
                    {[
                        { label: 'Total', val: analytics.total_complaints, color: 'var(--saffron)' },
                        { label: 'Pending', val: analytics.pending, color: '#ffc107' },
                        { label: 'In Progress', val: analytics.in_progress, color: '#42a5f5' },
                        { label: 'Resolved', val: analytics.resolved, color: 'var(--india-green)' },
                        { label: 'Avg Rating', val: analytics.avg_citizen_rating ? `${analytics.avg_citizen_rating}⭐` : 'N/A', color: 'var(--text)' },
                    ].map(s => (
                        <div key={s.label} className="glass-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                            <p style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.val}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div style={{ padding: '16px 24px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="inp" placeholder="🔍 Search ID, name, description..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex: '1 1 200px', maxWidth: 300 }} />
                {!dept && (
                    <select className="inp" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ flex: '0 0 auto', width: 'auto' }}>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                    </select>
                )}
                <select className="inp" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ flex: '0 0 auto', width: 'auto' }}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{filtered.length} complaint(s)</span>
            </div>

            {/* Complaint list */}
            <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loading && <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>}
                {!loading && filtered.length === 0 && (
                    <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
                        <p style={{ color: 'var(--text-muted)' }}>No complaints matching your filters</p>
                    </div>
                )}

                {filtered.map(c => {
                    const p = priorityLabel(c.priority);
                    const slas = SLA_MAP[c.escalation_level];
                    return (
                        <div key={c._id} className="complaint-card" onClick={() => setSelected(c)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                <div>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{c._id}</p>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 700 }}>{c.category?.replace(/_/g, ' ')}</span>
                                        {slas && <span className={`badge ${slas}`} style={{ fontSize: '0.68rem' }}>{c.escalation_level}</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                    <span className={`badge ${STATUS_MAP[c.status] || 'badge-pending'}`}>{c.status}</span>
                                    <span className={`badge ${p.cls}`}>{p.label}</span>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
                                {c.description?.slice(0, 140)}{c.description?.length > 140 ? '...' : ''}
                            </p>
                            <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                                <span>👤 {c.citizen_name}</span>
                                <span>🏢 {c.department?.replace(/_/g, ' ')}</span>
                                <span>📅 {new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                                {c.location_address && <span>📍 {c.location_address.slice(0, 30)}</span>}
                                <span style={{ marginLeft: 'auto', color: 'var(--saffron)', fontSize: '0.78rem' }}>Click to manage →</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selected && (
                <ComplaintModal complaint={selected} official={official} onClose={() => setSelected(null)} onUpdated={loadData} />
            )}
        </main>
    );
}

// ── Page entry ────────────────────────────────────────────────────────────────
export default function OfficialPage() {
    const [official, setOfficial] = useState(null);
    if (!official) return <LoginForm onLogin={setOfficial} />;
    return <Dashboard official={official} onLogout={() => setOfficial(null)} />;
}
