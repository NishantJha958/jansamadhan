'use client';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import MapPicker from '@/components/MapPicker';
import GovtIDModal from '@/components/GovtIDModal';
import {
  checkCitizenExists, sendOTP, verifyOTP, citizenSignup,
  getCitizenComplaints, submitComplaint, getLanguages,
  translateText, checkDuplicates, giveFeedback, verifyGovtId
} from '@/lib/api';

const CATEGORIES = [
  { id: 'Water_Supply', label: 'Water Supply', icon: '💧' },
  { id: 'Water_Emergency', label: 'Water Emergency', icon: '🚿' },
  { id: 'Roads_Infrastructure', label: 'Roads & Infrastructure', icon: '🛣️' },
  { id: 'Sanitation', label: 'Sanitation / Garbage', icon: '🗑️' },
  { id: 'Power', label: 'Power / Electricity', icon: '⚡' },
  { id: 'Power_Emergency', label: 'Power Emergency', icon: '🔌' },
  { id: 'Street_Lights', label: 'Street Lights', icon: '💡' },
  { id: 'Health', label: 'Health / Medical', icon: '🏥' },
  { id: 'Safety_Emergency', label: 'Safety Emergency', icon: '🚨' },
  { id: 'Animals', label: 'Stray Animals', icon: '🐕' },
  { id: 'Drainage', label: 'Drainage', icon: '🌊' },
];

const STATUS_MAP = {
  Pending: 'badge-pending', 'In Progress': 'badge-progress',
  Resolved: 'badge-resolved', Rejected: 'badge-rejected', Forwarded: 'badge-forwarded',
};

const SLA_MAP = {
  OVERDUE: 'badge-overdue', CRITICAL: 'badge-critical',
  URGENT: 'badge-urgent', WARNING: 'badge-warning',
};

function priorityLabel(p) {
  if (p <= 2) return { label: 'Emergency', cls: 'badge-p1' };
  if (p <= 3) return { label: 'Critical', cls: 'badge-p2' };
  if (p <= 5) return { label: 'High', cls: 'badge-p3' };
  if (p <= 7) return { label: 'Medium', cls: 'badge-p5' };
  return { label: 'Low', cls: 'badge-p9' };
}

