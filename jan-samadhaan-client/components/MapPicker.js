'use client';
import { useState } from 'react';

export default function MapPicker({ onLocationSelect }) {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [manualLat, setManualLat] = useState('');
    const [manualLng, setManualLng] = useState('');
    const [showManual, setShowManual] = useState(false);

    const detectLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation not supported by your browser');
            return;
        }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setLocation(loc);
                setManualLat(loc.lat.toFixed(6));
                setManualLng(loc.lng.toFixed(6));
                onLocationSelect?.(loc);
                setLoading(false);
            },
            () => {
                setLoading(false);
                setShowManual(true);
            },
            { timeout: 10000 }
        );
    };

    const applyManual = () => {
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        if (isNaN(lat) || isNaN(lng)) return;
        const loc = { lat, lng };
        setLocation(loc);
        onLocationSelect?.(loc);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Map preview via Google Maps embed — static, no JS bundle */}
            {location && (
                <div style={{ borderRadius: 10, overflow: 'hidden', height: 220, border: '1px solid var(--glass-border)' }}>
                    <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=16&output=embed`}
                    />
                </div>
            )}

            {!location && !showManual && (
                <div style={{
                    border: '2px dashed var(--border)', borderRadius: 10, padding: '32px 20px',
                    textAlign: 'center', background: 'rgba(255,255,255,0.02)',
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: 10 }}>📍</div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                        Attach your location to help officials find the site
                    </p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button type="button" className="btn-primary" onClick={detectLocation} disabled={loading}
                            style={{ padding: '10px 20px', fontSize: '0.88rem' }}>
                            {loading ? <><span className="spinner" /> Detecting...</> : '📡 Detect My Location'}
                        </button>
                        <button type="button" className="btn-ghost" onClick={() => setShowManual(true)}
                            style={{ padding: '10px 20px', fontSize: '0.88rem' }}>
                            ✏️ Enter Manually
                        </button>
                    </div>
                </div>
            )}

            {showManual && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {!location && <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn-primary" onClick={detectLocation} disabled={loading}
                            style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                            {loading ? <span className="spinner" /> : '📡 Auto-Detect'}
                        </button>
                    </div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Latitude</label>
                            <input className="inp" placeholder="e.g. 19.0760" value={manualLat}
                                onChange={e => setManualLat(e.target.value)} style={{ fontSize: '0.85rem' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Longitude</label>
                            <input className="inp" placeholder="e.g. 72.8777" value={manualLng}
                                onChange={e => setManualLng(e.target.value)} style={{ fontSize: '0.85rem' }} />
                        </div>
                    </div>
                    <button type="button" className="btn-green" onClick={applyManual} style={{ padding: '8px 16px', fontSize: '0.85rem', alignSelf: 'flex-start' }}>
                        ✓ Set Location
                    </button>
                </div>
            )}

            {location && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--india-green)' }}>
                        ✅ Pinned: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                    </span>
                    <button type="button" className="btn-ghost" onClick={() => { setLocation(null); onLocationSelect?.(null); }}
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                        ✕ Clear
                    </button>
                </div>
            )}
        </div>
    );
}
