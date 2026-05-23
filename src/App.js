import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import DonorDiscovery from './components/DonorDiscovery';
import LinkIntel from './components/LinkIntel';
import PitchStudio from './components/PitchStudio';
import ContactBase from './components/ContactBase';
import AnchorLinks from './components/AnchorLinks';
import './App.css';

const PROJECT_COLORS = ['#FF7A59','#4F6EF7','#00A06E','#8B5CF6','#C87F0A','#E24B4A','#0891B2'];

const DEFAULT_SETTINGS = {
  aiProvider: 'claude',
  anthropicKey: process.env.REACT_APP_ANTHROPIC_API_KEY || '',
  geminiKey: '',
  exaKey: process.env.REACT_APP_EXA_API_KEY || '',
  outreachMode: 'both',
  tone: 'friendly',
  ourProduct: 'Pics.io — a digital asset management (DAM) platform built for creative teams.',
};

function ProjectModal({ project, onSave, onClose }) {
  const [name, setName] = useState(project?.name || '');
  const [color, setColor] = useState(project?.color || PROJECT_COLORS[0]);
  const [description, setDescription] = useState(project?.description || '');
  const [goalLabel, setGoalLabel] = useState(project?.goal_label || 'links');
  const [goalTarget, setGoalTarget] = useState(project?.goal_target || 10);
  const [deadline, setDeadline] = useState(project?.deadline || '');
  const [outreachGoal, setOutreachGoal] = useState(project?.outreach_goal || '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{project ? 'Edit project' : 'New project'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Project name</label>
            <input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Link building — Pics.io" autoFocus />
          </div>
          <div className="field-group">
            <label className="field-label">Color</label>
            <div className="color-picker">
              {PROJECT_COLORS.map(c => <div key={c} className={`color-swatch ${color === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />)}
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">Description (optional)</label>
            <input className="field-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" />
          </div>
          <div className="field-group">
            <label className="field-label">Outreach goal</label>
            <textarea className="field-input field-textarea" value={outreachGoal} onChange={e => setOutreachGoal(e.target.value)} placeholder="What do you want to achieve?" style={{ minHeight: 70 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="field-group">
              <label className="field-label">Goal metric</label>
              <input className="field-input" value={goalLabel} onChange={e => setGoalLabel(e.target.value)} placeholder="links, replies..." />
            </div>
            <div className="field-group">
              <label className="field-label">Target</label>
              <input className="field-input" type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Deadline</label>
              <input className="field-input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            if (name.trim()) onSave({ name: name.trim(), color, description, goal_label: goalLabel, goal_target: parseInt(goalTarget) || 10, goal_current: project?.goal_current || 0, deadline: deadline || null, outreach_goal: outreachGoal });
          }}>{project ? 'Save changes' : 'Create project'}</button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ settings, onSave, onClose }) {
  const [s, setS] = useState({ ...settings });
  const set = (k, v) => setS(p => ({ ...p, [k]: v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Settings</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">AI Provider</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ id: 'claude', label: 'Claude (Anthropic)', model: 'claude-sonnet-4-5' }, { id: 'gemini', label: 'Gemini (Google)', model: 'gemini-pro' }].map(p => (
                <div key={p.id} onClick={() => set('aiProvider', p.id)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid', borderColor: s.aiProvider === p.id ? 'var(--orange)' : 'var(--border)', background: s.aiProvider === p.id ? 'var(--orange-light)' : 'var(--bg)', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: s.aiProvider === p.id ? 'var(--orange)' : 'var(--text-1)', marginBottom: 2 }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.model}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field-group"><label className="field-label">Anthropic API Key</label><input className="field-input" type="password" value={s.anthropicKey} onChange={e => set('anthropicKey', e.target.value)} /></div>
            <div className="field-group"><label className="field-label">Exa API Key</label><input className="field-input" type="password" value={s.exaKey} onChange={e => set('exaKey', e.target.value)} /></div>
          </div>
          <div className="field-group"><label className="field-label">Gemini API Key (optional)</label><input className="field-input" type="password" value={s.geminiKey} onChange={e => set('geminiKey', e.target.value)} placeholder="AIza..." /></div>
          <div className="divider" />
          <div className="field-group"><label className="field-label">Our product / context</label><textarea className="field-input field-textarea" value={s.ourProduct} onChange={e => set('ourProduct', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field-group"><label className="field-label">Default outreach mode</label><select className="field-select" value={s.outreachMode} onChange={e => set('outreachMode', e.target.value)}><option value="both">Both (auto-select)</option><option value="partnership">Partnership</option><option value="discovery">Customer discovery</option></select></div>
            <div className="field-group"><label className="field-label">Default tone</label><select className="field-select" value={s.tone} onChange={e => set('tone', e.target.value)}><option value="friendly">Friendly / casual</option><option value="professional">Professional</option><option value="neutral">Neutral / direct</option></select></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(s)}>Save settings</button>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ onNewProject, onViewProjects }) {
  return (
    <div className="home-screen">
      <div className="home-nav"><div className="home-logo">Outreach<em>OS</em></div></div>
      <div className="home-body">
        <button className="home-card" onClick={onNewProject}>
          <div className="home-card-icon hci-orange"><i className="ti ti-folder-plus" /></div>
          <div className="home-card-title">Create new project</div>
          <div className="home-card-sub">Set up a new outreach campaign with its own goal, contacts, and pitches</div>
          <div className="home-card-btn hcb-orange">+ New project</div>
        </button>
        <button className="home-card" onClick={onViewProjects}>
          <div className="home-card-icon hci-blue"><i className="ti ti-layout-grid" /></div>
          <div className="home-card-title">Open existing project</div>
          <div className="home-card-sub">Continue working on an active campaign or review completed ones</div>
          <div className="home-card-btn hcb-blue">View all projects →</div>
        </button>
      </div>
    </div>
  );
}

function ProjectsScreen({ projects, loading, onOpen, onNew, onEdit, onDelete, onHome }) {
  return (
    <div className="projects-screen">
      <div className="projects-topbar">
        <button className="projects-back" onClick={onHome}><i className="ti ti-home" /> Home</button>
        <span className="projects-breadcrumb">›</span>
        <span className="projects-title">All projects</span>
        <div className="projects-spacer" />
        <button className="btn btn-primary" onClick={onNew}><i className="ti ti-plus" /> New project</button>
      </div>
      <div className="projects-body">
        {loading ? (
          <div className="empty-state"><span className="spinner" style={{ width: 24, height: 24 }} /><div className="empty-title">Loading...</div></div>
        ) : (
          <div className="projects-grid">
            {projects.map(p => {
              const pct = Math.round(((p.goal_current || 0) / (p.goal_target || 1)) * 100);
              return (
                <div key={p.id} className="proj-card" onClick={() => onOpen(p)}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: p.color }} />
                  <div className="proj-card-actions" onClick={e => e.stopPropagation()}>
                    <div className="proj-card-action" onClick={() => onEdit(p)}><i className="ti ti-pencil" /></div>
                    <div className="proj-card-action delete" onClick={() => onDelete(p.id)}><i className="ti ti-trash" /></div>
                  </div>
                  <div className="proj-card-name">{p.name}</div>
                  <div className="proj-card-desc">{p.description}</div>
                  <div className="proj-card-meta">
                    <span className="proj-pill" style={{ background: p.color + '20', color: p.color }}>{p.goal_current || 0} / {p.goal_target} {p.goal_label}</span>
                    <div className="proj-card-progress">
                      <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%`, background: p.color }} /></div>
                      <div className="proj-progress-text">{pct}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="proj-card proj-card-new" onClick={onNew}><i className="ti ti-plus" /><span>New project</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

function MainApp({ projects, currentProject, settings, donors, contacts, onDonorsChange, onContactsChange, onChangeProject, onHome, onNewProject, onEditProject, onShowSettings }) {
  const [activeModule, setActiveModule] = useState('discovery');
  const [showProjDropdown, setShowProjDropdown] = useState(false);

  // ── LIFTED STATE — persists across tab switches ──
  const [pitchData, setPitchData] = useState(null);
  const [linkIntelData, setLinkIntelData] = useState({ url: '', outreachGoal: '', dossier: null });

  const dropdownRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowProjDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // When project changes, update outreach goal in linkIntel
  useEffect(() => {
    if (currentProject?.outreach_goal) {
      setLinkIntelData(prev => ({ ...prev, outreachGoal: prev.outreachGoal || currentProject.outreach_goal }));
    }
  }, [currentProject?.id]); // eslint-disable-line

  const pct = currentProject ? Math.round(((currentProject.goal_current || 0) / (currentProject.goal_target || 1)) * 100) : 0;

  const modules = [
    { id: 'discovery', label: 'Donor Discovery', icon: 'ti-users', color: '#FF7A59' },
    { id: 'linkintel', label: 'LinkIntel', icon: 'ti-analyze', color: '#4F6EF7' },
    { id: 'pitch', label: 'Pitch Studio', icon: 'ti-mail', color: '#00A06E' },
    { id: 'base', label: 'Contact Base', icon: 'ti-database', color: '#C87F0A' },
    { id: 'anchor', label: 'Anchor & Links', icon: 'ti-link', color: '#8B5CF6' },
  ];

  const handleOpenPitch = useCallback((data) => {
    setPitchData(data);
    setActiveModule('pitch');
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sb-logo">Outreach<em>OS</em></div>
        <div className="sb-inner">
          <button className="sb-home-btn" onClick={onHome}><i className="ti ti-home" />Home</button>
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <div className="proj-switcher" onClick={() => setShowProjDropdown(v => !v)}>
              <div className="proj-color-dot" style={{ background: currentProject?.color || '#ccc' }} />
              <span className="proj-switcher-name">{currentProject?.name || 'No project'}</span>
              <i className={`ti ${showProjDropdown ? 'ti-chevron-up' : 'ti-chevron-down'} proj-switcher-chevron`} />
            </div>
            {showProjDropdown && (
              <div className="proj-dropdown">
                {projects.map(p => (
                  <div key={p.id} className={`proj-dd-item ${currentProject?.id === p.id ? 'current' : ''}`} onClick={() => { onChangeProject(p); setShowProjDropdown(false); }}>
                    <div className="proj-color-dot" style={{ background: p.color }} />{p.name}
                  </div>
                ))}
                <div className="proj-dd-divider" />
                <div className="proj-dd-item proj-dd-new" onClick={() => { onNewProject(); setShowProjDropdown(false); }}>
                  <i className="ti ti-plus" style={{ fontSize: 13 }} /> New project
                </div>
              </div>
            )}
          </div>
          <div className="sb-section">Modules</div>
          {modules.map(m => (
            <button key={m.id} className={`nav-item ${activeModule === m.id ? 'active' : ''}`} onClick={() => setActiveModule(m.id)}>
              <i className={`ti ${m.icon}`} style={{ color: activeModule === m.id ? 'var(--orange)' : m.color }} />
              {m.label}
            </button>
          ))}
        </div>
        <div className="sb-bottom">
          <div className="model-pill" onClick={onShowSettings}>
            <div className="model-dot" />
            <div className="model-info">
              <span className="model-label">AI Model · Settings</span>
              <span className="model-name">{settings.aiProvider === 'claude' ? 'Claude Sonnet' : 'Gemini Pro'}</span>
            </div>
            <i className="ti ti-settings" style={{ fontSize: 14, color: 'var(--text-3)' }} />
          </div>
        </div>
      </aside>

      <div className="main-content">
        {currentProject && (
          <div className="proj-context-bar" style={{ background: currentProject.color + '12', borderColor: currentProject.color + '40' }}>
            <div className="pcb-dot" style={{ background: currentProject.color }} />
            <span className="pcb-name" style={{ color: currentProject.color }}>{currentProject.name}</span>
            {currentProject.description && <span className="pcb-desc">· {currentProject.description}</span>}
            {currentProject.deadline && <span className="pcb-desc">· Deadline {new Date(currentProject.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
            <div className="pcb-spacer" />
            <div className="pcb-progress">
              <div className="pcb-bar"><div className="pcb-fill" style={{ width: `${pct}%`, background: currentProject.color }} /></div>
              <span className="pcb-text" style={{ color: currentProject.color }}>{currentProject.goal_current || 0} / {currentProject.goal_target} {currentProject.goal_label}</span>
            </div>
            <button className="pcb-edit" onClick={() => onEditProject(currentProject)}><i className="ti ti-pencil" style={{ fontSize: 12 }} />Edit</button>
          </div>
        )}

        {/* All modules rendered always, hidden when not active — preserves state */}
        <div style={{ display: activeModule === 'discovery' ? 'contents' : 'none' }}>
          <DonorDiscovery settings={settings} currentProject={currentProject} projects={projects} donors={donors} onDonorsChange={onDonorsChange} onOpenPitch={handleOpenPitch} contacts={contacts} onContactsChange={onContactsChange} />
        </div>
        <div style={{ display: activeModule === 'linkintel' ? 'contents' : 'none' }}>
          <LinkIntel settings={settings} currentProject={currentProject} onOpenPitch={handleOpenPitch} linkIntelData={linkIntelData} onLinkIntelDataChange={setLinkIntelData} />
        </div>
        <div style={{ display: activeModule === 'pitch' ? 'contents' : 'none' }}>
          <PitchStudio settings={settings} currentProject={currentProject} pitchData={pitchData} onPitchDataChange={setPitchData} contacts={contacts} onContactsChange={onContactsChange} />
        </div>
        <div style={{ display: activeModule === 'base' ? 'contents' : 'none' }}>
          <ContactBase settings={settings} currentProject={currentProject} projects={projects} contacts={contacts} onContactsChange={onContactsChange} />
        </div>
        <div style={{ display: activeModule === 'anchor' ? 'contents' : 'none' }}>
          <AnchorLinks settings={settings} currentProject={currentProject} projects={projects} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [donors, setDonors] = useState([]);
  const [contacts, setContacts] = useState([]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (data) setProjects(data);
    setLoading(false);
  }, []);

  const loadDonors = useCallback(async () => {
    const { data } = await supabase.from('donors').select('*').order('created_at', { ascending: false });
    if (data) setDonors(data);
  }, []);

  const loadContacts = useCallback(async () => {
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    if (data) setContacts(data);
  }, []);

  useEffect(() => { loadProjects(); loadDonors(); loadContacts(); }, [loadProjects, loadDonors, loadContacts]);

  useEffect(() => {
    const ps = supabase.channel('projects-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, loadProjects).subscribe();
    const ds = supabase.channel('donors-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'donors' }, loadDonors).subscribe();
    const cs = supabase.channel('contacts-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, loadContacts).subscribe();
    return () => { ps.unsubscribe(); ds.unsubscribe(); cs.unsubscribe(); };
  }, [loadProjects, loadDonors, loadContacts]);

  const handleSaveProject = async (data) => {
    if (editingProject) {
      const { data: updated } = await supabase.from('projects').update(data).eq('id', editingProject.id).select().single();
      if (updated) { setProjects(prev => prev.map(p => p.id === editingProject.id ? updated : p)); if (currentProject?.id === editingProject.id) setCurrentProject(updated); }
    } else {
      const { data: created } = await supabase.from('projects').insert(data).select().single();
      if (created) { setProjects(prev => [created, ...prev]); setCurrentProject(created); setScreen('app'); }
    }
    setShowProjectModal(false); setEditingProject(null);
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm('Delete this project?')) {
      await supabase.from('projects').delete().eq('id', id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProject?.id === id) { setCurrentProject(null); setScreen('projects'); }
    }
  };

  return (
    <>
      {screen === 'home' && <HomeScreen onNewProject={() => { setShowProjectModal(true); setEditingProject(null); }} onViewProjects={() => { loadProjects(); setScreen('projects'); }} />}
      {screen === 'projects' && <ProjectsScreen projects={projects} loading={loading} onOpen={(p) => { setCurrentProject(p); setScreen('app'); }} onNew={() => { setEditingProject(null); setShowProjectModal(true); }} onEdit={(p) => { setEditingProject(p); setShowProjectModal(true); }} onDelete={handleDeleteProject} onHome={() => setScreen('home')} />}
      {screen === 'app' && (
        <MainApp
          projects={projects} currentProject={currentProject} settings={settings}
          donors={donors} contacts={contacts}
          onDonorsChange={setDonors} onContactsChange={setContacts}
          onChangeProject={(p) => setCurrentProject(p)}
          onHome={() => setScreen('home')}
          onNewProject={() => { setEditingProject(null); setShowProjectModal(true); }}
          onEditProject={(p) => { setEditingProject(p); setShowProjectModal(true); }}
          onShowSettings={() => setShowSettings(true)}
        />
      )}
      {showProjectModal && <ProjectModal project={editingProject} onSave={handleSaveProject} onClose={() => { setShowProjectModal(false); setEditingProject(null); }} />}
      {showSettings && <SettingsModal settings={settings} onSave={(s) => { setSettings(s); setShowSettings(false); }} onClose={() => setShowSettings(false)} />}
    </>
  );
}