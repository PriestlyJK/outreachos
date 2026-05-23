import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const PLACEMENT_STATUS = {
  pending: { label: 'Pending', color: 'var(--text-3)', bg: 'var(--bg-3)' },
  sent: { label: 'Sent', color: 'var(--blue)', bg: 'var(--blue-light)' },
  published: { label: 'Published', color: 'var(--green)', bg: 'var(--green-light)' },
  rejected: { label: 'Rejected', color: '#E24B4A', bg: '#FEF2F2' },
};

const LINK_STATUS = {
  alive: { label: 'Alive', color: 'var(--green)', bg: 'var(--green-light)', icon: 'ti-circle-check' },
  dead: { label: 'Dead / 404', color: '#E24B4A', bg: '#FEF2F2', icon: 'ti-circle-x' },
  nofollow: { label: 'Nofollow', color: 'var(--amber)', bg: 'var(--amber-light)', icon: 'ti-eye-off' },
  no_response: { label: 'No response', color: 'var(--text-3)', bg: 'var(--bg-3)', icon: 'ti-wifi-off' },
  not_checked: { label: 'Not checked', color: 'var(--text-3)', bg: 'var(--bg-3)', icon: 'ti-clock' },
};

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>;
}

async function checkLinkViaAPI(link) {
  try {
    const res = await fetch('/api/check-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: link.url,
        anchor: link.anchor_text,
        targetUrl: link.target_page,
      }),
    });
    const data = await res.json();
    return data.status || 'no_response';
  } catch {
    return 'no_response';
  }
}

