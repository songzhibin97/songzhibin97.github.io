// app.jsx — Bin's terminal-profile (orchestrates the terminal stream).
//
// All bin's data (identity, repos, orgs, commits, tech stack, ...) lives in
// profile-data.js and is loaded through profile-source.js. To repoint to a
// live source (GitHub API), see profile-source.js — no JSX changes here.

const { useState, useEffect, useMemo, useRef } = React;

// ─── Data binding ────────────────────────────────────────────────────────
const DEFAULT_PROFILE_DATA = window.PROFILE_DATA || {};

let PROFILE;
let PINNED;
let OWN_REPOS;
let ORGS;
let ACHIEVEMENTS;
let TECH;
let SIGNATURES;
let COMMITS;
let SHELL_ENV;
let HEATMAP;
let HEATMAP_COUNTS;
let HEATMAP_MONTHS;

function applyProfileData(data) {
  const PD = data || DEFAULT_PROFILE_DATA;
  PROFILE      = { ...(PD.identity || {}), stats: PD.stats || {} };
  PINNED       = PD.pinned || [];
  OWN_REPOS    = PD.ownRepos || [];
  ORGS         = PD.orgs || [];
  ACHIEVEMENTS = PD.achievements || [];
  TECH         = PD.tech || [];
  SIGNATURES   = PD.signatures || [];
  COMMITS      = PD.commits || [];
  SHELL_ENV    = PD.shellEnv || {};
  HEATMAP      = PD.heatmap?.weeks || makeHeatmap();
  HEATMAP_COUNTS = PD.heatmap?.counts || null;
  HEATMAP_MONTHS = PD.heatmap?.months || makeHeatmapMonths();
}

applyProfileData(DEFAULT_PROFILE_DATA);

// ─── Contribution heatmap (12 weeks × 7 days) — synthetic but plausible ──
function makeHeatmap() {
  const seed = (i, j) => {
    const n = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
    return n - Math.floor(n);
  };
  const grid = [];
  for (let w = 0; w < 26; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const r = seed(w, d);
      let v = 0;
      if (r > 0.85) v = 4;
      else if (r > 0.65) v = 3;
      else if (r > 0.45) v = 2;
      else if (r > 0.25) v = 1;
      col.push(v);
    }
    grid.push(col);
  }
  return grid;
}

function makeHeatmapMonths(weekCount = 26) {
  const start = startOfWeek(new Date(Date.now() - (weekCount - 1) * 7 * 24 * 60 * 60 * 1000));
  const labels = [];
  let prev = "";
  for (let i = 0; i < weekCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 7);
    const label = d.toLocaleString("en-US", { month: "short" });
    if (i === 0 || label !== prev) labels.push({ label, col: i + 1 });
    prev = label;
  }
  return labels;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// ─── Defaults persisted via tweaks ───────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mode": "auto",
  "accent": "amber",
  "density": "compact",
  "showCursor": true,
  "showAscii": true,
  "replayBoot": false
}/*EDITMODE-END*/;

// Per-mode metadata: which accent variant + heatmap base color
const MODE_META = {
  noir:  { isLight: false, hmBase: "#1a1c1f" },
  slate: { isLight: false, hmBase: "#2b313b" },
  solar: { isLight: false, hmBase: "#184049" },
  paper: { isLight: true,  hmBase: "#e8e5dc" },
  // legacy aliases
  dark:  { isLight: false, hmBase: "#1a1c1f" },
  light: { isLight: true,  hmBase: "#e8e5dc" },
};

const ACCENTS = {
  // Dark-mode accents (and their light-mode counterparts)
  amber: { c: "#e5a648", dim: "#7a5a26", glow: "rgba(229,166,72,0.18)",
           lc: "#a8721f", ldim: "#c79352", lglow: "rgba(168,114,31,0.10)",  name: "amber" },
  mint:  { c: "#5feab6", dim: "#2f7a5e", glow: "rgba(95,234,182,0.18)",
           lc: "#1f7a52", ldim: "#4ea888", lglow: "rgba(31,122,82,0.10)",   name: "mint"  },
  cyan:  { c: "#66c4d9", dim: "#36697a", glow: "rgba(102,196,217,0.18)",
           lc: "#246a7a", ldim: "#5a9aac", lglow: "rgba(36,106,122,0.10)",  name: "cyan"  },
  mono:  { c: "#d9dadd", dim: "#6e7177", glow: "rgba(217,218,221,0.10)",
           lc: "#1a1c1f", ldim: "#6e7177", lglow: "rgba(26,28,31,0.05)",    name: "mono"  },
};

