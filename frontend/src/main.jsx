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

function App() {
  const fileInputRef = useRef(null);
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState('');

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

  return (
    <main className="shell">
      <p className="eyebrow">GROUPDNA / PRIVATE BETA</p>
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
