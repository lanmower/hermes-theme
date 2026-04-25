/**
 * Clean Light / Dark skin — Hermes dashboard plugin.
 *
 * Every user-created entity (session, skill, cron job, model, compartment)
 * gets a stable, deterministic colour derived from its name.
 * Colours persist across reloads via localStorage and are fully reassignable.
 *
 * Reassignment API (browser console):
 *   window.__debug["cl-skin"].reassign("name", 0-19)
 *   window.__debug["cl-skin"].reset("name")
 *   window.__debug["cl-skin"].resetAll()
 *   window.__debug["cl-skin"].list()        // show all assigned names + indices
 */
(function () {
  "use strict";

  const SDK = window.__HERMES_PLUGIN_SDK__;
  const PLUGINS = window.__HERMES_PLUGINS__;
  if (!SDK || !PLUGINS) return;

  // Light palette — [bg tint, accent fg]
  const P_LIGHT = [
    ["#fce8e6", "#c5221f"],
    ["#e8f0fe", "#1a73e8"],
    ["#e6f4ea", "#137333"],
    ["#fef7e0", "#b05e00"],
    ["#f3e8fd", "#7b1fa2"],
    ["#e4f7fb", "#007b83"],
    ["#fbe9e7", "#bf360c"],
    ["#f0f4ff", "#3c4499"],
    ["#fff3e0", "#e65100"],
    ["#f9fbe7", "#558b2f"],
    ["#fdf2fa", "#880e4f"],
    ["#e0f7fa", "#006064"],
    ["#fff8e1", "#f57f17"],
    ["#f3e5f5", "#6a1b9a"],
    ["#e8eaf6", "#283593"],
    ["#e0f2f1", "#004d40"],
    ["#fce4ec", "#c62828"],
    ["#e3f2fd", "#0d47a1"],
    ["#f1f8e9", "#33691e"],
    ["#ede7f6", "#4527a0"],
  ];

  // Dark palette — same indices, dark-surface variants
  const P_DARK = [
    ["#4a1512", "#f28b82"],
    ["#1a2f5e", "#8ab4f8"],
    ["#1a3320", "#81c995"],
    ["#3d2e00", "#fdd663"],
    ["#2d1b42", "#d7aefb"],
    ["#003438", "#78d9ec"],
    ["#4a1c0a", "#ffb399"],
    ["#1c2060", "#aab0f5"],
    ["#3d2500", "#ffb974"],
    ["#243014", "#b5e48c"],
    ["#3b0c2a", "#f4b8dc"],
    ["#003035", "#79c6ce"],
    ["#3d2f00", "#fde899"],
    ["#280d42", "#d7b8f5"],
    ["#0d1540", "#9fa8da"],
    ["#00201e", "#80cbc4"],
    ["#3b0c2a", "#f48fb1"],
    ["#0d2240", "#90caf9"],
    ["#1a2e0a", "#aed581"],
    ["#1a0f42", "#b39ddb"],
  ];

  // Detect dark mode via computed background brightness (immune to CSS var tricks)
  function isDark() {
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!m) return false;
    const lum = 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3];
    return lum < 128;
  }

  function djb2(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return Math.abs(h) % P_LIGHT.length;
  }

  // Persistent overrides — survive page reload
  const STORE_KEY = "cl-skin-overrides";
  const overrides = new Map(
    JSON.parse(localStorage.getItem(STORE_KEY) || "[]")
  );

  function saveOverrides() {
    localStorage.setItem(STORE_KEY, JSON.stringify([...overrides]));
  }

  // Runtime cache — cleared on dark/light switch detected
  let _lastDark = isDark();
  const cache = new Map();

  function checkThemeSwitch() {
    const dark = isDark();
    if (dark !== _lastDark) { _lastDark = dark; cache.clear(); }
  }

  function indexFor(name) {
    return overrides.has(name) ? overrides.get(name) : djb2(name);
  }

  function colorsFor(name) {
    if (!cache.has(name)) {
      const idx = indexFor(name);
      cache.set(name, _lastDark ? P_DARK[idx] : P_LIGHT[idx]);
    }
    return cache.get(name);
  }

  function accent(name) { return colorsFor(name)[1]; }
  function tint(name, opacity) {
    const [bg] = colorsFor(name);
    return bg + opacity; // hex + 2-char alpha e.g. "66" = 40%
  }

  // ─── Mark element as colored (idempotent per name) ────────────────────────
  function mark(el, name) {
    if (el.dataset.clColored === name) return false;
    el.dataset.clColored = name;
    return true;
  }

  // ─── Compartments (data-compartment attr) ─────────────────────────────────
  function colorCompartments() {
    document.querySelectorAll("[data-compartment]").forEach((el) => {
      const name = el.getAttribute("data-compartment") || "default";
      const [bg] = colorsFor(name);
      el.style.setProperty("--cl-compartment-bg", bg);
    });
  }

  // ─── Session rows (/sessions page) ────────────────────────────────────────
  // Principle: backgrounds, not borders. Each row gets a tinted bg + colored
  // title so the entity is identifiable without any border chrome.
  function paintRow(row, name, bgAlpha) {
    const [bg] = colorsFor(name);
    row.style.backgroundColor = bg + bgAlpha;
    row.style.borderLeft = "none";
  }

  function colorSessions() {
    // Compact rows
    document.querySelectorAll("div.flex.flex-col.sm\\:flex-row.sm\\:items-center").forEach((row) => {
      const titleEl = row.querySelector("span.font-medium");
      const modelEl = row.querySelector("span.font-mono-ui, span[class*='font-mono']");
      if (!titleEl || !modelEl) return;
      const name = titleEl.textContent.trim() || "Untitled";
      if (!mark(row, name)) return;
      paintRow(row, name, "33");
    });

    // Accordion rows
    document.querySelectorAll("div.border.overflow-hidden.transition-colors.border-border").forEach((row) => {
      const modelEl = row.querySelector("span.font-mono-ui, span[class*='font-mono']");
      if (!modelEl) return;
      const titleEl = row.querySelector("span.font-medium, span.font-semibold");
      if (!titleEl) return;
      const name = titleEl.textContent.trim() || "Untitled";
      if (!mark(row, name)) return;
      paintRow(row, name, "26");
    });
  }

  // ─── Skill rows (/skills page) ─────────────────────────────────────────────
  // Each skill: div.group.flex.items-start.gap-3.px-3.py-2.5
  // Name: first span.font-mono-ui or first anchor/span text
  function colorSkills() {
    document.querySelectorAll("div.group.flex.items-start.gap-3").forEach((row) => {
      // Must have a switch to confirm it's a skill row, not something else
      const sw = row.querySelector('[role="switch"]');
      if (!sw) return;
      const nameEl = row.querySelector("span.font-mono-ui");
      if (!nameEl) return;
      const name = nameEl.textContent.trim();
      if (!name) return;
      if (!mark(row, name)) return;
      paintRow(row, name, "44");
    });
  }

  // ─── Cron job rows (/cron page) ────────────────────────────────────────────
  // Job rows contain a name heading + schedule badge + status badge
  // Selector: card containers with a cron schedule pattern (e.g. "0 9 * * *")
  function colorCronJobs() {
    document.querySelectorAll("div.border.border-border.bg-card\\/80").forEach((card) => {
      // Identify as cron job card: must have a schedule-like text (digits/stars/spaces)
      const txt = card.textContent || "";
      const hasSchedule = /\d+\s+[\d\*]+\s+[\d\*]+\s+[\d\*]+\s+[\d\*]+/.test(txt);
      const hasPause = card.querySelector('[aria-label*="ause"], [title*="ause"], [aria-label*="rigger"]');
      if (!hasSchedule && !hasPause) return;

      // Name: first h3/h4 or first bold span
      const nameEl = card.querySelector("h3, h4, span.font-semibold, span.font-medium");
      if (!nameEl) return;
      const name = nameEl.textContent.trim();
      if (!name || name === "New Cron Job") return; // skip create form
      if (!mark(card, name)) return;
      paintRow(card, name, "55");
    });
  }

  // ─── Model name badges (inline text) ──────────────────────────────────────
  // Tint the model name's background only — never recolor text.
  function colorModelBadges() {
    document.querySelectorAll("span.font-mono-ui, code.font-mono-ui").forEach((el) => {
      if (el.closest("div.group.flex.items-start.gap-3")) return;
      const name = el.textContent.trim();
      if (!name || el.dataset.clColored === name) return;
      el.dataset.clColored = name;
      const [bg] = colorsFor(name);
      el.style.backgroundColor = bg + "66";
      el.style.borderRadius = "4px";
      el.style.padding = "1px 6px";
    });
  }

  // ─── data-label badges ────────────────────────────────────────────────────
  function refreshStyleSheet() {
    const id = "cl-skin-entity-styles";
    let styleEl = document.getElementById(id);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = id;
      document.head.appendChild(styleEl);
    }
    const rules = [];
    cache.forEach(([bg], name) => {
      const safe = CSS.escape ? CSS.escape(name) : name.replace(/[^\w-]/g, "_");
      rules.push(
        `[data-compartment="${safe}"] .badge,` +
        `[data-compartment="${safe}"] [data-slot="badge"]{background:${bg}!important;}`
      );
      rules.push(
        `[data-label="${safe}"]{background:${bg}!important;` +
        `border-radius:9999px!important;padding:2px 8px!important;` +
        `font-size:0.6875rem!important;font-weight:500!important;}`
      );
    });
    styleEl.textContent = rules.join("\n");
  }

  // ─── Brand rename: Hermes → Thoth ─────────────────────────────────────────
  // Replace text content only — never touch attributes, ids, classes.
  function renameBrand(root) {
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null);
    const hits = [];
    let n;
    while ((n = walker.nextNode())) {
      const v = n.nodeValue;
      if (v && /Hermes/.test(v)) hits.push(n);
    }
    hits.forEach(n => { n.nodeValue = n.nodeValue.replace(/Hermes/g, "Thoth"); });
    // Also patch document.title once per change
    if (/Hermes/.test(document.title)) {
      document.title = document.title.replace(/Hermes/g, "Thoth");
    }
  }

  // ─── Main scan ────────────────────────────────────────────────────────────
  function scan() {
    checkThemeSwitch();
    colorCompartments();
    colorSessions();
    colorSkills();
    colorCronJobs();
    colorModelBadges();
    refreshStyleSheet();
    renameBrand();
  }

  function startObserver() {
    const obs = new MutationObserver(scan);
    obs.observe(document.body, { subtree: true, childList: true,
      attributes: true, attributeFilter: ["data-compartment", "class"] });
  }

  function clearStaleMarkers() {
    document.querySelectorAll("[data-cl-colored]").forEach(el => {
      delete el.dataset.clColored;
    });
  }

  function init() { clearStaleMarkers(); scan(); startObserver(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  setInterval(scan, 3000);

  // ─── Public API ──────────────────────────────────────────────────────────
  window.__debug = window.__debug || {};
  window.__debug["cl-skin"] = {
    palettes: { light: P_LIGHT, dark: P_DARK },
    cache, overrides,
    getColors: colorsFor,
    rescan: scan,

    list() {
      const out = [];
      cache.forEach(([bg, fg], name) => {
        out.push({ name, index: indexFor(name), bg, fg, override: overrides.has(name) });
      });
      return out;
    },

    reassign(name, idx) {
      if (idx < 0 || idx >= P_LIGHT.length)
        throw new RangeError(`idx must be 0-${P_LIGHT.length - 1}`);
      overrides.set(name, idx);
      saveOverrides();
      cache.delete(name);
      document.querySelectorAll(`[data-cl-colored="${name}"]`).forEach(el => {
        delete el.dataset.clColored;
        el.style.removeProperty("border-left");
        el.style.removeProperty("background-color");
        el.style.removeProperty("color");
        el.querySelectorAll("[data-cl-title]").forEach(t => {
          delete t.dataset.clTitle;
          t.style.removeProperty("color");
          t.style.removeProperty("font-weight");
        });
      });
      scan();
    },

    reset(name) {
      overrides.delete(name);
      saveOverrides();
      cache.delete(name);
      document.querySelectorAll(`[data-cl-colored="${name}"]`).forEach(el => {
        delete el.dataset.clColored;
        el.style.removeProperty("border-left");
        el.style.removeProperty("background-color");
        el.style.removeProperty("color");
        el.querySelectorAll("[data-cl-title]").forEach(t => {
          delete t.dataset.clTitle;
          t.style.removeProperty("color");
          t.style.removeProperty("font-weight");
        });
      });
      scan();
    },

    resetAll() {
      overrides.clear();
      saveOverrides();
      cache.clear();
      document.querySelectorAll("[data-cl-colored]").forEach(el => {
        delete el.dataset.clColored;
        el.style.removeProperty("border-left");
        el.style.removeProperty("background-color");
        el.style.removeProperty("color");
      });
      document.querySelectorAll("[data-cl-title]").forEach(t => {
        delete t.dataset.clTitle;
        t.style.removeProperty("color");
        t.style.removeProperty("font-weight");
      });
      scan();
    },
  };

  if (PLUGINS.register) {
    PLUGINS.register("gmail-skin", () =>
      (SDK.React || window.React).createElement(
        "div",
        { style: { padding: "1rem", color: "#5f6368", fontSize: "0.875rem" } },
        "Clean Light skin active — entity colours applied.",
      ),
    );
  }

})();
