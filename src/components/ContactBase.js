import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';

const STATUS_CONFIG = {
  new: { label: 'New', dot: '#4F6EF7', bg: 'var(--blue-light)', color: 'var(--blue)' },
  pitched: { label: 'Pitched', dot: '#FF7A59', bg: 'var(--orange-light)', color: 'var(--orange)' },
  replied: { label: 'Replied', dot: '#00A06E', bg: 'var(--green-light)', color: 'var(--green)' },
  placed: { label: 'Placed ✓', dot: '#16A34A', bg: '#F0FDF4', color: '#16A34A' },
  no_response: { label: 'No response', dot: '#94A3B8', bg: 'var(--bg-3)', color: 'var(--text-3)' },
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
      <button onClick={() => setOpen(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 6, border: 'none', background: cfg.bg, color: cfg.color, cursor: 'pointer', fontFamily: 'var(--font)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />{cfg.label}<i className="ti ti-chevron-down" style={{ fontSize: 9 }} />
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

function Checkbox({ checked, onChange }) {
  return (
    <div className={`checkbox ${checked ? 'checked' : ''}`} onClick={() => onChange(!checked)}>
      {checked && <i className="ti ti-check" />}
    </div>
  );
}

function AddContactModal({ projects, onAdd, onClose }) {
  const [form, setForm] = useState({ name: '', url: '', channel: 'email', status: 'pitched', project_id: '', pitch_used: '', notes: '', followup_sent: false, reply_received: false, placed: false, date: new Date().toISOString().slice(0, 10) });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add to Contact Base</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field-group"><label className="field-label">Name *</label><input className="field-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sarah Johnson or bynder.com" autoFocus /></div>
            <div className="field-group"><label className="field-label">URL</label><input className="field-input" value={form.url} onChange={e => set('url', e.target.value)} placeholder="linkedin.com/in/... or site.com" /></div>
            <div className="field-group"><label className="field-label">Channel</label><select className="field-select" value={form.channel} onChange={e => set('channel', e.target.value)}><option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="both">Both</option></select></div>
            <div className="field-group"><label className="field-label">Status</label><select className="field-select" value={form.status} onChange={e => set('status', e.target.value)}>{Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            <div className="field-group"><label className="field-label">Project</label><select className="field-select" value={form.project_id} onChange={e => set('project_id', e.target.value)}><option value="">— no project —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="field-group"><label className="field-label">Date contacted</label><input className="field-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
          </div>
          <div className="field-group"><label className="field-label">Pitch used</label><textarea className="field-input field-textarea" value={form.pitch_used} onChange={e => set('pitch_used', e.target.value)} placeholder="Paste the message you sent..." style={{ minHeight: 80 }} /></div>
          <div className="field-group"><label className="field-label">Notes</label><textarea className="field-input field-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ minHeight: 50 }} /></div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['followup_sent', 'Follow-up sent'], ['reply_received', 'Reply received'], ['placed', 'Placed']].map(([k, label]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <Checkbox checked={form[k]} onChange={v => set(k, v)} />{label}
              </label>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { if (form.name) onAdd({ ...form, project_id: form.project_id || null }); }}>Add contact</button>
        </div>
      </div>
    </div>
  );
}

export default function ContactBase({ settings, currentProject, projects, contacts, onContactsChange }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewPitch, setViewPitch] = useState(null);
  const [filterProject, setFilterProject] = useState('all');

  const filtered = contacts.filter(c => filterProject === 'all' || String(c.project_id) === String(filterProject));

  const updateContact = async (id, changes) => {
    await supabase.from('contacts').update(changes).eq('id', id);
    onContactsChange(contacts.map(c => c.id === id ? { ...c, ...changes } : c));
  };

  const handleAdd = async (contactData) => {
    const { data } = await supabase.from('contacts').insert(contactData).select().single();
    if (data) onContactsChange([data, ...contacts]);
    setShowAddModal(false);
  };

  const stats = {
    total: contacts.length,
    pitched: contacts.filter(c => ['pitched', 'replied', 'placed'].includes(c.status)).length,
    replied: contacts.filter(c => ['replied', 'placed'].includes(c.status)).length,
    placed: contacts.filter(c => c.status === 'placed').length,
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-info">
          <div className="topbar-title">Contact Base</div>
          <div className="topbar-sub">{stats.total} contacts · {stats.replied} replied · {stats.placed} placed</div>
        </div>
        <select className="field-select" style={{ width: 180, padding: '7px 10px', fontSize: 12 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}><i className="ti ti-plus" /> Add contact</button>
      </div>

      <div className="scroll-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[{ label: 'Total', value: stats.total, color: 'var(--text-1)' }, { label: 'Pitched', value: stats.pitched, color: 'var(--orange)' }, { label: 'Replied', value: stats.replied, color: 'var(--green)' }, { label: 'Placed', value: stats.placed, color: '#16A34A' }].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="data-table">
          <div className="data-table-head" style={{ gridTemplateColumns: '1fr 110px 80px 90px 90px 80px 80px' }}>
            <div className="data-table-th">Contact</div>
            <div className="data-table-th">Status</div>
            <div className="data-table-th">Channel</div>
            <div className="data-table-th">Followup</div>
            <div className="data-table-th">Reply</div>
            <div className="data-table-th">Placed</div>
            <div className="data-table-th">Pitch</div>
          </div>
          {filtered.map(c => {
            const proj = projects.find(p => p.id === c.project_id);
            return (
              <div key={c.id} className="data-table-row" style={{ gridTemplateColumns: '1fr 110px 80px 90px 90px 80px 80px' }}>
                <div>
                  <div className="contact-name">
                    {c.url?.includes('linkedin') && <span className="linkedin-badge">in</span>}
                    {c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.name}</a> : c.name}
                  </div>
                  <div className="contact-desc">
                    {c.date && new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {proj && <span style={{ marginLeft: 6 }}>· <span style={{ color: proj.color, fontWeight: 500 }}>{proj.name}</span></span>}
                    {c.notes && <span style={{ marginLeft: 6 }}>· {c.notes.slice(0, 40)}</span>}
                  </div>
                </div>
                <div><StatusDropdown value={c.status} onChange={s => updateContact(c.id, { status: s })} /></div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', textTransform: 'capitalize' }}>{c.channel}</div>
                <div><Checkbox checked={c.followup_sent} onChange={v => updateContact(c.id, { followup_sent: v })} /></div>
                <div><Checkbox checked={c.reply_received} onChange={v => updateContact(c.id, { reply_received: v })} /></div>
                <div><Checkbox checked={c.placed} onChange={v => updateContact(c.id, { placed: v, status: v ? 'placed' : c.status })} /></div>
                <div>
                  {c.pitch_used ? <button className="btn btn-ghost btn-sm" onClick={() => setViewPitch(c)} style={{ padding: '4px 8px', fontSize: 11 }}><i className="ti ti-eye" style={{ fontSize: 13 }} /></button> : <span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span>}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="empty-state"><i className="ti ti-database empty-icon" /><div className="empty-title">No contacts yet</div><div className="empty-sub">Add contacts manually or from Pitch Studio</div></div>}
        </div>
      </div>

      {showAddModal && <AddContactModal projects={projects} onAdd={handleAdd} onClose={() => setShowAddModal(false)} />}
      {viewPitch && (
        <div className="modal-overlay" onClick={() => setViewPitch(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Pitch — {viewPitch.name}</span><button className="btn btn-ghost btn-sm" onClick={() => setViewPitch(null)}><i className="ti ti-x" /></button></div>
            <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: 16, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}>{viewPitch.pitch_used || 'No pitch saved.'}</div>
            <div className="modal-footer"><button className="btn" onClick={() => setViewPitch(null)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}