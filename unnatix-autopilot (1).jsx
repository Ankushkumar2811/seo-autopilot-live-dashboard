import React, { useState, useEffect, useCallback } from "react";
import { MapPin, MessageCircle, Calendar, ListChecks, Plus, Trash2, Copy, Check, TrendingUp, ExternalLink, Sparkles, Link2, Loader2, RefreshCw } from "lucide-react";

// ---- storage helpers ----
const K = "unnatix-autopilot-v1";

const defaultData = {
  clients: [
    { id: "c1", name: "UnnatiX Technologies", gmbUrl: "" },
  ],
  activeClientId: "c1",
  reviewRequests: {}, // clientId -> [{id, customer, phone, status, date}]
  posts: {}, // clientId -> [{id, week, idea, status}]
  checklist: {}, // clientId -> [{id, label, done, category}]
  backlinks: {}, // clientId -> [{id, site, contactEmail, url, status, notes, date}]
  contentIdeas: {}, // clientId -> [{id, text, keyword, date}]
};

const defaultChecklist = [
  { id: "s1", category: "Website", label: "Page speed under 3s (mobile)", done: false },
  { id: "s2", category: "Website", label: "Meta title + description on every page", done: false },
  { id: "s3", category: "Website", label: "No broken links / 404s", done: false },
  { id: "s4", category: "Website", label: "Schema markup (LocalBusiness) added", done: false },
  { id: "s5", category: "Website", label: "Mobile responsive check", done: false },
  { id: "g1", category: "GMB", label: "NAP consistent across directories", done: false },
  { id: "g2", category: "GMB", label: "Business name follows Google guidelines", done: false },
  { id: "g3", category: "GMB", label: "Weekly photo/post uploaded", done: false },
  { id: "g4", category: "GMB", label: "Q&A section monitored", done: false },
  { id: "g5", category: "GMB", label: "Categories + services updated", done: false },
];

function load() {
  try {
    const raw = localStorageFallback();
    return raw || defaultData;
  } catch {
    return defaultData;
  }
}
function localStorageFallback() {
  return null; // artifacts can't use localStorage; state lives in memory + window.storage
}

