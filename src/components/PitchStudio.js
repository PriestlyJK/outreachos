import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const SPAM_WORDS = ['guest post', 'link building', 'backlink', 'collaboration opportunity', 'partnership proposal', 'I wanted to reach out', 'I hope this email finds you well', 'mutual benefit', 'win-win', 'SEO', 'anchor text', 'sponsored', 'paid placement'];

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>;
}

function PitchCard({ title, variants, icon, color }) {
  const [active, setActive] = useState(0);
  if (!variants?.length) return null;
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ background: color + '12', borderColor: color + '30' }}>
        <i className={`ti ${icon}`} style={{ fontSize: 15, color }} />
        <span className="card-title">{title}</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {variants.map((v, i) => (
            <button key={i} onClick={() => setActive(i)} style={{ padding: '2px 10px', borderRadius: 20, border: '1px solid', borderColor: active === i ? color : 'var(--border)', background: active === i ? color : 'transparent', color: active === i ? '#fff' : 'var(--text-3)', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {variants[active]?.subject && (
          <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 3 }}>Subject</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{variants[active].subject}</div>
          </div>
        )}
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, flex: 1, whiteSpace: 'pre-wrap' }}>{variants[active]?.body}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--bg-3)' }}>
          <CopyBtn text={variants[active]?.subject ? `Subject: ${variants[active].subject}\n\n${variants[active].body}` : variants[active]?.body || ''} />
          {variants[active]?.charCount && <span style={{ fontSize: 11, color: 'var(--text-3)', alignSelf: 'center', marginLeft: 'auto' }}>{variants[active].charCount} chars</span>}
        </div>
      </div>
    </div>
  );
}

function AddToBaseModal({ pitches, currentProject, onAdd, onClose }) {
  const [channel, setChannel] = useState('email');
  const [selectedPitch, setSelectedPitch] = useState('email1');
  const [contactName, setContactName] = useState('');
  const [notes, setNotes] = useState('');

  const pitchOptions = [
    { id: 'email1', label: 'Email v1' }, { id: 'email2', label: 'Email v2' }, { id: 'email3', label: 'Email v3' },
    { id: 'followup1', label: 'Follow-up 1' }, { id: 'followup2', label: 'Follow-up 2' },
    { id: 'linkedinInvite1', label: 'LinkedIn Invite' }, { id: 'linkedinInmail1', label: 'LinkedIn InMail' },
  ].filter(o => pitches && pitches[o.id]);

  const getPitchText = (id) => {
    if (!pitches || !pitches[id]) return '';
    const p = pitches[id];
    return p.subject ? `Subject: ${p.subject}\n\n${p.body}` : p.body || '';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Save to Contact Base</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="modal-body">
          <div className="field-group"><label className="field-label">Contact name *</label><input className="field-input" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Name or domain" autoFocus /></div>
          <div className="field-group"><label className="field-label">Channel used</label><select className="field-select" value={channel} onChange={e => setChannel(e.target.value)}><option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="both">Both</option></select></div>
          <div className="field-group">
            <label className="field-label">Pitch sent</label>
            <select className="field-select" value={selectedPitch} onChange={e => setSelectedPitch(e.target.value)}>
              {pitchOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          {selectedPitch && pitches?.[selectedPitch] && (
            <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, maxHeight: 100, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
              {getPitchText(selectedPitch).slice(0, 250)}...
            </div>
          )}
          <div className="field-group"><label className="field-label">Notes</label><textarea className="field-input field-textarea" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: 50 }} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { if (contactName) onAdd({ name: contactName, channel, pitch_used: getPitchText(selectedPitch), notes, status: 'pitched', date: new Date().toISOString().slice(0, 10), followup_sent: false, reply_received: false, placed: false, project_id: currentProject?.id || null }); }}>Save to base</button>
        </div>
      </div>
    </div>
  );
}

