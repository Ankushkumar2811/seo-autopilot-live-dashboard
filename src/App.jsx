import React, { useMemo, useState } from "react";
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

const STORAGE_KEY = "unnatix-seo-autopilot-live-v2";
const USED_TITLES_KEY = "unnatix-seo-autopilot-used-blog-titles-v1";

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
      websiteUrl: "https://unnatix.com",
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
];

function safeLoad() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...seedData, ...JSON.parse(raw) } : seedData;
  } catch {
    return seedData;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function loadUsedTitles() {
  try {
    const raw = localStorage.getItem(USED_TITLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsedTitles(titles) {
  const clean = Array.from(new Set(titles.map((title) => String(title || "").trim()).filter(Boolean))).slice(-1000);
  localStorage.setItem(USED_TITLES_KEY, JSON.stringify(clean));
  return clean;
}

export default function App() {
  const [data, setData] = useState(safeLoad);
  const [tab, setTab] = useState("overview");
  const [copiedId, setCopiedId] = useState("");
  const [clientDraft, setClientDraft] = useState({ name: "", type: "", city: "" });

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
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

        <div className="mini-panel">
          <div className="mini-panel-title">Add client</div>
          <input value={clientDraft.name} onChange={(event) => setClientDraft({ ...clientDraft, name: event.target.value })} placeholder="Business name" />
          <input value={clientDraft.type} onChange={(event) => setClientDraft({ ...clientDraft, type: event.target.value })} placeholder="Business type" />
          <input value={clientDraft.city} onChange={(event) => setClientDraft({ ...clientDraft, city: event.target.value })} placeholder="City" />
          <button className="primary-button compact" onClick={addClient}><Plus size={16} /> Add client</button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Live local SEO command center</p>
            <h1>{activeClient.name}</h1>
            <p className="subline">{activeClient.type} in {activeClient.city} · {activeClient.goal}</p>
          </div>
          <div className="top-actions">
            {activeClient.gmbUrl && <a className="ghost-button" href={activeClient.gmbUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> GBP link</a>}
            <button className="ghost-button" onClick={exportCsv}><Download size={16} /> Export report</button>
          </div>
        </header>

        <section className="client-strip">
          <div className="input-group wide">
            <label>Website URL</label>
            <input value={activeClient.websiteUrl || ""} onChange={(event) => updateClient({ websiteUrl: event.target.value })} placeholder="https://example.com" />
          </div>
          <div className="input-group">
            <label>Google review link</label>
            <input value={activeClient.gmbUrl} onChange={(event) => updateClient({ gmbUrl: event.target.value })} placeholder="Paste Google Business review URL" />
          </div>
        </section>

        {tab === "overview" && <Overview metrics={metrics} reviews={reviews} posts={posts} backlinks={backlinks} health={health} setTab={setTab} />}
        {tab === "reviews" && <Reviews reviews={reviews} client={activeClient} copiedId={copiedId} setCopiedId={setCopiedId} onChange={(next) => setCollection("reviews", next)} />}
        {tab === "posts" && <Posts posts={posts} onChange={(next) => setCollection("posts", next)} />}
        {tab === "scheduler" && <BlogScheduler schedules={blogSchedules} onChange={(next) => setCollection("blogSchedules", next)} />}
        {tab === "content" && <Content ideas={ideas} client={activeClient} onChange={(next) => setCollection("contentIdeas", next)} />}
        {tab === "backlinks" && <Backlinks backlinks={backlinks} onChange={(next) => setCollection("backlinks", next)} />}
        {tab === "health" && <Health items={health} score={metrics.healthScore} onChange={(next) => setCollection("health", next)} />}
        {tab === "autopilot" && <Autopilot client={activeClient} onSaveIdea={(idea) => setCollection("contentIdeas", [idea, ...ideas])} />}
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

function BlogScheduler({ schedules, onChange }) {
  const [draft, setDraft] = useState({ date: "", title: "", keywords: "" });
  const [planInput, setPlanInput] = useState({ topic: "SEO services", city: "Indore", count: 5, startDate: today(), cadenceDays: 3 });
  const [planBusy, setPlanBusy] = useState(false);
  const [planMessage, setPlanMessage] = useState("");
  const [planItems, setPlanItems] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState({});
  const [usedTitles, setUsedTitles] = useState(loadUsedTitles);
  const [bulkText, setBulkText] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");

  const pending = schedules.filter((item) => !item.postId && item.status !== "scheduled");
  const excludedTitles = [...usedTitles, ...schedules.map((item) => item.title)];

  function rememberTitles(titles) {
    setUsedTitles(saveUsedTitles([...loadUsedTitles(), ...titles]));
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

function Backlinks({ backlinks, onChange }) {
  const [draft, setDraft] = useState({ site: "", url: "", authority: 30 });
  const statuses = ["identified", "contacted", "approved", "live"];
  function add() {
    if (!draft.site.trim()) return;
    onChange([{ id: uid("b"), ...draft, site: draft.site.trim(), status: "identified", date: today() }, ...backlinks]);
    setDraft({ site: "", url: "", authority: 30 });
  }
  return (
    <CrudPanel title="Backlink and citation tracker" description="Track genuine directories, partner mentions, local citations, and editorial outreach from prospect to live link.">
      <div className="form-row">
        <input value={draft.site} onChange={(event) => setDraft({ ...draft, site: event.target.value })} placeholder="Website or directory" />
        <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="URL" />
        <input type="number" min="1" max="100" value={draft.authority} onChange={(event) => setDraft({ ...draft, authority: Number(event.target.value) })} />
        <button className="primary-button" onClick={add}><Plus size={16} /> Add prospect</button>
      </div>
      <ListEmpty items={backlinks} text="No backlink prospect yet." />
      {backlinks.map((item) => (
        <div className="data-row" key={item.id}>
          <div><strong>{item.site}</strong><span>{item.url || "URL pending"} · DA {item.authority} · {item.date}</span></div>
          <button className={item.status === "live" ? "chip success" : "chip"} onClick={() => onChange(backlinks.map((row) => row.id === item.id ? { ...row, status: statuses[(statuses.indexOf(row.status) + 1) % statuses.length] } : row))}>{item.status}</button>
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
          {draft.generatedImage && <div className="result-card"><span>Image result</span><p>{draft.generatedImage.message || draft.generatedImage.mode}</p></div>}
        </div>
      )}
    </CrudPanel>
  );
}

async function api(path, body) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || data.error || `Request failed: ${response.status}`);
  }
  return data;
}