export default function App() {
  const [data, setData] = useState(defaultData);
  const [tab, setTab] = useState("reviews");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [newClientName, setNewClientName] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);

  // load from persistent storage
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("app-data");
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setData({ ...defaultData, ...parsed });
        }
      } catch (e) {
        // no data yet, use defaults
      }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setData(next);
    try {
      await window.storage.set("app-data", JSON.stringify(next));
    } catch (e) {
      console.error("save failed", e);
    }
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingPin}>
          <MapPin size={28} color="#F2A93B" />
        </div>
        <p style={{ color: "#9FB4B8", fontFamily: "Inter, sans-serif", fontSize: 14, marginTop: 12 }}>
          Loading autopilot...
        </p>
      </div>
    );
  }

  const activeClient = data.clients.find((c) => c.id === data.activeClientId) || data.clients[0];
  const clientReviews = data.reviewRequests[activeClient.id] || [];
  const clientPosts = data.posts[activeClient.id] || [];
  const clientChecklist = data.checklist[activeClient.id] || defaultChecklist;
  const clientBacklinks = data.backlinks[activeClient.id] || [];
  const clientContentIdeas = data.contentIdeas[activeClient.id] || [];

  const rankingScore = Math.round(
    (clientChecklist.filter((c) => c.done).length / clientChecklist.length) * 100
  );

  // ---- actions ----
  const addClient = () => {
    if (!newClientName.trim()) return;
    const id = "c" + Date.now();
    const next = {
      ...data,
      clients: [...data.clients, { id, name: newClientName.trim(), gmbUrl: "" }],
      activeClientId: id,
    };
    persist(next);
    setNewClientName("");
    setShowAddClient(false);
  };

  const updateClientGmb = (url) => {
    const next = {
      ...data,
      clients: data.clients.map((c) => (c.id === activeClient.id ? { ...c, gmbUrl: url } : c)),
    };
    persist(next);
  };

  const addReviewRequest = (customer, phone) => {
    if (!customer.trim() || !phone.trim()) return;
    const entry = {
      id: "r" + Date.now(),
      customer: customer.trim(),
      phone: phone.trim(),
      status: "sent",
      date: new Date().toISOString().slice(0, 10),
    };
    const next = {
      ...data,
      reviewRequests: {
        ...data.reviewRequests,
        [activeClient.id]: [entry, ...clientReviews],
      },
    };
    persist(next);
  };

  const toggleReviewStatus = (id) => {
    const updated = clientReviews.map((r) =>
      r.id === id ? { ...r, status: r.status === "sent" ? "reviewed" : "sent" } : r
    );
    persist({ ...data, reviewRequests: { ...data.reviewRequests, [activeClient.id]: updated } });
  };

  const deleteReview = (id) => {
    const updated = clientReviews.filter((r) => r.id !== id);
    persist({ ...data, reviewRequests: { ...data.reviewRequests, [activeClient.id]: updated } });
  };

  const addPost = (week, idea) => {
    if (!idea.trim()) return;
    const entry = { id: "p" + Date.now(), week: week || "This week", idea: idea.trim(), status: "planned" };
    const next = {
      ...data,
      posts: { ...data.posts, [activeClient.id]: [entry, ...clientPosts] },
    };
    persist(next);
  };

  const togglePostStatus = (id) => {
    const updated = clientPosts.map((p) =>
      p.id === id ? { ...p, status: p.status === "planned" ? "posted" : "planned" } : p
    );
    persist({ ...data, posts: { ...data.posts, [activeClient.id]: updated } });
  };

  const deletePost = (id) => {
    const updated = clientPosts.filter((p) => p.id !== id);
    persist({ ...data, posts: { ...data.posts, [activeClient.id]: updated } });
  };

  const toggleChecklistItem = (id) => {
    const base = data.checklist[activeClient.id] || defaultChecklist;
    const updated = base.map((c) => (c.id === id ? { ...c, done: !c.done } : c));
    persist({ ...data, checklist: { ...data.checklist, [activeClient.id]: updated } });
  };

  const addBacklink = (site, url, contactEmail) => {
    if (!site.trim()) return;
    const entry = {
      id: "b" + Date.now(),
      site: site.trim(),
      url: url.trim(),
      contactEmail: contactEmail.trim(),
      status: "identified",
      date: new Date().toISOString().slice(0, 10),
    };
    persist({ ...data, backlinks: { ...data.backlinks, [activeClient.id]: [entry, ...clientBacklinks] } });
  };

  const cycleBacklinkStatus = (id) => {
    const order = ["identified", "contacted", "replied", "live"];
    const updated = clientBacklinks.map((b) => {
      if (b.id !== id) return b;
      const idx = order.indexOf(b.status);
      return { ...b, status: order[(idx + 1) % order.length] };
    });
    persist({ ...data, backlinks: { ...data.backlinks, [activeClient.id]: updated } });
  };

  const deleteBacklink = (id) => {
    const updated = clientBacklinks.filter((b) => b.id !== id);
    persist({ ...data, backlinks: { ...data.backlinks, [activeClient.id]: updated } });
  };

  const addContentIdea = (text, keyword) => {
    const entry = { id: "ci" + Date.now(), text, keyword, date: new Date().toISOString().slice(0, 10) };
    persist({ ...data, contentIdeas: { ...data.contentIdeas, [activeClient.id]: [entry, ...clientContentIdeas] } });
  };

  const deleteContentIdea = (id) => {
    const updated = clientContentIdeas.filter((c) => c.id !== id);
    persist({ ...data, contentIdeas: { ...data.contentIdeas, [activeClient.id]: updated } });
  };

  const buildWhatsappLink = (phone, customer) => {
    const gmb = activeClient.gmbUrl || "[apna GMB review link yahan add karo]";
    const msg = `Hi ${customer}, UnnatiX Technologies ki taraf se dhanyavaad! Agar aap satisfied hain to 1 minute mein humein Google pe ek review de sakte hain? ${gmb}`;
    const digits = phone.replace(/[^0-9]/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };

  const copyLink = (link, id) => {
    navigator.clipboard?.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div style={styles.page}>
      <style>{fontImport}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoMark}>
            <MapPin size={20} color="#0F2027" strokeWidth={2.5} />
          </div>
          <div>
            <div style={styles.brandName}>UnnatiX Autopilot</div>
            <div style={styles.brandSub}>Har din thoda upar</div>
          </div>
        </div>
        <div style={styles.scoreBadge}>
          <TrendingUp size={14} color="#F2A93B" />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#F2A93B", fontWeight: 600 }}>
            {rankingScore}% ready
          </span>
        </div>
      </header>

      {/* Client selector */}
      <div style={styles.clientBar}>
        <select
          value={activeClient.id}
          onChange={(e) => persist({ ...data, activeClientId: e.target.value })}
          style={styles.clientSelect}
        >
          {data.clients.map((c) => (
            <option key={c.id} value={c.id} style={{ background: "#16323F" }}>
              {c.name}
            </option>
          ))}
        </select>
        {!showAddClient ? (
          <button style={styles.addClientBtn} onClick={() => setShowAddClient(true)}>
            <Plus size={14} /> Client
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <input
              autoFocus
              placeholder="Client naam"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addClient()}
              style={styles.miniInput}
            />
            <button style={styles.addClientBtn} onClick={addClient}>
              Add
            </button>
          </div>
        )}
      </div>

      {/* GMB url input */}
      <div style={styles.gmbUrlWrap}>
        <ExternalLink size={13} color="#6E8A8F" />
        <input
          placeholder="Client ka GMB review link paste karo (g.page/r/...)"
          value={activeClient.gmbUrl}
          onChange={(e) => updateClientGmb(e.target.value)}
          style={styles.gmbUrlInput}
        />
      </div>

      {/* Tabs */}
      <nav style={styles.tabs}>
        {[
          { id: "reviews", label: "Reviews", icon: MessageCircle },
          { id: "posts", label: "GMB Posts", icon: Calendar },
          { id: "content", label: "AI Content", icon: Sparkles },
          { id: "backlinks", label: "Backlinks", icon: Link2 },
          { id: "checklist", label: "SEO Health", icon: ListChecks },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...styles.tabBtn,
              ...(tab === t.id ? styles.tabBtnActive : {}),
            }}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {tab === "reviews" && (
          <ReviewsTab
            reviews={clientReviews}
            onAdd={addReviewRequest}
            onToggle={toggleReviewStatus}
            onDelete={deleteReview}
            buildLink={buildWhatsappLink}
            copyLink={copyLink}
            copiedId={copiedId}
          />
        )}
        {tab === "posts" && (
          <PostsTab posts={clientPosts} onAdd={addPost} onToggle={togglePostStatus} onDelete={deletePost} />
        )}
        {tab === "content" && (
          <ContentTab
            client={activeClient}
            ideas={clientContentIdeas}
            onSave={addContentIdea}
            onDelete={deleteContentIdea}
          />
        )}
        {tab === "backlinks" && (
          <BacklinksTab
            backlinks={clientBacklinks}
            onAdd={addBacklink}
            onCycle={cycleBacklinkStatus}
            onDelete={deleteBacklink}
          />
        )}
        {tab === "checklist" && (
          <ChecklistTab items={clientChecklist} onToggle={toggleChecklistItem} score={rankingScore} />
        )}
      </main>

      <footer style={styles.footer}>
        Genuine reviews + consistent GMB activity = real, lasting ranking. Data safe rehta hai is device pe.
      </footer>
    </div>
  );
}

