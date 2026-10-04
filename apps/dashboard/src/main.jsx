import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileCheck2,
  GitBranch,
  LayoutDashboard,
  Megaphone,
  Menu,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
import './styles.css';

const navigation = [
  ['Approvals', ClipboardCheck],
  ['Work board', LayoutDashboard],
  ['Agents', Users],
  ['Activity', Activity],
];

const agentIcons = {
  'Marketing Agent': Megaphone,
  'Sales Agent': ShoppingCart,
  'Brand Agent': ShieldCheck,
  'Business Manager': UserRoundCheck,
};

const statusTone = {
  'Agent working': 'working',
  'Brand review': 'review',
  'Founder approval': 'approval',
  'Approved execution': 'ready',
  'Blocked external': 'blocked',
};

function Status({ children }) {
  return <span className={`status status--${statusTone[children] || 'neutral'}`}><span />{children}</span>;
}

function Sidebar({ open, onClose }) {
  return <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
    <div className="brand"><span>Pen Pad Golf</span><FlagMark /></div>
    <nav aria-label="Dashboard navigation">
      {navigation.map(([label, Icon], index) => <button className={index === 0 ? 'active' : ''} key={label} onClick={onClose}>
        <Icon aria-hidden="true"/><span>{label}</span>
      </button>)}
    </nav>
    <div className="sidebar-art" aria-hidden="true"><span/><i/><b/></div>
  </aside>;
}

function FlagMark() {
  return <svg viewBox="0 0 38 52" role="img" aria-label="Pen Pad Golf flag"><path d="M12 45V6m1 3h18l-6 7 6 7H13M5 46h15"/></svg>;
}

function WorkRow({ item, active, onSelect }) {
  const Icon = agentIcons[item.agent] || Bot;
  return <button className={`work-row ${active ? 'work-row--active' : ''}`} onClick={onSelect} aria-pressed={active}>
    <span className="work-identity"><FileCheck2 aria-hidden="true"/><span><strong>{item.id}</strong><span>{item.title}</span></span></span>
    <span className="work-agent"><Icon aria-hidden="true"/>{item.agent.replace(' Agent', '')}</span>
    <Status>{item.status}</Status>
    <span className="work-updated">{item.updated}</span>
    <ChevronRight className="row-chevron" aria-hidden="true"/>
  </button>;
}

function EvidenceList({ evidence }) {
  return <div className="evidence-list">
    {evidence.map((entry, index) => <div className="evidence-row" key={entry}>
      <span className="evidence-icon">{index === 0 ? <PackageCheck/> : <FileCheck2/>}</span>
      <span><strong>{entry.split('/').at(-1)}</strong><small>{entry}</small></span>
      <ChevronRight aria-hidden="true"/>
    </div>)}
  </div>;
}

function Detail({ item, onBack, onDecision }) {
  const AgentIcon = agentIcons[item.agent] || Bot;
  return <aside className="detail" aria-label={`${item.id} approval details`}>
    <button className="detail-back" onClick={onBack}><ArrowLeft/>Approvals</button>
    <div className="detail-heading">
      <div><span className="detail-id">{item.id}</span><h2>{item.title}</h2></div>
      <Status>{item.status}</Status>
    </div>

    <section>
      <h3>Decision requested</h3>
      <p>{item.decision}</p>
      <div className="decision-actions">
        <button className="approve" onClick={() => onDecision('Approved')}><Check/>Approve</button>
        <button className="changes" onClick={() => onDecision('Changes requested')}>Request changes</button>
        <button className="decline" onClick={() => onDecision('Declined')}><X/>Decline</button>
      </div>
    </section>

    <dl className="metadata">
      <div><dt>Owner</dt><dd><AgentIcon/>{item.agent}</dd></div>
      <div><dt>Commit reference</dt><dd><GitBranch/>{item.commit}</dd></div>
      <div><dt>Brand review</dt><dd><ShieldCheck/>{item.brandReview}</dd></div>
    </dl>

    <section><h3>Evidence</h3><EvidenceList evidence={item.evidence}/></section>
    <section><h3>Checks</h3><div className="check-list">
      {item.checks.map(([label, complete]) => <div key={label}><span className={complete ? 'check complete' : 'check'}>{complete ? <Check/> : null}</span><span>{label}</span><small>{complete ? 'Complete' : 'Required'}</small></div>)}
    </div></section>
    <section><h3>Activity</h3><div className="timeline">
      {item.activity.map(([actor, action, when]) => <div key={`${actor}-${action}`}><span/><p><small>{when}</small><strong>{actor}</strong>{action}</p></div>)}
    </div></section>
    <p className="approval-scope">Approval authorizes the exact commit and evidence shown here only.</p>
  </aside>;
}

function App() {
  const [data, setData] = useState({ source: 'loading', items: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.BASE_URL}data/work-items.json`).then(response => response.json()).then(next => {
      if (!active) return;
      setData(next);
      setSelectedId(next.items[1]?.id || next.items[0]?.id || null);
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.items.filter(item => (status === 'All statuses' || item.status === status) && (!needle || `${item.id} ${item.title} ${item.agent}`.toLowerCase().includes(needle)));
  }, [data.items, query, status]);

  const selected = data.items.find(item => item.id === selectedId) || filtered[0];
  const decide = decision => {
    if (selected?.issueUrl) {
      window.open(selected.issueUrl, '_blank', 'noopener,noreferrer');
      setNotice(`Opening the source GitHub issue to record: ${decision}. The issue remains the auditable approval record.`);
      window.setTimeout(() => setNotice(''), 5200);
      return;
    }
    setNotice(`${decision} recorded in local preview only. Connect the umbrella GitHub repository to persist decisions.`);
    window.setTimeout(() => setNotice(''), 5200);
  };

  return <div className="shell">
    <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)}/>
    <main className="workspace">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMenuOpen(value => !value)} aria-label="Open navigation"><Menu/></button>
        <label className="search"><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search approvals, agents, or work items…"/></label>
        <div className="connection"><Smartphone/><span>{data.source === 'local-preview' ? 'Local preview' : 'GitHub connected'}</span></div>
        <div className="avatar" aria-label="Founder profile">AH</div>
      </header>
      <div className={`content ${selected ? 'content--detail' : ''}`}>
        <section className="queue">
          <div className="queue-header"><div><h1>Approvals</h1><p>Review exact agent work before controlled execution.</p></div><a className="project-link" href={import.meta.env.VITE_GITHUB_PROJECT_URL || data.projectUrl || '#'} aria-disabled={!(import.meta.env.VITE_GITHUB_PROJECT_URL || data.projectUrl)}>Open project <ExternalLink/></a></div>
          <div className="filters">
            <label><span className="sr-only">Filter by status</span><select value={status} onChange={event => setStatus(event.target.value)}><option>All statuses</option>{Object.keys(statusTone).map(value => <option key={value}>{value}</option>)}</select><ChevronDown/></label>
            <span>{filtered.length} work items</span>
          </div>
          <div className="list-head"><span>ID / Title</span><span>Agent</span><span>Status</span><span>Updated</span><span/></div>
          <div className="work-list">{filtered.map(item => <WorkRow key={item.id} item={item} active={selected?.id === item.id} onSelect={() => setSelectedId(item.id)}/>)}</div>
          {filtered.length === 0 ? <div className="empty"><Search/><h2>No matching work</h2><p>Try another status or search phrase.</p></div> : null}
        </section>
        {selected ? <Detail item={selected} onBack={() => setSelectedId(null)} onDecision={decide}/> : null}
      </div>
    </main>
    {notice ? <div className="toast" role="status"><CheckCircle2/>{notice}</div> : null}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
