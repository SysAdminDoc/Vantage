// Vantage — To-Do list panel widget.

import { el, clear, toast } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";

const TODO_PERSIST_DEBOUNCE_MS = 300;

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function renderTodo(mount, settings, { onChange, onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.todo;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  let items = [...(cfg.items || [])];

  function nextSettings(nextItems = items) {
    return { ...settings, todo: { ...cfg, items: nextItems } };
  }

  function persist(next = nextSettings(), { debounce = false } = {}) {
    commitTodoChange(mount, next, onChange, { debounce });
  }

  // Header
  const undoneCount = items.filter(i => !i.done).length;
  const completedCount = items.length - undoneCount;
  const badge = undoneCount > 0
    ? el("span", { class: "panel-badge" }, [String(undoneCount)])
    : null;

  const clearBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--small",
    title: "Clear completed",
    "aria-label": "Clear completed tasks",
    disabled: completedCount === 0,
    onClick: () => {
      const removed = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.done);
      if (!removed.length) return;
      items = items.filter(i => !i.done);
      persist();
      renderTodo(mount, nextSettings(), { onChange, onAttachDragHandle });
      toast(`Cleared ${removed.length} completed task${removed.length === 1 ? "" : "s"}.`, "warning", 6500, {
        label: "Undo",
        onClick: () => {
          const restored = [...items];
          for (const { item, index } of removed) {
            restored.splice(Math.min(index, restored.length), 0, item);
          }
          const next = nextSettings(restored);
          persist(next);
          renderTodo(mount, next, { onChange, onAttachDragHandle });
        }
      });
    }
  }, [iconNode("check-all", { size: 14 })]);

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2", { class: "panel-header__title" }, [
        iconNode("check-square", { size: 14 }),
        " To-Do",
        ...(badge ? [" ", badge] : [])
      ])
    ]),
    el("div", { class: "panel-header__right" }, [clearBtn])
  ]);

  // Add-task input row
  let inputVal = "";
  const input = el("input", {
    type: "text",
    class: "todo-input",
    placeholder: "Add a task…",
    "aria-label": "New task",
    maxlength: "200",
    onInput: (e) => { inputVal = e.target.value; },
    onKeydown: (e) => {
      if (e.key === "Enter" && inputVal.trim()) addTask();
    }
  });

  function addTask() {
    const text = inputVal.trim();
    if (!text) return;
    items.unshift({ id: uid(), text, done: false, createdAt: Date.now() });
    const next = nextSettings();
    persist(next, { debounce: true });
    renderTodo(mount, next, { onChange, onAttachDragHandle });
  }

  const addRow = el("div", { class: "todo-add-row" }, [
    input,
    el("button", {
      type: "button",
      class: "icon-button icon-button--accent icon-button--small",
      "aria-label": "Add task",
      onClick: addTask
    }, [iconNode("plus", { size: 14 })])
  ]);

  // Task list
  const listEl = el("ul", { class: "todo-list", role: "list" });

  const visible = cfg.showCompleted ? items : items.filter(i => !i.done);

  for (const item of visible) {
    const row = buildTaskRow(item, items, cfg, settings, onChange, onAttachDragHandle, mount);
    listEl.appendChild(row);
  }

  if (visible.length === 0) {
    listEl.appendChild(el("li", { class: "panel-empty" }, ["No tasks yet — add one above."]));
  }

  const body = el("div", { class: "panel-body todo-body" }, [addRow, listEl]);

  mount.appendChild(header);
  mount.appendChild(body);

  if (onAttachDragHandle) {
    onAttachDragHandle(header.querySelector(".panel-header__drag"));
  }

}

function buildTaskRow(item, items, cfg, settings, onChange, onAttachDragHandle, mount) {
  const checkbox = el("button", {
    type: "button",
    class: `todo-check${item.done ? " todo-check--done" : ""}`,
    "aria-pressed": String(item.done),
    "aria-label": item.done ? "Mark incomplete" : "Mark complete",
    innerHTML: iconString(item.done ? "check-square" : "square", 16),
    onClick: () => {
      item.done = !item.done;
      const next = { ...settings, todo: { ...cfg, items } };
      commitTodoChange(mount, next, onChange);
      renderTodo(mount, next, { onChange, onAttachDragHandle });
    }
  });

  const label = el("span", { class: `todo-label${item.done ? " todo-label--done" : ""}` }, [item.text]);

  const del = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--tiny todo-delete",
    "aria-label": "Delete task",
    onClick: () => {
      const idx = items.indexOf(item);
      if (idx > -1) items.splice(idx, 1);
      const next = { ...settings, todo: { ...cfg, items } };
      commitTodoChange(mount, next, onChange);
      renderTodo(mount, next, { onChange, onAttachDragHandle });
      toast("Task deleted.", "warning", 6500, {
        label: "Undo",
        onClick: () => {
          const restored = [...items];
          restored.splice(Math.max(0, idx), 0, item);
          const restoredNext = { ...settings, todo: { ...cfg, items: restored } };
          commitTodoChange(mount, restoredNext, onChange);
          renderTodo(mount, restoredNext, { onChange, onAttachDragHandle });
        }
      });
    }
  }, [iconNode("trash", { size: 12 })]);

  return el("li", { class: "todo-item", role: "listitem" }, [checkbox, label, del]);
}

function commitTodoChange(mount, next, onChange, { debounce = false } = {}) {
  if (!debounce) {
    clearTodoPersist(mount);
    onChange?.(next);
    return;
  }
  if (mount._todoPersistTimer) clearTimeout(mount._todoPersistTimer);
  mount._todoPendingSettings = next;
  mount._todoPersistTimer = setTimeout(() => {
    const pending = mount._todoPendingSettings;
    clearTodoPersist(mount);
    if (pending) onChange?.(pending);
  }, TODO_PERSIST_DEBOUNCE_MS);
}

function clearTodoPersist(mount) {
  if (mount._todoPersistTimer) {
    clearTimeout(mount._todoPersistTimer);
    mount._todoPersistTimer = null;
  }
  mount._todoPendingSettings = null;
}