export default function AnchorLinks({ settings, currentProject, projects }) {
  const [activeTab, setActiveTab] = useState('anchors');
  const [anchors, setAnchors] = useState([]);
  const [links, setLinks] = useState([]);
  const [stopList, setStopList] = useState([]);
  const [stopSearch, setStopSearch] = useState('');
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [filterProject, setFilterProject] = useState(currentProject?.id || 'all');

  const [articleText, setArticleText] = useState('');
  const [anchorText, setAnchorText] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [insertPrompt, setInsertPrompt] = useState('');
  const [selectedInsertPromptId, setSelectedInsertPromptId] = useState('');
  const [insertResult, setInsertResult] = useState('');
  const [inserting, setInserting] = useState(false);
  const [showInsertPromptManager, setShowInsertPromptManager] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(null);

  const [newAnchor, setNewAnchor] = useState({ text: '', target_site: '', target_url: '', month: '', project_id: currentProject?.id || '' });
  const [showAnchorForm, setShowAnchorForm] = useState(false);
  const [newLink, setNewLink] = useState({ url: '', anchor_text: '', target_page: '', project_id: currentProject?.id || '' });
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [stopInput, setStopInput] = useState('');

  useEffect(() => { loadData(); }, [currentProject?.id]); // eslint-disable-line

  const loadData = async () => {
    const [{ data: a }, { data: l }, { data: p }] = await Promise.all([
      supabase.from('anchors').select('*').order('created_at', { ascending: false }),
      supabase.from('links').select('*').order('created_at', { ascending: false }),
      supabase.from('saved_prompts').select('*').eq('type', 'insert').order('created_at'),
    ]);
    if (a) setAnchors(a);
    if (l) setLinks(l);
    if (p) setSavedPrompts(p);
  };

  const filteredAnchors = anchors.filter(a => filterProject === 'all' || a.project_id === filterProject);
  const filteredLinks = links.filter(l => filterProject === 'all' || l.project_id === filterProject);
  const filteredStopList = stopSearch.trim() ? stopList.filter(d => d.toLowerCase().includes(stopSearch.toLowerCase())) : stopList;

  const addAnchor = async () => {
    if (!newAnchor.text.trim()) return;
    const { data } = await supabase.from('anchors').insert({ ...newAnchor, project_id: newAnchor.project_id || null }).select().single();
    if (data) setAnchors(prev => [data, ...prev]);
    setNewAnchor({ text: '', target_site: '', target_url: '', month: '', project_id: currentProject?.id || '' });
    setShowAnchorForm(false);
  };

  const updateAnchor = async (id, changes) => {
    await supabase.from('anchors').update(changes).eq('id', id);
    setAnchors(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a));
  };

  const deleteAnchor = async (id) => {
    await supabase.from('anchors').delete().eq('id', id);
    setAnchors(prev => prev.filter(a => a.id !== id));
  };

  const handleInsert = async () => {
    if (!articleText.trim() || !anchorText.trim() || !targetUrl.trim()) return;
    setInserting(true); setInsertResult('');
    try {
      const system = `You are an expert SEO editor. Insert a link naturally into an article.
- Find the most natural place to add the anchor text as a hyperlink
- The placement must feel organic and add value to the reader
- Do NOT change the article structure or meaning
- Return the FULL article with the link: <a href="URL">anchor text</a>
${insertPrompt ? `\nAdditional instructions:\n${insertPrompt}` : ''}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': settings.anthropicKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 4000, system, messages: [{ role: 'user', content: `Article:\n${articleText}\n\nAnchor text: "${anchorText}"\nTarget URL: ${targetUrl}` }] }),
      });
      const text = (await res.json()).content?.[0]?.text || '';
      setInsertResult(text);
    } catch (e) { alert('Failed: ' + e.message); }
    setInserting(false);
  };

  const handleSaveInsertPrompt = async () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) return;
    if (editingPrompt) {
      const { data } = await supabase.from('saved_prompts').update({ name: newPromptName, content: newPromptContent }).eq('id', editingPrompt.id).select().single();
      if (data) setSavedPrompts(prev => prev.map(p => p.id === editingPrompt.id ? data : p));
    } else {
      const { data } = await supabase.from('saved_prompts').insert({ name: newPromptName, content: newPromptContent, type: 'insert' }).select().single();
      if (data) setSavedPrompts(prev => [...prev, data]);
    }
    setNewPromptName(''); setNewPromptContent(''); setEditingPrompt(null);
  };

  const handleDeleteInsertPrompt = async (id) => {
    await supabase.from('saved_prompts').delete().eq('id', id);
    setSavedPrompts(prev => prev.filter(p => p.id !== id));
    if (selectedInsertPromptId === id) { setSelectedInsertPromptId(''); setInsertPrompt(''); }
  };

  const addLink = async () => {
    if (!newLink.url.trim()) return;
    const { data } = await supabase.from('links').insert({ ...newLink, status: 'not_checked', project_id: newLink.project_id || null }).select().single();
    if (data) setLinks(prev => [data, ...prev]);
    setNewLink({ url: '', anchor_text: '', target_page: '', project_id: currentProject?.id || '' });
    setShowLinkForm(false);
  };

  const checkLink = async (link) => {
    setCheckingId(link.id);
    const status = await checkLinkViaAPI(link);
    await supabase.from('links').update({ status, last_checked: new Date().toISOString() }).eq('id', link.id);
    setLinks(prev => prev.map(l => l.id === link.id ? { ...l, status, last_checked: new Date().toISOString() } : l));
    setCheckingId(null);
  };

  const checkAllLinks = async () => {
    setChecking(true);
    for (const link of filteredLinks) {
      setCheckingId(link.id);
      const status = await checkLinkViaAPI(link);
      await supabase.from('links').update({ status, last_checked: new Date().toISOString() }).eq('id', link.id);
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, status, last_checked: new Date().toISOString() } : l));
    }
    setCheckingId(null);
    setChecking(false);
  };

  const deleteLink = async (id) => {
    await supabase.from('links').delete().eq('id', id);
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const addToStopList = () => {
    const domains = stopInput.split('\n').map(d => d.trim()).filter(Boolean);
    setStopList(prev => [...new Set([...prev, ...domains])]);
    setStopInput('');
  };

  const isInStopList = (domain) => stopList.some(d => d.toLowerCase() === domain.toLowerCase() || domain.toLowerCase().includes(d.toLowerCase()));

  const anchorsByMonth = filteredAnchors.reduce((acc, a) => {
    const month = a.month || 'No month';
    if (!acc[month]) acc[month] = [];
    acc[month].push(a);
    return acc;
  }, {});

  const tabs = [
    { id: 'anchors', label: 'Anchor Plan', icon: 'ti-list' },
    { id: 'inserter', label: 'Link Inserter', icon: 'ti-link' },
    { id: 'checker', label: 'Link Checker', icon: 'ti-radar' },
    { id: 'stoplist', label: 'Stop List', icon: 'ti-ban' },
  ];

  return (
    <>
      <div className="topbar">
        <div className="topbar-info">
          <div className="topbar-title">Anchor & Links</div>
          <div className="topbar-sub">{filteredAnchors.length} anchors · {filteredLinks.length} links tracked</div>
        </div>
        <select className="field-select" style={{ width: 180, padding: '7px 10px', fontSize: 12 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="scroll-body">
        <div className="tab-row">
          {tabs.map(t => <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}><i className={`ti ${t.icon}`} style={{ marginRight: 5 }} />{t.label}</button>)}
        </div>

        {/* ANCHOR PLAN */}
        {activeTab === 'anchors' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--green)' }}>{filteredAnchors.filter(a => a.status === 'used').length}</strong> used ·{' '}
                <strong style={{ color: 'var(--amber)' }}>{filteredAnchors.filter(a => a.status === 'inprogress').length}</strong> in progress ·{' '}
                <strong style={{ color: 'var(--text-3)' }}>{filteredAnchors.filter(a => a.status === 'pending').length}</strong> pending
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAnchorForm(v => !v)}><i className="ti ti-plus" /> Add anchor</button>
            </div>

            {showAnchorForm && (
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-header"><span className="card-title">New anchor</span></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="field-group"><label className="field-label">Anchor text *</label><input className="field-input" value={newAnchor.text} onChange={e => setNewAnchor(p => ({ ...p, text: e.target.value }))} placeholder="digital asset management" /></div>
                    <div className="field-group"><label className="field-label">Target site</label><input className="field-input" value={newAnchor.target_site} onChange={e => setNewAnchor(p => ({ ...p, target_site: e.target.value }))} placeholder="bynder.com" /></div>
                    <div className="field-group"><label className="field-label">Month</label><input className="field-input" value={newAnchor.month} onChange={e => setNewAnchor(p => ({ ...p, month: e.target.value }))} placeholder="May 2025" /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="field-group"><label className="field-label">Target URL</label><input className="field-input" value={newAnchor.target_url} onChange={e => setNewAnchor(p => ({ ...p, target_url: e.target.value }))} placeholder="https://..." /></div>
                    <div className="field-group"><label className="field-label">Project</label><select className="field-select" value={newAnchor.project_id} onChange={e => setNewAnchor(p => ({ ...p, project_id: e.target.value }))}><option value="">— no project —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn btn-primary" onClick={addAnchor}>Add anchor</button>
                    <button className="btn" onClick={() => setShowAnchorForm(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {Object.entries(anchorsByMonth).map(([month, monthAnchors]) => (
              <div key={month} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{month}</div>
                <div className="data-table">
                  <div className="data-table-head" style={{ gridTemplateColumns: '1fr 110px 110px 100px 110px 36px' }}>
                    <div className="data-table-th">Anchor text</div>
                    <div className="data-table-th">Target site</div>
                    <div className="data-table-th">Target URL</div>
                    <div className="data-table-th">Status</div>
                    <div className="data-table-th">Placement</div>
                    <div className="data-table-th"></div>
                  </div>
                  {monthAnchors.map(anchor => {
                    const ps = PLACEMENT_STATUS[anchor.placement_status] || PLACEMENT_STATUS.pending;
                    return (
                      <div key={anchor.id} className="data-table-row" style={{ gridTemplateColumns: '1fr 110px 110px 100px 110px 36px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace', color: 'var(--text-1)' }}>{anchor.text}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{anchor.target_site || '—'}</div>
                        <div>{anchor.target_url ? <a href={anchor.target_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--blue)' }}>Open ↗</a> : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}</div>
                        <div>
                          <select value={anchor.status} onChange={e => updateAnchor(anchor.id, { status: e.target.value })} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', fontFamily: 'var(--font)', cursor: 'pointer' }}>
                            <option value="pending">Pending</option>
                            <option value="inprogress">In progress</option>
                            <option value="used">Used</option>
                          </select>
                        </div>
                        <div>
                          <select value={anchor.placement_status || 'pending'} onChange={e => updateAnchor(anchor.id, { placement_status: e.target.value })} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: 'none', background: ps.bg, color: ps.color, fontFamily: 'var(--font)', cursor: 'pointer', fontWeight: 500 }}>
                            {Object.entries(PLACEMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </div>
                        <div><button className="btn btn-ghost btn-sm" onClick={() => deleteAnchor(anchor.id)} style={{ padding: '4px 6px', color: 'var(--text-3)' }}><i className="ti ti-x" style={{ fontSize: 12 }} /></button></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {filteredAnchors.length === 0 && <div className="empty-state"><i className="ti ti-list empty-icon" /><div className="empty-title">No anchors yet</div><div className="empty-sub">Add anchors to your monthly plan</div></div>}
          </div>
        )}

        {/* LINK INSERTER */}
        {activeTab === 'inserter' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="card">
                <div className="card-header"><span className="card-title">Input</span></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="field-group"><label className="field-label">Article text</label><textarea className="field-input field-textarea" value={articleText} onChange={e => setArticleText(e.target.value)} placeholder="Paste the full article text here..." style={{ minHeight: 180 }} /></div>
                  <div className="field-group"><label className="field-label">Anchor text</label><input className="field-input" value={anchorText} onChange={e => setAnchorText(e.target.value)} placeholder="digital asset management" /></div>
                  <div className="field-group"><label className="field-label">Target URL</label><input className="field-input" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="https://pics.io/..." /></div>
                  <div className="field-group">
                    <label className="field-label">Custom prompt (optional)</label>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <select className="field-select" value={selectedInsertPromptId} onChange={e => { setSelectedInsertPromptId(e.target.value); const p = savedPrompts.find(p => p.id === e.target.value); setInsertPrompt(p?.content || ''); }} style={{ flex: 1 }}>
                        <option value="">— no saved prompt —</option>
                        {savedPrompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button className="btn btn-sm" onClick={() => setShowInsertPromptManager(v => !v)}><i className="ti ti-settings" /></button>
                    </div>
                    <textarea className="field-input field-textarea" value={insertPrompt} onChange={e => setInsertPrompt(e.target.value)} placeholder="e.g. Place the link in the first paragraph..." style={{ minHeight: 50 }} />
                  </div>
                  <button className="btn btn-primary" onClick={handleInsert} disabled={inserting || !articleText.trim() || !anchorText.trim() || !targetUrl.trim()} style={{ justifyContent: 'center' }}>
                    {inserting ? <><span className="spinner" style={{ width: 14, height: 14 }} />Inserting...</> : <><i className="ti ti-link" />Insert link</>}
                  </button>
                </div>
              </div>
              {showInsertPromptManager && (
                <div className="card">
                  <div className="card-header"><span className="card-title">Saved prompts</span></div>
                  <div className="card-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                      <input className="field-input" value={newPromptName} onChange={e => setNewPromptName(e.target.value)} placeholder="Prompt name..." />
                      <textarea className="field-input field-textarea" value={newPromptContent} onChange={e => setNewPromptContent(e.target.value)} placeholder="Instructions..." style={{ minHeight: 60 }} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveInsertPrompt}>{editingPrompt ? 'Update' : 'Save'}</button>
                        {editingPrompt && <button className="btn btn-sm" onClick={() => { setEditingPrompt(null); setNewPromptName(''); setNewPromptContent(''); }}>Cancel</button>}
                      </div>
                    </div>
                    {savedPrompts.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, background: 'var(--bg-3)', marginBottom: 6 }}>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{p.name}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditingPrompt(p); setNewPromptName(p.name); setNewPromptContent(p.content); }}><i className="ti ti-pencil" style={{ fontSize: 12 }} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: '#E24B4A' }} onClick={() => handleDeleteInsertPrompt(p.id)}><i className="ti ti-trash" style={{ fontSize: 12 }} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="card" style={{ height: 'fit-content' }}>
              <div className="card-header">
                <span className="card-title">Result</span>
                {insertResult && <div style={{ marginLeft: 'auto' }}><CopyBtn text={insertResult} /></div>}
              </div>
              <div className="card-body">
                {!insertResult && !inserting && <div className="empty-state" style={{ padding: '32px 0' }}><i className="ti ti-link empty-icon" /><div className="empty-sub">Result will appear here</div></div>}
                {inserting && <div className="empty-state" style={{ padding: '32px 0' }}><span className="spinner" style={{ width: 20, height: 20 }} /></div>}
                {insertResult && <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 600, overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: insertResult }} />}
              </div>
            </div>
          </div>
        )}

        {/* LINK CHECKER */}
        {activeTab === 'checker' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--green)' }}>{filteredLinks.filter(l => l.status === 'alive').length}</strong> alive ·{' '}
                <strong style={{ color: '#E24B4A' }}>{filteredLinks.filter(l => l.status === 'dead').length}</strong> dead ·{' '}
                <strong style={{ color: 'var(--amber)' }}>{filteredLinks.filter(l => l.status === 'nofollow').length}</strong> nofollow
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" onClick={() => setShowLinkForm(v => !v)}><i className="ti ti-plus" /> Add link</button>
                <button className="btn btn-primary btn-sm" onClick={checkAllLinks} disabled={checking}>
                  {checking ? <><span className="spinner" style={{ width: 14, height: 14 }} />Checking...</> : <><i className="ti ti-radar" />Check all</>}
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--green)' }}>
              <i className="ti ti-circle-check" style={{ marginRight: 6 }} />
              Real HTTP check via Vercel function — verifies anchor text and target URL are actually present in the page. Accurate results, no false positives.
            </div>

            {showLinkForm && (
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-header"><span className="card-title">Add link to track</span></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="field-group"><label className="field-label">Page URL (where link is placed) *</label><input className="field-input" value={newLink.url} onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))} placeholder="https://bynder.com/article" /></div>
                    <div className="field-group"><label className="field-label">Anchor text</label><input className="field-input" value={newLink.anchor_text} onChange={e => setNewLink(p => ({ ...p, anchor_text: e.target.value }))} placeholder="digital asset management" /></div>
                    <div className="field-group"><label className="field-label">Our page (target URL)</label><input className="field-input" value={newLink.target_page} onChange={e => setNewLink(p => ({ ...p, target_page: e.target.value }))} placeholder="https://pics.io/..." /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={addLink}>Add link</button>
                    <button className="btn" onClick={() => setShowLinkForm(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div className="data-table">
              <div className="data-table-head" style={{ gridTemplateColumns: '1fr 140px 110px 140px 70px' }}>
                <div className="data-table-th">Page URL</div>
                <div className="data-table-th">Anchor</div>
                <div className="data-table-th">Status</div>
                <div className="data-table-th">Last checked</div>
                <div className="data-table-th"></div>
              </div>
              {filteredLinks.map(link => {
                const ls = LINK_STATUS[link.status] || LINK_STATUS.not_checked;
                const isChecking = checkingId === link.id;
                return (
                  <div key={link.id} className="data-table-row" style={{ gridTemplateColumns: '1fr 140px 110px 140px 70px' }}>
                    <div>
                      <a href={link.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{link.url}</a>
                      {link.target_page && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>→ {link.target_page}</div>}
                    </div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-2)' }}>{link.anchor_text || '—'}</div>
                    <div>
                      {isChecking ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-3)' }}>
                          <span className="spinner" style={{ width: 12, height: 12 }} />Checking...
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6, background: ls.bg, color: ls.color }}>
                          <i className={`ti ${ls.icon}`} style={{ fontSize: 11 }} />{ls.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {link.last_checked ? new Date(link.last_checked).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => checkLink(link)} style={{ padding: '4px 6px' }} disabled={isChecking}><i className="ti ti-refresh" style={{ fontSize: 12 }} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => deleteLink(link.id)} style={{ padding: '4px 6px', color: 'var(--text-3)' }}><i className="ti ti-x" style={{ fontSize: 12 }} /></button>
                    </div>
                  </div>
                );
              })}
              {filteredLinks.length === 0 && <div className="empty-state"><i className="ti ti-radar empty-icon" /><div className="empty-title">No links tracked</div><div className="empty-sub">Add links you've placed to monitor their status</div></div>}
            </div>
          </div>
        )}

        {/* STOP LIST */}
        {activeTab === 'stoplist' && (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="card">
                <div className="card-header"><span className="card-title">Add domains</span></div>
                <div className="card-body">
                  <div className="field-group" style={{ marginBottom: 10 }}>
                    <label className="field-label">Paste domains (one per line or from Ahrefs CSV)</label>
                    <textarea className="field-input field-textarea" value={stopInput} onChange={e => setStopInput(e.target.value)} placeholder="bynder.com&#10;martech.org&#10;..." style={{ minHeight: 150 }} />
                  </div>
                  <button className="btn btn-primary" onClick={addToStopList}><i className="ti ti-plus" /> Add to stop list</button>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><span className="card-title">Check a domain</span></div>
                <div className="card-body">
                  <input className="field-input" placeholder="Enter domain to check..." value={stopSearch} onChange={e => setStopSearch(e.target.value)} />
                  {stopSearch.trim() && (
                    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: isInStopList(stopSearch.trim()) ? '#FEF2F2' : 'var(--green-light)', border: '1px solid', borderColor: isInStopList(stopSearch.trim()) ? '#FECACA' : 'var(--green-border)' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: isInStopList(stopSearch.trim()) ? '#E24B4A' : 'var(--green)' }}>
                        <i className={`ti ${isInStopList(stopSearch.trim()) ? 'ti-circle-x' : 'ti-circle-check'}`} style={{ marginRight: 6 }} />
                        {isInStopList(stopSearch.trim()) ? `${stopSearch.trim()} is in stop list — skip this donor` : `${stopSearch.trim()} is NOT in stop list — safe to outreach`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Stop list ({stopList.length} domains)</span>
                  <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => navigator.clipboard.writeText(stopList.join('\n'))}>Export</button>
                </div>
                <div className="card-body">
                  <input className="field-input" placeholder="Filter domains..." value={stopSearch} onChange={e => setStopSearch(e.target.value)} style={{ marginBottom: 10 }} />
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {filteredStopList.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '24px 0' }}>{stopList.length === 0 ? 'No domains yet' : 'No results'}</div>}
                    {filteredStopList.map((domain, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bg-3)', fontSize: 13, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                        {domain}
                        <button className="btn btn-ghost btn-sm" onClick={() => setStopList(prev => prev.filter(d => d !== domain))} style={{ padding: '2px 6px', color: 'var(--text-3)' }}><i className="ti ti-x" style={{ fontSize: 11 }} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}