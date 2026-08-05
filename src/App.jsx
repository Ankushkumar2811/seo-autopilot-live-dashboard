import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  LayoutDashboard,
  Link2,
  MapPin,
  MessageCircle,
  Plus,
  SearchCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { api } from "./services/apiClient.js";
import { loadJson } from "./utils/storage.js";
import { workspaceService } from "./services/workspaceService.js";
import { useAuth } from "./stores/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";

const STORAGE_KEY = "unnatix-seo-autopilot-live-v2";

const healthTemplate = [
  { id: "h1", category: "Technical", label: "Mobile Core Web Vitals checked", impact: 10, done: true },
  { id: "h2", category: "Technical", label: "Sitemap and robots.txt submitted", impact: 8, done: true },
  { id: "h3", category: "Technical", label: "No 404 or broken internal links", impact: 9, done: false },
  { id: "h4", category: "On-page", label: "Service pages have local keywords", impact: 10, done: true },
  { id: "h5", category: "On-page", label: "Meta titles are unique and under 60 chars", impact: 7, done: false },
  { id: "h6", category: "Local SEO", label: "Google Business categories and services updated", impact: 10, done: true },
  { id: "h7", category: "Local SEO", label: "NAP is consistent across citations", impact: 9, done: false },
  { id: "h8", category: "Trust", label: "Recent photos added to GBP", impact: 7, done: true },
  { id: "h9", category: "Trust", label: "Review replies completed this week", impact: 8, done: false },
  { id: "h10", category: "Content", label: "Two local content pieces scheduled", impact: 8, done: false },
];

const seedData = {
  clients: [
    {
      id: "c1",
      name: "UnnatiX Technologies",
      type: "Digital marketing agency",
      city: "Indore",
      websiteUrl: "https://unnatix.in",
      services: "SEO, website development, Google Business Profile management",
      gmbUrl: "https://g.page/r/example-review-link",
      goal: "Rank in local map pack for SEO and website services",
    },
    {
      id: "c2",
      name: "Bright Dental Studio",
      type: "Dental clinic",
      city: "Noida",
      websiteUrl: "",
      services: "Root canal, cosmetic dentistry, dental implants",
      gmbUrl: "",
      goal: "Increase calls for root canal and cosmetic dentistry",
    },
  ],
  activeClientId: "c1",
  reviews: {
    c1: [
      { id: "r1", customer: "Rohit Sharma", phone: "919876543210", status: "reviewed", rating: 5, date: "2026-07-08" },
      { id: "r2", customer: "Priya Verma", phone: "919812345678", status: "sent", rating: 0, date: "2026-07-09" },
    ],
  },
  posts: {
    c1: [
      { id: "p1", date: "2026-07-12", channel: "Google Business", topic: "Website audit offer", status: "scheduled" },
      { id: "p2", date: "2026-07-15", channel: "Google Business", topic: "Client ranking case study", status: "draft" },
    ],
  },
  backlinks: {
    c1: [
      { id: "b1", site: "Justdial", url: "https://www.justdial.com", authority: 72, status: "live", date: "2026-07-04" },
      { id: "b2", site: "Local chamber directory", url: "", authority: 41, status: "contacted", date: "2026-07-07" },
    ],
  },
  contentIdeas: {
    c1: [
      { id: "ci1", kind: "Blog", keyword: "seo company indore", text: "How to choose a reliable SEO company in Indore", date: "2026-07-08" },
      { id: "ci2", kind: "GBP Post", keyword: "website audit", text: "Free 15-minute website audit for local businesses this week.", date: "2026-07-09" },
    ],
  },
  health: {
    c1: healthTemplate,
  },
  blogSchedules: {},
  usedTitles: [],
};

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "reviews", label: "Reviews", icon: MessageCircle },
  { id: "posts", label: "GBP Posts", icon: CalendarDays },
  { id: "scheduler", label: "Blog Scheduler", icon: CalendarPlus },
  { id: "content", label: "Content", icon: Sparkles },
  { id: "backlinks", label: "Backlinks", icon: Link2 },
  { id: "health", label: "SEO Health", icon: ClipboardCheck },
  { id: "autopilot", label: "Autopilot", icon: Wand2 },
  { id: "automation", label: "Automation Center", icon: Sparkles },
  { id: "intelligence", label: "SEO Intelligence", icon: SearchCheck },
  { id: "ai-visibility", label: "AI Visibility", icon: Globe2 },
  { id: "content-factory", label: "Content Intelligence", icon: FileText },
  { id: "local-command", label: "Local SEO", icon: MapPin },
  { id: "authority", label: "Authority Center", icon: Link2 },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function normalizeTitles(titles) { return Array.from(new Set(titles.map((title) => String(title || "").trim()).filter(Boolean))).slice(-1000); }

export default function App() {
  const auth = useAuth();
  if (auth.loading) return <div className="auth-loading">Loading secure workspace...</div>;
  if (!auth.user) return <AuthPage />;
  return <Dashboard user={auth.user} onLogout={auth.logout} />;
}

