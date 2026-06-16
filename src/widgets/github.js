// Vantage — GitHub activity + trending repos panel widget.

import { el, clear } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { relativeTime } from "../utils/dom.js";

const GITHUB_CACHE_KEY = "vantageGithubCache";
const GITHUB_CACHE_TTL_MS = 10 * 60 * 1000;
const GITHUB_CACHE_MAX_ENTRIES = 20;
const githubInflight = new Map();

const EVENT_LABELS = {
  PushEvent:              (e) => `Pushed to ${shortRepo(e.repo.name)}`,
  CreateEvent:            (e) => `Created ${e.payload?.ref_type || "branch"} in ${shortRepo(e.repo.name)}`,
  WatchEvent:             (e) => `Starred ${shortRepo(e.repo.name)}`,
  ForkEvent:              (e) => `Forked ${shortRepo(e.repo.name)}`,
  IssuesEvent:            (e) => `${cap(e.payload?.action || "")} issue in ${shortRepo(e.repo.name)}`,
  PullRequestEvent:       (e) => `${cap(e.payload?.action || "")} PR in ${shortRepo(e.repo.name)}`,
  IssueCommentEvent:      (e) => `Commented in ${shortRepo(e.repo.name)}`,
  ReleaseEvent:           (e) => `Released in ${shortRepo(e.repo.name)}`,
  DeleteEvent:            (e) => `Deleted ${e.payload?.ref_type || "ref"} in ${shortRepo(e.repo.name)}`,
};
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function shortRepo(name) { return name?.split("/")[1] || name; }

export function renderGithub(mount, settings, { onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.github;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  let activeTab = cfg.username ? "activity" : "trending";

  const activityBtn = el("button", {
    type: "button",
    role: "tab",
    "aria-selected": activeTab === "activity" ? "true" : "false",
    class: `panel-tab${activeTab === "activity" ? " panel-tab--active" : ""}`,
    onClick: () => switchTab("activity")
  }, ["Activity"]);

  const trendingBtn = el("button", {
    type: "button",
    role: "tab",
    "aria-selected": activeTab === "trending" ? "true" : "false",
    class: `panel-tab${activeTab === "trending" ? " panel-tab--active" : ""}`,
    onClick: () => switchTab("trending")
  }, ["Trending"]);

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2", { class: "panel-header__title" }, [iconNode("github", { size: 14 }), " GitHub"])
    ]),
    el("div", { class: "panel-header__right panel-tabs", role: "tablist", "aria-label": "GitHub view" }, [activityBtn, trendingBtn])
  ]);

  const body = el("div", { class: "panel-body github-body", role: "tabpanel" });
  mount.appendChild(header);
  mount.appendChild(body);

  if (onAttachDragHandle) onAttachDragHandle(header.querySelector(".panel-header__drag"));

  function switchTab(tab) {
    activeTab = tab;
    activityBtn.className = `panel-tab${tab === "activity" ? " panel-tab--active" : ""}`;
    activityBtn.setAttribute("aria-selected", tab === "activity" ? "true" : "false");
    trendingBtn.className = `panel-tab${tab === "trending" ? " panel-tab--active" : ""}`;
    trendingBtn.setAttribute("aria-selected", tab === "trending" ? "true" : "false");
    loadTab();
  }

  async function loadTab() {
    body.innerHTML = "";
    body.appendChild(el("div", { class: "panel-spinner" }, [iconNode("refresh", { size: 20, className: "spin" })]));
    try {
      if (activeTab === "activity") {
        await loadActivity();
      } else {
        await loadTrending();
      }
    } catch (err) {
      body.innerHTML = "";
      body.appendChild(el("p", { class: "panel-error" }, [`Couldn't load GitHub data — ${err.message.toLowerCase()}.`]));
    }
  }

  async function loadActivity() {
    if (!cfg.username) {
      body.innerHTML = "";
      body.appendChild(el("p", { class: "panel-empty" }, [
        "Set your GitHub username in Settings → GitHub to see your activity."
      ]));
      return;
    }
    const username = cfg.username.trim();
    const result = await fetchGithubJson(
      `activity:${username.toLowerCase()}`,
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=15`,
      { notFoundMessage: "User not found" }
    );
    const events = result.data;
    body.innerHTML = "";
    if (!events.length) {
      body.appendChild(el("p", { class: "panel-empty" }, ["No recent public activity."]));
      return;
    }
    const list = el("ul", { class: "github-list" });
    for (const ev of events.slice(0, 12)) {
      const label    = (EVENT_LABELS[ev.type] || (() => ev.type))(ev);
      const repoUrl  = `https://github.com/${ev.repo.name}`;
      const date     = new Date(ev.created_at);
      list.appendChild(el("li", { class: "github-item" }, [
        el("div", { class: "github-item__text" }, [
          el("a", { href: repoUrl, target: "_blank", rel: "noopener noreferrer", class: "github-item__label" }, [label])
        ]),
        el("time", { class: "github-item__time", dateTime: ev.created_at }, [relativeTime(date)])
      ]));
    }
    body.appendChild(list);
    appendCacheNotice(body, result);
  }

  async function loadTrending() {
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const lang  = cfg.language ? `+language:${encodeURIComponent(cfg.language)}` : "";
    const url   = `https://api.github.com/search/repositories?q=created:>${since}${lang}&sort=stars&order=desc&per_page=8`;
    const result = await fetchGithubJson(`trending:${cfg.language || "all"}:${since}`, url);
    const { items } = result.data;
    body.innerHTML = "";
    if (!items?.length) {
      body.appendChild(el("p", { class: "panel-empty" }, ["No trending repos found."]));
      return;
    }
    const list = el("ul", { class: "github-list" });
    for (const repo of items) {
      list.appendChild(el("li", { class: "github-item" }, [
        el("div", { class: "github-item__text" }, [
          el("a", { href: repo.html_url, target: "_blank", rel: "noopener noreferrer", class: "github-item__label" }, [repo.full_name]),
          repo.description ? el("div", { class: "github-item__desc" }, [repo.description]) : null
        ].filter(Boolean)),
        el("div", { class: "github-item__meta" }, [
          repo.language ? el("span", { class: "github-lang-chip" }, [repo.language]) : null,
          el("span", { class: "github-stars" }, [`★ ${repo.stargazers_count.toLocaleString()}`])
        ].filter(Boolean))
      ]));
    }
    body.appendChild(list);
    appendCacheNotice(body, result);
  }

  loadTab();
}

