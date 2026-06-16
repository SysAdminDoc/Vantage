// Vantage v1.2.0 — External widget panel (manifest-based sandboxed iframe).

import { el, clear, toast } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { validateManifest, fetchManifest, createWidgetFrame, buildThemePayload } from "../utils/widget-host.js";

const activeFrames = new Map();

export function renderExternalWidget(mount, widgetCfg, settings, { onAttachDragHandle } = {}) {
  clear(mount);

  const prev = activeFrames.get(widgetCfg.id);
  if (prev) { prev.destroy(); activeFrames.delete(widgetCfg.id); }

  if (!widgetCfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const manifest = widgetCfg.manifest;
  if (!manifest?.src) {
    mount.appendChild(el("div", { class: "panel-empty" }, ["Widget manifest not loaded yet."]));
    return;
  }

  const errors = validateManifest(manifest);
  if (errors.length) {
    mount.appendChild(el("div", { class: "panel-empty" }, [`Invalid widget: ${errors.join(", ")}`]));
    return;
  }

  const title = manifest.name || "Widget";

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2", { class: "panel-header__title" }, [iconNode("layout-grid", { size: 14 }), " ", title])
    ]),
    el("div", { class: "panel-header__right" }, [
      manifest.homepage
        ? el("a", {
            href: manifest.homepage, target: "_blank", rel: "noopener noreferrer",
            class: "icon-button icon-button--ghost icon-button--small",
            "aria-label": `${title} homepage`, title: "Widget homepage"
          }, [iconNode("external", { size: 14 })])
        : null
    ].filter(Boolean))
  ]);

  const body = el("div", { class: "panel-body panel-body--map" });

  manifest._userData = widgetCfg.data || {};
  const frame = createWidgetFrame(manifest, settings);
  body.appendChild(frame.iframe);
  activeFrames.set(widgetCfg.id, frame);

  frame.ready.then((ok) => {
    if (!ok) {
      body.innerHTML = "";
      body.appendChild(el("div", { class: "panel-empty" }, [
        el("p", {}, ["Widget failed to load."]),
        manifest.src
          ? el("a", {
              href: manifest.src, target: "_blank", rel: "noopener noreferrer",
              class: "button button--ghost"
            }, [iconNode("external", { size: 14 }), " Open directly"])
          : null
      ].filter(Boolean)));
    }
  });

  mount.appendChild(header);
  mount.appendChild(body);

  if (onAttachDragHandle) {
    onAttachDragHandle(header.querySelector(".panel-header__drag"));
  }
}

export function broadcastThemeChange(settings) {
  for (const frame of activeFrames.values()) {
    frame.sendThemeChange(settings);
  }
}

export function destroyAllExternalWidgets() {
  for (const frame of activeFrames.values()) {
    frame.destroy();
  }
  activeFrames.clear();
}