function Dashboard({ user, onLogout }) {
  const [data, setData] = useState(seedData);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const saveTimer = useRef(null);
  const saveVersion = useRef(0);
  const [tab, setTab] = useState("overview");
  const [copiedId, setCopiedId] = useState("");
  const [clientDraft, setClientDraft] = useState({ name: "", type: "", city: "" });
  const canWrite = user.role !== "CLIENT";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gbp") !== "connected") return;
    setTab("local-command");
    setSaveMessage(`Google Business Profile connected · account ${params.get("accountId") || "saved"} · location ${params.get("locationId") || "saved"}`);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    let active = true;
    workspaceService.load().then(async (result) => {
      if (!active) return;
      if (result.workspace) setData(result.workspace);
      else {
        const legacy = loadJson(STORAGE_KEY, null);
        const initial = legacy ? { ...seedData, ...legacy } : seedData;
        const saved = await workspaceService.save(initial);
        if (active) setData(saved.workspace || initial);
      }
      if (active) setWorkspaceReady(true);
    }).catch((error) => { if (active) { setSaveMessage(error.message); setWorkspaceReady(true); } });
    return () => { active = false; if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const activeClient = data.clients.find((client) => client.id === data.activeClientId) || data.clients[0];
  const clientId = activeClient.id;
  const reviews = data.reviews[clientId] || [];
  const posts = data.posts[clientId] || [];
  const backlinks = data.backlinks[clientId] || [];
  const ideas = data.contentIdeas[clientId] || [];
  const health = data.health[clientId] || healthTemplate.map((item) => ({ ...item, done: false }));
  const blogSchedules = data.blogSchedules?.[clientId] || [];

  const metrics = useMemo(() => {
    const healthScore = Math.round((health.reduce((sum, item) => sum + (item.done ? item.impact : 0), 0) / health.reduce((sum, item) => sum + item.impact, 0)) * 100);
    const reviewed = reviews.filter((item) => item.status === "reviewed").length;
    const liveLinks = backlinks.filter((item) => item.status === "live").length;
    const scheduled = posts.filter((item) => item.status === "scheduled" || item.status === "posted").length;
    const momentum = Math.min(100, Math.round((healthScore * 0.45) + (reviewed * 10) + (liveLinks * 8) + (scheduled * 6)));
    return { healthScore, reviewed, liveLinks, scheduled, momentum };
  }, [health, reviews, backlinks, posts]);

  function persist(next) {
    if (!canWrite) { setSaveMessage("Your CLIENT role has view-only access."); return; }
    setData(next);
    setSaveMessage("Saving...");
    const version = ++saveVersion.current;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { const result = await workspaceService.save(next); if (version === saveVersion.current) { setData(result.workspace || next); setSaveMessage("Saved securely"); } }
      catch (error) { if (version === saveVersion.current) setSaveMessage(`Save failed: ${error.message}`); }
    }, 600);
  }

  function updateClient(patch) {
    persist({
      ...data,
      clients: data.clients.map((client) => (client.id === clientId ? { ...client, ...patch } : client)),
    });
  }

  function addClient() {
    if (!clientDraft.name.trim()) return;
    const id = uid("c");
    const nextClient = {
      id,
      name: clientDraft.name.trim(),
      type: clientDraft.type.trim() || "Local business",
      city: clientDraft.city.trim() || "Your city",
      gmbUrl: "",
      goal: "Build local visibility and steady qualified leads",
    };
    persist({
      ...data,
      clients: [...data.clients, nextClient],
      activeClientId: id,
      health: { ...data.health, [id]: healthTemplate.map((item) => ({ ...item, done: false })) },
    });
    setClientDraft({ name: "", type: "", city: "" });
  }

  function setCollection(collection, nextItems) {
    persist({ ...data, [collection]: { ...data[collection], [clientId]: nextItems } });
  }

  function exportCsv() {
    const rows = [
      ["Client", activeClient.name],
      ["City", activeClient.city],
      ["SEO Momentum", `${metrics.momentum}%`],
      ["Health Score", `${metrics.healthScore}%`],
      [],
      ["Reviews", "Phone", "Status", "Date"],
      ...reviews.map((item) => [item.customer, item.phone, item.status, item.date]),
      [],
      ["Posts", "Channel", "Status", "Date"],
      ...posts.map((item) => [item.topic, item.channel, item.status, item.date]),
      [],
      ["Backlinks", "URL", "Authority", "Status"],
      ...backlinks.map((item) => [item.site, item.url, item.authority, item.status]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeClient.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-seo-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><MapPin size={22} /></div>
          <div>
            <strong>UnnatiX</strong>
            <span>SEO Autopilot</span>
          </div>
        </div>

        <label className="field-label" htmlFor="client-select">Client workspace</label>
        <select id="client-select" className="client-select" value={clientId} onChange={(event) => persist({ ...data, activeClientId: event.target.value })}>
          {data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>

        <nav className="nav-list" aria-label="Dashboard sections">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={tab === item.id ? "nav-item active" : "nav-item"} onClick={() => setTab(item.id)}>
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {canWrite && <div className="mini-panel">
          <div className="mini-panel-title">Add client</div>
          <input value={clientDraft.name} onChange={(event) => setClientDraft({ ...clientDraft, name: event.target.value })} placeholder="Business name" />
          <input value={clientDraft.type} onChange={(event) => setClientDraft({ ...clientDraft, type: event.target.value })} placeholder="Business type" />
          <input value={clientDraft.city} onChange={(event) => setClientDraft({ ...clientDraft, city: event.target.value })} placeholder="City" />
          <button className="primary-button compact" onClick={addClient}><Plus size={16} /> Add client</button>
        </div>}
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Live local SEO command center</p>
            <h1>{activeClient.name}</h1>
            <p className="subline">{activeClient.type} in {activeClient.city} · {activeClient.goal}</p>
          </div>
          <div className="top-actions">
            <span className="chip">{user.name} · {user.role}</span>
            {activeClient.gmbUrl && <a className="ghost-button" href={activeClient.gmbUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> GBP link</a>}
            <button className="ghost-button" onClick={exportCsv}><Download size={16} /> Export report</button>
            <button className="ghost-button" onClick={onLogout}>Logout</button>
          </div>
        </header>

        {!workspaceReady && <div className="notice">Loading organization workspace...</div>}
        {saveMessage && <div className="notice">{saveMessage}</div>}
        <section className="client-strip">
          <div className="input-group wide">
            <label>Website URL</label>
            <input disabled={!canWrite} value={activeClient.websiteUrl || ""} onChange={(event) => updateClient({ websiteUrl: event.target.value })} placeholder="https://example.com" />
          </div>
          <div className="input-group">
            <label>Google review link</label>
            <input disabled={!canWrite} value={activeClient.gmbUrl} onChange={(event) => updateClient({ gmbUrl: event.target.value })} placeholder="Paste Google Business review URL" />
          </div>
        </section>

        {tab === "overview" && <Overview metrics={metrics} reviews={reviews} posts={posts} backlinks={backlinks} health={health} setTab={setTab} />}
        {tab === "reviews" && <Reviews reviews={reviews} client={activeClient} copiedId={copiedId} setCopiedId={setCopiedId} onChange={(next) => setCollection("reviews", next)} />}
        {tab === "posts" && <Posts posts={posts} onChange={(next) => setCollection("posts", next)} />}
        {tab === "scheduler" && <BlogScheduler schedules={blogSchedules} usedTitles={data.usedTitles || []} onRememberTitles={(titles) => persist({ ...data, usedTitles: normalizeTitles([...(data.usedTitles || []), ...titles]) })} onChange={(next) => setCollection("blogSchedules", next)} />}
        {tab === "content" && <Content ideas={ideas} client={activeClient} onChange={(next) => setCollection("contentIdeas", next)} />}
        {tab === "backlinks" && <Backlinks backlinks={backlinks} client={activeClient} onChange={(next) => setCollection("backlinks", next)} />}
        {tab === "health" && <Health items={health} score={metrics.healthScore} onChange={(next) => setCollection("health", next)} />}
        {tab === "autopilot" && <Autopilot client={activeClient} onSaveIdea={(idea) => setCollection("contentIdeas", [idea, ...ideas])} />}
        {tab === "automation" && <AutomationCenter client={activeClient} />}
        {tab === "intelligence" && <SeoIntelligenceCenter client={activeClient} />}
        {tab === "ai-visibility" && <AIVisibilityCenter client={activeClient} />}
        {tab === "content-factory" && <ContentIntelligenceCenter client={activeClient} />}
        {tab === "local-command" && <LocalSeoCommandCenter client={activeClient} />}
        {tab === "authority" && <AuthorityCenter client={activeClient} />}
      </main>
    </div>
  );
}

function Overview({ metrics, reviews, posts, backlinks, health, setTab }) {
  const nextActions = [
    health.find((item) => !item.done)?.label || "Maintain weekly checks",
    reviews.some((item) => item.status === "sent") ? "Follow up pending review requests" : "Add two fresh review requests",
    posts.length ? "Move drafted GBP posts to scheduled" : "Plan this week's Google Business post",
  ];

  return (
    <div className="stack">
      <section className="metric-grid">
        <Metric title="SEO Momentum" value={`${metrics.momentum}%`} icon={TrendingUp} tone="gold" />
        <Metric title="Health Score" value={`${metrics.healthScore}%`} icon={SearchCheck} />
        <Metric title="Reviews Won" value={metrics.reviewed} icon={MessageCircle} />
        <Metric title="Live Links" value={metrics.liveLinks} icon={Globe2} />
      </section>

      <section className="split-grid">
        <div className="panel">
          <PanelTitle icon={Target} title="This week focus" action="Open health" onClick={() => setTab("health")} />
          <div className="action-list">
            {nextActions.map((action) => <div className="action-item" key={action}><ChevronRight size={16} /> {action}</div>)}
          </div>
        </div>
        <div className="panel">
          <PanelTitle icon={BarChart3} title="Pipeline snapshot" />
          <div className="pipeline">
            <Pipeline label="Reviews" current={reviews.filter((item) => item.status === "reviewed").length} total={Math.max(reviews.length, 1)} />
            <Pipeline label="GBP Posts" current={posts.filter((item) => item.status !== "draft").length} total={Math.max(posts.length, 1)} />
            <Pipeline label="Backlinks" current={backlinks.filter((item) => item.status === "live").length} total={Math.max(backlinks.length, 1)} />
          </div>
        </div>
      </section>
    </div>
  );
}

function Reviews({ reviews, client, copiedId, setCopiedId, onChange }) {
  const [draft, setDraft] = useState({ customer: "", phone: "" });

  function buildLink(item) {
    const reviewUrl = client.gmbUrl || "your Google review link";
    const message = `Hi ${item.customer}, thank you for choosing ${client.name}. If you are happy with our work, please share a quick Google review here: ${reviewUrl}`;
    return `https://wa.me/${item.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
  }

  function add() {
    if (!draft.customer.trim() || !draft.phone.trim()) return;
    onChange([{ id: uid("r"), customer: draft.customer.trim(), phone: draft.phone.trim(), status: "sent", rating: 0, date: today() }, ...reviews]);
    setDraft({ customer: "", phone: "" });
  }

  async function copy(item) {
    await navigator.clipboard?.writeText(buildLink(item));
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(""), 1200);
  }

  return (
    <CrudPanel title="Review engine" description="Real review requests with WhatsApp-ready follow-up links. Mark confirmed reviews once they go live.">
      <div className="form-row">
        <input value={draft.customer} onChange={(event) => setDraft({ ...draft, customer: event.target.value })} placeholder="Customer name" />
        <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="WhatsApp number with country code" />
        <button className="primary-button" onClick={add}><Plus size={16} /> Add request</button>
      </div>
      <ListEmpty items={reviews} text="No review request yet." />
      {reviews.map((item) => (
        <div className="data-row" key={item.id}>
          <div><strong>{item.customer}</strong><span>{item.phone} · {item.date}</span></div>
          <button className={item.status === "reviewed" ? "chip success" : "chip"} onClick={() => onChange(reviews.map((row) => row.id === item.id ? { ...row, status: row.status === "reviewed" ? "sent" : "reviewed", rating: row.status === "reviewed" ? 0 : 5 } : row))}>{item.status === "reviewed" ? "Reviewed" : "Awaiting"}</button>
          <a className="icon-button" href={buildLink(item)} target="_blank" rel="noreferrer" title="Open WhatsApp"><MessageCircle size={16} /></a>
          <button className="icon-button" onClick={() => copy(item)} title="Copy link">{copiedId === item.id ? <Check size={16} /> : <Copy size={16} />}</button>
          <button className="icon-button danger" onClick={() => onChange(reviews.filter((row) => row.id !== item.id))} title="Delete"><Trash2 size={16} /></button>
        </div>
      ))}
    </CrudPanel>
  );
}

function Posts({ posts, onChange }) {
  const [draft, setDraft] = useState({ date: today(), channel: "Google Business", topic: "" });
  function add() {
    if (!draft.topic.trim()) return;
    onChange([{ id: uid("p"), ...draft, topic: draft.topic.trim(), status: "draft" }, ...posts]);
    setDraft({ date: today(), channel: "Google Business", topic: "" });
  }
  return (
    <CrudPanel title="GBP post calendar" description="Plan offers, updates, photos, and case-study posts so the profile stays fresh every week.">
      <div className="form-row">
        <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
        <input value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} placeholder="Post topic" />
        <button className="primary-button" onClick={add}><Plus size={16} /> Add post</button>
      </div>
      <ListEmpty items={posts} text="No post planned yet." />
      {posts.map((item) => (
        <div className="data-row" key={item.id}>
          <div><strong>{item.topic}</strong><span>{item.channel} · {item.date}</span></div>
          <button className={item.status === "posted" ? "chip success" : "chip"} onClick={() => onChange(posts.map((row) => row.id === item.id ? { ...row, status: row.status === "draft" ? "scheduled" : row.status === "scheduled" ? "posted" : "draft" } : row))}>{item.status}</button>
          <button className="icon-button danger" onClick={() => onChange(posts.filter((row) => row.id !== item.id))} title="Delete"><Trash2 size={16} /></button>
        </div>
      ))}
    </CrudPanel>
  );
}

function BlogScheduler({ schedules, usedTitles, onRememberTitles, onChange }) {
  const [draft, setDraft] = useState({ date: "", title: "", keywords: "" });
  const [planInput, setPlanInput] = useState({ topic: "SEO services", city: "Indore", count: 5, startDate: today(), cadenceDays: 3 });
  const [planBusy, setPlanBusy] = useState(false);
  const [planMessage, setPlanMessage] = useState("");
  const [planItems, setPlanItems] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState({});
  const [bulkText, setBulkText] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");

  const pending = schedules.filter((item) => !item.postId && item.status !== "scheduled");
  const excludedTitles = [...usedTitles, ...schedules.map((item) => item.title)];

  function rememberTitles(titles) {
    onRememberTitles(titles);
  }

  function addOne() {
    if (!draft.title.trim() || !draft.date) return;
    onChange([
      ...schedules,
      {
        id: uid("bs"),
        title: draft.title.trim(),
        date: draft.date,
        keywords: draft.keywords.trim(),
        status: "queued",
      },
    ]);
    rememberTitles([draft.title.trim()]);
    setDraft({ date: "", title: "", keywords: "" });
  }

  function importBulk() {
    const items = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const [date, title, keywords = ""] = line.split("|").map((part) => part.trim());
        return title && date ? { id: uid("bs"), date, title, keywords, status: "queued" } : null;
      })
      .filter(Boolean);
    if (!items.length) return;
    onChange([...schedules, ...items]);
    rememberTitles(items.map((item) => item.title));
    setBulkText("");
  }

  async function generatePlan() {
    if (!planInput.topic.trim()) return;
    setPlanBusy(true);
    setPlanMessage("");
    setPlanItems([]);
    setSelectedPlan({});
    try {
      const response = await api("/api/generate-blog-plan", {
        ...planInput,
        excludeTitles: excludedTitles,
      });
      const nextPlan = response.plan || [];
      setPlanItems(nextPlan);
      setSelectedPlan(Object.fromEntries(nextPlan.map((item, index) => [index, true])));
      setPlanMessage(`${nextPlan.length} SEO blog ideas generated by ${response.provider || "AI"}.`);
    } catch (error) {
      setPlanMessage(error.message || "Plan generation failed");
    }
    setPlanBusy(false);
  }

  function addSelectedPlan() {
    const selected = planItems
      .filter((_, index) => selectedPlan[index])
      .map((item) => ({
        id: uid("bs"),
        date: item.date,
        title: item.title,
        keywords: [item.primaryKeyword, ...(item.secondaryKeywords || [])].filter(Boolean).join(", "),
        status: "queued",
        metaTitle: item.metaTitle,
        metaDescription: item.metaDescription,
        slug: item.slug,
        outline: item.outline,
        imagePrompt: item.imagePrompt,
      }));
    if (!selected.length) return;
    onChange([...schedules, ...selected]);
    rememberTitles(selected.map((item) => item.title));
    setPlanMessage(`${selected.length} blogs added to queue.`);
  }

  async function scheduleAll() {
    if (!pending.length) return;
    setBusy(true);
    setMessage("");
    setResults([]);
    try {
      const response = await api("/api/schedule-blogs", {
        posts: pending.map((item) => ({
          title: item.title,
          date: item.date,
          keywords: item.keywords,
          imagePrompt: item.imagePrompt,
          imageUrl: item.imageUrl,
        })),
      });
      rememberTitles(pending.map((item) => item.title));
      setResults(response.results || []);
      const next = schedules.map((item) => {
        const result = response.results?.find((row) => row.title === item.title);
        if (!result) return item;
        return {
          ...item,
          status: result.ok ? result.status : "error",
          postId: result.postId,
          link: result.link,
          error: result.error,
          scheduledFor: result.scheduledFor,
          imageMode: result.imageMode,
          imageUrl: result.imageUrl || item.imageUrl,
        };
      });
      onChange(next);
      setMessage(response.ok ? "All blogs scheduled." : "Some blogs need attention.");
    } catch (error) {
      setMessage(error.message || "Scheduling failed");
    }
    setBusy(false);
  }

  return (
    <CrudPanel title="Blog scheduler" description="Add many blog titles with dates, then schedule them into WordPress with SEO keywords and internal links.">
      <div className="seo-plan-panel">
        <div className="seo-plan-header">
          <div>
            <strong>Generate SEO titles and keywords</strong>
            <span>AI suggests title, primary keyword, secondary keywords, slug, meta and outline.</span>
          </div>
          <button className="primary-button" disabled={planBusy || !planInput.topic.trim()} onClick={generatePlan}>
            <Sparkles size={16} /> {planBusy ? "Generating..." : "Generate plan"}
          </button>
        </div>
        <div className="seo-plan-form">
          <input value={planInput.topic} onChange={(event) => setPlanInput({ ...planInput, topic: event.target.value })} placeholder="Service/topic e.g. SEO services" />
          <input value={planInput.city} onChange={(event) => setPlanInput({ ...planInput, city: event.target.value })} placeholder="City e.g. Indore" />
          <input type="number" min="1" max="50" value={planInput.count} onChange={(event) => setPlanInput({ ...planInput, count: Number(event.target.value) })} title="Number of ideas" />
          <input type="date" value={planInput.startDate} onChange={(event) => setPlanInput({ ...planInput, startDate: event.target.value })} />
          <input type="number" min="1" max="30" value={planInput.cadenceDays} onChange={(event) => setPlanInput({ ...planInput, cadenceDays: Number(event.target.value) })} title="Days between blogs" />
        </div>
        {planMessage && <div className="notice">{planMessage}</div>}
        {planItems.length > 0 && (
          <div className="plan-list">
            {planItems.map((item, index) => (
              <label className="plan-row" key={`${item.title}-${index}`}>
                <input type="checkbox" checked={Boolean(selectedPlan[index])} onChange={(event) => setSelectedPlan({ ...selectedPlan, [index]: event.target.checked })} />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.date} | {item.primaryKeyword}</span>
                  <em>{[item.primaryKeyword, ...(item.secondaryKeywords || [])].filter(Boolean).join(", ")}</em>
                  {item.metaDescription && <small>{item.metaDescription}</small>}
                  {item.imagePrompt && <small>Image: {item.imagePrompt}</small>}
                </div>
              </label>
            ))}
            <div className="scheduler-actions">
              <button className="primary-button" onClick={addSelectedPlan}><Plus size={16} /> Add selected to queue</button>
            </div>
          </div>
        )}
      </div>

      <div className="scheduler-form">
        <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
        <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Blog title" />
        <input value={draft.keywords} onChange={(event) => setDraft({ ...draft, keywords: event.target.value })} placeholder="Keywords, comma separated" />
        <button className="primary-button" onClick={addOne}><Plus size={16} /> Add</button>
      </div>

      <div className="bulk-box">
        <textarea
          value={bulkText}
          onChange={(event) => setBulkText(event.target.value)}
          placeholder={"2026-07-15 | Best SEO Company in Indore | seo company indore, local SEO\n2026-07-18 | Website Development and SEO | website development, digital marketing"}
        />
        <button className="ghost-button" onClick={importBulk}>Import lines</button>
      </div>

      <div className="scheduler-actions">
        <button className="primary-button" disabled={!pending.length || busy} onClick={scheduleAll}>
          <CalendarPlus size={16} /> {busy ? "Scheduling..." : `Schedule ${pending.length || 0}`}
        </button>
        <button className="ghost-button" onClick={() => onChange([])}>Clear list</button>
      </div>

      {message && <div className="notice">{message}</div>}
      <ListEmpty items={schedules} text="No blog queued yet." />
      <div className="schedule-list">
        {schedules.map((item) => (
          <div className="schedule-row" key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <span>{item.date} · {item.keywords || "default keywords"}</span>
              {item.metaDescription && <small>{item.metaDescription}</small>}
              {item.imageMode && <small>Image: {item.imageMode}</small>}
              {item.error && <em>{item.error}</em>}
            </div>
            {item.link ? (
              <a className="chip success" href={item.link} target="_blank" rel="noreferrer">{item.status || "scheduled"}</a>
            ) : (
              <span className="chip">{item.status || "queued"}</span>
            )}
            <button className="icon-button danger" onClick={() => onChange(schedules.filter((row) => row.id !== item.id))} title="Remove">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {results.length > 0 && <pre className="result-box">{JSON.stringify(results, null, 2)}</pre>}
    </CrudPanel>
  );
}

function Content({ ideas, client, onChange }) {
  const [keyword, setKeyword] = useState("");
  const [drafts, setDrafts] = useState([]);
  function generate() {
    if (!keyword.trim()) return;
    const base = keyword.trim();
    setDrafts([
      { kind: "GBP Post", text: `${client.name} helps ${client.city} businesses improve visibility for "${base}". Book a quick audit and see what is stopping calls, clicks, and map rankings.` },
      { kind: "GBP Post", text: `New local SEO checklist for ${client.city}: reviews, citations, service pages, and weekly Google Business updates. Message ${client.name} for a practical action plan.` },
      { kind: "Blog", text: `${base}: complete local SEO guide for ${client.city} businesses` },
      { kind: "Blog", text: `How ${client.type.toLowerCase()} owners can rank higher on Google Maps` },
    ]);
  }
  return (
    <CrudPanel title="Content planner" description="Generate practical GBP post and blog ideas without depending on paid API keys. Save the useful ones into the client workspace.">
      <div className="form-row">
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && generate()} placeholder="Keyword or service topic" />
        <button className="primary-button" onClick={generate}><Sparkles size={16} /> Generate</button>
      </div>
      {drafts.length > 0 && <div className="draft-grid">{drafts.map((item) => <button className="draft-card" key={item.text} onClick={() => onChange([{ id: uid("ci"), ...item, keyword, date: today() }, ...ideas])}><span>{item.kind}</span>{item.text}</button>)}</div>}
      <ListEmpty items={ideas} text="No saved content idea yet." />
      {ideas.map((item) => (
        <div className="data-row" key={item.id}>
          <div><strong>{item.text}</strong><span>{item.kind} · {item.keyword} · {item.date}</span></div>
          <button className="icon-button danger" onClick={() => onChange(ideas.filter((row) => row.id !== item.id))} title="Delete"><Trash2 size={16} /></button>
        </div>
      ))}
    </CrudPanel>
  );
}

function Backlinks({ backlinks, client, onChange }) {
  const [draft, setDraft] = useState({ site: "", url: "", authority: 30 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [runResult, setRunResult] = useState(null);
  const statuses = ["identified", "contacted", "approved", "live"];
  function add() {
    if (!draft.site.trim()) return;
    onChange([{ id: uid("b"), ...draft, site: draft.site.trim(), status: "identified", date: today() }, ...backlinks]);
    setDraft({ site: "", url: "", authority: 30 });
  }

  async function runAutopilot() {
    setBusy(true);
    setMessage("");
    try {
      const result = await api("/api/backlink-autopilot", {
        businessName: client.name,
        city: client.city,
        websiteUrl: client.websiteUrl,
        services: client.services,
        keywords: client.services,
        existingSites: backlinks.map((item) => item.site),
      });
      const prospects = (result.prospects || []).map((item) => ({
        id: uid("b"),
        site: item.site,
        url: item.url,
        authority: item.authority,
        status: item.status,
        date: item.date,
        type: item.type,
        priority: item.priority,
        action: item.action,
        anchorIdeas: item.anchorIdeas,
        outreach: item.outreach,
        submissionData: item.submissionData,
      }));
      onChange([...prospects, ...backlinks]);
      setRunResult(result);
      setMessage(`${prospects.length} backlink/citation opportunities queued.`);
    } catch (error) {
      setMessage(error.message || "Backlink autopilot failed");
    }
    setBusy(false);
  }

  function copyOutreach(item) {
    const text = item.outreach ? `Subject: ${item.outreach.subject}\n\n${item.outreach.body}` : item.action || "";
    navigator.clipboard?.writeText(text);
    setMessage(`Copied outreach for ${item.site}`);
  }

  return (
    <CrudPanel title="Backlink and citation tracker" description="Track genuine directories, partner mentions, local citations, and editorial outreach from prospect to live link.">
      <div className="seo-plan-panel">
        <div className="seo-plan-header">
          <div>
            <strong>One-click backlink autopilot</strong>
            <span>Creates safe citation, profile, partner, and outreach tasks with submission data and email drafts.</span>
          </div>
          <button className="primary-button" disabled={busy} onClick={runAutopilot}>
            <Link2 size={16} /> {busy ? "Building..." : "Run autopilot"}
          </button>
        </div>
        {message && <div className="notice">{message}</div>}
        {runResult?.nextActions?.length > 0 && (
          <div className="action-list compact-list">
            {runResult.nextActions.map((action) => <div className="action-item" key={action}><ChevronRight size={16} /> {action}</div>)}
          </div>
        )}
      </div>

      <div className="form-row">
        <input value={draft.site} onChange={(event) => setDraft({ ...draft, site: event.target.value })} placeholder="Website or directory" />
        <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="URL" />
        <input type="number" min="1" max="100" value={draft.authority} onChange={(event) => setDraft({ ...draft, authority: Number(event.target.value) })} />
        <button className="primary-button" onClick={add}><Plus size={16} /> Add prospect</button>
      </div>
      <ListEmpty items={backlinks} text="No backlink prospect yet." />
      {backlinks.map((item) => (
        <div className="data-row" key={item.id}>
          <div>
            <strong>{item.site}</strong>
            <span>{item.url || "URL pending"} · DA {item.authority} · {item.date}</span>
            {item.action && <small>{item.action}</small>}
            {item.anchorIdeas?.length > 0 && <small>Anchors: {item.anchorIdeas.join(", ")}</small>}
          </div>
          <button className={item.status === "live" ? "chip success" : "chip"} onClick={() => onChange(backlinks.map((row) => row.id === item.id ? { ...row, status: statuses[(statuses.indexOf(row.status) + 1) % statuses.length] } : row))}>{item.status}</button>
          {item.url && <a className="icon-button" href={item.url} target="_blank" rel="noreferrer" title="Open prospect"><ExternalLink size={16} /></a>}
          {item.outreach && <button className="icon-button" onClick={() => copyOutreach(item)} title="Copy outreach"><Copy size={16} /></button>}
          <button className="icon-button danger" onClick={() => onChange(backlinks.filter((row) => row.id !== item.id))} title="Delete"><Trash2 size={16} /></button>
        </div>
      ))}
    </CrudPanel>
  );
}

function Health({ items, score, onChange }) {
  const categories = [...new Set(items.map((item) => item.category))];
  return (
    <CrudPanel title="SEO health audit" description="A weighted checklist for technical, on-page, local SEO, trust, and content readiness.">
      <div className="score-banner">
        <div className="score-circle" style={{ "--score": `${score * 3.6}deg` }}>{score}%</div>
        <div><strong>{score >= 80 ? "Strong foundation" : score >= 55 ? "Good progress" : "Needs attention"}</strong><span>Complete high-impact items first for faster local visibility gains.</span></div>
      </div>
      {categories.map((category) => (
        <section className="check-group" key={category}>
          <h3>{category}</h3>
          {items.filter((item) => item.category === category).map((item) => (
            <button className={item.done ? "check-row done" : "check-row"} key={item.id} onClick={() => onChange(items.map((row) => row.id === item.id ? { ...row, done: !row.done } : row))}>
              <span>{item.done && <Check size={14} />}</span>
              <strong>{item.label}</strong>
              <em>{item.impact} pts</em>
            </button>
          ))}
        </section>
      ))}
    </CrudPanel>
  );
}

function Metric({ title, value, icon: Icon, tone = "" }) {
  return (
    <div className={`metric ${tone}`}>
      <div><span>{title}</span><strong>{value}</strong></div>
      <Icon size={24} />
    </div>
  );
}

function PanelTitle({ icon: Icon, title, action, onClick }) {
  return (
    <div className="panel-title">
      <div><Icon size={18} /><h2>{title}</h2></div>
      {action && <button onClick={onClick}>{action}</button>}
    </div>
  );
}

function Pipeline({ label, current, total }) {
  return (
    <div>
      <div className="pipeline-label"><span>{label}</span><strong>{current}/{total}</strong></div>
      <div className="bar"><span style={{ width: `${Math.round((current / total) * 100)}%` }} /></div>
    </div>
  );
}

function CrudPanel({ title, description, children }) {
  return (
    <section className="panel">
      <div className="crud-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="crud-body">{children}</div>
    </section>
  );
}

function ListEmpty({ items, text }) {
  if (items.length) return null;
  return <div className="empty-state"><FileText size={18} /> {text}</div>;
}

function Autopilot({ client, onSaveIdea }) {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState(null);
  const [audit, setAudit] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function run(label, action) {
    setBusy(label);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error.message || "Action failed");
    }
    setBusy("");
  }

  return (
    <CrudPanel title="Real autopilot controls" description="Live backend actions for website audit, AI content, image generation, WordPress drafts, and GMB posts.">
      <div className="automation-grid">
        <button className="automation-card" onClick={() => run("health", async () => setStatus(await api("/api/health")))}>
          <SearchCheck size={20} />
          <strong>Check integrations</strong>
          <span>Database, AI, WordPress, GMB, SMTP readiness</span>
        </button>
        <button className="automation-card" onClick={() => run("audit", async () => setAudit((await api("/api/audit", { url: client.websiteUrl, clientId: client.id })).audit))}>
          <Globe2 size={20} />
          <strong>Audit website</strong>
          <span>Title, meta, H1, schema, links, image alt text</span>
        </button>
        <button className="automation-card" onClick={() => run("content", async () => {
          const result = await api("/api/generate-content", {
            businessName: client.name,
            city: client.city,
            services: client.services,
            keyword: keyword || client.services,
          });
          setDraft(result.content);
          if (result.content?.blog?.title) {
            onSaveIdea({ id: uid("ci"), kind: "Blog", keyword: keyword || "autopilot", text: result.content.blog.title, date: today() });
          }
        })}>
          <Sparkles size={20} />
          <strong>Generate SEO content</strong>
          <span>Blog draft, GMB posts, and image prompt</span>
        </button>
      </div>

      <div className="form-row">
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Keyword/topic for content generation" />
        <button className="primary-button" disabled={Boolean(busy)} onClick={() => run("image", async () => {
          const prompt = draft?.imagePrompt || `Professional local SEO marketing image for ${client.name}`;
          const result = await api("/api/generate-image", { prompt });
          setDraft({ ...(draft || {}), generatedImage: result });
        })}>
          <Sparkles size={16} /> Image
        </button>
        <button className="primary-button" disabled={!draft?.blog || Boolean(busy)} onClick={() => run("wordpress", async () => {
          const result = await api("/api/publish-wordpress", {
            title: draft.blog.title,
            excerpt: draft.blog.excerpt,
            content: draft.blog.content,
            status: "draft",
            imageUrl: draft.generatedImage?.imageUrl,
          });
          setMessage(`WordPress draft created: ${result.post?.link || result.post?.id}`);
        })}>
          <FileText size={16} /> WP Draft
        </button>
        <button className="primary-button" disabled={!draft?.gmbPosts?.length || Boolean(busy)} onClick={() => run("gmb", async () => {
          const firstPost = draft.gmbPosts[0];
          const result = await api("/api/publish-gmb", {
            summary: firstPost.summary,
            cta: firstPost.cta || "LEARN_MORE",
            url: client.websiteUrl,
          });
          setMessage(`GMB post created: ${result.post?.name || "done"}`);
        })}>
          <MapPin size={16} /> GMB Post
        </button>
      </div>

      {busy && <div className="notice">Running {busy}...</div>}
      {message && <div className="notice">{message}</div>}
      {status && <pre className="result-box">{JSON.stringify(status, null, 2)}</pre>}
      {audit && (
        <div className="score-banner">
          <div className="score-circle" style={{ "--score": `${audit.score * 3.6}deg` }}>{audit.score}%</div>
          <div>
            <strong>{audit.title || "Website audit"}</strong>
            <span>{audit.issues.length ? audit.issues.join(" · ") : "No major on-page issue found."}</span>
          </div>
        </div>
      )}
      {draft && (
        <div className="result-grid">
          {draft.blog && <div className="result-card"><span>Blog draft</span><strong>{draft.blog.title}</strong><p>{draft.blog.excerpt}</p></div>}
          {draft.gmbPosts?.map((post, index) => <div className="result-card" key={index}><span>GMB post</span><p>{post.summary}</p></div>)}
          {draft.imagePrompt && <div className="result-card"><span>Image prompt</span><p>{draft.imagePrompt}</p></div>}
          {draft.generatedImage && <div className="result-card"><span>Image result</span><p>{draft.generatedImage.imageUrl || draft.generatedImage.message || draft.generatedImage.mode}</p></div>}
        </div>
      )}
    </CrudPanel>
  );
}

function AutomationCenter({ client }) {
  const [agents, setAgents] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState({});
  const [successRate, setSuccessRate] = useState(100);
  const [cost, setCost] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState("seo-audit");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    try {
      const [agentResult, workflowResult, jobResult] = await Promise.all([api("/api/agents"), api("/api/agent-workflows"), api("/api/agent-jobs")]);
      setAgents(agentResult.agents || []); setWorkflows(workflowResult.workflows || []); setJobs(jobResult.jobs || []);
      setSummary(jobResult.summary || {}); setSuccessRate(jobResult.successRate ?? 100); setCost(jobResult.totalCostEstimate || 0);
    } catch (error) { setMessage(error.message); }
  }

  useEffect(() => { refresh(); const timer = setInterval(refresh, 15000); return () => clearInterval(timer); }, []);

  async function queueAgent() {
    setBusy("queue"); setMessage("");
    try { await api("/api/agents", { agentId: selectedAgent, clientId: client.id, input: { url: client.websiteUrl, website: client.websiteUrl, businessName: client.name, city: client.city, services: client.services, reviewLink: client.gmbUrl } }); setMessage("Agent job queued."); await refresh(); }
    catch (error) { setMessage(error.message); } setBusy("");
  }

  async function startWorkflow(workflowId) {
    setBusy(workflowId); setMessage("");
    try { await api("/api/agent-workflows", { workflowId, clientId: client.id, input: { url: client.websiteUrl, website: client.websiteUrl, businessName: client.name, city: client.city, services: client.services, reviewLink: client.gmbUrl, approved: false } }); setMessage("Automation workflow started in approval-safe mode."); await refresh(); }
    catch (error) { setMessage(error.message); } setBusy("");
  }

  async function jobAction(job, action) {
    setBusy(`${action}-${job._id}`); setMessage("");
    try { await api(`/api/agent-jobs/${job._id}`, { action }); setMessage(`Job ${action} completed.`); await refresh(); }
    catch (error) { setMessage(error.message); } setBusy("");
  }

  return <div className="stack">
    <section className="metric-grid">
      <Metric title="Queued" value={summary.queued?.count || 0} icon={CalendarPlus} />
      <Metric title="Running" value={summary.running?.count || 0} icon={Wand2} tone="gold" />
      <Metric title="Success rate" value={`${successRate}%`} icon={Check} />
      <Metric title="Estimated AI cost" value={`$${Number(cost).toFixed(4)}`} icon={BarChart3} />
    </section>
    <CrudPanel title="Agent control" description="Queue an independent tenant-scoped agent or start a collaborative workflow. Publishing remains approval-gated.">
      <div className="form-row"><select value={selectedAgent} onChange={(event) => setSelectedAgent(event.target.value)}>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select><button className="primary-button" disabled={Boolean(busy)} onClick={queueAgent}><Sparkles size={16} /> Queue agent</button><button className="ghost-button" onClick={refresh}>Refresh</button></div>
      <div className="draft-grid">{workflows.map((workflow) => <button className="draft-card" key={workflow.id} disabled={Boolean(busy)} onClick={() => startWorkflow(workflow.id)}><span>Workflow</span><strong>{workflow.name}</strong><small>{workflow.steps.join(" → ")}</small></button>)}</div>
      {message && <div className="notice">{message}</div>}
    </CrudPanel>
    <CrudPanel title="Execution queue" description="Monitor execution time, provider, tokens, estimated cost, retries and errors.">
      <ListEmpty items={jobs} text="No agent jobs yet." />
      {jobs.map((job) => <div className="data-row" key={job._id}><div><strong>{job.agentId}</strong><span>{job.status} · attempts {job.attempts || 0}/{(job.maxRetries || 0) + 1} · {job.metrics?.executionMs || 0} ms</span><small>{job.metrics?.provider || "pending provider"} · {job.metrics?.tokens || 0} tokens · ${(job.metrics?.costEstimate || 0).toFixed(6)}{job.error?.message ? ` · ${job.error.message}` : ""}</small></div><span className={job.status === "completed" ? "chip success" : "chip"}>{job.status}</span>{["queued", "retrying"].includes(job.status) && <button className="ghost-button" disabled={Boolean(busy)} onClick={() => jobAction(job, "run")}>Run</button>}{job.status === "failed" && <button className="ghost-button" disabled={Boolean(busy)} onClick={() => jobAction(job, "retry")}>Retry</button>}{["queued", "retrying", "running"].includes(job.status) && <button className="icon-button danger" disabled={Boolean(busy)} onClick={() => jobAction(job, "cancel")}><Trash2 size={16} /></button>}</div>)}
    </CrudPanel>
  </div>;
}

function SeoIntelligenceCenter({ client }) {
  const [latest, setLatest] = useState(null);
  const [projects, setProjects] = useState([]);
  const [competitors, setCompetitors] = useState("");
  const [maxPages, setMaxPages] = useState(25);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() { try { const result = await api(`/api/seo-intelligence?clientId=${encodeURIComponent(client.id)}`); setLatest(result.latest || null); setProjects(result.projects || []); } catch (error) { setMessage(error.message); } }
  useEffect(() => { load(); }, [client.id]);

  async function startCrawl() {
    if (!client.websiteUrl) { setMessage("Add the client website URL first."); return; }
    setBusy(true); setMessage("");
    try { await api("/api/seo-intelligence", { clientId: client.id, input: { url: client.websiteUrl, businessName: client.name, city: client.city, services: client.services, keywords: client.services, maxPages, competitors: competitors.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean) } }); setMessage("SEO intelligence crawl queued. Track execution in Automation Center, then refresh this page."); }
    catch (error) { setMessage(error.message); } setBusy(false);
  }

  async function scheduleWeekly() { const project = projects[0]; if (!project) { setMessage("Run the first crawl before scheduling."); return; } setBusy(true); try { await api(`/api/seo-intelligence/${project._id}`, { action: "schedule_weekly", maxPages }); setMessage("Weekly intelligence crawl scheduled."); } catch (error) { setMessage(error.message); } setBusy(false); }

  const overview = latest?.overview || {}, strategy = latest?.strategy || {}, opportunities = latest?.opportunities || [], keywordItems = latest?.keywords || [], competitor = latest?.competitor || {};
  return <div className="stack">
    <section className="metric-grid">
      <Metric title="Overall Score" value={overview.overallScore ?? "—"} icon={TrendingUp} tone="gold" />
      <Metric title="Technical Score" value={overview.technicalScore ?? "—"} icon={SearchCheck} />
      <Metric title="Content Score" value={overview.contentScore ?? "—"} icon={FileText} />
      <Metric title="Local SEO Score" value={overview.localSeoScore ?? "—"} icon={MapPin} />
    </section>
    <CrudPanel title="SEO Intelligence Center" description="Run a robots-aware, bounded crawl with on-page, technical, competitor, keyword and opportunity analysis.">
      <div className="form-row"><input type="number" min="1" max="100" value={maxPages} onChange={(event) => setMaxPages(Number(event.target.value))} title="Maximum pages" /><textarea value={competitors} onChange={(event) => setCompetitors(event.target.value)} placeholder="Competitor URLs, comma or new-line separated" /><button className="primary-button" disabled={busy} onClick={startCrawl}><SearchCheck size={16} /> {busy ? "Queueing..." : "Run intelligence"}</button><button className="ghost-button" disabled={busy} onClick={scheduleWeekly}>Schedule weekly</button><button className="ghost-button" onClick={load}>Refresh</button></div>
      {message && <div className="notice">{message}</div>}
      {latest?.changes && <div className="notice">Score change: {latest.changes.overallScoreDelta ?? "first baseline"} · New issue types: {latest.changes.newIssueTypes?.join(", ") || "none"}</div>}
    </CrudPanel>
    <section className="split-grid">
      <div className="panel"><PanelTitle icon={Target} title="Priority Tasks" /><div className="action-list">{opportunities.slice(0, 10).map((item, index) => <div className="action-item" key={`${item.issue}-${index}`}><ChevronRight size={16} /><div><strong>{item.issue}</strong><span>{item.suggestedAction}</span></div><em>{item.priority}</em></div>)}</div>{!opportunities.length && <div className="empty-state">Run a crawl to generate opportunities.</div>}</div>
      <div className="panel"><PanelTitle icon={BarChart3} title="Competitor Gap" /><div className="action-list">{(competitor.competitorAdvantages || []).map((item) => <div className="action-item" key={item}><ChevronRight size={16} />{item}</div>)}{(competitor.missingOpportunities || []).slice(0, 8).map((item) => <div className="action-item" key={item}><ChevronRight size={16} />{item}</div>)}</div>{!competitor.competitors?.length && <div className="empty-state">Add competitor URLs to compare content, schema and linking.</div>}</div>
    </section>
    <section className="split-grid">
      <div className="panel"><PanelTitle icon={Sparkles} title="Keyword Opportunities" /><div className="pipeline">{keywordItems.slice(0, 12).map((item) => <div className="pipeline-label" key={`${item.keyword}-${item.location}`}><span>{item.keyword}<small>{item.searchIntent} · difficulty {item.difficulty}</small></span><strong>{item.priority}</strong></div>)}</div></div>
      <div className="panel"><PanelTitle icon={CalendarDays} title="90 Day Plan" />{(strategy.months || []).map((month) => <div className="result-card" key={month.month}><span>Month {month.month}</span><strong>{month.theme}</strong><p>{month.weeks?.flatMap((week) => week.tasks || []).slice(0, 6).join(" · ")}</p></div>)}{!strategy.months?.length && <div className="empty-state">The strategist will create a roadmap after the crawl.</div>}</div>
    </section>
    <CrudPanel title="Crawl History" description="Completed and failed crawl baselines for change comparison.">{projects.map((project) => <div className="data-row" key={project._id}><div><strong>{project.rootUrl}</strong><span>{new Date(project.createdAt).toLocaleString()} · {project.summary?.pagesCrawled || 0} pages · {project.summary?.issues || 0} issues</span></div><span className={project.status === "completed" ? "chip success" : "chip"}>{project.status}</span></div>)}<ListEmpty items={projects} text="No intelligence crawl yet." /></CrudPanel>
  </div>;
}

function AIVisibilityCenter({ client }) {
  const [projects, setProjects] = useState([]), [projectId, setProjectId] = useState("");
  const [detail, setDetail] = useState(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [draft, setDraft] = useState({ industry: client.type || "", services: client.services?.join?.(", ") || "", locations: client.city || "", competitors: "", targetCustomers: "local businesses" });
  async function loadProjects() { try { const result = await api(`/api/ai-visibility?clientId=${encodeURIComponent(client.id)}`), next = result.projects || []; setProjects(next); setProjectId((current) => current || next[0]?._id || ""); } catch (error) { setMessage(error.message); } }
  async function loadDetail(id = projectId) { if (!id) return; try { setDetail(await api(`/api/ai-visibility/${id}`)); } catch (error) { setMessage(error.message); } }
  useEffect(() => { setProjectId(""); setDetail(null); loadProjects(); }, [client.id]);
  useEffect(() => { loadDetail(projectId); }, [projectId]);
  async function createProject() { setBusy(true); setMessage(""); try { const result = await api("/api/ai-visibility", { clientId: client.id, brandName: client.name, industry: draft.industry, services: split(draft.services), locations: split(draft.locations), competitors: split(draft.competitors), targetCustomers: split(draft.targetCustomers), queryLimit: 200 }); setProjects((items) => [result.project, ...items]); setProjectId(result.project._id); setMessage("AI visibility project created; query generation is queued in Automation Center."); } catch (error) { setMessage(error.message); } setBusy(false); }
  async function action(name) { if (!projectId) { setMessage("Create a visibility project first."); return; } setBusy(true); setMessage(""); try { await api(`/api/ai-visibility/${projectId}`, { action: name, providers: ["openai", "gemini"], queryLimit: 20 }); setMessage(name === "schedule" ? "Daily, weekly and monthly monitoring schedules created." : "AI visibility job queued. Run it from Automation Center, then refresh."); } catch (error) { setMessage(error.message); } setBusy(false); }
  const score = detail?.latest || {}, recommendations = detail?.recommendations || [], report = detail?.report || {}, platforms = score.platformScores || [], competitors = score.competitors || [];
  return <div className="stack">
    <section className="metric-grid"><Metric title="AI Visibility" value={score.overallScore ?? "—"} icon={Globe2} tone="gold" /><Metric title="Brand Mentions" value={score.brandMentionScore ?? "—"} icon={TrendingUp} /><Metric title="Citation Score" value={score.citationScore ?? "—"} icon={Link2} /><Metric title="Authority" value={score.authorityScore ?? "—"} icon={Target} /></section>
    <CrudPanel title="AI Visibility Center" description="Measure brand recommendations, citations and competitive presence across configured generative AI providers.">
      {!projects.length ? <div className="draft-grid"><input value={draft.industry} onChange={(event) => setDraft({ ...draft, industry: event.target.value })} placeholder="Industry" /><input value={draft.services} onChange={(event) => setDraft({ ...draft, services: event.target.value })} placeholder="Services, comma separated" /><input value={draft.locations} onChange={(event) => setDraft({ ...draft, locations: event.target.value })} placeholder="Locations" /><input value={draft.targetCustomers} onChange={(event) => setDraft({ ...draft, targetCustomers: event.target.value })} placeholder="Target customers" /><textarea value={draft.competitors} onChange={(event) => setDraft({ ...draft, competitors: event.target.value })} placeholder="Competitor brands" /><button className="primary-button" disabled={busy} onClick={createProject}><Plus size={16} /> Create project</button></div> : <div className="form-row"><select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((item) => <option value={item._id} key={item._id}>{item.brandName} · {item.industry}</option>)}</select><button className="primary-button" disabled={busy} onClick={() => action("run")}><Sparkles size={16} /> Run 20 queries</button><button className="ghost-button" disabled={busy} onClick={() => action("generate_queries")}>Expand queries</button><button className="ghost-button" disabled={busy} onClick={() => action("schedule")}>Schedule automation</button><button className="ghost-button" onClick={() => loadDetail()}>Refresh</button></div>}
      {message && <div className="notice">{message}</div>}<div className="notice">Usage: {detail?.usage?.calls || 0} calls · {detail?.usage?.tokens || 0} tokens · ${Number(detail?.usage?.cost || 0).toFixed(4)} estimated</div>
    </CrudPanel>
    <section className="split-grid"><div className="panel"><PanelTitle icon={BarChart3} title="Platform comparison" />{platforms.map((item) => <div className="data-row" key={item.provider}><div><strong>{item.provider === "openai" ? "ChatGPT / OpenAI" : item.provider}</strong><span>{item.mentionRate}% mention rate · average position {item.averagePosition || "—"}</span></div></div>)}<ListEmpty items={platforms} text="Run tracked queries to compare configured platforms. Perplexity is reserved for a future adapter." /></div><div className="panel"><PanelTitle icon={Target} title="Competitor comparison" />{competitors.map((item) => <div className="data-row" key={item.brand}><div><strong>{item.brand}</strong><span>{item.mentions} mentions · average position {item.averagePosition || "—"}</span></div></div>)}<ListEmpty items={competitors} text="Add competitor brands to expose recommendation gaps." /></div></section>
    <section className="split-grid"><div className="panel"><PanelTitle icon={Wand2} title="GEO recommendations" /><div className="action-list">{recommendations.slice(0, 12).map((item, index) => <div className="action-item" key={`${item.title}-${index}`}><ChevronRight size={16} /><div><strong>{item.title}</strong><span>{item.action}</span></div><em>{item.priority}</em></div>)}</div><ListEmpty items={recommendations} text="Recommendations appear after the first scored run." /></div><div className="panel"><PanelTitle icon={SearchCheck} title="Missed query opportunities" /><div className="action-list">{(report.missingQueries || []).slice(0, 12).map((query) => <div className="action-item" key={query}><ChevronRight size={16} />{query}</div>)}</div><ListEmpty items={report.missingQueries || []} text="No measured query gaps yet." /></div></section>
    <CrudPanel title="Client AI Visibility Report" description="Latest evidence-backed baseline, content roadmap and authority sources."><div className="result-card"><span>Tracked evidence</span><strong>{score.queryCount || 0} provider responses · {score.mentionCount || 0} brand mentions</strong><p>Average brand position: {score.averagePosition || "not ranked"}. Top citations: {(report.topCitations || []).slice(0, 5).join(" · ") || "No citations captured"}.</p></div></CrudPanel>
  </div>;
}

function split(value) { return String(value || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean); }

function ContentIntelligenceCenter({ client }) {
  const [projects, setProjects] = useState([]), [projectId, setProjectId] = useState(""), [detail, setDetail] = useState(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [draft, setDraft] = useState({ industry: client.type || "", services: client.services?.join?.(", ") || "", locations: client.city || "", audience: "local business owners", tone: "Professional, practical and trustworthy", competitors: "" });
  async function loadProjects() { try { const result = await api(`/api/content-factory?clientId=${encodeURIComponent(client.id)}`), items = result.projects || []; setProjects(items); setProjectId((current) => current || items[0]?._id || ""); } catch (error) { setMessage(error.message); } }
  async function loadDetail(id = projectId) { if (!id) return; try { setDetail(await api(`/api/content-factory/${id}`)); } catch (error) { setMessage(error.message); } }
  useEffect(() => { setProjectId(""); setDetail(null); loadProjects(); }, [client.id]); useEffect(() => { loadDetail(projectId); }, [projectId]);
  async function createProject() { setBusy(true); setMessage(""); try { const result = await api("/api/content-factory", { clientId: client.id, brandName: client.name, industry: draft.industry, services: split(draft.services), locations: split(draft.locations), targetAudience: draft.audience, brandTone: draft.tone, competitors: split(draft.competitors) }); setProjects((items) => [result.project, ...items]); setProjectId(result.project._id); setMessage("Content project created; topical authority analysis queued."); } catch (error) { setMessage(error.message); } setBusy(false); }
  async function projectAction(action, input) { if (!projectId) return; setBusy(true); try { await api(`/api/content-factory/${projectId}`, { action, input }); setMessage(action === "schedule" ? "Daily opportunity, weekly plan and monthly refresh jobs scheduled." : `${action} job queued in Automation Center.`); } catch (error) { setMessage(error.message); } setBusy(false); }
  async function documentAction(action, item) { setBusy(true); try { await api("/api/content-factory/documents", action === "write" ? { action, briefId: item._id } : { action, contentId: item._id }); setMessage(`${action} action accepted.`); await loadDetail(); } catch (error) { setMessage(error.message); } setBusy(false); }
  const project = detail?.project || projects.find((item) => item._id === projectId) || {}, clusters = detail?.clusters || [], briefs = detail?.briefs || [], documents = detail?.documents || [], calendar = detail?.calendar || [], refresh = detail?.refreshRecommendations || [];
  return <div className="stack">
    <section className="metric-grid"><Metric title="Authority Score" value={project.authorityScore ?? 0} icon={Target} tone="gold" /><Metric title="Keyword Map" value={clusters.length} icon={SearchCheck} /><Metric title="Content Documents" value={documents.length} icon={FileText} /><Metric title="Published" value={documents.filter((item) => item.status === "published").length} icon={Globe2} /></section>
    <CrudPanel title="Content Intelligence Center" description="Plan topical authority, generate approval-gated content and continuously learn from real performance data.">
      {!projects.length ? <div className="draft-grid"><input value={draft.industry} onChange={(event) => setDraft({ ...draft, industry: event.target.value })} placeholder="Industry" /><input value={draft.services} onChange={(event) => setDraft({ ...draft, services: event.target.value })} placeholder="Services" /><input value={draft.locations} onChange={(event) => setDraft({ ...draft, locations: event.target.value })} placeholder="Locations" /><input value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} placeholder="Target audience" /><input value={draft.tone} onChange={(event) => setDraft({ ...draft, tone: event.target.value })} placeholder="Brand tone" /><textarea value={draft.competitors} onChange={(event) => setDraft({ ...draft, competitors: event.target.value })} placeholder="Competitor brands" /><button className="primary-button" disabled={busy} onClick={createProject}><Plus size={16} /> Create factory</button></div> : <div className="form-row"><select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((item) => <option key={item._id} value={item._id}>{item.brandName} · {item.industry}</option>)}</select>{["authority", "briefs", "calendar", "links", "refresh", "learn"].map((action) => <button className={action === "authority" ? "primary-button" : "ghost-button"} disabled={busy} key={action} onClick={() => projectAction(action)}>{action}</button>)}<button className="ghost-button" disabled={busy} onClick={() => projectAction("schedule")}>Automate</button><button className="ghost-button" onClick={() => loadDetail()}>Refresh</button></div>}
      {message && <div className="notice">{message}</div>}<div className="notice">AI usage: {detail?.usage?.jobs || 0} jobs · {detail?.usage?.tokens || 0} tokens · ${Number(detail?.usage?.cost || 0).toFixed(4)} estimated</div>
    </CrudPanel>
    <section className="split-grid"><div className="panel"><PanelTitle icon={SearchCheck} title="Keyword map" />{clusters.slice(0, 15).map((item) => <div className="data-row" key={item._id}><div><strong>{item.primaryKeyword}</strong><span>{item.searchIntent} · {item.contentType} · target {item.targetPage}</span></div><span className="chip">P{item.priority}</span></div>)}<ListEmpty items={clusters} text="Run authority analysis to create clusters." /></div><div className="panel"><PanelTitle icon={CalendarDays} title="Content calendar" />{calendar.slice(0, 12).map((item) => <div className="data-row" key={item._id}><div><strong>{item.title}</strong><span>{new Date(item.publishAt).toLocaleDateString()} · {item.contentType}</span></div></div>)}<ListEmpty items={calendar} text="Generate a weekly or monthly plan." /></div></section>
    <section className="split-grid"><div className="panel"><PanelTitle icon={FileText} title="Content briefs" />{briefs.slice(0, 12).map((item) => <div className="data-row" key={item._id}><div><strong>{item.title}</strong><span>{item.intent} · {item.recommendedLength} words</span></div><button className="ghost-button" disabled={busy} onClick={() => documentAction("write", item)}>Write draft</button></div>)}<ListEmpty items={briefs} text="Generate briefs from keyword clusters." /></div><div className="panel"><PanelTitle icon={Wand2} title="AI generated content" />{documents.slice(0, 12).map((item) => <div className="data-row" key={item._id}><div><strong>{item.title}</strong><span>{item.status} · v{item.version || 1} · SEO {item.optimization?.score ?? "—"}</span></div>{item.status === "draft" && <button className="ghost-button" onClick={() => documentAction("review", item)}>Review</button>}{item.status === "review" && <button className="ghost-button" onClick={() => documentAction("approve", item)}>Approve</button>}{item.status === "approved" && <button className="primary-button" onClick={() => documentAction("publish", item)}>WordPress</button>}<button className="ghost-button" onClick={() => documentAction("optimize", item)}>Optimize</button></div>)}<ListEmpty items={documents} text="Generate a draft from an approved brief." /></div></section>
    <section className="split-grid"><div className="panel"><PanelTitle icon={TrendingUp} title="Performance" />{(detail?.performance || []).slice(0, 10).map((item) => <div className="data-row" key={item._id}><div><strong>{item.clicks} clicks · {item.impressions} impressions</strong><span>Rank {item.ranking || "—"} · {item.conversions} conversions</span></div></div>)}<ListEmpty items={detail?.performance || []} text="Import Search Console/Analytics/ranking data to activate learning." /></div><div className="panel"><PanelTitle icon={CalendarPlus} title="Refresh recommendations" />{refresh.map((item) => <div className="action-item" key={item._id}><ChevronRight size={16} /><div><strong>{item.title}</strong><span>{item.actions?.join(" · ")}</span></div><em>{item.priority}</em></div>)}<ListEmpty items={refresh} text="No stale or declining content detected from current data." /></div></section>
  </div>;
}

function LocalSeoCommandCenter({ client }) {
  const [projects, setProjects] = useState([]), [projectId, setProjectId] = useState(""), [detail, setDetail] = useState(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [draft, setDraft] = useState({ category: client.type || "", locations: client.city || "", services: client.services?.join?.(", ") || "", keywords: "", competitors: "", accountId: "", locationId: "", address: "", phone: client.phone || "" });
  async function loadProjects() { try { const result = await api(`/api/local-seo?clientId=${encodeURIComponent(client.id)}`), items = result.projects || []; setProjects(items); setProjectId((current) => current || items[0]?._id || ""); } catch (error) { setMessage(error.message); } }
  async function loadDetail(id = projectId) { if (!id) return; try { setDetail(await api(`/api/local-seo/${id}`)); } catch (error) { setMessage(error.message); } }
  useEffect(() => { setProjectId(""); setDetail(null); loadProjects(); }, [client.id]); useEffect(() => { loadDetail(projectId); }, [projectId]);
  async function createProject() { setBusy(true); setMessage(""); try { const result = await api("/api/local-seo", { clientId: client.id, businessName: client.name, category: draft.category, locations: split(draft.locations), services: split(draft.services), targetKeywords: split(draft.keywords), competitors: split(draft.competitors), accountId: draft.accountId, locationId: draft.locationId, address: draft.address, phone: draft.phone, website: client.websiteUrl }); setProjects((items) => [result.project, ...items]); setProjectId(result.project._id); setMessage("Local SEO project created and citation discovery queued."); } catch (error) { setMessage(error.message); } setBusy(false); }
  async function action(name, input = {}) { if (!projectId) return; setBusy(true); setMessage(""); try { await api(`/api/local-seo/${projectId}`, { action: name, input }); setMessage(name === "schedule" ? "Local SEO daily, weekly and monthly automation scheduled." : `${name} job queued in Automation Center.`); } catch (error) { setMessage(error.message); } setBusy(false); }
  async function connectGbp() { setBusy(true); setMessage(""); try { const result = await api(`/api/gbp?action=oauth-url&clientId=${encodeURIComponent(client.id)}`); if (!result.url?.startsWith("https://accounts.google.com/o/oauth2/v2/auth")) throw new Error("Invalid Google OAuth URL returned by server"); window.location.assign(result.url); } catch (error) { setMessage(error.message); setBusy(false); } }
  const project = detail?.project || {}, profile = detail?.profile || {}, score = detail?.score || {}, factors = score.factors || {}, keywords = detail?.keywords || [], citations = detail?.citations || [], reviews = detail?.reviews || [], competitors = detail?.competitors?.comparisons || [], pages = detail?.locationPages || [], recommendations = detail?.recommendations || [];
  return <div className="stack">
    <section className="metric-grid"><Metric title="Local SEO Score" value={score.overallScore ?? "—"} icon={MapPin} tone="gold" /><Metric title="GBP Health" value={factors.gbpCompleteness ?? "—"} icon={Globe2} /><Metric title="Review Growth" value={score.reviewVelocity90Days ?? reviews.length} icon={MessageCircle} /><Metric title="Live Citations" value={citations.filter((item) => item.status === "live").length} icon={Link2} /></section>
    <CrudPanel title="Local SEO Command Center" description="Manage GBP health, reviews, rankings, citations, NAP consistency, competitors and local pages.">
      <div className="form-row"><button className="primary-button" disabled={busy} onClick={connectGbp}><Globe2 size={16} /> Connect Google Business Profile</button></div>
      {!projects.length ? <div className="draft-grid"><input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Business category" /><input value={draft.locations} onChange={(event) => setDraft({ ...draft, locations: event.target.value })} placeholder="Locations" /><input value={draft.services} onChange={(event) => setDraft({ ...draft, services: event.target.value })} placeholder="Services" /><input value={draft.keywords} onChange={(event) => setDraft({ ...draft, keywords: event.target.value })} placeholder="Target keywords" /><textarea value={draft.competitors} onChange={(event) => setDraft({ ...draft, competitors: event.target.value })} placeholder="Competitor names" /><input value={draft.accountId} onChange={(event) => setDraft({ ...draft, accountId: event.target.value })} placeholder="GBP account ID" /><input value={draft.locationId} onChange={(event) => setDraft({ ...draft, locationId: event.target.value })} placeholder="GBP location ID" /><input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} placeholder="Canonical address" /><input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="Canonical phone" /><button className="primary-button" disabled={busy} onClick={createProject}><Plus size={16} /> Create project</button></div> : <div className="form-row"><select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((item) => <option key={item._id} value={item._id}>{item.businessName} · {item.locations?.join(", ")}</option>)}</select><button className="primary-button" disabled={busy} onClick={() => action("gbp_sync")}><Globe2 size={16} /> Sync GBP</button>{["gbp_optimize", "citations", "competitors", "report"].map((name) => <button key={name} className="ghost-button" disabled={busy} onClick={() => action(name)}>{name}</button>)}<button className="ghost-button" disabled={busy} onClick={() => action("schedule")}>Automate</button><button className="ghost-button" onClick={() => loadDetail()}>Refresh</button></div>}
      {message && <div className="notice">{message}</div>}{profile.syncErrors?.length > 0 && <div className="notice">Partial GBP sync: {profile.syncErrors.map((item) => `${item.area}: ${item.message}`).join(" · ")}</div>}
    </CrudPanel>
    <section className="split-grid"><div className="panel"><PanelTitle icon={Globe2} title="GBP Health" /><div className="result-card"><span>{profile.businessName || project.businessName || "Not synced"}</span><strong>{factors.gbpCompleteness ?? 0}% complete</strong><p>{profile.category?.displayName || project.category} · {profile.reviewSummary?.totalReviewCount || 0} reviews · rating {profile.reviewSummary?.averageRating || "—"}</p></div>{recommendations.filter((item) => item.type === "gbp").map((item) => <div className="action-item" key={item._id}><ChevronRight size={16} />{item.action}<em>{item.priority}</em></div>)}</div><div className="panel"><PanelTitle icon={TrendingUp} title="Local Rankings" />{keywords.slice(0, 12).map((item) => <div className="data-row" key={item._id}><div><strong>{item.keyword}</strong><span>{item.location} · local {item.localPackPosition || "—"} · organic {item.organicPosition || "—"}</span></div><span className="chip">{item.previousPosition && item.currentPosition ? `${item.previousPosition - item.currentPosition > 0 ? "+" : ""}${item.previousPosition - item.currentPosition}` : "new"}</span></div>)}<ListEmpty items={keywords} text="Connect/import a rank provider observation to start tracking." /></div></section>
    <section className="split-grid"><div className="panel"><PanelTitle icon={MessageCircle} title="Review Growth" />{reviews.slice(0, 10).map((item) => <div className="data-row" key={item._id}><div><strong>{item.customerName} · {item.rating || "request"}★</strong><span>{item.sentiment?.label || item.responseStatus} · {item.reviewText || item.aiReply}</span></div></div>)}<ListEmpty items={reviews} text="Sync GBP reviews or create review requests." /></div><div className="panel"><PanelTitle icon={Link2} title="Citation Status" />{citations.slice(0, 12).map((item) => <div className="data-row" key={item._id}><div><strong>{item.platform}</strong><span>Authority {item.authorityScore} · NAP {item.napConsistent === false ? "mismatch" : "pending/consistent"}</span></div><span className="chip">{item.status}</span></div>)}<ListEmpty items={citations} text="Run citation discovery to create opportunities." /></div></section>
    <section className="split-grid"><div className="panel"><PanelTitle icon={BarChart3} title="Competitor Gap" />{competitors.map((item) => <div className="result-card" key={item.businessName}><span>{item.businessName}</span><strong>{item.metrics.reviews} reviews · {item.metrics.rating} rating</strong><p>{item.advantages.join(" · ") || "No measured advantage from supplied data"}</p></div>)}<ListEmpty items={competitors} text="Supply competitor GBP observations for evidence-based comparison." /></div><div className="panel"><PanelTitle icon={FileText} title="Location Pages" />{pages.map((item) => <div className="data-row" key={item._id}><div><strong>{item.title}</strong><span>{item.status} · {item.slug}</span></div></div>)}<ListEmpty items={pages} text="Generate unique service + location drafts through the location page action." /></div></section>
    <CrudPanel title="Local SEO Report" description="Latest rankings, reviews, GBP changes, citation progress and next actions."><div className="result-card"><span>{detail?.report?.createdAt ? new Date(detail.report.createdAt).toLocaleDateString() : "No report yet"}</span><strong>{detail?.report?.score?.overallScore ?? "—"}/100</strong><p>{detail?.report?.nextActions?.join(" · ") || "Queue a report after syncing local data."}</p></div></CrudPanel>
  </div>;
}

function AuthorityCenter({ client }) {
  const [projects, setProjects] = useState([]), [projectId, setProjectId] = useState(""), [detail, setDetail] = useState(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [draft, setDraft] = useState({ industry: client.type || "", locations: client.city || "", services: client.services?.join?.(", ") || "", competitors: "", founderName: "", products: "" });
  async function loadProjects() { try { const result = await api(`/api/authority?clientId=${encodeURIComponent(client.id)}`), items = result.projects || []; setProjects(items); setProjectId((current) => current || items[0]?._id || ""); } catch (error) { setMessage(error.message); } }
  async function loadDetail(id = projectId) { if (!id) return; try { setDetail(await api(`/api/authority/${id}`)); } catch (error) { setMessage(error.message); } }
  useEffect(() => { setProjectId(""); setDetail(null); loadProjects(); }, [client.id]); useEffect(() => { loadDetail(projectId); }, [projectId]);
  async function createProject() { if (!client.websiteUrl) { setMessage("Add the client website URL first."); return; } setBusy(true); try { const result = await api("/api/authority", { clientId: client.id, targetWebsite: client.websiteUrl, brandName: client.name, founderName: draft.founderName, products: split(draft.products), industry: draft.industry, locations: split(draft.locations), services: split(draft.services), competitors: split(draft.competitors) }); setProjects((items) => [result.project, ...items]); setProjectId(result.project._id); setMessage("Authority project created and discovery queued."); } catch (error) { setMessage(error.message); } setBusy(false); }
  async function action(name, input = {}) { if (!projectId) return; setBusy(true); try { await api(`/api/authority/${projectId}`, { action: name, input }); setMessage(name === "schedule" ? "Daily, weekly and monthly authority automation scheduled." : `${name} job queued in Automation Center.`); } catch (error) { setMessage(error.message); } setBusy(false); }
  const project = detail?.project || {}, score = detail?.score || {}, opportunities = detail?.opportunities || [], records = detail?.records || [], campaigns = detail?.campaigns || [], pr = detail?.prOpportunities || [], competitor = detail?.competitor || {}, recommendations = detail?.recommendations || [], lost = records.filter((item) => item.status === "lost"), newLinks = records.filter((item) => item.status === "live" && Date.now() - new Date(item.firstSeen).getTime() < 30 * 86400000);
  return <div className="stack">
    <section className="metric-grid"><Metric title="Authority Score" value={score.overallScore ?? "—"} icon={TrendingUp} tone="gold" /><Metric title="Backlink Growth" value={newLinks.length} icon={Link2} /><Metric title="Lost Links" value={lost.length} icon={Trash2} /><Metric title="Referring Domains" value={score.referringDomainDiversity ?? new Set(records.map((item) => item.sourceDomain)).size} icon={Globe2} /></section>
    <CrudPanel title="Authority Center" description="Discover, qualify, outreach, monitor and report on evidence-backed authority growth.">
      {!projects.length ? <div className="draft-grid"><input value={draft.industry} onChange={(event) => setDraft({ ...draft, industry: event.target.value })} placeholder="Industry" /><input value={draft.services} onChange={(event) => setDraft({ ...draft, services: event.target.value })} placeholder="Services" /><input value={draft.locations} onChange={(event) => setDraft({ ...draft, locations: event.target.value })} placeholder="Locations" /><input value={draft.competitors} onChange={(event) => setDraft({ ...draft, competitors: event.target.value })} placeholder="Competitor domains" /><input value={draft.founderName} onChange={(event) => setDraft({ ...draft, founderName: event.target.value })} placeholder="Founder name" /><input value={draft.products} onChange={(event) => setDraft({ ...draft, products: event.target.value })} placeholder="Products/brand terms" /><button className="primary-button" disabled={busy} onClick={createProject}><Plus size={16} /> Create authority project</button></div> : <div className="form-row"><select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((item) => <option key={item._id} value={item._id}>{item.brandName} · {item.industry}</option>)}</select><button className="primary-button" disabled={busy} onClick={() => action("discover")}><SearchCheck size={16} /> Discover</button>{["pr", "monitor", "report"].map((name) => <button className="ghost-button" disabled={busy} key={name} onClick={() => action(name)}>{name}</button>)}<button className="ghost-button" disabled={busy} onClick={() => action("schedule")}>Automate</button><button className="ghost-button" onClick={() => loadDetail()}>Refresh</button></div>}
      {message && <div className="notice">{message}</div>}<div className="notice">Catalog opportunities are leads, not verified backlinks. Import or monitor source evidence before reporting a link as acquired.</div>
    </CrudPanel>
    <section className="split-grid"><div className="panel"><PanelTitle icon={Target} title="Opportunities" />{opportunities.slice(0, 15).map((item) => <div className="data-row" key={item._id}><div><strong>{item.domain}</strong><span>{item.sourceType} · {item.reason} · {item.recommendedApproach}</span></div><span className="chip">{item.authorityScore} · {item.priority}</span></div>)}<ListEmpty items={opportunities} text="Run discovery to create scored opportunities." /></div><div className="panel"><PanelTitle icon={BarChart3} title="Competitor Gap" />{(competitor.commonLinkingDomains || []).slice(0, 12).map((item) => <div className="data-row" key={item.domain}><div><strong>{item.domain}</strong><span>{item.competitorCount} competitors · {item.sourceTypes.join(", ")}</span></div></div>)}<ListEmpty items={competitor.commonLinkingDomains || []} text="Import competitor-provider observations to calculate authority gaps." /></div></section>
    <section className="split-grid"><div className="panel"><PanelTitle icon={Sparkles} title="Digital PR Pipeline" />{pr.map((item) => <div className="result-card" key={item._id}><span>{item.type} · {item.expectedImpact}</span><strong>{item.idea}</strong><p>{item.targetPublication} · {item.pitchAngle}</p></div>)}<ListEmpty items={pr} text="Generate research, commentary, interview, podcast and webinar concepts." /></div><div className="panel"><PanelTitle icon={MessageCircle} title="Outreach Status" />{campaigns.map((item) => <div className="data-row" key={item._id}><div><strong>{item.campaignName}</strong><span>{item.emails?.filter((email) => email.status === "sent").length || 0} sent · {item.responses?.length || 0} responses</span></div><span className="chip">{item.status}</span></div>)}<ListEmpty items={campaigns} text="Outreach is draft-only until a permitted user approves sending." /></div></section>
    <section className="split-grid"><div className="panel"><PanelTitle icon={Link2} title="Backlink Monitor" />{records.slice(0, 15).map((item) => <div className="data-row" key={item._id}><div><strong>{item.sourceDomain}</strong><span>{item.anchorText || "No anchor"} · {item.linkType} · {item.sourceURL}</span></div><span className={item.status === "live" ? "chip success" : "chip"}>{item.status}</span></div>)}<ListEmpty items={records} text="Import verified backlink records before monitoring." /></div><div className="panel"><PanelTitle icon={Wand2} title="Next Recommendations" />{recommendations.map((item) => <div className="action-item" key={item._id}><ChevronRight size={16} />{item.action}</div>)}<ListEmpty items={recommendations} text="Generate the monthly authority report for cross-engine recommendations." /></div></section>
    <CrudPanel title="Authority Growth Report" description="New/lost links, authority change, PR activity, outreach and next actions."><div className="result-card"><span>{detail?.report?.createdAt ? new Date(detail.report.createdAt).toLocaleDateString() : "No report yet"}</span><strong>{detail?.report?.score?.overallScore ?? "—"}/100 · change {detail?.report?.authorityChange ?? "baseline"}</strong><p>{detail?.report?.nextRecommendations?.join(" · ") || "Queue a report after importing or monitoring backlink evidence."}</p></div></CrudPanel>
  </div>;
}