async function fetchGithubJson(key, url, { notFoundMessage } = {}) {
  const now = Date.now();
  const cached = await readGithubCacheEntry(key);
  if (cached?.data && now - cached.cachedAt < GITHUB_CACHE_TTL_MS) {
    return { data: cached.data, fromCache: true };
  }
  if (cached?.rateLimitedUntil && cached.rateLimitedUntil > now) {
    if (cached.data) {
      return { data: cached.data, fromCache: true, stale: true, rateLimitedUntil: cached.rateLimitedUntil };
    }
    throw new Error(githubRateLimitMessage(cached.rateLimitedUntil));
  }
  if (githubInflight.has(key)) return githubInflight.get(key);

  const request = (async () => {
    const resp = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    const rateLimitedUntil = githubRateLimitedUntil(resp);
    if (rateLimitedUntil) {
      await writeGithubCacheEntry(key, {
        ...cached,
        rateLimitedUntil,
        rateLimitedAt: now,
        cachedAt: cached?.cachedAt || 0
      });
      if (cached?.data) {
        return { data: cached.data, fromCache: true, stale: true, rateLimitedUntil };
      }
      throw new Error(githubRateLimitMessage(rateLimitedUntil));
    }
    if (!resp.ok) {
      throw new Error(resp.status === 404 && notFoundMessage ? notFoundMessage : `GitHub API ${resp.status}`);
    }
    const data = await resp.json();
    await writeGithubCacheEntry(key, { data, cachedAt: Date.now(), rateLimitedUntil: 0 });
    return { data, fromCache: false };
  })().finally(() => {
    githubInflight.delete(key);
  });

  githubInflight.set(key, request);
  return request;
}

async function readGithubCacheEntry(key) {
  const cache = await readGithubCache();
  return cache[key] || null;
}

async function readGithubCache() {
  const api = globalThis.chrome?.storage?.local;
  if (!api?.get) return {};
  try {
    const stored = await api.get(GITHUB_CACHE_KEY);
    const cache = stored?.[GITHUB_CACHE_KEY];
    return cache && typeof cache === "object" ? cache : {};
  } catch {
    return {};
  }
}

async function writeGithubCacheEntry(key, entry) {
  const api = globalThis.chrome?.storage?.local;
  if (!api?.set) return;
  const cache = await readGithubCache();
  cache[key] = entry;
  const entries = Object.entries(cache)
    .sort(([, a], [, b]) => (b.cachedAt || b.rateLimitedAt || 0) - (a.cachedAt || a.rateLimitedAt || 0));
  const pruned = Object.fromEntries(entries.slice(0, GITHUB_CACHE_MAX_ENTRIES));
  try { await api.set({ [GITHUB_CACHE_KEY]: pruned }); } catch {}
}

function githubRateLimitedUntil(resp) {
  if (!(resp.status === 403 || resp.status === 429)) return 0;
  const retryAfter = Number(resp.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Date.now() + retryAfter * 1000;
  }
  const reset = Number(resp.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(reset) && reset > 0) {
    return reset * 1000;
  }
  if (resp.status === 429 || resp.headers.get("x-ratelimit-remaining") === "0") {
    return Date.now() + 60 * 60 * 1000;
  }
  return 0;
}

function githubRateLimitMessage(untilMs) {
  return `GitHub API rate-limited this request — try again after ${formatRetryAt(untilMs)}`;
}

function appendCacheNotice(body, result) {
  if (!result?.stale || !result.rateLimitedUntil) return;
  body.appendChild(el("p", { class: "panel-empty" }, [
    `Showing cached GitHub data — API rate-limited until ${formatRetryAt(result.rateLimitedUntil)}.`
  ]));
}

function formatRetryAt(ms) {
  if (!Number.isFinite(ms)) return "later";
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
