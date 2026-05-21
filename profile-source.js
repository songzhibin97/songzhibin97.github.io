// profile-source.js
// ─────────────────────────────────────────────────────────────────────────
// Data-loading hook. The page renders the static `window.PROFILE_DATA` first,
// then refreshes the fields available from GitHub's unauthenticated public REST
// API. Curated fields remain in profile-data.js.
//
// To go live:
//   1. Set window.PROFILE_DATA_SOURCE = "github" before this file loads.
//   2. Reload. Unauthenticated requests are limited to 60 req/h per IP.
//
// The function returns a Promise<ProfileData> so the React app can stay
// thin and decoupled.
// ─────────────────────────────────────────────────────────────────────────

window.loadProfileData = async function loadProfileData(opts = {}) {
  const mode   = opts.mode   || window.PROFILE_DATA_SOURCE || "static";
  const handle = opts.handle || (window.PROFILE_DATA?.identity?.handle) || "songzhibin97";
  const cacheKey = `bin-profile.github.${handle}.v2`;

  if (mode === "static") {
    return window.PROFILE_DATA;
  }

  if (mode === "github") {
    const cached = readCache(cacheKey, 15 * 60 * 1000);
    if (cached) return mergeData(window.PROFILE_DATA, cached);

    try {
      const live = await fetchGitHub(handle, opts.token || window.GITHUB_TOKEN, window.PROFILE_DATA);
      writeCache(cacheKey, live);
      // Overlay live data on top of static defaults so anything GitHub
      // can't give us (motto, signatures, tech ratings, etc.) survives.
      return mergeData(window.PROFILE_DATA, live);
    } catch (err) {
      const stale = readCache(cacheKey, Infinity);
      if (stale) return mergeData(window.PROFILE_DATA, stale);
      console.warn("[profile-source] GitHub fetch failed, falling back to static data:", err);
      return window.PROFILE_DATA;
    }
  }

  console.warn("[profile-source] unknown mode:", mode, "— using static");
  return window.PROFILE_DATA;
};

// ─────────────────────────────────────────────────────────────────────────

async function fetchGitHub(handle, token, staticData = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = "Bearer " + token;

  const request = async (path) => {
    const res = await fetch("https://api.github.com" + path, { headers });
    if (!res.ok) throw new Error(path + " -> " + res.status);
    return {
      data: await res.json(),
      link: res.headers.get("Link") || "",
    };
  };
  const json = (path) => request(path).then(r => r.data);

  const pages = async (path, maxPages = 10) => {
    const out = [];
    for (let page = 1; page <= maxPages; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const { data, link } = await request(path + sep + "page=" + page);
      out.push(...data);
      if (!/rel="next"/.test(link)) break;
    }
    return out;
  };

  const pagedCount = async (path) => {
    const { data, link } = await request(path);
    const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
    if (match) return Number(match[1]);
    return Array.isArray(data) ? data.length : 0;
  };

  const [user, repos, orgs, starred] = await Promise.all([
    json(`/users/${handle}`),
    pages(`/users/${handle}/repos?per_page=100&sort=updated&type=owner`),
    pages(`/users/${handle}/orgs?per_page=100`, 3),
    pagedCount(`/users/${handle}/starred?per_page=1`).catch(() => staticData?.stats?.starred),
  ]);

  const reposByFullName = new Map(repos.map(r => [r.full_name.toLowerCase(), r]));
  const reposByName = new Map(repos.map(r => [r.name, r]));
  const staticPinned = staticData?.pinned || [];
  const pinned = staticPinned.length
    ? await Promise.all(staticPinned.map(p => refreshProject(p, handle, reposByFullName, json)))
    : [...repos]
        .filter(r => !r.fork)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 6)
        .map(r => projectFromRepo(r, handle));

  const ownRepos = (staticData?.ownRepos || []).length
    ? staticData.ownRepos.map(r => {
        const live = reposByName.get(r.name);
        return { name: r.name, desc: live?.description || r.desc || "" };
      })
    : [...repos]
        .filter(r => !r.fork)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 6)
        .map(r => ({ name: r.name, desc: r.description || "" }));

  const events = await pages(`/users/${handle}/events/public?per_page=100`, 1).catch(() => []);
  const commits = await fetchEventCommits(events, json).catch(() => []);

  return {
    identity: {
      handle:   user.login,
      name:     user.name || user.login,
      location: (user.location || "").toUpperCase(),
      homepage: user.blog || user.html_url,
      motto:    user.bio || undefined,
      uid:      String(user.id),
      // Keep static role / tags / English motto. GitHub doesn't have those.
    },
    stats: {
      repos:     user.public_repos,
      followers: user.followers,
      following: user.following,
      starred:   starred,
    },
    pinned,
    ownRepos,
    commits,
    heatmap: buildPublicActivityHeatmap(events),
    orgs: orgs.map(o => ({
      handle: o.login,
      name:   o.login,
      note:   o.description || "",
    })),
  };
}

