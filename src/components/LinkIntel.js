import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const ANCHOR_STATUSES = {
  pending: { label: 'Pending', color: 'var(--text-3)', bg: 'var(--bg-3)' },
  inprogress: { label: 'In progress', color: 'var(--amber)', bg: 'var(--amber-light)' },
  used: { label: 'Used', color: 'var(--green)', bg: 'var(--green-light)' },
};

export default function LinkIntel({ settings, currentProject, onOpenPitch, linkIntelData, onLinkIntelDataChange }) {
  const { url, outreachGoal, dossier } = linkIntelData;
  const setUrl = (v) => onLinkIntelDataChange(prev => ({ ...prev, url: v }));
  const setOutreachGoal = (v) => onLinkIntelDataChange(prev => ({ ...prev, outreachGoal: v }));
  const setDossier = (v) => onLinkIntelDataChange(prev => ({ ...prev, dossier: v }));

  const [analyzing, setAnalyzing] = useState(false);
  const [useAnchorPlan, setUseAnchorPlan] = useState(false);
  const [anchors, setAnchors] = useState([]);
  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const [newAnchorText, setNewAnchorText] = useState('');

  useEffect(() => {
    if (!outreachGoal && currentProject?.outreach_goal) {
      onLinkIntelDataChange(prev => ({ ...prev, outreachGoal: currentProject.outreach_goal }));
    }
  }, [currentProject?.id]); // eslint-disable-line

  useEffect(() => {
    if (currentProject?.id && useAnchorPlan) {
      supabase.from('anchors').select('*').eq('project_id', currentProject.id).then(({ data }) => { if (data) setAnchors(data); });
    }
  }, [currentProject?.id, useAnchorPlan]);

  const callAI = async (system, user) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': settings.anthropicKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, system, messages: [{ role: 'user', content: user }] }),
    });
    return (await res.json()).content?.[0]?.text || '';
  };

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setAnalyzing(true); setDossier(null);
    try {
      let content = `URL: ${url}`;
      try {
        const exaRes = await fetch('https://api.exa.ai/contents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': settings.exaKey },
          body: JSON.stringify({ urls: [`https://${url.replace(/https?:\/\//, '')}`], highlights: true }),
        });
        const exaData = await exaRes.json();
        content = exaData.results?.[0]?.highlights?.join('\n') || content;
      } catch {}

      const pendingAnchors = anchors.filter(a => a.status !== 'used').map(a => a.text);
      const isLinkedIn = url.includes('linkedin.com');

      const system = `You are an expert outreach researcher. Analyze this ${isLinkedIn ? 'LinkedIn profile' : 'website'} and build a detailed dossier. Focus on what's genuinely relevant for personalized outreach.

Return ONLY valid JSON:
{
  "name": "person or site name",
  "type": "${isLinkedIn ? 'person' : 'site'}",
  "summary": "2-3 sentences on who they are and why they matter",
  "keyTopics": ["topic 1", "topic 2", "topic 3"],
  "recentContent": ["specific post/article 1", "specific post/article 2", "specific post/article 3"],
  "companyOrProject": "their company or main affiliation",
  "achievements": ["notable achievement 1", "notable achievement 2"],
  "outreachAngle": "the most compelling specific angle based on their actual content",
  "suggestedAnchor": "${pendingAnchors.length ? 'pick best from: ' + pendingAnchors.join(', ') : 'suggest natural anchor text'}",
  "anchorReason": "why this anchor fits naturally"
}`;

      const raw = await callAI(system, `Our product: ${settings.ourProduct}\nOutreach goal: ${outreachGoal || 'general outreach'}\n\nAnalyze: ${url}\nContent:\n${content}`);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setDossier(parsed);
        if (parsed.suggestedAnchor && useAnchorPlan) {
          const matched = anchors.find(a => a.status !== 'used' && a.text.toLowerCase().includes(parsed.suggestedAnchor.toLowerCase().split(' ')[0]));
          setSelectedAnchor(matched || null);
        }
      }
    } catch (e) { alert('Analysis failed: ' + e.message); }
    setAnalyzing(false);
  };

  const handleOpenPitch = () => {
    if (!dossier) return;
    onOpenPitch({
      donorUrl: url,
      donorName: dossier.name,
      donorRole: dossier.companyOrProject || '',
      donorCompany: dossier.companyOrProject || '',
      donorNotes: dossier.summary || '',
      isLinkedIn: url.includes('linkedin.com'),
      dossier,
      selectedAnchor: selectedAnchor?.text || dossier.suggestedAnchor,
      outreachGoal,
      projectGoal: currentProject?.outreach_goal || '',
    });
  };

  const handleSaveAnchor = async () => {
    if (!newAnchorText.trim()) return;
    const { data } = await supabase.from('anchors').insert({ text: newAnchorText.trim(), status: 'pending', project_id: currentProject?.id || null }).select().single();
    if (data) setAnchors(prev => [...prev, data]);
    setNewAnchorText('');
  };

  const cycleAnchorStatus = async (anchor) => {
    const order = ['pending', 'inprogress', 'used'];
    const next = order[(order.indexOf(anchor.status) + 1) % order.length];
    await supabase.from('anchors').update({ status: next }).eq('id', anchor.id);
    setAnchors(prev => prev.map(a => a.id === anchor.id ? { ...a, status: next } : a));
  };

  const deleteAnchor = async (id) => {
    await supabase.from('anchors').delete().eq('id', id);
    setAnchors(prev => prev.filter(a => a.id !== id));
  };

  const usedCount = anchors.filter(a => a.status === 'used').length;
  const pendingCount = anchors.filter(a => a.status === 'pending').length;
  const inProgressCount = anchors.filter(a => a.status === 'inprogress').length;

  return (
    <>
      <div className="topbar">
        <div className="topbar-info">
          <div className="topbar-title">LinkIntel</div>
          <div className="topbar-sub">Build a dossier — then send to Pitch Studio</div>
        </div>
        {dossier && <button className="btn btn-primary btn-sm" onClick={handleOpenPitch}><i className="ti ti-mail" /> Send to Pitch Studio</button>}
      </div>

      <div className="scroll-body" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Analyze contact</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field-group">
                <label className="field-label">URL or LinkedIn profile</label>
                <input className="field-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="linkedin.com/in/... or site.com" onKeyDown={e => e.key === 'Enter' && handleAnalyze()} />
              </div>
              <div className="field-group">
                <label className="field-label">Outreach goal</label>
                <textarea className="field-input field-textarea" value={outreachGoal} onChange={e => setOutreachGoal(e.target.value)} placeholder="What do you want from this contact?" style={{ minHeight: 60 }} />
              </div>
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing || !url.trim()} style={{ width: '100%', justifyContent: 'center' }}>
                {analyzing ? <><span className="spinner" style={{ width: 14, height: 14 }} />Analyzing...</> : <><i className="ti ti-search" />Analyze</>}
              </button>
            </div>
          </div>

          {/* Anchor plan — fixed toggle */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Anchor plan</span>
              <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--text-3)' }}>optional</span>
              <div
                onClick={() => setUseAnchorPlan(v => !v)}
                style={{ marginLeft: 'auto', width: 32, height: 18, borderRadius: 9, background: useAnchorPlan ? 'var(--orange)' : 'var(--border-2)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0 }}
              >
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: useAnchorPlan ? 16 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
            {useAnchorPlan && (
              <div className="card-body">
                <div style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 12 }}>
                  <span style={{ color: 'var(--green)' }}><strong>{usedCount}</strong> used</span>
                  <span style={{ color: 'var(--amber)' }}><strong>{inProgressCount}</strong> in progress</span>
                  <span style={{ color: 'var(--text-3)' }}><strong>{pendingCount}</strong> pending</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <input className="field-input" value={newAnchorText} onChange={e => setNewAnchorText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveAnchor()} placeholder="Add anchor..." style={{ fontSize: 12 }} />
                  <button className="btn btn-primary btn-sm" onClick={handleSaveAnchor}><i className="ti ti-plus" /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {anchors.map(a => {
                    const sc = ANCHOR_STATUSES[a.status] || ANCHOR_STATUSES.pending;
                    const isSelected = selectedAnchor?.id === a.id;
                    return (
                      <div key={a.id} onClick={() => a.status !== 'used' && setSelectedAnchor(isSelected ? null : a)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, background: isSelected ? 'var(--orange-light)' : 'var(--bg-3)', cursor: a.status === 'used' ? 'default' : 'pointer', opacity: a.status === 'used' ? 0.6 : 1, border: isSelected ? '1px solid var(--orange-border)' : '1px solid transparent' }}>
                        <span style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: 'var(--text-1)' }}>{a.text}</span>
                        <button onClick={e => { e.stopPropagation(); cycleAnchorStatus(a); }} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, border: 'none', background: sc.bg, color: sc.color, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 }}>{sc.label}</button>
                        <button onClick={e => { e.stopPropagation(); deleteAnchor(a.id); }} className="btn btn-ghost btn-sm" style={{ padding: '2px 4px', color: 'var(--text-3)' }}><i className="ti ti-x" style={{ fontSize: 11 }} /></button>
                      </div>
                    );
                  })}
                  {anchors.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '12px 0' }}>No anchors yet. Add one above.</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          {!dossier && !analyzing && (
            <div className="empty-state" style={{ marginTop: 60 }}>
              <i className="ti ti-file-search empty-icon" />
              <div className="empty-title">Enter a URL to analyze</div>
              <div className="empty-sub">AI will build a detailed dossier for personalized outreach</div>
            </div>
          )}
          {analyzing && (
            <div className="empty-state" style={{ marginTop: 60 }}>
              <span className="spinner" style={{ width: 28, height: 28 }} />
              <div className="empty-title">Building dossier...</div>
              <div className="empty-sub">Fetching content and analyzing with AI</div>
            </div>
          )}
          {dossier && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>{dossier.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{url}</div>
                  {dossier.companyOrProject && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{dossier.companyOrProject}</div>}
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleOpenPitch}><i className="ti ti-mail" />Send to Pitch Studio</button>
              </div>

              <div className="card">
                <div className="card-header"><i className="ti ti-user" style={{ fontSize: 14, color: 'var(--blue)' }} /><span className="card-title">Summary</span></div>
                <div className="card-body" style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{dossier.summary}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="card">
                  <div className="card-header"><i className="ti ti-tags" style={{ fontSize: 14, color: 'var(--amber)' }} /><span className="card-title">Key topics</span></div>
                  <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(dossier.keyTopics || []).map((t, i) => <span key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'var(--amber-light)', color: 'var(--amber)', fontWeight: 500 }}>{t}</span>)}
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><i className="ti ti-trophy" style={{ fontSize: 14, color: 'var(--purple)' }} /><span className="card-title">Achievements</span></div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {(dossier.achievements || []).map((a, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', paddingLeft: 10, borderLeft: '2px solid var(--purple-light)', lineHeight: 1.5 }}>{a}</div>)}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><i className="ti ti-file-text" style={{ fontSize: 14, color: 'var(--blue)' }} /><span className="card-title">Recent content</span></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(dossier.recentContent || []).map((c, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', paddingLeft: 12, borderLeft: '2px solid var(--blue-light)', lineHeight: 1.5 }}>{c}</div>)}
                </div>
              </div>

              <div className="card" style={{ borderColor: 'var(--orange-border)', background: 'var(--orange-light)' }}>
                <div className="card-header" style={{ background: 'transparent', borderColor: 'var(--orange-border)' }}>
                  <i className="ti ti-target" style={{ fontSize: 14, color: 'var(--orange)' }} />
                  <span className="card-title" style={{ color: 'var(--orange)' }}>Best outreach angle</span>
                </div>
                <div className="card-body" style={{ fontSize: 13, color: 'var(--orange-dark)', lineHeight: 1.7 }}>{dossier.outreachAngle}</div>
              </div>

              {(selectedAnchor || dossier.suggestedAnchor) && (
                <div className="card">
                  <div className="card-header"><i className="ti ti-link" style={{ fontSize: 14, color: 'var(--green)' }} /><span className="card-title">Suggested anchor</span></div>
                  <div className="card-body">
                    <div style={{ fontSize: 14, fontWeight: 500, fontFamily: 'monospace', color: 'var(--text-1)', marginBottom: 6 }}>{selectedAnchor?.text || dossier.suggestedAnchor}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{dossier.anchorReason}</div>
                  </div>
                </div>
              )}

              <button className="btn btn-primary" onClick={handleOpenPitch} style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 14 }}>
                <i className="ti ti-mail" />Generate pitches in Pitch Studio →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}