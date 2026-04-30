// Vantage v0.2.0 — DOM helpers + UI primitives (toggle, segmented, toast)

import { iconNode } from "../icons.js";

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "html") node.innerHTML = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("aria-") || k.startsWith("data-") || k === "role") {
      node.setAttribute(k, v);
    } else if (k in node) {
      node[k] = v;
    } else {
      node.setAttribute(k, v);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Toggle switch primitive. Returns the wrapper label element. */
export function toggle({ checked = false, onChange, label, ariaLabel } = {}) {
  const input = el("input", {
    type: "checkbox",
    checked,
    "aria-label": ariaLabel || label || "Toggle",
    onChange: (e) => onChange?.(e.target.checked)
  });
  return el("label", { class: "toggle" }, [
    input,
    el("span", { class: "toggle__track" }),
    el("span", { class: "toggle__thumb" })
  ]);
}

/**
 * Segmented control primitive.
 * options: [{ value, label }, ...]
 * value: current value
 * onChange: (newValue) => void
 */
export function segmented({ options, value, onChange, ariaLabel } = {}) {
  const group = el("div", { class: "segmented", role: "group", "aria-label": ariaLabel || "Choose option" });
  for (const opt of options) {
    const btn = el("button", {
      type: "button",
      class: "segmented__button",
      "aria-pressed": String(opt.value === value),
      onClick: () => {
        if (opt.value === value) return;
        value = opt.value;
        for (const child of group.children) {
          child.setAttribute("aria-pressed", String(child.dataset.value === value));
        }
        onChange?.(value);
      },
      "data-value": String(opt.value)
    }, [opt.label]);
    group.appendChild(btn);
  }
  return group;
}

/** Toast notification. */
export function toast(message, kind = "info", timeoutMs = 3400) {
  const host = document.getElementById("toast-host");
  if (!host) return;
  const iconName = kind === "error" ? "alert" : kind === "success" ? "check" : kind === "warning" ? "alert" : "info";
  // Errors are assertive (role=alert); everything else inherits polite from host.
  const role = kind === "error" ? "alert" : "status";
  const node = el("div", { class: `toast toast--${kind}`, role }, [
    el("span", { class: "toast__icon" }, [iconNode(iconName, { size: 16 })]),
    el("span", { class: "toast__body" }, [message])
  ]);
  host.appendChild(node);
  setTimeout(() => {
    node.classList.add("toast--leaving");
    setTimeout(() => node.remove(), 240);
  }, timeoutMs);
}

/** Format a Date relative to now ("just now", "2m ago", "3h ago", "Apr 10"). */
export function relativeTime(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 30) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Time-of-day greeting. */
export function timeOfDayGreeting(hour = new Date().getHours()) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
}

/** Try to derive a clean URL display label from a URL. */
export function hostnameLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