// ─── Utilities ───────────────────────────────────────────────────────────
const formatStars = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/,"") + "k" : String(n);
const ASCII_NAME = [
  "  ██████╗ ██╗███╗   ██╗",
  "  ██╔══██╗██║████╗  ██║",
  "  ██████╔╝██║██╔██╗ ██║",
  "  ██╔══██╗██║██║╚██╗██║",
  "  ██████╔╝██║██║ ╚████║",
  "  ╚═════╝ ╚═╝╚═╝  ╚═══╝",
];

// ─── BlinkingCursor ──────────────────────────────────────────────────────
// Local stub — actual Cursor lives in boot-sequence.jsx so that file can use it
// without depending on app.jsx's evaluation order. Re-export for local readability.
const Cursor = window.Cursor;

// ─── Boot sequence at top of page ────────────────────────────────────────
function BootLine({ k, v, accent }) {
  return (
    <div className="boot-line">
      <span className="dim">[</span>
      <span style={{ color: accent }}>OK</span>
      <span className="dim">]</span>
      <span style={{ marginLeft: 10 }} className="dim">{k}</span>
      <span style={{ marginLeft: 6 }}>{v}</span>
    </div>
  );
}

// ─── Status bar (tmux-like) ──────────────────────────────────────────────
function StatusBar({ accent, name, mode, autoBadge }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(time.getUTCHours()).padStart(2,"0");
  const mm = String(time.getUTCMinutes()).padStart(2,"0");
  const ss = String(time.getUTCSeconds()).padStart(2,"0");
  const fgOnAccent = (mode === "light" || mode === "paper") ? "#fbf7ea" : "#0a0b0d";
  return (
    <div className="statusbar">
      <div className="sb-left">
        <span className="sb-cell" style={{ background: accent, color: fgOnAccent }}>● bin@arch</span>
        <span className="sb-cell">~/profile</span>
        <span className="sb-cell dim">git:(main) ✓</span>
      </div>
      <div className="sb-right">
        <span className="sb-cell dim">{SHELL_ENV?.goVer || "go1.22.4"}</span>
        <span className="sb-cell dim">{SHELL_ENV?.timezone || "XI'AN · UTC+8"}</span>
        <span className="sb-cell dim">{hh}:{mm}:{ss} UTC</span>
        <span className="sb-cell" style={{ background: accent, color: fgOnAccent }}>
          {autoBadge || (mode + "·" + name)}
        </span>
      </div>
    </div>
  );
}

// ─── Section frame ───────────────────────────────────────────────────────
function Section({ id, title, count, children, accent }) {
  return (
    <section className="section" id={"sec-" + id}>
      <header className="section-head">
        <span className="section-marker" style={{ color: accent }}>§</span>
        <span className="section-id">{id}</span>
        <span className="section-title">{title}</span>
        <span className="section-rule" />
        {count != null && <span className="section-count">[{count}]</span>}
      </header>
      <div className="section-body">{children}</div>
    </section>
  );
}

// Wrapper that fades in when its `id` is in the revealed set.
function RevealSection({ id, revealed, ...rest }) {
  const isVisible = revealed.has(id);
  return (
    <div className={"reveal " + (isVisible ? "reveal-on" : "reveal-off")}
         data-section-id={id}>
      <Section id={id} {...rest} />
    </div>
  );
}

