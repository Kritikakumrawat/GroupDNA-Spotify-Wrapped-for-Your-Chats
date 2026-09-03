import { useRef, useState, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const ARCHETYPE_INFO = {
  'The Catalyst': { icon: '✦', color: 'coral', description: 'Starts conversations and keeps the group moving.', signal: 'High conversation energy' },
  'The Anchor': { icon: '◉', color: 'teal', description: 'Shows up consistently and keeps the group connected.', signal: 'Steady presence' },
  'The Night Owl': { icon: '☾', color: 'gold', description: 'Brings ideas and replies when everyone else is asleep.', signal: 'After-hours activity' },
  'The Spark': { icon: '✺', color: 'pink', description: 'Adds expressive, lively energy to the conversation.', signal: 'Expressive style' },
  'The Observer': { icon: '◌', color: 'blue', description: 'Speaks selectively, but adds signal when they do.', signal: 'Selective participation' },
};

function ArchetypeCard({ member }) {
  const info = ARCHETYPE_INFO[member.archetype] || ARCHETYPE_INFO['The Observer'];
  return <article className={`archetype-card ${info.color}`}>
    <div className="card-top"><span className="archetype-icon">{info.icon}</span><span className="cluster-label">CLUSTER {member.cluster + 1}</span></div>
    <p className="member-name">{member.author}</p>
    <h3>{member.archetype}</h3>
    <p className="card-description">{info.description}</p>
    <div className="signal"><span>{info.signal}</span><strong>{Math.round(member.message_volume)} messages</strong></div>
  </article>;
}

function AuthScreen({ onEnter }) {
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (mode === 'register' && !form.name.trim()) {
      setError('Tell us your name first.');
      return;
    }
    if (!form.email.includes('@') || form.password.length < 6) {
      setError('Use a valid email and a password with 6+ characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:8080/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'login' ? { email: form.email, password: form.password } : form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Authentication failed');
      if (mode === 'register') {
        setMode('login');
        setForm({ name: '', email: form.email, password: '' });
        setError('Account created successfully. Please sign in to continue.');
      } else {
        onEnter(payload);
      }
    } catch (requestError) {
      const message = requestError instanceof TypeError && requestError.message.toLowerCase().includes('fetch')
        ? 'Authentication server is offline. Start Spring Boot on port 8080, then try again.'
        : requestError.message || 'Authentication failed. Please try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell">
    <section className="auth-story">
      <div className="story-brand"><span className="brand-mark">✦</span><span>GROUPDNA</span></div>
      <div className="story-copy"><p className="eyebrow">YOUR CHAT, DECODED</p><h1>See the people behind the messages.</h1><p>Turn your group’s everyday chaos into a beautiful, surprisingly accurate snapshot of how you connect.</p></div>
      <div className="story-footer"><span>01 / INSIGHT</span><span>PRIVATE BY DESIGN</span></div>
    </section>
    <section className="auth-panel">
      <div className="auth-heading"><p className="eyebrow">WELCOME BACK</p><h2>{mode === 'login' ? 'Sign in to your group' : 'Make your group count'}</h2><p>{mode === 'login' ? 'Your next little revelation is waiting.' : 'Create a space for your chat stories.'}</p></div>
      <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => { setMode('login'); setError(''); }}>Sign in</button><button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => { setMode('register'); setError(''); }}>Register</button></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' && <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" autoComplete="name" /></label>}
        <label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" autoComplete="email" required /></label>
        <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 6 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
        {mode === 'login' && <div className="form-meta"><label className="check-label"><input type="checkbox" /> Remember me</label><button type="button" className="text-button">Forgot password?</button></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Connecting...' : mode === 'login' ? 'Enter GroupDNA  →' : 'Create account  →'}</button>
      </form>
      <div className="auth-divider"><span>OR</span></div>
      <button className="guest-button" type="button" onClick={onEnter}>Explore as guest</button>
      <p className="auth-privacy">Your exported chat stays yours. GroupDNA stores derived statistics, never raw messages.</p>
    </section>
  </main>;
}

function App() {
  const fileInputRef = useRef(null);
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  async function analyzeFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setStatus('Please choose a WhatsApp .txt export.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setStatus('Reading your group...');
    setAnalysis(null);

    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || 'Analysis failed');
      setAnalysis(payload);
      setStatus('Analysis complete.');
    } catch (error) {
      setStatus(error.message || 'Could not reach the analysis service.');
    }
  }

  if (!authenticated) return <AuthScreen onEnter={(payload) => { setUser(payload); setAuthenticated(true); }} />;

  return (
    <main className="shell">
      <div className="app-bar"><p className="eyebrow">GROUPDNA / PRIVATE BETA</p><span className="signed-in">{user?.name || 'Guest'} <button type="button" onClick={() => { setAuthenticated(false); setUser(null); setAnalysis(null); }}>Sign out</button></span></div>
      <h1>Your group has a pulse.</h1>
      <p className="lede">Upload a WhatsApp export to decode the rhythm, energy, and roles inside your chat.</p>
      <section className="dropzone" aria-label="Upload WhatsApp export" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); analyzeFile(event.dataTransfer.files[0]); }}>
        <strong>Drop your .txt export here</strong>
        <span>Analysis happens in memory. Only anonymous aggregates are retained.</span>
        <input ref={fileInputRef} type="file" accept=".txt,text/plain" hidden onChange={(event) => analyzeFile(event.target.files[0])} />
        <button type="button" onClick={() => fileInputRef.current?.click()}>Choose export</button>
        {status && <span className="status" role="status">{status}</span>}
      </section>
      {analysis && <section className="results" aria-label="Analysis results">
        <p className="eyebrow">ANALYSIS #{analysis.analysis_id}</p>
        <div className="result-heading"><div><h2>The group, decoded.</h2><p>Every chat has its own rhythm. Here is yours.</p></div><button className="secondary-button" type="button" onClick={() => { setAnalysis(null); setStatus(''); }}>New export</button></div>
        <div className="metrics">
          <div><strong>{analysis.stats.total_messages}</strong><span>messages</span></div>
          <div><strong>{Object.keys(analysis.stats.member_messages).length}</strong><span>members</span></div>
          <div><strong>{analysis.stats.total_attachments}</strong><span>attachments</span></div>
        </div>
        <div className="insight-grid">
          <div className="insight-panel"><span className="panel-label">GROUP MOOD</span><strong>{analysis.sentiment_trend.length ? (analysis.sentiment_trend.reduce((sum, item) => sum + item.score, 0) / analysis.sentiment_trend.length > 0.2 ? 'Warm & upbeat' : 'Thoughtful & mixed') : 'Not enough data'}</strong><span>Based on VADER sentiment across the timeline.</span></div>
          <div className="insight-panel"><span className="panel-label">ACTIVITY BY HOUR</span><div className="bar-chart">{Array.from({ length: 12 }, (_, index) => { const hour = index * 2; const value = analysis.stats.hourly_messages[hour] || 0; const max = Math.max(...Object.values(analysis.stats.hourly_messages), 1); return <i key={hour} style={{ height: `${Math.max(8, value / max * 100)}%` }} title={`${hour}:00 - ${value} messages`} />; })}</div><span>Quiet hours to peak hours, in two-hour blocks.</span></div>
        </div>
        <div className="section-heading"><h2>Member archetypes</h2><span>Behavioral patterns, not personality diagnoses.</span></div>
        <div className="archetypes">{analysis.members.map((member) => <ArchetypeCard key={member.author} member={member} />)}</div>
        <div className="word-panel"><div className="section-heading"><h2>Your group says it best</h2><span>Most frequent meaningful words</span></div><div className="word-cloud">{Object.entries(analysis.top_words).slice(0, 12).map(([word, count], index) => <span key={word} style={{ fontSize: `${1 + Math.max(0, 5 - index) * 0.12}rem` }}>{word}<small>{count}</small></span>)}</div></div>
        <p className="privacy-note">Raw message text was analyzed in memory and discarded. Only aggregate statistics are retained.</p>
      </section>}
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>,
);