// ---------------- Tabs ----------------

function ReviewsTab({ reviews, onAdd, onToggle, onDelete, buildLink, copyLink, copiedId }) {
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");

  const sentCount = reviews.filter((r) => r.status === "sent").length;
  const reviewedCount = reviews.filter((r) => r.status === "reviewed").length;

  return (
    <div>
      <SectionIntro
        title="Review Requests"
        desc="Har naye client ke baad yahan add karo. WhatsApp link auto-generate hoga with your GMB link attached."
      />

      <div style={styles.statsRow}>
        <StatPill label="Requests sent" value={sentCount} />
        <StatPill label="Reviews confirmed" value={reviewedCount} accent />
      </div>

      <div style={styles.formCard}>
        <input
          placeholder="Customer ka naam"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="WhatsApp number (with country code)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={styles.input}
        />
        <button
          style={styles.primaryBtn}
          onClick={() => {
            onAdd(customer, phone);
            setCustomer("");
            setPhone("");
          }}
        >
          <Plus size={15} /> Add & generate link
        </button>
      </div>

      <div style={styles.list}>
        {reviews.length === 0 && <EmptyState text="Abhi koi review request nahi hai. Upar se pehli add karo." />}
        {reviews.map((r) => {
          const link = buildLink(r.phone, r.customer);
          return (
            <div key={r.id} style={styles.rowCard}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.rowTitle}>{r.customer}</div>
                <div style={styles.rowSub}>
                  {r.phone} • {r.date}
                </div>
              </div>
              <button
                style={{
                  ...styles.statusChip,
                  ...(r.status === "reviewed" ? styles.statusChipDone : {}),
                }}
                onClick={() => onToggle(r.id)}
              >
                {r.status === "reviewed" ? "Reviewed ✓" : "Awaiting"}
              </button>
              <a href={link} target="_blank" rel="noreferrer" style={styles.iconBtn} title="Open WhatsApp">
                <MessageCircle size={15} />
              </a>
              <button style={styles.iconBtn} onClick={() => copyLink(link, r.id)} title="Copy link">
                {copiedId === r.id ? <Check size={15} color="#4ECDC4" /> : <Copy size={15} />}
              </button>
              <button style={styles.iconBtnDanger} onClick={() => onDelete(r.id)} title="Remove">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostsTab({ posts, onAdd, onToggle, onDelete }) {
  const [week, setWeek] = useState("");
  const [idea, setIdea] = useState("");

  const posted = posts.filter((p) => p.status === "posted").length;

  return (
    <div>
      <SectionIntro
        title="GMB Post Calendar"
        desc="Weekly posts plan karo — offers, updates, photos. Consistency GMB ranking ka bada factor hai."
      />

      <div style={styles.statsRow}>
        <StatPill label="Planned" value={posts.length - posted} />
        <StatPill label="Posted" value={posted} accent />
      </div>

      <div style={styles.formCard}>
        <input
          placeholder="Week label (e.g. 8-14 July)"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          style={styles.input}
        />
        <textarea
          placeholder="Post idea (e.g. Monsoon offer poster + before/after client photo)"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          style={{ ...styles.input, minHeight: 60, resize: "vertical" }}
        />
        <button
          style={styles.primaryBtn}
          onClick={() => {
            onAdd(week, idea);
            setWeek("");
            setIdea("");
          }}
        >
          <Plus size={15} /> Add to calendar
        </button>
      </div>

      <div style={styles.list}>
        {posts.length === 0 && <EmptyState text="Koi post plan nahi hai abhi. Pehla idea upar add karo." />}
        {posts.map((p) => (
          <div key={p.id} style={styles.rowCard}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.rowSub}>{p.week}</div>
              <div style={styles.rowTitle}>{p.idea}</div>
            </div>
            <button
              style={{ ...styles.statusChip, ...(p.status === "posted" ? styles.statusChipDone : {}) }}
              onClick={() => onToggle(p.id)}
            >
              {p.status === "posted" ? "Posted ✓" : "Planned"}
            </button>
            <button style={styles.iconBtnDanger} onClick={() => onDelete(p.id)} title="Remove">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistTab({ items, onToggle, score }) {
  const categories = [...new Set(items.map((i) => i.category))];
  return (
    <div>
      <SectionIntro
        title="SEO Health Checklist"
        desc="Website + GMB dono ke basics cover karo. Score jitna zyada, ranking foundation utni mazboot."
      />

      <div style={styles.scoreCard}>
        <div style={styles.scoreRing(score)}>
          <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 22, fontWeight: 700, color: "#EDEDED" }}>
            {score}%
          </span>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9FB4B8" }}>
          {score < 50 ? "Foundation abhi weak hai — pehle basics fix karo." : score < 85 ? "Achha chal raha hai, thoda aur." : "Solid foundation — ab consistency maintain karo."}
        </div>
      </div>

      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div style={styles.categoryLabel}>{cat}</div>
          <div style={styles.list}>
            {items
              .filter((i) => i.category === cat)
              .map((i) => (
                <div key={i.id} style={styles.checkRow} onClick={() => onToggle(i.id)}>
                  <div style={{ ...styles.checkbox, ...(i.done ? styles.checkboxDone : {}) }}>
                    {i.done && <Check size={12} color="#0F2027" strokeWidth={3} />}
                  </div>
                  <span style={{ ...styles.checkLabel, ...(i.done ? styles.checkLabelDone : {}) }}>{i.label}</span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContentTab({ client, ideas, onSave, onDelete }) {
  const [keyword, setKeyword] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    setDrafts([]);
    try {
      const prompt = `Tum ek Indian digital marketing agency ke liye SEO content writer ho. Business: "${client.name}"${
        businessType ? ` (${businessType})` : ""
      }. Target keyword/topic: "${keyword}".

Generate 3 short Google Business Profile post drafts (Hinglish tone, warm aur local feel, har ek 40-60 words, ek clear CTA ke saath). Also generate 3 blog/content title ideas targeting this keyword for SEO.

Respond ONLY in this exact JSON format, no markdown, no preamble:
{"posts": ["...", "...", "..."], "titles": ["...", "...", "..."]}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      const textBlock = data?.content?.find((b) => b.type === "text");
      const clean = (textBlock?.text || "").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const combined = [
        ...(parsed.posts || []).map((t) => ({ text: t, kind: "GMB Post" })),
        ...(parsed.titles || []).map((t) => ({ text: t, kind: "Blog Title" })),
      ];
      setDrafts(combined);
    } catch (e) {
      setError("Generate nahi ho paya, ek baar phir try karo.");
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionIntro
        title="AI Content Generator"
        desc="Keyword daalo, AI GMB post drafts + blog title ideas bana dega. Jo pasand aaye save kar lo."
      />

      <div style={styles.formCard}>
        <input
          placeholder="Business type (e.g. dental clinic, digital agency)"
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Keyword / topic (e.g. root canal treatment Noida)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          style={styles.input}
        />
        <button style={styles.primaryBtn} onClick={generate} disabled={loading}>
          {loading ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
          {loading ? "Generating..." : "Generate ideas"}
        </button>
        {error && <div style={{ color: "#D95A5A", fontSize: 12 }}>{error}</div>}
      </div>

      {drafts.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={styles.categoryLabel}>Fresh drafts</div>
          <div style={styles.list}>
            {drafts.map((d, i) => (
              <div key={i} style={styles.rowCard}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.rowSub}>{d.kind}</div>
                  <div style={{ ...styles.rowTitle, fontWeight: 400, marginTop: 2 }}>{d.text}</div>
                </div>
                <button
                  style={styles.iconBtn}
                  title="Save"
                  onClick={() => onSave(d.text, keyword)}
                >
                  <Plus size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.categoryLabel}>Saved ideas</div>
      <div style={styles.list}>
        {ideas.length === 0 && <EmptyState text="Koi saved idea nahi hai abhi." />}
        {ideas.map((idea) => (
          <div key={idea.id} style={styles.rowCard}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.rowSub}>{idea.keyword} • {idea.date}</div>
              <div style={{ ...styles.rowTitle, fontWeight: 400, marginTop: 2 }}>{idea.text}</div>
            </div>
            <button style={styles.iconBtnDanger} onClick={() => onDelete(idea.id)} title="Remove">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BacklinksTab({ backlinks, onAdd, onCycle, onDelete }) {
  const [site, setSite] = useState("");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");

  const statusMeta = {
    identified: { label: "Identified", color: "#9FB4B8" },
    contacted: { label: "Contacted", color: "#F2A93B" },
    replied: { label: "Replied", color: "#5AAAD9" },
    live: { label: "Live ✓", color: "#4ECDC4" },
  };

  return (
    <div>
      <SectionIntro
        title="Backlink Outreach"
        desc="Directories, guest-post sites, local citations track karo. White-hat outreach hi — genuine listings/guest posts, koi bulk/spam links nahi."
      />

      <div style={styles.formCard}>
        <input placeholder="Site / directory naam" value={site} onChange={(e) => setSite(e.target.value)} style={styles.input} />
        <input placeholder="Site URL" value={url} onChange={(e) => setUrl(e.target.value)} style={styles.input} />
        <input placeholder="Contact email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
        <button
          style={styles.primaryBtn}
          onClick={() => {
            onAdd(site, url, email);
            setSite("");
            setUrl("");
            setEmail("");
          }}
        >
          <Plus size={15} /> Add prospect
        </button>
      </div>

      <div style={styles.list}>
        {backlinks.length === 0 && <EmptyState text="Koi backlink prospect nahi hai abhi." />}
        {backlinks.map((b) => {
          const meta = statusMeta[b.status];
          return (
            <div key={b.id} style={styles.rowCard}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.rowTitle}>{b.site}</div>
                <div style={styles.rowSub}>{b.url || "no url"} • {b.date}</div>
              </div>
              <button
                style={{ ...styles.statusChip, color: meta.color, background: `${meta.color}22` }}
                onClick={() => onCycle(b.id)}
                title="Click to update status"
              >
                {meta.label}
              </button>
              <button style={styles.iconBtnDanger} onClick={() => onDelete(b.id)} title="Remove">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- small pieces ----------------

function SectionIntro({ title, desc }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <p style={styles.sectionDesc}>{desc}</p>
    </div>
  );
}

function StatPill({ label, value, accent }) {
  return (
    <div style={{ ...styles.statPill, ...(accent ? styles.statPillAccent : {}) }}>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9FB4B8" }}>{label}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={styles.emptyState}>{text}</div>;
}

// ---------------- styles ----------------

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap');
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0F2027 0%, #14282F 100%)",
    fontFamily: "Inter, sans-serif",
    color: "#EDEDED",
    paddingBottom: 24,
  },
  loadingWrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#0F2027",
  },
  loadingPin: { animation: "none" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 18px 12px",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 9,
    background: "#F2A93B",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandName: { fontFamily: "Space Grotesk, sans-serif", fontSize: 16, fontWeight: 700, lineHeight: 1.1 },
  brandSub: { fontSize: 11, color: "#6E8A8F", marginTop: 2 },
  scoreBadge: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "rgba(242,169,59,0.12)",
    border: "1px solid rgba(242,169,59,0.3)",
    borderRadius: 20,
    padding: "5px 10px",
  },
  clientBar: {
    display: "flex",
    gap: 8,
    padding: "0 18px 10px",
    alignItems: "center",
  },
  clientSelect: {
    flex: 1,
    background: "#16323F",
    border: "1px solid #22434C",
    color: "#EDEDED",
    borderRadius: 8,
    padding: "9px 10px",
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    outline: "none",
  },
  addClientBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "#F2A93B",
    color: "#0F2027",
    border: "none",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    whiteSpace: "nowrap",
  },
  miniInput: {
    background: "#16323F",
    border: "1px solid #22434C",
    color: "#EDEDED",
    borderRadius: 8,
    padding: "9px 10px",
    fontSize: 13,
    outline: "none",
    width: 110,
  },
  gmbUrlWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "0 18px 14px",
    background: "rgba(110,138,143,0.08)",
    border: "1px solid #1D3941",
    borderRadius: 8,
    padding: "8px 10px",
  },
  gmbUrlInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#C9D6D8",
    fontSize: 12.5,
    outline: "none",
    fontFamily: "Inter, sans-serif",
  },
  tabs: {
    display: "flex",
    gap: 6,
    padding: "0 18px 14px",
    borderBottom: "1px solid #1D3941",
  },
  tabBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "none",
    color: "#6E8A8F",
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  },
  tabBtnActive: {
    background: "#1D3941",
    color: "#F2A93B",
  },
  main: { padding: "18px 18px 0" },
  sectionTitle: { fontFamily: "Space Grotesk, sans-serif", fontSize: 18, fontWeight: 700, margin: 0 },
  sectionDesc: { fontSize: 12.5, color: "#9FB4B8", marginTop: 4, lineHeight: 1.5 },
  statsRow: { display: "flex", gap: 10, marginBottom: 16 },
  statPill: {
    flex: 1,
    background: "#16323F",
    border: "1px solid #22434C",
    borderRadius: 10,
    padding: "10px 14px",
  },
  statPillAccent: { borderColor: "rgba(78,205,196,0.4)" },
  formCard: {
    background: "#16323F",
    border: "1px solid #22434C",
    borderRadius: 12,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 16,
  },
  input: {
    background: "#0F2027",
    border: "1px solid #22434C",
    color: "#EDEDED",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13.5,
    outline: "none",
    fontFamily: "Inter, sans-serif",
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    background: "#F2A93B",
    color: "#0F2027",
    border: "none",
    borderRadius: 8,
    padding: "10px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    marginTop: 2,
  },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  rowCard: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#16323F",
    border: "1px solid #1D3941",
    borderRadius: 10,
    padding: "10px 12px",
  },
  rowTitle: { fontSize: 13.5, fontWeight: 600, color: "#EDEDED" },
  rowSub: { fontSize: 11.5, color: "#6E8A8F", marginTop: 2 },
  statusChip: {
    fontSize: 11,
    background: "rgba(110,138,143,0.15)",
    color: "#9FB4B8",
    border: "none",
    borderRadius: 20,
    padding: "5px 10px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "Inter, sans-serif",
  },
  statusChipDone: { background: "rgba(78,205,196,0.15)", color: "#4ECDC4" },
  iconBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "rgba(110,138,143,0.1)",
    color: "#C9D6D8",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
    textDecoration: "none",
  },
  iconBtnDanger: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "rgba(217,90,90,0.1)",
    color: "#D95A5A",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
  },
  emptyState: {
    textAlign: "center",
    padding: "28px 12px",
    color: "#6E8A8F",
    fontSize: 13,
    background: "#16323F",
    borderRadius: 10,
    border: "1px dashed #22434C",
  },
  scoreCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#16323F",
    border: "1px solid #22434C",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },
  scoreRing: (score) => ({
    width: 56,
    height: 56,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `conic-gradient(#F2A93B ${score * 3.6}deg, #22434C 0deg)`,
    flexShrink: 0,
  }),
  categoryLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6E8A8F",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#16323F",
    border: "1px solid #1D3941",
    borderRadius: 10,
    padding: "10px 12px",
    cursor: "pointer",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    border: "1.5px solid #3A5560",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxDone: { background: "#4ECDC4", borderColor: "#4ECDC4" },
  checkLabel: { fontSize: 13, color: "#EDEDED" },
  checkLabelDone: { color: "#6E8A8F", textDecoration: "line-through" },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#4A6870",
    padding: "20px 18px 4px",
  },
};
