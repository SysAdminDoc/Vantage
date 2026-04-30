// Vantage — GitHub activity + trending repos panel widget.

import { el, clear } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { relativeTime } from "../utils/dom.js";

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
      body.appendChild(el("p", { class: "panel-empty" }, [`Error: ${err.message}`]));
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
    const resp  = await fetch(`https://api.github.com/users/${encodeURIComponent(cfg.username)}/events/public?per_page=15`);
    if (!resp.ok) throw new Error(resp.status === 404 ? "User not found" : `GitHub API ${resp.status}`);
    const events = await resp.json();
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
  }

  async function loadTrending() {
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const lang  = cfg.language ? `+language:${encodeURIComponent(cfg.language)}` : "";
    const url   = `https://api.github.com/search/repositories?q=created:>${since}${lang}&sort=stars&order=desc&per_page=8`;
    const resp  = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!resp.ok) throw new Error(`GitHub API ${resp.status}`);
    const { items } = await resp.json();
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
  }

  loadTab();
}