async function fetchEventCommits(events, json) {
  const byHead = new Map();
  events
    .filter(e => e.type === "PushEvent" && e.repo?.name && e.payload?.head)
    .forEach(e => {
      if (!byHead.has(e.payload.head)) byHead.set(e.payload.head, e);
    });

  const pulls = [...byHead.values()].slice(0, 8).map(event => {
    return json(`/repos/${event.repo.name}/commits/${event.payload.head}`)
      .then(commit => [commitFromApi(event, commit)])
      .catch(() => [commitFromEvent(event)]);
  });

  const bySha = new Map();
  (await Promise.all(pulls)).flat().forEach(commit => {
    if (!bySha.has(commit.sha)) bySha.set(commit.sha, commit);
  });

  return [...bySha.values()]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
    .map(({ sha, date, message, repo }) => {
      const parsed = parseCommitMessage(message);
      return {
        repo,
        hash: sha.slice(0, 7),
        tag: parsed.tag,
        scope: parsed.scope,
        msg: parsed.msg,
        time: timeAgo(date),
      };
    });
}

function commitFromApi(event, c) {
  return {
    repo: event.repo.name,
    sha: c.sha || event.payload.head,
    date: c.commit?.author?.date || c.commit?.committer?.date || event.created_at,
    message: (c.commit?.message || "").split("\n")[0],
  };
}

function commitFromEvent(event) {
  const branch = (event.payload?.ref || "").replace("refs/heads/", "") || "branch";
  return {
    repo: event.repo.name,
    sha: event.payload.head,
    date: event.created_at,
    message: `push to ${branch}`,
  };
}

function parseCommitMessage(message) {
  const line = (message || "update").trim();
  if (line.startsWith("push to ")) {
    return { tag: "push", scope: "event", msg: line };
  }
  const conventional = line.match(/^([a-zA-Z]+)(?:\(([^)]+)\))?!?:\s*(.+)$/);
  if (conventional) {
    return {
      tag: conventional[1].toLowerCase(),
      scope: conventional[2] || "core",
      msg: conventional[3],
    };
  }
  return { tag: "commit", scope: "core", msg: line };
}

function timeAgo(dateText) {
  const then = new Date(dateText).getTime();
  const delta = Math.max(0, Date.now() - then);
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  if (delta < day) return Math.max(1, Math.floor(delta / hour)) + "h";
  if (delta < week) return Math.floor(delta / day) + "d";
  if (delta < month) return Math.floor(delta / week) + "w";
  return Math.floor(delta / month) + "mo";
}

function buildPublicActivityHeatmap(events, weekCount = 26) {
  const end = new Date();
  const start = startOfWeek(new Date(end.getFullYear(), end.getMonth(), end.getDate() - (weekCount - 1) * 7));
  const counts = Array.from({ length: weekCount }, () => Array(7).fill(0));

  events.forEach(event => {
    const date = new Date(event.created_at);
    const week = Math.floor((startOfWeek(date) - start) / (7 * 24 * 60 * 60 * 1000));
    const day = (date.getDay() + 6) % 7;
    if (week >= 0 && week < weekCount) counts[week][day] += 1;
  });

  const max = Math.max(1, ...counts.flat());
  const weeks = counts.map(col => col.map(n => n === 0 ? 0 : Math.max(1, Math.ceil((n / max) * 4))));
  return {
    source: "github-public-events",
    weeks,
    counts,
    months: buildMonthLabels(start, weekCount),
  };
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function buildMonthLabels(start, weekCount) {
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

function readCache(key, maxAgeMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || !cached.data || Date.now() - cached.savedAt > maxAgeMs) return null;
    return cached.data;
  } catch (e) {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch (e) {}
}

async function refreshProject(project, handle, reposByFullName, json) {
  const fullName = `${project.owner}/${project.name}`.toLowerCase();
  const repo = reposByFullName.get(fullName)
    || await json(`/repos/${project.owner}/${project.name}`).catch(() => null);
  return repo ? projectFromRepo(repo, handle, project.role, project.desc) : project;
}

function projectFromRepo(repo, handle, role, fallbackDesc) {
  return {
    name:  repo.name,
    owner: repo.owner.login,
    lang:  repo.language || "—",
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    desc:  repo.description || fallbackDesc || "",
    role:  role || (repo.owner.login === handle ? "author" : "contributor"),
  };
}

// Shallow-but-keyed merge: live > static for each top-level field, with
// per-array fallback if live didn't return anything for that array.
function mergeData(stat, live) {
  const out = { ...stat };
  for (const key of Object.keys(live)) {
    if (Array.isArray(live[key])) {
      out[key] = live[key].length > 0 ? live[key] : stat[key];
    } else if (typeof live[key] === "object" && live[key] !== null) {
      out[key] = mergeObject(stat[key], live[key]);
    } else if (live[key] !== undefined && live[key] !== "") {
      out[key] = live[key];
    }
  }
  return out;
}

function mergeObject(base = {}, overlay = {}) {
  const out = { ...base };
  for (const [key, val] of Object.entries(overlay)) {
    if (val !== undefined && val !== "") out[key] = val;
  }
  return out;
}
