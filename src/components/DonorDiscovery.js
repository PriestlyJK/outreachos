import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';

const SPAM_WORDS = ['open to work', 'looking for job', 'seeking opportunities', 'available for hire'];

const STATUS_CONFIG = {
  new: { label: 'New', class: 's-new', dot: '#4F6EF7' },
  analyzed: { label: 'Analyzed', class: 's-analyzed', dot: '#C87F0A' },
  pitched: { label: 'Pitched', class: 's-pitched', dot: '#FF7A59' },
  replied: { label: 'Replied', class: 's-replied', dot: '#00A06E' },
  placed: { label: 'Placed ✓', class: 's-placed', dot: '#16A34A' },
};

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const cfg = STATUS_CONFIG[value] || STATUS_CONFIG.new;
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button className={`status-badge ${cfg.class}`} onClick={() => setOpen(v => !v)}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
        {cfg.label} <i className="ti ti-chevron-down" style={{ fontSize: 10 }} />
      </button>
      {open && (
        <div className="status-dropdown">
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <div key={k} className="status-dd-item" onClick={() => { onChange(k); setOpen(false); }}>
              <span className="status-dd-dot" style={{ background: v.dot }} />{v.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectAssignBtn({ donor, projects, onAssign }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const proj = projects.find(p => p.id === donor.project_id);
  if (proj) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: proj.color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: 'var(--text-2)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.name}</span>
    </div>
  );
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="proj-add-btn" onClick={() => setOpen(v => !v)}>
        <i className="ti ti-folder-plus" style={{ fontSize: 12 }} /> Add to project
      </button>
      {open && (
        <div className="status-dropdown" style={{ minWidth: 170 }}>
          {projects.map(p => (
            <div key={p.id} className="status-dd-item" onClick={() => { onAssign(donor.id, p.id); setOpen(false); }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />{p.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddToContactBaseModal({ donor, pitches, onAdd, onClose }) {
  const [channel, setChannel] = useState('email');
  const [selectedPitch, setSelectedPitch] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add to Contact Base</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Channel used</label>
            <select className="field-select" value={channel} onChange={e => setChannel(e.target.value)}>
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Notes</label>
            <textarea className="field-input field-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any context..." style={{ minHeight: 60 }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onAdd({ name: donor.name, url: donor.url, channel, notes, status: 'pitched', date: new Date().toISOString().slice(0, 10), followup_sent: false, reply_received: false, placed: false, project_id: donor.project_id })}>Add to base</button>
        </div>
      </div>
    </div>
  );
}

function CsvMappingModal({ headers, onConfirm, onClose }) {
  const [mapping, setMapping] = useState({ name: '', url: '', company: '', role: '', notes: '', dr: '' });
  const fields = [{ key: 'name', label: 'Name / Title' }, { key: 'url', label: 'URL or LinkedIn' }, { key: 'company', label: 'Company' }, { key: 'role', label: 'Role' }, { key: 'notes', label: 'Notes' }, { key: 'dr', label: 'DR' }];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Map CSV columns</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="modal-body">
          {fields.map(f => (
            <div key={f.key} className="field-group">
              <label className="field-label">{f.label}</label>
              <select className="field-select" value={mapping[f.key]} onChange={e => setMapping(p => ({ ...p, [f.key]: e.target.value }))}>
                <option value="">— skip —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(mapping)}>Import</button>
        </div>
      </div>
    </div>
  );
}

function AddManualModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: '', url: '', company: '', role: '', niche: '', notes: '', dr: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add contact manually</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field-group"><label className="field-label">Name *</label><input className="field-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sarah Johnson" autoFocus /></div>
            <div className="field-group"><label className="field-label">URL or LinkedIn *</label><input className="field-input" value={form.url} onChange={e => set('url', e.target.value)} placeholder="linkedin.com/in/... or site.com" /></div>
            <div className="field-group"><label className="field-label">Company</label><input className="field-input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Inc." /></div>
            <div className="field-group"><label className="field-label">Role</label><input className="field-input" value={form.role} onChange={e => set('role', e.target.value)} placeholder="Head of Content" /></div>
            <div className="field-group"><label className="field-label">Niche</label><input className="field-input" value={form.niche} onChange={e => set('niche', e.target.value)} placeholder="DAM, SaaS..." /></div>
            <div className="field-group"><label className="field-label">DR (if site)</label><input className="field-input" type="number" value={form.dr} onChange={e => set('dr', e.target.value)} placeholder="55" /></div>
          </div>
          <div className="field-group"><label className="field-label">Notes</label><textarea className="field-input field-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ minHeight: 60 }} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { if (form.name || form.url) onAdd(form); }}>Add contact</button>
        </div>
      </div>
    </div>
  );
}

async function exaSearch(query, exaKey, numResults = 15) {
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': exaKey },
    body: JSON.stringify({ query, type: 'auto', numResults, contents: { highlights: true } }),
  });
  return (await res.json()).results || [];
}

async function filterWithClaude(profiles, query, anthropicKey) {
  if (!profiles.length) return [];
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 300, messages: [{ role: 'user', content: `Filter LinkedIn profiles for "${query}". Keep only real professionals in this niche. Remove job seekers, spam, unrelated fields. Return ONLY JSON array of indices: [0,2,4]\n\nProfiles:\n${profiles.map((p, i) => `${i}: ${p.name} | ${p.desc}`).join('\n')}` }] }),
  });
  const text = (await res.json()).content?.[0]?.text || '[]';
  const match = text.match(/\[[\d,\s]*\]/);
  if (!match) return profiles;
  return profiles.filter((_, i) => JSON.parse(match[0]).includes(i));
}

export default function DonorDiscovery({ settings, currentProject, projects, donors, onDonorsChange, onOpenPitch, contacts, onContactsChange }) {
  const [activeTab, setActiveTab] = useState('all');
  const [query, setQuery] = useState('digital asset management SaaS');
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvMapping, setShowCsvMapping] = useState(false);
  const [csvData, setCsvData] = useState({ headers: [], rows: [] });
  const [addToBaseModal, setAddToBaseModal] = useState(null);
  const fileRef = useRef(null);

  const filtered = donors.filter(d => {
    if (activeTab === 'all') return true;
    if (activeTab === 'people') return d.is_linkedin;
    if (activeTab === 'sites') return !d.is_linkedin;
    if (activeTab === 'project') return d.project_id === currentProject?.id;
    return d.source === activeTab;
  });

  const saveDonor = async (donorData) => {
    const { data } = await supabase.from('donors').insert(donorData).select().single();
    if (data) onDonorsChange([data, ...donors]);
    return data;
  };

  const updateDonor = async (id, changes) => {
    await supabase.from('donors').update(changes).eq('id', id);
    onDonorsChange(donors.map(d => d.id === id ? { ...d, ...changes } : d));
  };

  const handleSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    try {
      if (activeTab === 'people' || activeTab === 'all') {
        let allFiltered = [];
        const existing = new Set(donors.map(d => d.url).filter(Boolean));
        for (let round = 0; round < 3 && allFiltered.length < 20; round++) {
          const roles = [
            [`${query} content manager OR editor site:linkedin.com/in`, `${query} SEO manager OR outreach specialist site:linkedin.com/in`, `${query} head of content OR marketing director site:linkedin.com/in`],
            [`${query} blogger OR writer site:linkedin.com/in`, `${query} digital marketing specialist site:linkedin.com/in`, `${query} partnerships manager site:linkedin.com/in`],
            [`${query} founder OR CEO site:linkedin.com/in`, `${query} VP marketing OR CMO site:linkedin.com/in`, `${query} content strategist site:linkedin.com/in`],
          ][round];
          setSearchStatus(`Round ${round + 1}: searching profiles...`);
          const raw = (await Promise.all(roles.map(q => exaSearch(q, settings.exaKey, 15)))).flat();
          const seen = new Set([...existing, ...allFiltered.map(d => d.url)]);
          const candidates = raw.filter(r => r.url?.includes('linkedin.com/in/') && !seen.has(r.url) && r.title?.length > 8 && !SPAM_WORDS.some(w => (r.highlights?.[0] || '').toLowerCase().includes(w))).map((r, i) => ({ name: r.title.replace(/ [-|].*LinkedIn.*/, '').trim(), url: r.url, notes: r.highlights?.[0]?.slice(0, 120) || '', is_linkedin: true, source: 'People', status: 'new', project_id: currentProject?.id || null, desc: r.highlights?.[0] || '' }));
          candidates.forEach(c => seen.add(c.url));
          if (!candidates.length) break;
          setSearchStatus(`Filtering ${candidates.length} profiles with AI...`);
          const good = await filterWithClaude(candidates, query, settings.anthropicKey);
          allFiltered = [...allFiltered, ...good];
          setSearchStatus(`Found ${allFiltered.length} relevant profiles...`);
        }
        if (allFiltered.length) {
          const toInsert = allFiltered.map(({ desc, ...d }) => d);
          const { data } = await supabase.from('donors').insert(toInsert).select();
          if (data) onDonorsChange([...data, ...donors]);
        } else alert('No relevant profiles found.');
      } else {
        setSearchStatus('Searching for donor sites...');
        const res = await exaSearch(`${query} blog "write for us" OR "guest post" OR "contribute"`, settings.exaKey, 20);
        const existing = new Set(donors.map(d => d.url));
        const toInsert = res.map(r => { let name; try { name = new URL(r.url).hostname.replace('www.', ''); } catch { name = r.url; } return { name, url: r.url, notes: r.title || '', is_linkedin: false, source: 'Exa', status: 'new', project_id: currentProject?.id || null }; }).filter(d => !existing.has(d.url));
        if (toInsert.length) {
          const { data } = await supabase.from('donors').insert(toInsert).select();
          if (data) onDonorsChange([...data, ...donors]);
        }
      }
    } catch (e) { console.error(e); alert('Search failed: ' + e.message); }
    setSearchStatus(''); setSearching(false);
  };

  const handleCsvFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const rows = lines.slice(1).map(l => l.split(',').map(c => c.replace(/"/g, '').trim()));
      setCsvData({ headers, rows }); setShowCsvMapping(true);
    };
    reader.readAsText(file); e.target.value = '';
  };

  const handleCsvConfirm = async (mapping) => {
    const { headers, rows } = csvData;
    const idx = (f) => mapping[f] ? headers.indexOf(mapping[f]) : -1;
    const toInsert = rows.map(row => {
      const url = idx('url') >= 0 ? row[idx('url')] : '';
      return { name: idx('name') >= 0 ? row[idx('name')] : url, url, company: idx('company') >= 0 ? row[idx('company')] : '', role: idx('role') >= 0 ? row[idx('role')] : '', notes: idx('notes') >= 0 ? row[idx('notes')] : '', dr: idx('dr') >= 0 ? row[idx('dr')] : '', is_linkedin: url.includes('linkedin.com'), source: 'CSV', status: 'new', project_id: currentProject?.id || null };
    }).filter(d => d.name || d.url);
    const { data } = await supabase.from('donors').insert(toInsert).select();
    if (data) onDonorsChange([...data, ...donors]);
    setShowCsvMapping(false);
  };

  const handleAddManual = async (form) => {
    await saveDonor({ ...form, is_linkedin: form.url?.includes('linkedin.com') || false, source: 'Manual', status: 'new', project_id: currentProject?.id || null });
    setShowAddModal(false);
  };

  const handleAddToContactBase = async (contactData) => {
    const { data } = await supabase.from('contacts').insert(contactData).select().single();
    if (data) onContactsChange([data, ...contacts]);
    setAddToBaseModal(null);
  };

  const getNextBtn = (donor) => {
    const s = donor.status;
    if (s === 'new' || s === 'analyzed') return <button className="next-btn nb-pitch" onClick={() => onOpenPitch({ donorUrl: donor.url, donorName: donor.name, donorRole: donor.role, donorCompany: donor.company || '', donorNotes: donor.notes || '', isLinkedIn: donor.is_linkedin, projectGoal: currentProject?.outreach_goal || '' })}>Generate pitch →</button>;
    if (s === 'pitched') return <div style={{ display: 'flex', gap: 6 }}><button className="next-btn nb-track" onClick={() => updateDonor(donor.id, { status: 'replied' })}>Mark replied</button><button className="next-btn nb-base" style={{ fontSize: 11, padding: '5px 8px' }} onClick={() => setAddToBaseModal(donor)}><i className="ti ti-database" /></button></div>;
    if (s === 'replied') return <button className="next-btn nb-done" onClick={() => updateDonor(donor.id, { status: 'placed' })}>Mark placed →</button>;
    if (s === 'placed') return <button className="next-btn nb-base" style={{ fontSize: 11 }} onClick={() => setAddToBaseModal(donor)}><i className="ti ti-database" /> Save to base</button>;
    return null;
  };

  const tabs = [
    { id: 'all', label: `All (${donors.length})` },
    { id: 'people', label: 'People' },
    { id: 'sites', label: 'Sites' },
    { id: 'csv', label: 'CSV' },
    ...(currentProject ? [{ id: 'project', label: `In project (${donors.filter(d => d.project_id === currentProject.id).length})` }] : []),
  ];

  return (
    <>
      <div className="topbar">
        <div className="topbar-info">
          <div className="topbar-title">Donor Discovery</div>
          <div className="topbar-sub">{donors.length} contacts · {donors.filter(d => d.status === 'placed').length} placed</div>
        </div>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvFile} />
        <button className="btn btn-sm" onClick={() => fileRef.current.click()}><i className="ti ti-upload" /> Upload CSV</button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}><i className="ti ti-plus" /> Add manually</button>
      </div>

      <div className="scroll-body">
        <div className="search-card">
          <div className="field-label" style={{ marginBottom: 8 }}>Find contacts</div>
          <div className="search-row">
            <input className="search-input" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="e.g. digital asset management SaaS..." />
            <button className="btn btn-primary" onClick={handleSearch} disabled={searching}>
              {searching && <span className="spinner" style={{ width: 14, height: 14 }} />}
              {searching ? 'Searching...' : activeTab === 'people' ? 'Find people' : 'Search via Exa'}
            </button>
          </div>
          {searching && searchStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--orange)' }}>
              <span className="spinner" style={{ width: 12, height: 12, borderTopColor: 'var(--orange)' }} />{searchStatus}
            </div>
          )}
          <div className="tab-row" style={{ marginBottom: 0, marginTop: 10 }}>
            {tabs.map(t => <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>)}
          </div>
        </div>

        <div className="data-table">
          <div className="data-table-head" style={{ gridTemplateColumns: '1fr 120px 110px 170px' }}>
            <div className="data-table-th">Contact</div>
            <div className="data-table-th">Status</div>
            <div className="data-table-th">Project</div>
            <div className="data-table-th">Next step</div>
          </div>
          {filtered.map(donor => (
            <div key={donor.id} className="data-table-row" style={{ gridTemplateColumns: '1fr 120px 110px 170px' }}>
              <div>
                <div className="contact-name">
                  {donor.is_linkedin && <span className="linkedin-badge">in</span>}
                  {donor.is_linkedin ? <a href={donor.url} target="_blank" rel="noreferrer">{donor.name}</a> : donor.name}
                  {donor.dr && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--green-light)', color: 'var(--green)', fontWeight: 500 }}>DR {donor.dr}</span>}
                </div>
                <div className="contact-desc">{[donor.role, donor.company, donor.niche].filter(Boolean).join(' · ') || donor.notes?.slice(0, 80) || donor.url}</div>
              </div>
              <div><StatusDropdown value={donor.status} onChange={s => updateDonor(donor.id, { status: s })} /></div>
              <div><ProjectAssignBtn donor={donor} projects={projects} onAssign={(id, pid) => updateDonor(id, { project_id: pid })} /></div>
              <div>{getNextBtn(donor)}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">
              <i className="ti ti-users empty-icon" />
              <div className="empty-title">No contacts yet</div>
              <div className="empty-sub">Search via Exa, upload CSV, or add manually</div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && <AddManualModal onAdd={handleAddManual} onClose={() => setShowAddModal(false)} />}
      {showCsvMapping && <CsvMappingModal headers={csvData.headers} onConfirm={handleCsvConfirm} onClose={() => setShowCsvMapping(false)} />}
      {addToBaseModal && <AddToContactBaseModal donor={addToBaseModal} onAdd={handleAddToContactBase} onClose={() => setAddToBaseModal(null)} />}
    </>
  );
}