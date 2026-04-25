/**
 * Clean Light skin — Hermes dashboard plugin.
 *
 * Injects deterministic pastel label colours per compartment so
 * compartments are visually separated at a glance. Each compartment
 * name hashes to a stable index in the Material You tonal palette —
 * consistent across page reloads and SPA route changes.
 *
 * No external branding injected. Stays within the Hermes identity.
 */
(function () {
  "use strict";

  const SDK = window.__HERMES_PLUGIN_SDK__;
  const PLUGINS = window.__HERMES_PLUGINS__;
  if (!SDK || !PLUGINS) return;

  // ─── Compartment colour palette — Material You tonal pairs ───────────────
  // Each entry: [bg, fg] — light pastel bg, darker text
  const PALETTES = [
    ["#fce8e6", "#c5221f"], // warm red
    ["#e8f0fe", "#1a73e8"], // sky blue
    ["#e6f4ea", "#137333"], // sage green
    ["#fef7e0", "#b05e00"], // amber
    ["#f3e8fd", "#7b1fa2"], // purple
    ["#e4f7fb", "#007b83"], // teal
    ["#fbe9e7", "#bf360c"], // deep orange
    ["#f0f4ff", "#3c4499"], // indigo
    ["#fff3e0", "#e65100"], // orange
    ["#f9fbe7", "#558b2f"], // light green
    ["#fdf2fa", "#880e4f"], // pink
    ["#e0f7fa", "#006064"], // cyan
    ["#fff8e1", "#f57f17"], // yellow
    ["#f3e5f5", "#6a1b9a"], // deep purple
    ["#e8eaf6", "#283593"], // deep indigo
    ["#e0f2f1", "#004d40"], // dark teal
    ["#fce4ec", "#880e4f"], // pink dark
    ["#e3f2fd", "#0d47a1"], // blue dark
    ["#f1f8e9", "#33691e"], // light green dark
    ["#ede7f6", "#4527a0"], // deep purple mid
  ];

  // Stable djb2-style hash → palette index
  function hashStr(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return Math.abs(h) % PALETTES.length;
  }

  const assigned = new Map();

  function colorsFor(name) {
    if (!assigned.has(name)) assigned.set(name, PALETTES[hashStr(name)]);
    return assigned.get(name);
  }

  // Inject CSS vars onto [data-compartment] elements
  function applyCompartmentColors() {
    document.querySelectorAll("[data-compartment]").forEach((el) => {
      const name = el.getAttribute("data-compartment") || "default";
      const [bg, fg] = colorsFor(name);
      el.style.setProperty("--cl-compartment-bg", bg);
      el.style.setProperty("--cl-compartment-fg", fg);
    });
  }

  // Stylesheet for label/badge elements inside compartments
  function refreshStyleSheet() {
    const id = "cl-skin-compartment-styles";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    const rules = [];
    assigned.forEach(([bg, fg], name) => {
      const safe = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(name) : name.replace(/[^\w-]/g, "_");
      rules.push(
        `[data-compartment="${safe}"] .badge,` +
        `[data-compartment="${safe}"] [data-slot="badge"] {` +
        `background:${bg}!important;color:${fg}!important;}`
      );
      rules.push(
        `[data-label="${safe}"] {` +
        `background:${bg}!important;color:${fg}!important;` +
        `border-radius:9999px!important;padding:2px 8px!important;` +
        `font-size:0.6875rem!important;font-weight:500!important;}`
      );
    });
    el.textContent = rules.join("\n");
  }

  function scan() {
    applyCompartmentColors();
    refreshStyleSheet();
  }

  // MutationObserver picks up dynamically added compartments
  function startObserver() {
    const obs = new MutationObserver(scan);
    obs.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-compartment"],
    });
  }

  function init() {
    scan();
    startObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Re-scan every 3s for SPA route changes
  setInterval(scan, 3000);

  // Observability hook
  window.__debug = window.__debug || {};
  window.__debug["cl-skin"] = {
    compartments: assigned,
    palettes: PALETTES,
    getColors: colorsFor,
    rescan: scan,
  };

  // Register plugin page (hidden tab — slot-only plugin)
  if (PLUGINS.register) {
    PLUGINS.register("gmail-skin", () =>
      (SDK.React || window.React).createElement(
        "div",
        { style: { padding: "1rem", color: "#5f6368", fontSize: "0.875rem" } },
        "Clean Light skin active",
      ),
    );
  }

})();