// ─── Identity card ───────────────────────────────────────────────────────
function Identity({ accent, accentName, showAscii }) {
  return (
    <div className="identity">
      <div className="identity-left">
        {showAscii && (
          <pre className="ascii-name" style={{ color: accent }}>
            {ASCII_NAME.join("\n")}
          </pre>
        )}
        <div className="who">
          <div className="who-section"># [identity]</div>
          <div className="who-out">
            <span className="kv-k">name</span>
            <span className="kv-eq">=</span>
            <span className="kv-v">"{PROFILE.name}" </span>
            <span className="dim">// {PROFILE.handle}</span>
          </div>
          <div className="who-out">
            <span className="kv-k">role</span>
            <span className="kv-eq">=</span>
            <span className="kv-v">"{PROFILE.role || "backend engineer · open-source maintainer"}"</span>
          </div>
          <div className="who-out">
            <span className="kv-k">loc </span>
            <span className="kv-eq">=</span>
            <span className="kv-v">"{PROFILE.location}"</span>
          </div>
          <div className="who-out">
            <span className="kv-k">tags</span>
            <span className="kv-eq">=</span>
            <span className="kv-v">[{(PROFILE.tags || []).join(", ")}]</span>
          </div>
          <div className="motto">
            <span className="quote-mark" style={{ color: accent }}>“</span>
            <span className="motto-zh">{PROFILE.motto}</span>
            <span className="quote-mark" style={{ color: accent }}>”</span>
            <span className="motto-en"> — {PROFILE.mottoEn}</span>
          </div>
        </div>
      </div>

      <div className="identity-right">
        <div className="stat-grid">
          <div className="stat-cell">
            <div className="stat-n" style={{ color: accent }}>{PROFILE.stats.repos}</div>
            <div className="stat-l">REPOSITORIES</div>
          </div>
          <div className="stat-cell">
            <div className="stat-n" style={{ color: accent }}>{PROFILE.stats.followers}</div>
            <div className="stat-l">FOLLOWERS</div>
          </div>
          <div className="stat-cell">
            <div className="stat-n" style={{ color: accent }}>{PROFILE.stats.starred}</div>
            <div className="stat-l">STARS GIVEN</div>
          </div>
          <div className="stat-cell">
            <div className="stat-n" style={{ color: accent }}>{ORGS.length}</div>
            <div className="stat-l">ORGS</div>
          </div>
        </div>
        <div className="achievements">
          <div className="ach-label"># [achievements]</div>
          {ACHIEVEMENTS.map(a => (
            <div className="ach-row" key={a.code}>
              <span className="ach-code" style={{ color: accent }}>▮</span>
              <span className="ach-name">{a.code.padEnd(14, " ")}</span>
              <span className="dim">×{a.count}</span>
              <span className="dim" style={{ marginLeft: 10 }}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tech stack ──────────────────────────────────────────────────────────
function TechBar({ level, accent }) {
  const cells = [0,1,2,3,4];
  return (
    <div className="tech-bar" title={`level ${level}/5`}>
      {cells.map(i => (
        <span key={i} className="tech-bar-cell"
              style={{ background: i < level ? accent : "transparent",
                       borderColor: i < level ? accent : "var(--border-2)" }} />
      ))}
      <span className="tech-bar-num dim">{level}/5</span>
    </div>
  );
}

function TechStack({ accent }) {
  return (
    <div className="techstack">
      {TECH.map(({ k, v, level }) => (
        <div className="tech-row" key={k}>
          <div className="tech-k" style={{ color: accent }}>{k.padEnd(14, ".")}</div>
          <div className="tech-v">
            {v.map((it, i) => (
              <React.Fragment key={it}>
                <span className="tech-tok">{it}</span>
                {i < v.length - 1 && <span className="tech-sep dim"> · </span>}
              </React.Fragment>
            ))}
          </div>
          <TechBar level={level} accent={accent} />
        </div>
      ))}
    </div>
  );
}

// ─── Signature themes ────────────────────────────────────────────────────
function Signatures({ accent }) {
  return (
    <div className="sigs">
      {SIGNATURES.map((s, i) => (
        <div className="sig" key={s.tag}>
          <div className="sig-num" style={{ color: accent }}>0{i+1}</div>
          <div className="sig-body">
            <div className="sig-tag">{s.tag}</div>
            <div className="sig-note dim">{s.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Pinned projects ─────────────────────────────────────────────────────
const ROLE_GLYPH = { author: "✎", maintainer: "★", contributor: "↗" };

function ProjectCard({ p, accent }) {
  return (
    <div className="proj">
      <div className="proj-head">
        <span className="proj-stripe" style={{ background: accent }} />
        <span className="proj-title">
          <span className="proj-owner dim">{p.owner}</span>
          <span className="dim"> / </span>
          <span className="proj-name">{p.name}</span>
        </span>
        <span className="proj-role" title={p.role} style={{ color: accent }}>{ROLE_GLYPH[p.role]}</span>
      </div>
      <div className="proj-desc">{p.desc}</div>
      <div className="proj-meta">
        <span className="meta-pill">{p.lang}</span>
        <span className="meta-pair"><span className="dim">★</span>{formatStars(p.stars)}</span>
        <span className="meta-pair"><span className="dim">⑂</span>{formatStars(p.forks)}</span>
        <span className="meta-pair dim role-tag">{p.role}</span>
      </div>
    </div>
  );
}

function Pinned({ accent }) {
  return (
    <div className="pinned-grid">
      {PINNED.map(p => <ProjectCard key={p.owner + "/" + p.name} p={p} accent={accent} />)}
    </div>
  );
}

// ─── Own repos (compact) ─────────────────────────────────────────────────
function OwnRepos({ accent }) {
  return (
    <div className="own-list">
      <div className="own-head dim">
        <span style={{ width: 26 }}>idx</span>
        <span style={{ flex: "0 0 240px" }}>repo</span>
        <span style={{ flex: 1 }}>description</span>
      </div>
      {OWN_REPOS.map((r, i) => (
        <div className="own-row" key={r.name}>
          <span className="dim own-idx">{String(i+1).padStart(2,"0")}</span>
          <span className="own-name">songzhibin97/<span style={{ color: accent }}>{r.name}</span></span>
          <span className="own-desc dim">{r.desc}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Orgs ────────────────────────────────────────────────────────────────
function Orgs({ accent }) {
  return (
    <div className="orgs-grid">
      {ORGS.map(o => (
        <div className="org-card" key={o.handle}>
          <div className="org-badge" style={{ borderColor: accent }}>
            <span style={{ color: accent }}>@</span>
          </div>
          <div className="org-text">
            <div className="org-name">{o.name}</div>
            <div className="org-handle dim">@{o.handle}</div>
            <div className="org-note dim">{o.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Contribution heatmap ────────────────────────────────────────────────
function Heatmap({ accent, mode, hmBase }) {
  const base = hmBase || (mode === "light" || mode === "paper" ? "#ece9e0" : "#1a1c1f");
  const colors = [
    base,
    `color-mix(in oklab, ${accent} 25%, ${base})`,
    `color-mix(in oklab, ${accent} 50%, ${base})`,
    `color-mix(in oklab, ${accent} 75%, ${base})`,
    accent,
  ];
  return (
    <div className="heatmap-wrap">
      <div className="heatmap-months">
        {HEATMAP_MONTHS.map(m => (
          <span key={m.label} className="dim" style={{ gridColumn: m.col }}>{m.label}</span>
        ))}
      </div>
      <div className="heatmap">
        <div className="heatmap-days dim">
          <span>Mon</span><span>Wed</span><span>Fri</span>
        </div>
        <div className="heatmap-grid">
          {HEATMAP.map((col, w) => (
            <div className="hm-col" key={w}>
              {col.map((v, d) => {
                const count = HEATMAP_COUNTS?.[w]?.[d];
                const title = count == null
                  ? `week ${w+1} d${d+1}: ${v}`
                  : `week ${w+1} d${d+1}: ${count} public events`;
                return <div key={d} className="hm-cell" style={{ background: colors[v] }} title={title} />;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-legend dim">
        <span>less</span>
        {colors.map((c,i) => <div key={i} className="hm-cell" style={{ background: c }} />)}
        <span>more</span>
      </div>
    </div>
  );
}

// ─── Activity log ────────────────────────────────────────────────────────
const TAG_COLORS = {
  feat: { fg: "#88d18a" },
  fix:  { fg: "#e07a5f" },
  perf: { fg: "#d4a85a" },
  ref:  { fg: "#9aa3d4" },
  docs: { fg: "#7aa2c2" },
  chore:{ fg: "#b8a0d9" },
  push: { fg: "#d4a85a" },
  commit:{ fg: "#9aa3ad" },
};

function Activity({ accent }) {
  return (
    <div className="git-log">
      {COMMITS.map((c, i) => {
        const tc = TAG_COLORS[c.tag] || { fg: accent };
        return (
          <div className="log-row" key={c.hash}>
            <span className="log-graph" style={{ color: accent }}>{i === 0 ? "●" : "│"}</span>
            <span className="log-hash" style={{ color: accent }}>{c.hash}</span>
            <span className="log-repo dim">{c.repo}</span>
            <span className="log-tag" style={{ color: tc.fg, borderColor: tc.fg }}>{c.tag}</span>
            <span className="log-scope dim">({c.scope})</span>
            <span className="log-msg">{c.msg}</span>
            <span className="log-time dim">{c.time}</span>
          </div>
        );
      })}
      <div className="log-row log-row-end" style={{ opacity: 0.5 }}>
        <span className="log-graph">│</span>
        <span className="dim" style={{ gridColumn: "2 / -1" }}>…older commits truncated. <span style={{ color: accent }}>public REST</span> sampled across {PROFILE.stats.repos || "all"} repos.</span>
      </div>
    </div>
  );
}

// ─── Contact / CLI flags ─────────────────────────────────────────────────
function Contact({ accent }) {
  const flags = [
    { f: "--github",   v: "github.com/" + PROFILE.handle },
    { f: "--blog",     v: PROFILE.homepage },
    { f: "--region",   v: PROFILE.location },
    { f: "--available",v: "open to interesting OSS collabs" },
  ];
  return (
    <div className="contact">
      <pre className="contact-table">
{"# bin's contact card · last updated " + new Date().getFullYear() + "\n\n" +
 flags.map(x => `${x.f.padEnd(14)}  ${x.v}`).join("\n")}
      </pre>
    </div>
  );
}

// ─── Footer prompt ───────────────────────────────────────────────────────
function FooterPrompt({ accent, showCursor }) {
  return (
    <div className="footer-prompt">
      <span className="prompt" style={{ color: accent }}>bin@arch</span>
      <span className="dim">:</span>
      <span style={{ color: "#9ab" }}>~/profile</span>
      <span className="dim">{"$ session complete. press "}</span>
      <kbd>↑</kbd>
      <span className="dim">{" for history, "}</span>
      <kbd>R</kbd>
      <span className="dim">{" to replay."}</span>
    </div>
  );
}

// ─── Tweaks panel content ────────────────────────────────────────────────
function Tweaks({ t, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="Theme" />
      <TweakSelect label="Mode" value={t.mode}
                   options={["auto","noir","slate","solar","paper"]}
                   onChange={(v) => setTweak("mode", v)} />
      <TweakRadio  label="Accent" value={t.accent}
                   options={["amber","mint","cyan","mono"]}
                   onChange={(v) => setTweak("accent", v)} />
      <TweakRadio  label="Density" value={t.density}
                   options={["compact","comfy"]}
                   onChange={(v) => setTweak("density", v)} />
      <TweakSection label="Decor" />
      <TweakToggle label="ASCII banner" value={t.showAscii}
                   onChange={(v) => setTweak("showAscii", v)} />
      <TweakToggle label="Blinking cursor" value={t.showCursor}
                   onChange={(v) => setTweak("showCursor", v)} />
      <TweakSection label="Boot" />
      <TweakButton label="Replay boot sequence"
                   onClick={() => setTweak("replayBoot", true)} />
    </TweaksPanel>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [, setDataVersion] = useState(0);
  const A = ACCENTS[t.accent] || ACCENTS.amber;

  useEffect(() => {
    if (typeof window.loadProfileData !== "function") return;
    let alive = true;
    window.loadProfileData({ mode: window.PROFILE_DATA_SOURCE || "github" })
      .then((data) => {
        if (!alive || !data) return;
        window.PROFILE_DATA = data;
        applyProfileData(data);
        setDataVersion(v => v + 1);
      })
      .catch((err) => {
        console.warn("[app] profile data refresh failed:", err);
      });
    return () => { alive = false; };
  }, []);

  // Detect system preference, live-update.
  const [sysLight, setSysLight] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  });
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e) => setSysLight(e.matches);
    mql.addEventListener ? mql.addEventListener("change", handler)
                         : mql.addListener(handler);
    return () => {
      mql.removeEventListener ? mql.removeEventListener("change", handler)
                              : mql.removeListener(handler);
    };
  }, []);

  const resolvedMode = t.mode === "auto" ? (sysLight ? "paper" : "slate") : t.mode;
  const M = MODE_META[resolvedMode] || MODE_META.slate;
  const isLight = M.isLight;
  const accentC   = isLight ? A.lc   : A.c;
  const accentDim = isLight ? A.ldim : A.dim;
  const accentGlow= isLight ? A.lglow: A.glow;

  useEffect(() => {
    const el = document.documentElement;
    ["mode-noir","mode-slate","mode-solar","mode-paper","mode-dark","mode-light"]
      .forEach(c => el.classList.remove(c));
    el.classList.add("mode-" + resolvedMode);
    return () => { el.classList.remove("mode-" + resolvedMode); };
  }, [resolvedMode]);

  // ─── Stream state ────────────────────────────────────────────────────
  const seenStream = (() => {
    try { return !!localStorage.getItem(STREAM_SEEN_KEY); } catch (e) { return false; }
  })();
  const [skipped,    setSkipped]    = useState(seenStream);
  const [streamDone, setStreamDone] = useState(seenStream);
  // Incrementing key force-remounts TerminalStream so internal progress
  // state is fully reset on Replay — even when skipped is already false.
  const [replayKey,  setReplayKey]  = useState(0);

  useEffect(() => {
    if (t.replayBoot) {
      try { localStorage.removeItem(STREAM_SEEN_KEY); } catch (e) {}
      setSkipped(false);
      setStreamDone(false);
      setReplayKey(k => k + 1);
      window.scrollTo(0, 0);
      setTimeout(() => setTweak("replayBoot", false), 50);
    }
  }, [t.replayBoot]);

  const handleStreamComplete = () => {
    try { localStorage.setItem(STREAM_SEEN_KEY, "1"); } catch (e) {}
    setStreamDone(true);
  };

  useEffect(() => {
    if (streamDone) {
      // After the session is complete, listen for R to replay.
      const onKey = (e) => {
        if (e.key === "r" || e.key === "R") setTweak("replayBoot", true);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "s" || e.key === "S") setSkipped(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [streamDone]);

  // density via CSS variables
  const densityVars = t.density === "comfy"
    ? { "--row-gap": "16px", "--block-pad": "28px" }
    : { "--row-gap": "10px", "--block-pad": "20px" };

  const cssVars = {
    "--accent": accentC,
    "--accent-dim": accentDim,
    "--accent-glow": accentGlow,
    ...densityVars,
  };

  // Each command's "output" is a Section wrapping the relevant block.
  const sectionConfigs = [
    { id: "00", title: "identity.toml",                     count: null,                                              body: <Identity accent={accentC} accentName={A.name} showAscii={t.showAscii} /> },
    { id: "01", title: "signature themes",                  count: SIGNATURES.length,                                 body: <Signatures accent={accentC} /> },
    { id: "02", title: "tech stack · self-rated",           count: TECH.reduce((n, r) => n + r.v.length, 0),          body: <TechStack accent={accentC} /> },
    { id: "03", title: "pinned · maintained · contributed", count: PINNED.length,                                     body: <Pinned accent={accentC} /> },
    { id: "04", title: "own repositories · selected",       count: OWN_REPOS.length,                                  body: <OwnRepos accent={accentC} /> },
    { id: "05", title: "public activity · last 26w",        count: null,                                              body: <Heatmap accent={accentC} mode={resolvedMode} hmBase={M.hmBase} /> },
    { id: "06", title: "commit log",                        count: COMMITS.length,                                    body: <Activity accent={accentC} /> },
    { id: "07", title: "organizations",                     count: ORGS.length,                                       body: <Orgs accent={accentC} /> },
    { id: "08", title: "contact",                           count: null,                                              body: <Contact accent={accentC} /> },
  ];
  const wrappedSections = {};
  sectionConfigs.forEach(s => {
    wrappedSections[s.id] = (
      <Section id={s.id} title={s.title} count={s.count} accent={accentC}>
        {s.body}
      </Section>
    );
  });

  return (
    <div className={"root mode-" + resolvedMode + (streamDone ? " stream-done" : " streaming")}
         style={cssVars}>
      <StatusBar accent={accentC} name={A.name} mode={resolvedMode}
                 autoBadge={t.mode === "auto" ? `auto→${resolvedMode}` : null} />

      <main className="page">
        <TerminalStream
          key={replayKey}
          accent={accentC}
          mode={resolvedMode}
          sections={wrappedSections}
          skipped={skipped}
          onComplete={handleStreamComplete}
        />
        {/* Footer removed — the final live prompt acts as the natural end
            marker, and Replay is available via the Tweaks panel. */}
      </main>

      {!streamDone && (
        <button className="boot-skip" onClick={() => setSkipped(true)}>
          <span>skip animation</span>
          <kbd>ESC</kbd>
        </button>
      )}

      <Tweaks t={t} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