// ─── OTP Modal ────────────────────────────────────────────────────────────────
function OTPModal({ mode, onSuccess, onClose }) {
  const [step, setStep] = useState('phone'); // phone → otp → signup
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [signedUpCitizen, setSignedUpCitizen] = useState(null);

  const handleSendOTP = async () => {
    if (!phone || !email) return toast.error('Enter phone and email');
    setLoading(true);
    try {
      if (mode === 'new') {
        // New citizen — check they don't already exist
        const res = await checkCitizenExists(phone);
        if (res.data.exists) return toast.error('Account already exists. Use "Returning Citizen" instead.');
      } else {
        // Returning — check they exist
        const res = await checkCitizenExists(phone);
        if (!res.data.exists) return toast.error('No account found. Register as a New Citizen first.');
      }
      await sendOTP(phone, email, mode === 'new' ? 'signup' : 'signin');
      toast.success('OTP sent! Check your email inbox.');
      setStep('otp');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (!otp) return toast.error('Enter OTP');
    setLoading(true);
    try {
      const res = await verifyOTP(phone, otp);
      if (res.data.new_user) { setStep('signup'); }
      else { toast.success('Welcome back! 🎉'); onSuccess(res.data.citizen); }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const handleSignup = async () => {
    if (!name) return toast.error('Enter your name');
    setLoading(true);
    try {
      const res = await citizenSignup({ phone, name, email, address });
      toast.success('Account created! Welcome 🎉');
      setSignedUpCitizen(res.data.citizen);
      setStep('govtid'); // → prompt for govt ID verification
    } catch (e) {
      toast.error(e.response?.data?.message || 'Signup failed');
    } finally { setLoading(false); }
  };

  // Govt ID step after signup
  if (step === 'govtid' && signedUpCitizen) {
    return (
      <GovtIDModal
        phone={signedUpCitizen.phone}
        onVerified={(vdata) => {
          toast.success('Identity verified! 🇮🇳');
          onSuccess({ ...signedUpCitizen, govt_id_verified: true, govt_id_masked: vdata.masked, govt_id_type: vdata.id_type });
        }}
        onSkip={() => onSuccess(signedUpCitizen)}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="tricolor-bar" style={{ marginBottom: 24 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {mode === 'new' ? '🆕 New Citizen' : '👤 Returning Citizen'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>Jan Samadhaan Portal</p>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '6px 12px' }}>✕</button>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {['phone', 'otp', ...(mode === 'new' ? ['signup'] : [])].map((s, i) => (
            <div className="step" key={s}>
              <div className={`step-dot ${step === s ? 'active' : ['phone', 'otp', 'signup'].indexOf(s) < ['phone', 'otp', 'signup'].indexOf(step) ? 'done' : 'idle'}`}>
                {['phone', 'otp', 'signup'].indexOf(s) < ['phone', 'otp', 'signup'].indexOf(step) ? '✓' : i + 1}
              </div>
              <span style={{ display: i < 2 ? 'inline' : 'none' }}>—</span>
            </div>
          ))}
        </div>

        {step === 'phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Mobile Number</label>
              <input className="inp" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Email Address</label>
              <input className="inp" type="email" placeholder="citizen@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={handleSendOTP} disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <span className="spinner" /> : '📱 Send OTP'}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'rgba(19,136,8,0.1)', border: '1px solid rgba(19,136,8,0.3)', borderRadius: 10, padding: 14, fontSize: '0.85rem', color: '#4caf50' }}>
              ✅ OTP sent to {email}. <strong>For testing, use: 123456</strong>
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Enter OTP</label>
              <input className="inp" placeholder="6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} style={{ letterSpacing: 8, fontSize: '1.4rem', textAlign: 'center' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" onClick={() => setStep('phone')} style={{ flex: 1 }}>← Back</button>
              <button className="btn-primary" onClick={handleVerifyOTP} disabled={loading} style={{ flex: 2 }}>
                {loading ? <span className="spinner" /> : '✓ Verify OTP'}
              </button>
            </div>
          </div>
        )}

        {step === 'signup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 4 }}>Complete your registration</div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Full Name *</label>
              <input className="inp" placeholder="Ravi Kumar" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Address</label>
              <input className="inp" placeholder="Area, City, State" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <button className="btn-green" onClick={handleSignup} disabled={loading}>
              {loading ? <span className="spinner" /> : '🎉 Create Account'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Complaint Form ───────────────────────────────────────────────────────────
function ComplaintForm({ citizen, onBack }) {
  const [languages, setLanguages] = useState({});
  const [lang, setLang] = useState('en');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const fileRef = useRef();
  const recognitionRef = useRef(null);

  useEffect(() => {
    getLanguages().then(r => setLanguages(r.data.languages || {})).catch(() => { });
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // Map app lang codes to BCP-47 speech codes
      const langMap = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-IN', or: 'or-IN', as: 'as-IN' };
      recognition.lang = langMap[lang] || 'en-IN';
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setDescription(prev => prev ? prev + ' ' + finalTranscript : finalTranscript);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [lang]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('🎙️ Listening... Speak now');
      } catch (e) {
        toast.error('Microphone access denied');
      }
    }
  };

  const handleLocationSet = async (loc) => {
    setLocation(loc);
    if (category) {
      setCheckingDupes(true);
      try {
        const r = await checkDuplicates(loc.lat, loc.lng, category);
        if (r.data.duplicates_found) setDuplicates(r.data.nearby_complaints);
      } catch { }
      setCheckingDupes(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description) return toast.error('Please describe your complaint');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('citizen_name', citizen.name);
      fd.append('citizen_email', citizen.email);
      fd.append('citizen_phone', citizen.phone);
      fd.append('citizen_address', address || citizen.address || '');
      fd.append('category', category);
      fd.append('description', description);
      fd.append('citizen_language', lang);
      if (location) { fd.append('latitude', location.lat); fd.append('longitude', location.lng); fd.append('location_address', location.address || ''); }
      if (file) fd.append('media_upload', file);

      const res = await submitComplaint(fd);
      setSubmitted(res.data);
      toast.success('Complaint submitted! 🇮🇳');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="glass-card fade-in" style={{ padding: 40, textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Complaint Registered!</h2>
        <div style={{ background: 'rgba(255,153,51,0.1)', border: '1px solid rgba(255,153,51,0.3)', borderRadius: 10, padding: 20, margin: '20px 0', textAlign: 'left' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Tracking ID</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--saffron)' }}>{submitted.tracking_id}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority</p><p style={{ fontWeight: 700 }}>P-{submitted.priority}</p></div>
            <div><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department</p><p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{submitted.department?.replace(/_/g, ' ')}</p></div>
            <div><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SLA Deadline</p><p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{submitted.sla_deadline}</p></div>
            <div><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI Sentiment</p><p style={{ fontWeight: 700 }}>{submitted.ai_sentiment}</p></div>
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>Confirmation email sent. Save your tracking ID.</p>
        <button className="btn-primary" onClick={() => { setSubmitted(null); setDescription(''); setCategory(''); setLocation(null); setFile(null); }}>
          + Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn-ghost" onClick={onBack} style={{ padding: '8px 14px' }}>← Back</button>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>🗳️ File a Complaint</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Logged in as {citizen.name} • {citizen.phone}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20, maxWidth: 700, margin: '0 auto' }}>
        {/* Language */}
        <div className="glass-card" style={{ padding: 20 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>🌐 Your Language</label>
          <select className="inp" value={lang} onChange={e => setLang(e.target.value)}>
            {Object.entries(languages).map(([code, l]) => (
              <option key={code} value={code}>{l.flag} {l.native} ({l.name})</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="glass-card" style={{ padding: 20 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12, display: 'block' }}>📂 Category</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
            {CATEGORIES.map(c => (
              <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                style={{
                  padding: '10px 12px', borderRadius: 10, border: `1px solid ${category === c.id ? 'var(--saffron)' : 'var(--border)'}`,
                  background: category === c.id ? 'rgba(255,153,51,0.1)' : 'transparent',
                  color: category === c.id ? 'var(--saffron)' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📝 Description *</label>
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={isListening ? 'mic-btn mic-btn-active' : 'mic-btn'}
                title={isListening ? 'Stop Recording' : 'Speak your complaint'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{isListening ? 'Stop' : 'Speak'}</span>
              </button>
            )}
          </div>
          {isListening && (
            <div className="mic-listening-bar">
              <div className="mic-wave"><span /><span /><span /><span /><span /></div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>🎙️ Listening — speak in {languages[lang]?.native || 'your language'}...</span>
            </div>
          )}
          <textarea className="inp" rows={5} placeholder={`Describe your complaint... (you can type in ${languages[lang]?.native || 'your language'})`}
            value={description} onChange={e => setDescription(e.target.value)} style={{ resize: 'vertical' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 6 }}>🤖 Our AI will automatically translate and analyze your complaint. {speechSupported && '🎤 Click "Speak" to use voice input.'}</p>
        </div>

        {/* Location */}
        <div className="glass-card" style={{ padding: 20 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>
            📍 Location {location && <span style={{ color: 'var(--india-green)' }}>✓ ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})</span>}
          </label>
          <MapPicker onLocationSelect={handleLocationSet} />
          <input className="inp" placeholder="Address / Landmark" value={address} onChange={e => setAddress(e.target.value)} style={{ marginTop: 10 }} />
          {checkingDupes && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>🔍 Checking for nearby complaints...</p>}
          {duplicates.length > 0 && (
            <div style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: 10, padding: 14, marginTop: 10 }}>
              <p style={{ color: '#ffc107', fontWeight: 600, fontSize: '0.85rem' }}>⚠️ {duplicates.length} similar complaint(s) already reported nearby!</p>
              {duplicates.slice(0, 2).map(d => (
                <p key={d.id} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>• {d.description} ({d.distance}m away)</p>
              ))}
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 6 }}>You can still submit — your complaint will support the existing one.</p>
            </div>
          )}
        </div>

        {/* File Upload */}
        <div className="glass-card" style={{ padding: 20 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>📎 Attach Photo / Video (optional)</label>
          <div onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${file ? 'var(--india-green)' : 'var(--border)'}`, borderRadius: 10, padding: '24px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s' }}>
            {file ? (
              <div style={{ color: 'var(--india-green)', fontWeight: 600 }}>
                ✅ {file.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>📂 Click to upload or drag & drop<br /><span style={{ fontSize: '0.78rem' }}>PNG, JPG, MP4, PDF (max 50MB)</span></div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
          {file && <button type="button" onClick={() => setFile(null)} className="btn-ghost" style={{ marginTop: 8, padding: '6px 12px', fontSize: '0.8rem' }}>✕ Remove</button>}
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '16px', fontSize: '1rem', borderRadius: 12 }}>
          {loading ? <><span className="spinner" /> Analysing & Submitting...</> : '🇮🇳 Submit Complaint'}
        </button>
      </form>
    </div>
  );
}

// ─── My Complaints Dashboard ──────────────────────────────────────────────────
function MyCamplaints({ citizen, onBack }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState({});
  const [comment, setComment] = useState({});

  useEffect(() => {
    getCitizenComplaints(citizen.phone).then(r => setComplaints(r.data.complaints || [])).finally(() => setLoading(false));
  }, [citizen.phone]);

  const handleFeedback = async (id, r, c) => {
    try {
      await giveFeedback(id, r, c);
      toast.success('Feedback submitted! Thank you.');
    } catch { toast.error('Failed to submit feedback'); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn-ghost" onClick={onBack} style={{ padding: '8px 14px' }}>← Back</button>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>📋 My Complaints</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{citizen.name} • {complaints.length} complaint(s)</p>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>}
      {!loading && complaints.length === 0 && (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
          <p style={{ color: 'var(--text-muted)' }}>No complaints yet. File your first one!</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {complaints.map(c => {
          const p = priorityLabel(c.priority);
          const status_cls = STATUS_MAP[c.status] || 'badge-pending';
          const sla_cls = SLA_MAP[c.escalation_level];
          return (
            <div key={c._id} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{c._id}</p>
                  <p style={{ fontWeight: 700, marginTop: 2 }}>{c.category?.replace(/_/g, ' ')}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <span className={`badge ${status_cls}`}>{c.status}</span>
                  <span className={`badge ${p.cls}`}>P-{c.priority} {p.label}</span>
                  {sla_cls && <span className={`badge ${sla_cls}`}>{c.escalation_level}</span>}
                </div>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>{c.description?.slice(0, 200)}{c.description?.length > 200 ? '...' : ''}</p>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                <span>🏢 {c.department?.replace(/_/g, ' ')}</span>
                <span>📅 {new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                {c.location_address && <span>📍 {c.location_address.slice(0, 40)}</span>}
              </div>
              {c.resolution_summary && (
                <div style={{ background: 'rgba(19,136,8,0.08)', borderRadius: 8, padding: 12, marginTop: 12, fontSize: '0.85rem' }}>
                  <strong style={{ color: 'var(--india-green)' }}>Resolution: </strong>{c.resolution_summary}
                </div>
              )}
              {c.status === 'Resolved' && !c.citizen_feedback_rating && (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8 }}>⭐ Rate this resolution:</p>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button" onClick={() => setRating(r => ({ ...r, [c._id]: star }))}
                        style={{ fontSize: '1.4rem', background: 'none', border: 'none', cursor: 'pointer', opacity: (rating[c._id] || 0) >= star ? 1 : 0.3 }}>⭐</button>
                    ))}
                  </div>
                  {rating[c._id] && (
                    <>
                      <input className="inp" placeholder="Any comments? (optional)" value={comment[c._id] || ''} onChange={e => setComment(cm => ({ ...cm, [c._id]: e.target.value }))} style={{ marginBottom: 8 }} />
                      <button className="btn-green" onClick={() => handleFeedback(c._id, rating[c._id], comment[c._id])} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Submit Feedback</button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Home Page ───────────────────────────────────────────────────────────
export default function HomePage() {
  const [screen, setScreen] = useState('home'); // home | form | mycomplaints | tracking
  const [authModal, setAuthModal] = useState(null); // null | 'new' | 'returning'
  const [citizen, setCitizen] = useState(null);
  const [trackingId, setTrackingId] = useState('');

  const handleAuthSuccess = (c) => {
    setCitizen(c);
    setAuthModal(null);
    toast.success(`Welcome, ${c.name}! 🎉`);
  };

  const handleRoleSelect = (role) => {
    if (role === 'official') { window.location.href = '/official'; return; }
    setAuthModal(role);
  };

  if (citizen && screen === 'form') return (
    <main style={{ minHeight: '100vh', padding: '24px 16px', background: 'var(--bg)' }}>
      <Header citizen={citizen} onLogout={() => { setCitizen(null); setScreen('home'); }} />
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <ComplaintForm citizen={citizen} onBack={() => setScreen('home')} />
      </div>
    </main>
  );

  if (citizen && screen === 'mycomplaints') return (
    <main style={{ minHeight: '100vh', padding: '24px 16px', background: 'var(--bg)' }}>
      <Header citizen={citizen} onLogout={() => { setCitizen(null); setScreen('home'); }} />
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <MyCamplaints citizen={citizen} onBack={() => setScreen('home')} />
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0f1e 0%, #111c35 50%, #0a1628 100%)',
        padding: '60px 16px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* BG glow */}
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 400, background: 'radial-gradient(ellipse, rgba(255,153,51,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="slide-up">
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🇮🇳</div>
          <h1 className="gradient-text" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, marginBottom: 12, lineHeight: 1.2 }}>
            Jan Samadhaan
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto 8px', lineHeight: 1.6 }}>
            भारत ई-शिकायत प्रणाली — AI-Powered Citizen Grievance Portal
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Supports 13 Indian Languages • Real-time SLA Tracking • Gemini AI</p>
        </div>

        <div className="tricolor-bar" style={{ maxWidth: 300, margin: '32px auto 0' }} />
      </div>

      {/* Role Cards */}
      {!citizen && (
        <div style={{ maxWidth: 900, margin: '-30px auto 0', padding: '0 16px 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {[
            { role: 'new', icon: '🆕', title: 'New Citizen', sub: 'Register and file your first grievance', color: 'var(--saffron)', hint: 'Create account with OTP' },
            { role: 'returning', icon: '👤', title: 'Returning Citizen', sub: 'Login and track your complaints', color: 'var(--india-green)', hint: 'Sign in with OTP' },
            { role: 'official', icon: '🏛️', title: 'Official Dashboard', sub: 'Manage and resolve grievances', color: 'var(--ashoka-blue)', hint: 'Requires credentials' },
          ].map(card => (
            <div key={card.role} className="glass-card" onClick={() => handleRoleSelect(card.role)}
              style={{ padding: 28, cursor: 'pointer', textAlign: 'center', border: `1px solid rgba(255,255,255,0.07)`, transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = card.color; e.currentTarget.style.transform = 'translateY(-6px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 12 }} className="float">{card.icon}</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>{card.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>{card.sub}</p>
              <span style={{ fontSize: '0.75rem', color: card.color, background: `${card.color}15`, padding: '4px 12px', borderRadius: 20, border: `1px solid ${card.color}30` }}>{card.hint}</span>
            </div>
          ))}
        </div>
      )}

      {/* Citizen logged in — action cards */}
      {citizen && (
        <div style={{ maxWidth: 700, margin: '10px auto 0', padding: '0 16px 60px' }}>
          <Header citizen={citizen} onLogout={() => { setCitizen(null); setScreen('home'); }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
            <div className="glass-card" onClick={() => setScreen('form')}
              style={{ padding: 32, cursor: 'pointer', textAlign: 'center' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--saffron)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🗳️</div>
              <h3 style={{ fontWeight: 700, marginBottom: 4 }}>New Complaint</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>File a new grievance with AI routing</p>
            </div>
            <div className="glass-card" onClick={() => setScreen('mycomplaints')}
              style={{ padding: 32, cursor: 'pointer', textAlign: 'center' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--india-green)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📋</div>
              <h3 style={{ fontWeight: 700, marginBottom: 4 }}>My Complaints</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Track status and give feedback</p>
            </div>
          </div>
        </div>
      )}

      {/* Features strip */}
      <div style={{ background: 'var(--surface)', padding: '50px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontWeight: 700, marginBottom: 32, color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 2 }}>Platform Features</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {[
              { icon: '🤖', title: 'Gemini AI', desc: 'Auto-routes to correct department' },
              { icon: '🌐', title: '13 Languages', desc: 'Full multilingual support' },
              { icon: '📍', title: 'Geolocation', desc: 'Map-based complaint tagging' },
              { icon: '⏱️', title: 'SLA Tracking', desc: 'Priority-based deadlines' },
              { icon: '📧', title: 'Email Alerts', desc: 'Real-time notifications' },
              { icon: '🔄', title: 'Dept Routing', desc: 'Forward between departments' },
            ].map(f => (
              <div key={f.title} style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>{f.icon}</div>
                <h4 style={{ fontWeight: 700, marginBottom: 4, fontSize: '0.95rem' }}>{f.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px 16px', fontSize: '0.8rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border)' }}>
        🇮🇳 भारत ई-शिकायत प्रणाली • Jan Samadhaan • Built for India's Citizens
      </div>

      {/* Auth Modal */}
      {authModal && <OTPModal mode={authModal} onSuccess={handleAuthSuccess} onClose={() => setAuthModal(null)} />}
    </main>
  );
}

function Header({ citizen, onLogout }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.5rem' }}>🇮🇳</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Jan Samadhaan</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logged in as {citizen.name}</div>
        </div>
      </div>
      <button className="btn-ghost" onClick={onLogout} style={{ padding: '7px 14px', fontSize: '0.82rem' }}>Logout</button>
    </div>
  );
}