export default function PitchStudio({ settings, currentProject, pitchData, onPitchDataChange, contacts, onContactsChange }) {
  // All state persisted via props from App.js
  const [donorUrl, setDonorUrl] = useState(pitchData?.donorUrl || '');
  const [donorName, setDonorName] = useState(pitchData?.donorName || '');
  const [dossier, setDossier] = useState(pitchData?.dossier || null);
  const [outreachGoal, setOutreachGoal] = useState(pitchData?.outreachGoal || currentProject?.outreach_goal || '');
  const [anchor, setAnchor] = useState(pitchData?.selectedAnchor || '');
  const [mode, setMode] = useState(settings.outreachMode || 'both');
  const [tone, setTone] = useState(settings.tone || 'friendly');
  const [generating, setGenerating] = useState(false);
  const [pitches, setPitches] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddToBase, setShowAddToBase] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptManager, setShowPromptManager] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(null);

  // When pitchData changes (from LinkIntel), update fields
  useEffect(() => {
    if (pitchData) {
      if (pitchData.donorUrl) setDonorUrl(pitchData.donorUrl);
      if (pitchData.donorName) setDonorName(pitchData.donorName);
      if (pitchData.dossier) setDossier(pitchData.dossier);
      if (pitchData.outreachGoal) setOutreachGoal(pitchData.outreachGoal);
      if (pitchData.selectedAnchor) setAnchor(pitchData.selectedAnchor);
    }
  }, [pitchData?.donorUrl]); // eslint-disable-line

  useEffect(() => {
    supabase.from('saved_prompts').select('*').eq('type', 'pitch').order('created_at').then(({ data }) => { if (data) setSavedPrompts(data); });
  }, []);

  const handleSelectPrompt = (id) => {
    setSelectedPromptId(id);
    if (id) { const p = savedPrompts.find(p => p.id === id); if (p) setCustomPrompt(p.content); }
    else setCustomPrompt('');
  };

  const handleSavePrompt = async () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) return;
    if (editingPrompt) {
      const { data } = await supabase.from('saved_prompts').update({ name: newPromptName, content: newPromptContent }).eq('id', editingPrompt.id).select().single();
      if (data) setSavedPrompts(prev => prev.map(p => p.id === editingPrompt.id ? data : p));
    } else {
      const { data } = await supabase.from('saved_prompts').insert({ name: newPromptName, content: newPromptContent, type: 'pitch' }).select().single();
      if (data) setSavedPrompts(prev => [...prev, data]);
    }
    setNewPromptName(''); setNewPromptContent(''); setEditingPrompt(null);
  };

  const handleDeletePrompt = async (id) => {
    await supabase.from('saved_prompts').delete().eq('id', id);
    setSavedPrompts(prev => prev.filter(p => p.id !== id));
    if (selectedPromptId === id) { setSelectedPromptId(''); setCustomPrompt(''); }
  };

  const callAI = async (system, user) => {
    if (settings.aiProvider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': settings.anthropicKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 10000, system, messages: [{ role: 'user', content: user }] }),
      });
      return (await res.json()).content?.[0]?.text || '';
    } else {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${settings.geminiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `${system}\n\n${user}` }] }] }) });
      return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  };

  const handleGenerate = async () => {
    if (!donorUrl.trim() && !donorName.trim()) return;
    setGenerating(true); setPitches(null);
    try {
      const dossierText = dossier ? `\nDossier:\n- Summary: ${dossier.summary}\n- Key topics: ${(dossier.keyTopics || []).join(', ')}\n- Recent content: ${(dossier.recentContent || []).join(' | ')}\n- Achievements: ${(dossier.achievements || []).join(' | ')}\n- Best outreach angle: ${dossier.outreachAngle}` : '';

      const system = `You are an expert outreach copywriter. Write highly personalized, human outreach messages.

NEVER use: ${SPAM_WORDS.join(', ')}
Tone: ${tone === 'friendly' ? 'casual and peer-to-peer' : tone === 'professional' ? 'professional but warm' : 'neutral and direct'}
Mode: ${mode === 'partnership' ? 'content collaboration' : mode === 'discovery' ? 'expert advice / customer discovery' : 'best fit based on context'}
${customPrompt ? `\nAdditional instructions:\n${customPrompt}` : ''}

Return ONLY valid JSON:
{
  "linkedinInvite1": {"body": "...", "charCount": 0},
  "linkedinInvite2": {"body": "...", "charCount": 0},
  "linkedinInvite3": {"body": "...", "charCount": 0},
  "linkedinInmail1": {"body": "..."},
  "linkedinInmail2": {"body": "..."},
  "linkedinComment1": {"body": "..."},
  "linkedinComment2": {"body": "..."},
  "linkedinComment3": {"body": "..."},
  "email1": {"subject": "...", "body": "..."},
  "email2": {"subject": "...", "body": "..."},
  "email3": {"subject": "...", "body": "..."},
  "followup1": {"subject": "...", "body": "...", "timing": "5 days after"},
  "followup2": {"subject": "...", "body": "...", "timing": "10 days after"}
}`;

      const raw = await callAI(system, `Our product: ${settings.ourProduct}\nContact: ${donorName || donorUrl}\nURL: ${donorUrl}\nOutreach goal: ${outreachGoal}${anchor ? `\nAnchor (use naturally if relevant): ${anchor}` : ''}${dossierText}`);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) setPitches(JSON.parse(match[0]));
      else throw new Error('Invalid response');
    } catch (e) { alert('Generation failed: ' + e.message); }
    setGenerating(false);
  };

  const handleAddToBase = async (contactData) => {
    const { data } = await supabase.from('contacts').insert(contactData).select().single();
    if (data) onContactsChange([data, ...contacts]);
    setShowAddToBase(false);
  };

  const p = pitches;

  return (
    <>
      <div className="topbar">
        <div className="topbar-info">
          <div className="topbar-title">Pitch Studio</div>
          <div className="topbar-sub">{donorName || donorUrl || 'Set up a contact to generate pitches'}</div>
        </div>
        <button className="btn btn-sm" onClick={() => setShowPromptManager(true)}><i className="ti ti-bookmark" /> Saved prompts</button>
        <button className="btn btn-sm" onClick={() => setShowSettings(v => !v)}><i className="ti ti-adjustments" /> Settings</button>
        {pitches && <><button className="btn btn-sm" onClick={() => setShowAddToBase(true)}><i className="ti ti-database" /> Save to base</button><button className="btn btn-sm" onClick={handleGenerate}><i className="ti ti-refresh" /> Regenerate</button></>}
        <button className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={generating || (!donorUrl.trim() && !donorName.trim())}>
          {generating ? <><span className="spinner" style={{ width: 14, height: 14 }} />Generating...</> : <><i className="ti ti-bolt" />Generate</>}
        </button>
      </div>

      <div className="scroll-body">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            {dossier && (
              <div style={{ background: 'var(--orange-light)', border: '1px solid var(--orange-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--orange-dark)' }}>
                <strong>Dossier loaded:</strong> {dossier.name} · {dossier.summary?.slice(0, 100)}...
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(dossier.keyTopics || []).map((t, i) => <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--orange)', color: '#fff' }}>{t}</span>)}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field-group"><label className="field-label">Contact name</label><input className="field-input" value={donorName} onChange={e => setDonorName(e.target.value)} placeholder="Sarah Johnson or bynder.com" /></div>
              <div className="field-group"><label className="field-label">URL or LinkedIn</label><input className="field-input" value={donorUrl} onChange={e => setDonorUrl(e.target.value)} placeholder="linkedin.com/in/... or site.com" /></div>
              <div className="field-group"><label className="field-label">Outreach goal</label><input className="field-input" value={outreachGoal} onChange={e => setOutreachGoal(e.target.value)} placeholder="What do you want from this contact?" /></div>
              <div className="field-group"><label className="field-label">Anchor text (optional)</label><input className="field-input" value={anchor} onChange={e => setAnchor(e.target.value)} placeholder="digital asset management" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 10 }}>
              <div className="field-group">
                <label className="field-label">Custom prompt (optional)</label>
                <select className="field-select" value={selectedPromptId} onChange={e => handleSelectPrompt(e.target.value)}>
                  <option value="">— no saved prompt —</option>
                  {savedPrompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {(customPrompt || showSettings) && (
                <div className="field-group">
                  <label className="field-label">Custom instructions</label>
                  <textarea className="field-input field-textarea" value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="e.g. Keep all emails under 3 sentences..." style={{ minHeight: 60 }} />
                </div>
              )}
            </div>
            {showSettings && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <div className="field-group"><label className="field-label">Mode</label><select className="field-select" value={mode} onChange={e => setMode(e.target.value)}><option value="both">Both (auto)</option><option value="partnership">Partnership</option><option value="discovery">Discovery</option></select></div>
                <div className="field-group"><label className="field-label">Tone</label><select className="field-select" value={tone} onChange={e => setTone(e.target.value)}><option value="friendly">Friendly / casual</option><option value="professional">Professional</option><option value="neutral">Neutral</option></select></div>
              </div>
            )}
          </div>
        </div>

        {!pitches && !generating && (
          <div className="empty-state" style={{ marginTop: 32 }}>
            <i className="ti ti-mail empty-icon" />
            <div className="empty-title">Ready to generate</div>
            <div className="empty-sub">Fill in the contact details and click Generate</div>
          </div>
        )}
        {generating && (
          <div className="empty-state" style={{ marginTop: 32 }}>
            <span className="spinner" style={{ width: 28, height: 28 }} />
            <div className="empty-title">Generating personalized pitches...</div>
          </div>
        )}

        {p && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>LinkedIn</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <PitchCard title="Invite note" icon="ti-user-plus" color="var(--blue)" variants={[{ label: 'v1', body: p.linkedinInvite1?.body, charCount: p.linkedinInvite1?.charCount }, { label: 'v2', body: p.linkedinInvite2?.body, charCount: p.linkedinInvite2?.charCount }, { label: 'v3', body: p.linkedinInvite3?.body, charCount: p.linkedinInvite3?.charCount }]} />
              <PitchCard title="InMail" icon="ti-message" color="var(--blue)" variants={[{ label: 'v1', body: p.linkedinInmail1?.body }, { label: 'v2', body: p.linkedinInmail2?.body }]} />
            </div>
            <PitchCard title="Post comments (warm-up)" icon="ti-message-circle" color="var(--blue)" variants={[{ label: 'Comment 1', body: p.linkedinComment1?.body }, { label: 'Comment 2', body: p.linkedinComment2?.body }, { label: 'Comment 3', body: p.linkedinComment3?.body }]} />
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginTop: 8 }}>Email</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <PitchCard title="Email v1" icon="ti-mail" color="var(--orange)" variants={[{ label: 'Email', subject: p.email1?.subject, body: p.email1?.body }]} />
              <PitchCard title="Email v2" icon="ti-mail" color="var(--orange)" variants={[{ label: 'Email', subject: p.email2?.subject, body: p.email2?.body }]} />
              <PitchCard title="Email v3" icon="ti-mail" color="var(--orange)" variants={[{ label: 'Email', subject: p.email3?.subject, body: p.email3?.body }]} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginTop: 8 }}>Follow-ups</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <PitchCard title={`Follow-up 1 · ${p.followup1?.timing || '~5 days'}`} icon="ti-send" color="var(--green)" variants={[{ label: 'FU 1', subject: p.followup1?.subject, body: p.followup1?.body }]} />
              <PitchCard title={`Follow-up 2 · ${p.followup2?.timing || '~10 days'}`} icon="ti-send" color="var(--green)" variants={[{ label: 'FU 2', subject: p.followup2?.subject, body: p.followup2?.body }]} />
            </div>
          </div>
        )}
      </div>

      {showAddToBase && <AddToBaseModal pitches={pitches} currentProject={currentProject} onAdd={handleAddToBase} onClose={() => setShowAddToBase(false)} />}

      {showPromptManager && (
        <div className="modal-overlay" onClick={() => setShowPromptManager(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Saved prompts</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPromptManager(false)}><i className="ti ti-x" /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
                <input className="field-input" value={newPromptName} onChange={e => setNewPromptName(e.target.value)} placeholder="Prompt name..." />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary" onClick={handleSavePrompt}>{editingPrompt ? 'Update' : 'Save'}</button>
                  {editingPrompt && <button className="btn" onClick={() => { setEditingPrompt(null); setNewPromptName(''); setNewPromptContent(''); }}>Cancel</button>}
                </div>
              </div>
              <textarea className="field-input field-textarea" value={newPromptContent} onChange={e => setNewPromptContent(e.target.value)} placeholder="Enter your custom instructions..." style={{ minHeight: 80 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {savedPrompts.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-3)', border: selectedPromptId === p.id ? '1px solid var(--orange)' : '1px solid transparent' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', marginBottom: 3 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.content.slice(0, 100)}...</div>
                  </div>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setEditingPrompt(p); setNewPromptName(p.name); setNewPromptContent(p.content); }}><i className="ti ti-pencil" style={{ fontSize: 13 }} /></button>
                  <button className="btn btn-sm btn-ghost" style={{ color: 'var(--coral, #E24B4A)' }} onClick={() => handleDeletePrompt(p.id)}><i className="ti ti-trash" style={{ fontSize: 13 }} /></button>
                </div>
              ))}
              {savedPrompts.length === 0 && <div style={{ textAlign: 'center', padding: 24, fontSize: 13, color: 'var(--text-3)' }}>No saved prompts yet.</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}