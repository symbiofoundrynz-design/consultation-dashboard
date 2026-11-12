"use strict";

(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";
  const debug = new URLSearchParams(location.search).get("debug") === "1";

  const dom = {
    app: document.getElementById("app"),
    workspace: document.getElementById("workspace"),
    svg: document.getElementById("matrix"),
    backLinks: document.getElementById("back-links"),
    backNodes: document.getElementById("back-nodes"),
    clientLayer: document.getElementById("client-layer"),
    frontLinks: document.getElementById("front-links"),
    frontNodes: document.getElementById("front-nodes"),
    infoPanel: document.getElementById("info-panel"),
    panelContent: document.getElementById("panel-content"),
    closePanel: document.getElementById("panel-close"),
    warningButton: document.getElementById("warning-button"),
    warningDialog: document.getElementById("warning-dialog"),
    warningList: document.getElementById("warning-list"),
    emptyState: document.getElementById("empty-state"),
    loadingState: document.getElementById("loading-state"),
    helpHint: document.getElementById("help-hint"),
    zoomIn: document.getElementById("zoom-in"),
    zoomOut: document.getElementById("zoom-out"),
    reset: document.getElementById("reset-view"),
    motion: document.getElementById("motion-toggle"),
    settingsToggle: document.getElementById("settings-toggle"),
    settingsPanel: document.getElementById("settings-panel"),
    settingsClose: document.getElementById("settings-close"),
    settingsReset: document.getElementById("settings-reset"),
    settingIdleZoom: document.getElementById("setting-idle-zoom"),
    settingViewTilt: document.getElementById("setting-view-tilt"),
    settingLayoutSpread: document.getElementById("setting-layout-spread"),
    settingOrbitBreathing: document.getElementById("setting-orbit-breathing"),
    settingMotionStrength: document.getElementById("setting-motion-strength"),
    settingIdleSpeed: document.getElementById("setting-idle-speed"),
    fullscreen: document.getElementById("fullscreen")
  };

  const SETTINGS_KEY = "cdash-ecosphere-settings-v1";
  const DEFAULT_SETTINGS = {
    idleZoom: "near",
    viewTilt: "soft",
    layoutSpread: "natural",
    orbitBreathing: "subtle",
    motionStrength: "normal",
    idleSpeed: "normal"
  };

  const SETTING_PRESETS = {
    idleZoom: {
      near: 1.16,
      balanced: 1.04,
      wide: 0.92
    },
    viewTilt: {
      flat: 0,
      soft: -8,
      deep: -14
    },
    layoutSpread: {
      tight: { radiusScale: 0.92, stagger: 0.04 },
      natural: { radiusScale: 1.02, stagger: 0.09 },
      wide: { radiusScale: 1.12, stagger: 0.13 }
    },
    orbitBreathing: {
      off: 0,
      subtle: 0.022,
      noticeable: 0.045
    },
    motionStrength: {
      calm: 0.58,
      normal: 1,
      alive: 1.35
    },
    idleSpeed: {
      slow: 0.011,
      normal: 0.018,
      fast: 0.028
    }
  };

  const state = {
    config: null,
    data: null,
    nodes: [],
    links: [],
    providerNodes: [],
    client: null,
    width: 0,
    height: 0,
    centerX: 0,
    centerY: 0,
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
    zoom: 1,
    targetZoom: 1,
    velocityYaw: 0,
    velocityPitch: 0,
    pointerMap: new Map(),
    drag: null,
    pinchStart: null,
    selectedId: null,
    hoveredId: null,
    panelOpen: false,
    settingsOpen: false,
    settings: { ...DEFAULT_SETTINGS },
    warnings: [],
    startTime: performance.now(),
    lastInteraction: performance.now(),
    lastFrame: performance.now(),
    motionEnabled: !matchMedia("(prefers-reduced-motion: reduce)").matches,
    reduceMotionMedia: matchMedia("(prefers-reduced-motion: reduce)"),
    idleRotating: false,
    logoStatus: new Map(),
    suppressClickUntil: 0
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const angleDelta = (target, current) => Math.atan2(Math.sin(target - current), Math.cos(target - current));
  const svgEl = (name, attrs = {}) => {
    const el = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    return el;
  };
  const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); };
  const safeText = value => String(value ?? "");
  const isActive = value => String(value ?? "Active").toLowerCase() === "active";

  function addWarning(message) {
    if (!state.warnings.includes(message)) state.warnings.push(message);
    renderWarnings();
  }

  function renderWarnings() {
    dom.warningButton.classList.toggle("hidden", state.warnings.length === 0);
    clear(dom.warningList);
    for (const warning of state.warnings) {
      const li = document.createElement("li");
      li.textContent = warning;
      dom.warningList.appendChild(li);
    }
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      state.settings = { ...DEFAULT_SETTINGS, ...saved };
    } catch (error) {
      console.warn("EcoSphere settings could not be loaded.", error);
      state.settings = { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function syncSettingsControls() {
    dom.settingIdleZoom.value = state.settings.idleZoom;
    dom.settingViewTilt.value = state.settings.viewTilt;
    dom.settingLayoutSpread.value = state.settings.layoutSpread;
    dom.settingOrbitBreathing.value = state.settings.orbitBreathing;
    dom.settingMotionStrength.value = state.settings.motionStrength;
    dom.settingIdleSpeed.value = state.settings.idleSpeed;
  }

  function defaultPitchRadians() {
    return (state.config.defaultPitchDegrees || 0) * Math.PI / 180;
  }

  function applySettings({ resetViewState = false } = {}) {
    if (!state.config) return;
    const spread = SETTING_PRESETS.layoutSpread[state.settings.layoutSpread] || SETTING_PRESETS.layoutSpread.natural;
    state.config.defaultZoom = SETTING_PRESETS.idleZoom[state.settings.idleZoom] || SETTING_PRESETS.idleZoom.near;
    state.config.defaultPitchDegrees = SETTING_PRESETS.viewTilt[state.settings.viewTilt] ?? SETTING_PRESETS.viewTilt.soft;
    state.config.providerRadiusScale = spread.radiusScale;
    state.config.providerRadiusStagger = spread.stagger;
    state.config.providerBreathingAmplitude = SETTING_PRESETS.orbitBreathing[state.settings.orbitBreathing] ?? SETTING_PRESETS.orbitBreathing.subtle;
    state.config.motionStrength = SETTING_PRESETS.motionStrength[state.settings.motionStrength] || SETTING_PRESETS.motionStrength.normal;
    state.config.idleRotationSpeedRadiansPerSecond = SETTING_PRESETS.idleSpeed[state.settings.idleSpeed] || SETTING_PRESETS.idleSpeed.normal;
    state.targetZoom = clamp(state.targetZoom, state.config.minZoom, state.config.maxZoom);
    state.targetPitch = clamp(state.targetPitch, -pitchLimit(), pitchLimit());
    if (resetViewState) resetView(false);
  }

  function setSetting(key, value) {
    state.settings[key] = value;
    saveSettings();
    applySettings();
    interact();
  }

  function normalizeSnapshot(raw) {
    if (!raw || typeof raw !== "object") return null;
    const cleanRows = (rows, fields) => Array.isArray(rows)
      ? rows.map(row => {
          const clean = {};
          for (const field of fields) clean[field] = safeText(row?.[field]);
          return clean;
        })
      : [];
    return {
      id: safeText(raw.id),
      snapshot_date: safeText(raw.snapshot_date),
      accepted_at: safeText(raw.accepted_at),
      parser_status: safeText(raw.parser_status),
      productSummary: safeText(raw.productSummary).trim(),
      finalSnapshot: safeText(raw.finalSnapshot).trim(),
      pricing: cleanRows(raw.pricing, ["field", "value"]),
      facts: cleanRows(raw.facts, ["section", "capability", "available", "note", "review_flag"]),
      listItems: cleanRows(raw.listItems || raw.list_items, ["list_type", "name", "type", "purpose", "access_or_status", "note"])
    };
  }

  function validateData(raw) {
    const normalized = { providers: [] };
    if (!raw || !Array.isArray(raw.providers)) {
      addWarning("The normalized data object did not contain a providers array.");
      return normalized;
    }
    const providerIds = new Set();
    for (const [pIndex, provider] of raw.providers.entries()) {
      if (!provider || typeof provider !== "object") {
        addWarning(`Provider record ${pIndex + 1} is not an object and was skipped.`);
        continue;
      }
      const id = safeText(provider.id).trim();
      const name = safeText(provider.name).trim();
      if (!id || !name) {
        addWarning(`Provider record ${pIndex + 1} is missing an id or name and was skipped.`);
        continue;
      }
      if (providerIds.has(id)) {
        addWarning(`Duplicate provider id "${id}" was skipped.`);
        continue;
      }
      providerIds.add(id);
      if (!isActive(provider.status)) continue;
      const normalizedProvider = {
        id,
        name,
        website: provider.website ? safeText(provider.website) : "",
        logo_path: safeText(provider.logo_path),
        status: "Active",
        products: []
      };
      const productIds = new Set();
      const products = Array.isArray(provider.products) ? provider.products : [];
      if (!Array.isArray(provider.products)) addWarning(`Provider "${name}" had no valid products array.`);
      for (const [itemIndex, product] of products.entries()) {
        if (!product || typeof product !== "object") {
          addWarning(`Product record ${itemIndex + 1} under "${name}" was skipped.`);
          continue;
        }
        const productId = safeText(product.id).trim();
        const productName = safeText(product.name).trim();
        if (!productId || !productName) {
          addWarning(`A product under "${name}" is missing an id or name and was skipped.`);
          continue;
        }
        if (productIds.has(productId)) {
          addWarning(`Duplicate product id "${productId}" under "${name}" was skipped.`);
          continue;
        }
        productIds.add(productId);
        if (!isActive(product.status)) continue;
        if (product.provider_id && product.provider_id !== id) {
          addWarning(`Product "${productName}" declared provider_id "${product.provider_id}" but is nested under "${id}"; the parent nesting was used.`);
        }
        normalizedProvider.products.push({
          id: productId,
          provider_id: id,
          name: productName,
          website: product.website ? safeText(product.website) : "",
          logo_path: safeText(product.logo_path),
          category: safeText(product.category),
          tags: safeText(product.tags),
          status: "Active",
          snapshot: normalizeSnapshot(product.snapshot)
        });
      }
      normalized.providers.push(normalizedProvider);
    }
    return normalized;
  }

  function buildGraph(data) {
    state.nodes = [];
    state.links = [];
    state.providerNodes = [];
    const providerCount = data.providers.length;
    const totalWeight = data.providers.reduce((sum, p) => sum + Math.max(1.15, 1 + p.products.length * 0.24), 0);
    let cursor = -Math.PI / 2;

    data.providers.forEach((provider, index) => {
      const weight = Math.max(1.15, 1 + provider.products.length * 0.24);
      const span = (Math.PI * 2 * weight) / totalWeight;
      const theta = cursor + span / 2;
      cursor += span;
      const providerNode = {
        runtimeId: `provider:${provider.id}`,
        type: "provider",
        id: provider.id,
        providerId: provider.id,
        parentId: null,
        name: provider.name,
        website: provider.website,
        logoPath: provider.logo_path,
        productRecords: provider.products,
        baseTheta: theta,
        radiusOffset: Math.sin((index + 1) * 1.947) * 0.5 + Math.sin((index + 1) * 4.131) * 0.5,
        latitude: Math.sin(index * 2.17) * 0.26,
        revealAt: providerCount <= 1 ? 0 : index / providerCount,
        phase: index * 1.731,
        dom: null,
        screen: null
      };
      state.nodes.push(providerNode);
      state.providerNodes.push(providerNode);
      state.links.push({ source: "client", target: providerNode.runtimeId, type: "provider", dom: null });

      const products = provider.products;
      const count = products.length;
      products.forEach((product, productIndex) => {
        const ringIndex = Math.floor(productIndex / 4);
        const slot = productIndex % 4;
        const ringCount = Math.min(4, count - ringIndex * 4);
        const fan = ringCount === 1 ? 0 : (slot / (ringCount - 1) - 0.5);
        const productNode = {
          runtimeId: `product:${provider.id}:${product.id}`,
          type: "product",
          id: product.id,
          providerId: provider.id,
          parentId: providerNode.runtimeId,
          name: product.name,
          website: product.website,
          logoPath: product.logo_path,
          category: product.category,
          tags: product.tags,
          snapshot: product.snapshot,
          baseTheta: theta,
          latitude: providerNode.latitude,
          ringIndex,
          fan,
          revealAt: Math.min(1, providerNode.revealAt + 0.06 + productIndex * 0.018),
          phase: (index + 1) * 2.07 + productIndex * 1.29,
          dom: null,
          screen: null
        };
        state.nodes.push(productNode);
        state.links.push({ source: providerNode.runtimeId, target: productNode.runtimeId, type: "product", dom: null });
      });
    });
  }

  function calcBaseSize(type) {
    const shortEdge = Math.min(state.width, state.height);
    if (type === "provider") {
      return clamp(shortEdge * 0.088, state.config.providerSize.min, state.config.providerSize.max);
    }
    return clamp(shortEdge * 0.052, state.config.productSize.min, state.config.productSize.max);
  }

  function rotate3D(point, yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x1 = point.x * cy + point.z * sy;
    const z1 = -point.x * sy + point.z * cy;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    return { x: x1, y: point.y * cp - z1 * sp, z: point.y * sp + z1 * cp };
  }

  function getProviderPoint(node, now) {
    const minEdge = Math.min(state.width, state.height);
    const baseRadius = minEdge * (state.width < 1366 || state.height < 768 ? 0.30 : 0.34);
    const stagger = 1 + node.radiusOffset * state.config.providerRadiusStagger;
    const breathing = state.motionEnabled ? 1 + Math.sin(now * 0.00023 + node.phase) * state.config.providerBreathingAmplitude : 1;
    const radius = baseRadius * state.config.providerRadiusScale * stagger * breathing;
    const theta = node.baseTheta;
    const drift = state.motionEnabled ? Math.sin(now * 0.0007 + node.phase) * 2.2 * state.config.motionStrength : 0;
    return {
      x: Math.cos(theta) * radius,
      y: node.latitude * radius * 0.9 + drift,
      z: Math.sin(theta) * radius * 0.92
    };
  }

  function getProductPoint(node, providerBase, now) {
    const baseSize = calcBaseSize("provider");
    const orbit = baseSize * (1.02 + node.ringIndex * 0.78);
    const theta = node.baseTheta;
    const radial = { x: Math.cos(theta), y: 0, z: Math.sin(theta) };
    const tangent = { x: -Math.sin(theta), y: 0, z: Math.cos(theta) };
    const vertical = { x: 0, y: 1, z: 0 };
    const micro = state.motionEnabled ? Math.sin(now * 0.0011 + node.phase) * 2.0 * state.config.motionStrength : 0;
    const outward = orbit * (1.15 + Math.abs(node.fan) * 0.12);
    const sideways = node.fan * orbit * 1.45;
    const verticalOffset = (node.fan === 0 ? 0 : Math.sin(node.fan * Math.PI) * orbit * 0.42) + micro;
    return {
      x: providerBase.x + radial.x * outward + tangent.x * sideways + vertical.x * verticalOffset,
      y: providerBase.y + radial.y * outward + tangent.y * sideways + vertical.y * verticalOffset,
      z: providerBase.z + radial.z * outward + tangent.z * sideways + vertical.z * verticalOffset
    };
  }

  function getProductScreen(node, providerScreen, now) {
    const providerSize = calcBaseSize("provider");
    const productSize = calcBaseSize("product");
    let dx = providerScreen.x - state.centerX;
    let dy = providerScreen.y - state.centerY;
    let distance = Math.hypot(dx, dy);
    if (distance < providerSize * 0.45) {
      const fallbackAngle = node.baseTheta + state.yaw;
      dx = Math.cos(fallbackAngle);
      dy = Math.sin(fallbackAngle) * 0.48;
      distance = Math.hypot(dx, dy) || 1;
    }
    const ux = dx / distance;
    const uy = dy / distance;
    const px = -uy;
    const py = ux;
    const ringDistance = providerSize * 0.72 + productSize * 0.72 + node.ringIndex * productSize * 1.25;
    const fanOffset = node.fan * productSize * 1.7;
    const micro = state.motionEnabled ? Math.sin(now * 0.0011 + node.phase) * 1.8 * state.config.motionStrength : 0;
    return {
      x: providerScreen.x + ux * ringDistance + px * fanOffset + px * micro,
      y: providerScreen.y + uy * ringDistance + py * fanOffset + py * micro,
      z: providerScreen.z + node.fan * 4 - node.ringIndex * 2,
      depth: clamp(providerScreen.depth + node.fan * 0.018, -1, 1),
      scale: providerScreen.scale * 0.96
    };
  }

  function resolveCollisions() {
    const nodes = state.nodes.filter(node => node.screen);
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const aRadius = calcBaseSize(a.type) * 0.43;
          const bRadius = calcBaseSize(b.type) * 0.43;
          const minDistance = aRadius + bRadius + 5;
          let dx = b.screen.x - a.screen.x;
          let dy = b.screen.y - a.screen.y;
          let distance = Math.hypot(dx, dy);
          if (distance >= minDistance) continue;
          if (distance < 0.001) { dx = 1; dy = 0; distance = 1; }
          const overlap = minDistance - distance;
          const ux = dx / distance, uy = dy / distance;
          const aMovable = a.type === "product";
          const bMovable = b.type === "product";
          if (aMovable && bMovable) {
            a.screen.x -= ux * overlap * 0.5; a.screen.y -= uy * overlap * 0.5;
            b.screen.x += ux * overlap * 0.5; b.screen.y += uy * overlap * 0.5;
          } else if (aMovable) {
            a.screen.x -= ux * overlap; a.screen.y -= uy * overlap;
          } else if (bMovable) {
            b.screen.x += ux * overlap; b.screen.y += uy * overlap;
          }
        }
      }
    }
  }

  function project(point) {
    const rotated = rotate3D(point, state.yaw, state.pitch);
    const depthRange = Math.min(state.width, state.height) * 0.48;
    const normalizedDepth = clamp(rotated.z / depthRange, -1, 1);
    const perspectiveScale = 0.86 + (normalizedDepth + 1) * 0.18;
    const scale = perspectiveScale * state.zoom;
    return {
      x: state.centerX + rotated.x * scale,
      y: state.centerY + rotated.y * scale,
      z: rotated.z,
      depth: normalizedDepth,
      scale
    };
  }

  function createClient() {
    clear(dom.clientLayer);
    const group = svgEl("g", { class: "client-node", tabindex: "0", role: "button", "aria-label": "Client centre. Activate to reset the view." });
    const halo = svgEl("circle", { class: "client-halo", fill: "url(#clientHalo)" });
    const orb = svgEl("g", { class: "client-orb" });
    const core = svgEl("circle", { class: "client-core" });
    const shine = svgEl("ellipse", { class: "client-shine" });
    orb.append(core, shine);
    group.append(halo, orb);
    dom.clientLayer.appendChild(group);
    state.client = { group, halo, orb, core, shine };
    group.addEventListener("click", event => { event.stopPropagation(); resetView(); });
    group.addEventListener("dblclick", event => { event.stopPropagation(); openClientPanel(); });
    group.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); resetView(); }
    });
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";
  }

  function createNodeDom(node) {
    const group = svgEl("g", {
      class: "graph-node",
      tabindex: "0",
      role: "button",
      "data-runtime-id": node.runtimeId,
      "aria-label": `${node.name}, ${node.type}${node.type === "product" ? `, product of ${providerName(node.providerId)}` : ""}. Press Enter to bring into focus. Press Space for details.`
    });
    const hit = svgEl("circle", { class: "node-hit" });
    const halo = svgEl("circle", { class: "node-halo" });
    const logoGroup = svgEl("g", { class: "node-logo" });
    const image = svgEl("image", { class: "node-logo-image", preserveAspectRatio: "xMidYMid meet" });
    image.setAttributeNS(XLINK_NS, "href", node.logoPath || "");
    image.setAttribute("href", node.logoPath || "");
    const text = svgEl("text", { class: "node-initials" });
    text.textContent = initials(node.name);
    text.style.display = "none";
    logoGroup.append(image, text);

    const label = svgEl("g", { class: "node-label" });
    const labelBg = svgEl("rect", { class: "node-label-bg", rx: 8, ry: 8 });
    const labelText = svgEl("text", { class: "node-label-text" });
    labelText.textContent = node.name;
    label.append(labelBg, labelText);

    const debugText = debug ? svgEl("text", { class: "debug-label" }) : null;
    if (debugText) debugText.textContent = node.runtimeId;
    group.append(hit, halo, logoGroup, label);
    if (debugText) group.append(debugText);

    node.dom = { group, hit, halo, logoGroup, image, initials: text, label, labelBg, labelText, debugText };
    bindNodeEvents(node);
    prepareLogo(node);
    return group;
  }

  function prepareLogo(node) {
    if (!node.logoPath) {
      useInitials(node, "No logo path supplied");
      return;
    }
    let retryCount = 0;
    node.dom.image.addEventListener("error", () => {
      if (retryCount === 0) {
        retryCount++;
        const separator = node.logoPath.includes("?") ? "&" : "?";
        const retryPath = `${node.logoPath}${separator}retry=1`;
        node.dom.image.setAttribute("href", retryPath);
        node.dom.image.setAttributeNS(XLINK_NS, "href", retryPath);
      } else {
        useInitials(node, `Logo failed to load: ${node.logoPath}`);
      }
    });
    node.dom.image.addEventListener("load", () => state.logoStatus.set(node.runtimeId, "loaded"));
  }

  function useInitials(node, warning) {
    node.dom.image.style.display = "none";
    node.dom.initials.style.display = "block";
    state.logoStatus.set(node.runtimeId, "fallback");
    addWarning(`${node.name}: ${warning}; initials are shown instead.`);
  }

  function providerName(providerId) {
    return state.data?.providers.find(p => p.id === providerId)?.name || providerId;
  }

  function bindNodeEvents(node) {
    const group = node.dom.group;
    group.addEventListener("pointerenter", () => { state.hoveredId = node.runtimeId; interact(); });
    group.addEventListener("pointerleave", () => { if (state.hoveredId === node.runtimeId) state.hoveredId = null; });
    group.addEventListener("focus", () => { group.classList.add("keyboard-focus"); state.hoveredId = node.runtimeId; interact(); });
    group.addEventListener("blur", () => { group.classList.remove("keyboard-focus"); if (state.hoveredId === node.runtimeId) state.hoveredId = null; });
    group.addEventListener("click", event => {
      event.stopPropagation();
      if (performance.now() < state.suppressClickUntil) return;
      selectNode(node);
    });
    group.addEventListener("dblclick", event => {
      event.stopPropagation();
      openNodePanel(node);
    });
    group.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); selectNode(node); }
      if (event.key === " ") { event.preventDefault(); openNodePanel(node); }
    });
  }

  function renderGraphDom() {
    clear(dom.backLinks); clear(dom.frontLinks); clear(dom.backNodes); clear(dom.frontNodes);
    for (const link of state.links) {
      link.dom = svgEl("path", { class: `graph-link ${link.type}-link` });
      (link.type === "provider" ? dom.backLinks : dom.backLinks).appendChild(link.dom);
    }
    for (const node of state.nodes) dom.backNodes.appendChild(createNodeDom(node));
    createClient();
  }

  function linkEndpoints(source, target, sourceRadius, targetRadius) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.hypot(dx, dy) || 1;
    const ux = dx / distance, uy = dy / distance;
    return {
      sx: source.x + ux * sourceRadius,
      sy: source.y + uy * sourceRadius,
      tx: target.x - ux * targetRadius,
      ty: target.y - uy * targetRadius,
      ux, uy, distance
    };
  }

  function curvedPath(source, target, sourceRadius, targetRadius, bend = 0.08) {
    const p = linkEndpoints(source, target, sourceRadius, targetRadius);
    const mx = (p.sx + p.tx) / 2;
    const my = (p.sy + p.ty) / 2;
    const curve = Math.min(28, p.distance * bend);
    const cx = mx - p.uy * curve;
    const cy = my + p.ux * curve;
    return `M ${p.sx.toFixed(2)} ${p.sy.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${p.tx.toFixed(2)} ${p.ty.toFixed(2)}`;
  }

  function branchMatches(node) {
    if (!state.selectedId && !state.hoveredId) return false;
    const activeId = state.hoveredId || state.selectedId;
    const active = state.nodes.find(n => n.runtimeId === activeId);
    if (!active) return false;
    const providerId = active.type === "provider" ? active.id : active.providerId;
    return node.type === "provider" ? node.id === providerId : node.providerId === providerId;
  }

  function updateNodeDom(node, revealProgress) {
    const domNode = node.dom;
    const screen = node.screen;
    const base = calcBaseSize(node.type);
    const depthScale = 0.78 + (screen.depth + 1) * 0.22;
    const hovered = state.hoveredId === node.runtimeId;
    const selected = state.selectedId === node.runtimeId;
    const branchActive = branchMatches(node);
    const hasFocusContext = Boolean(state.selectedId || state.hoveredId);
    const unrelated = hasFocusContext && !branchActive;
    const swell = hovered || selected ? 1.08 : 1;
    const size = base * depthScale * swell;
    const opacity = revealProgress * (unrelated ? 0.32 : 0.66 + (screen.depth + 1) * 0.17);
    const isForeground = screen.depth > -0.05;
    const activeProvider = state.selectedId ? state.nodes.find(n => n.runtimeId === state.selectedId) : null;
    const parentSelected = activeProvider && (activeProvider.type === "provider" ? activeProvider.id === node.providerId : activeProvider.providerId === node.providerId);
    const showLabel = node.type === "provider" ? isForeground : (branchActive || parentSelected) && screen.depth > -0.42;

    domNode.group.setAttribute("transform", `translate(${screen.x.toFixed(2)} ${screen.y.toFixed(2)})`);
    domNode.group.setAttribute("opacity", opacity.toFixed(3));
    domNode.group.classList.toggle("hovered", hovered);
    domNode.group.classList.toggle("selected", selected);
    domNode.group.classList.toggle("show-label", showLabel);
    domNode.hit.setAttribute("r", size * 0.60);
    domNode.halo.setAttribute("r", size * 0.58);
    domNode.logoGroup.setAttribute("transform", `scale(${swell})`);
    const inset = size * 0.12;
    const logoSide = size - inset * 2;
    domNode.image.setAttribute("x", -logoSide / 2);
    domNode.image.setAttribute("y", -logoSide / 2);
    domNode.image.setAttribute("width", logoSide);
    domNode.image.setAttribute("height", logoSide);
    domNode.initials.setAttribute("font-size", Math.max(12, size * 0.28));
    domNode.initials.setAttribute("x", 0);
    domNode.initials.setAttribute("y", 0);

    const labelWidth = clamp(node.name.length * 7.2 + 20, 56, 170);
    const labelY = size * 0.62 + 10;
    domNode.label.setAttribute("transform", `translate(0 ${labelY})`);
    domNode.labelBg.setAttribute("x", -labelWidth / 2);
    domNode.labelBg.setAttribute("y", -12);
    domNode.labelBg.setAttribute("width", labelWidth);
    domNode.labelBg.setAttribute("height", 24);
    domNode.labelText.setAttribute("x", 0);
    domNode.labelText.setAttribute("y", 0);
    if (domNode.debugText) {
      domNode.debugText.setAttribute("x", size * 0.55);
      domNode.debugText.setAttribute("y", -size * 0.55);
      domNode.debugText.textContent = `${node.runtimeId} z:${screen.depth.toFixed(2)}`;
    }
    node.visualRadius = size * 0.48;
  }

  function updateClient() {
    if (!state.client) return;
    const providerSize = calcBaseSize("provider");
    const radius = providerSize * state.config.clientOrbScale * 0.5;
    const c = state.client;
    c.group.setAttribute("transform", `translate(${state.centerX.toFixed(2)} ${state.centerY.toFixed(2)})`);
    c.halo.setAttribute("r", radius * 1.85);
    c.core.setAttribute("r", radius);
    c.shine.setAttribute("cx", -radius * 0.24);
    c.shine.setAttribute("cy", -radius * 0.28);
    c.shine.setAttribute("rx", radius * 0.31);
    c.shine.setAttribute("ry", radius * 0.18);
    state.clientRadius = radius;
  }

  function moveDomByDepth() {
    // Move an element only when it crosses the client plane. Re-appending every
    // animation frame can interrupt pointer click/double-click sequences.
    for (const node of state.nodes) {
      const layer = node.screen.z < 0 ? dom.backNodes : dom.frontNodes;
      if (node.dom.group.parentNode !== layer) layer.appendChild(node.dom.group);
    }
    for (const link of state.links) {
      const target = state.nodes.find(n => n.runtimeId === link.target);
      const source = link.source === "client" ? null : state.nodes.find(n => n.runtimeId === link.source);
      const z = source ? (source.screen.z + target.screen.z) / 2 : target.screen.z;
      const layer = z < 0 ? dom.backLinks : dom.frontLinks;
      if (link.dom.parentNode !== layer) layer.appendChild(link.dom);
    }
  }

  function updateLinks(revealProgressById) {
    for (const link of state.links) {
      const target = state.nodes.find(n => n.runtimeId === link.target);
      if (!target?.screen) continue;
      let sourceScreen, sourceRadius;
      if (link.source === "client") {
        sourceScreen = { x: state.centerX, y: state.centerY };
        sourceRadius = state.clientRadius;
      } else {
        const source = state.nodes.find(n => n.runtimeId === link.source);
        if (!source?.screen) continue;
        sourceScreen = source.screen;
        sourceRadius = source.visualRadius;
      }
      const targetRadius = target.visualRadius;
      const path = curvedPath(sourceScreen, target.screen, sourceRadius, targetRadius, link.type === "provider" ? 0.055 : 0.10);
      const targetReveal = revealProgressById.get(target.runtimeId) ?? 0;
      const sourceReveal = link.source === "client" ? 1 : (revealProgressById.get(link.source) ?? 0);
      const reveal = Math.min(targetReveal, sourceReveal);
      const branchActive = branchMatches(target);
      const hasFocusContext = Boolean(state.selectedId || state.hoveredId);
      const unrelated = hasFocusContext && !branchActive;
      const rear = target.screen.depth < 0;
      const baseOpacity = link.type === "provider" ? 0.58 : 0.42;
      const opacity = reveal * baseOpacity * (rear ? 0.56 : 1) * (unrelated ? 0.22 : 1);
      link.dom.setAttribute("d", path);
      link.dom.setAttribute("stroke", branchActive ? "#66c1ff" : "#2f8edc");
      link.dom.setAttribute("stroke-width", link.type === "provider" ? (branchActive ? 3.2 : 2.35) : (branchActive ? 2.35 : 1.55));
      link.dom.setAttribute("opacity", opacity.toFixed(3));
      if (branchActive) link.dom.setAttribute("filter", "url(#blueGlow)"); else link.dom.removeAttribute("filter");
    }
  }

  function animate(now) {
    const dt = Math.min(40, now - state.lastFrame);
    state.lastFrame = now;
    const ease = 1 - Math.pow(0.001, dt / 1000);
    state.yaw += angleDelta(state.targetYaw, state.yaw) * Math.min(1, ease * 1.8);
    state.pitch = lerp(state.pitch, state.targetPitch, Math.min(1, ease * 1.8));
    state.zoom = lerp(state.zoom, state.targetZoom, Math.min(1, ease * 1.8));

    if (!state.drag && Math.abs(state.velocityYaw) + Math.abs(state.velocityPitch) > 0.000001) {
      state.targetYaw += state.velocityYaw * dt;
      state.targetPitch = clamp(state.targetPitch + state.velocityPitch * dt, -pitchLimit(), pitchLimit());
      const damping = Math.pow(0.91, dt / 16.67);
      state.velocityYaw *= damping;
      state.velocityPitch *= damping;
    }

    const idleRotationAllowed = state.motionEnabled
      && !state.drag
      && !state.selectedId
      && !state.hoveredId
      && !state.panelOpen
      && !state.settingsOpen
      && now - state.lastInteraction > state.config.idleRotationDelayMs;

    state.idleRotating = idleRotationAllowed;
    if (idleRotationAllowed) {
      state.targetYaw += state.config.idleRotationSpeedRadiansPerSecond * (dt / 1000);
      state.targetPitch = lerp(state.targetPitch, defaultPitchRadians(), Math.min(1, ease * 0.45));
      state.targetZoom = lerp(state.targetZoom, state.config.defaultZoom, Math.min(1, ease * 0.45));
    }

    if (debug) {
      dom.workspace.dataset.idleRotating = String(idleRotationAllowed);
      dom.workspace.dataset.yaw = state.yaw.toFixed(6);
    }

    updateScene(now);
    requestAnimationFrame(animate);
  }

  function updateScene(now) {
    if (!state.config || !state.data) return;
    const providerBaseMap = new Map();
    const revealProgressById = new Map();
    for (const provider of state.providerNodes) {
      const base = getProviderPoint(provider, now);
      providerBaseMap.set(provider.runtimeId, base);
      provider.screen = project(base);
    }
    for (const node of state.nodes) {
      if (node.type !== "product") continue;
      const provider = state.providerNodes.find(item => item.runtimeId === node.parentId);
      node.screen = getProductScreen(node, provider.screen, now);
    }
    resolveCollisions();
    for (const node of state.nodes) {
      const elapsed = now - state.startTime;
      const begin = node.revealAt * state.config.revealDurationMs;
      const local = state.motionEnabled ? clamp((elapsed - begin) / 420, 0, 1) : 1;
      const reveal = easeOutCubic(local);
      revealProgressById.set(node.runtimeId, reveal);
      updateNodeDom(node, reveal);
    }
    updateClient();
    updateLinks(revealProgressById);
    moveDomByDepth();
  }

  function pitchLimit() { return state.config.verticalTiltLimitDegrees * Math.PI / 180; }

  function selectNode(node) {
    interact();
    if (state.selectedId === node.runtimeId && node.type === "provider") {
      state.selectedId = null;
      return;
    }
    state.selectedId = node.runtimeId;
    const provider = node.type === "provider" ? node : state.providerNodes.find(p => p.id === node.providerId);
    if (provider) {
      state.targetYaw = -provider.baseTheta;
      state.targetPitch = clamp(-provider.latitude * 0.42, -pitchLimit(), pitchLimit());
    }
  }

  function openClientPanel() {
    interact();
    state.panelOpen = true;
    dom.infoPanel.classList.add("open");
    dom.infoPanel.setAttribute("aria-hidden", "false");
    dom.panelContent.innerHTML = `
      <p class="panel-kicker">Centre node</p>
      <h2 class="panel-title">Client</h2>
      <p class="panel-id">client</p>
      <div class="panel-section"><h3>V1 placeholder</h3><p>The centre represents the consultation client. Client-profile data is intentionally not connected in this release.</p></div>`;
    setTimeout(() => dom.closePanel.focus(), 50);
  }

  function compactText(text, maxLength = 420) {
    const clean = safeText(text).replace(/\s+/g, " ").trim();
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength - 1).trim()}...`;
  }

  function sectionMarkup(title, body) {
    if (!body) return "";
    return `<div class="panel-section"><h3>${escapeHtml(title)}</h3>${body}</div>`;
  }

  function listMarkup(items, emptyText = "") {
    const usable = items.filter(Boolean);
    if (!usable.length && !emptyText) return "";
    const rows = usable.length ? usable : [emptyText];
    return `<ul class="panel-list">${rows.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  function chipMarkup(items) {
    const usable = items.filter(Boolean);
    if (!usable.length) return "";
    return `<div class="panel-chip-list">${usable.map(item => `<span class="panel-chip">${escapeHtml(item)}</span>`).join("")}</div>`;
  }

  function pricingValue(snapshot, field) {
    const row = snapshot?.pricing?.find(item => item.field.toLowerCase() === field.toLowerCase());
    const value = safeText(row?.value).trim();
    return value && value.toUpperCase() !== "UNKNOWN" ? value : "";
  }

  function pricingEssentials(snapshot) {
    if (!snapshot) return [];
    const rows = [
      ["Free tier", pricingValue(snapshot, "Free tier available")],
      ["Entry", [pricingValue(snapshot, "Entry paid tier name"), pricingValue(snapshot, "Entry paid tier price")].filter(Boolean).join(" - ")],
      ["Pro", [pricingValue(snapshot, "Pro paid tier name"), pricingValue(snapshot, "Pro paid tier price")].filter(Boolean).join(" - ")],
      ["Team", [pricingValue(snapshot, "Team or business tier available"), pricingValue(snapshot, "Team or business tier price")].filter(Boolean).join(" - ")],
      ["Enterprise", pricingValue(snapshot, "Enterprise quote required")],
      ["Checked", pricingValue(snapshot, "Pricing checked date")]
    ];
    return rows.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
  }

  function factByCapability(snapshot, capability) {
    return snapshot?.facts?.find(item => item.capability.toLowerCase() === capability.toLowerCase()) || null;
  }

  function affirmativeFactLabels(snapshot, capabilities, limit) {
    const blocked = new Set(["", "NO", "UNKNOWN", "NONE", "N/A"]);
    return capabilities.map(capability => {
      const fact = factByCapability(snapshot, capability);
      const status = safeText(fact?.available).trim().toUpperCase();
      if (blocked.has(status)) return "";
      return status === "YES" ? capability : `${capability}: ${fact.available}`;
    }).filter(Boolean).slice(0, limit);
  }

  function platformSupport(snapshot) {
    return affirmativeFactLabels(snapshot, [
      "Web app",
      "Windows app",
      "macOS app",
      "Linux app",
      "Android app",
      "iPhone or iPad app",
      "Browser extension",
      "API",
      "Command-line tool",
      "Self-hosted server",
      "Local desktop use",
      "Open-weight models",
      "Offline use"
    ], 10);
  }

  function usefulCapabilities(snapshot) {
    return affirmativeFactLabels(snapshot, [
      "General chat",
      "Writing and editing",
      "Reasoning",
      "Data analysis",
      "Live web search",
      "File upload",
      "PDF reading",
      "Image understanding",
      "Image generation",
      "Code generation",
      "Code execution",
      "Coding agent",
      "API access",
      "Tool calling"
    ], 8);
  }

  function providerPanel(node, website) {
    const products = node.productRecords || [];
    return `
      ${website}
      ${sectionMarkup("Products", `<p class="panel-copy">${products.length} product${products.length === 1 ? "" : "s"} recorded.</p>${listMarkup(products.map(p => p.name), "No products recorded")}`)}`;
  }

  function productPanel(node, provider, website) {
    const snapshot = node.snapshot;
    const summary = compactText(snapshot?.productSummary);
    const finalSnapshot = compactText(snapshot?.finalSnapshot);
    const platform = platformSupport(snapshot);
    const pricing = pricingEssentials(snapshot);
    const capabilities = usefulCapabilities(snapshot);
    const category = node.category ? `<p class="panel-copy"><strong>Category:</strong> ${escapeHtml(node.category)}</p>` : "";
    const tags = node.tags ? chipMarkup(node.tags.split(",").map(tag => tag.trim())) : "";
    return `
      ${website}
      ${sectionMarkup("Provider", listMarkup([provider?.name || node.providerId]))}
      ${(category || tags) ? sectionMarkup("Classification", `${category}${tags}`) : ""}
      ${summary ? sectionMarkup("Product Summary", `<p class="panel-copy">${escapeHtml(summary)}</p>`) : ""}
      ${sectionMarkup("Pricing Essentials", listMarkup(pricing, snapshot ? "No pricing essentials stored" : "No snapshot stored"))}
      ${sectionMarkup("Platform / Interface", chipMarkup(platform) || `<p class="panel-copy">No platform fields stored.</p>`)}
      ${sectionMarkup("Useful Capabilities", chipMarkup(capabilities) || `<p class="panel-copy">No capability highlights stored.</p>`)}
      ${finalSnapshot ? sectionMarkup("Final Snapshot", `<p class="panel-copy">${escapeHtml(finalSnapshot)}</p>`) : ""}`;
  }

  function openNodePanel(node) {
    interact();
    state.panelOpen = true;
    state.selectedId = node.runtimeId;
    dom.infoPanel.classList.add("open");
    dom.infoPanel.setAttribute("aria-hidden", "false");
    const runtimeId = node.runtimeId;
    const provider = state.data.providers.find(p => p.id === node.providerId);
    const website = node.website ? `<a class="panel-link" href="${escapeAttr(node.website)}" target="_blank" rel="noopener noreferrer">Open website ↗</a>` : `<p class="panel-id">No website recorded</p>`;
    const panelBody = node.type === "provider" ? providerPanel(node, website) : productPanel(node, provider, website);
    dom.panelContent.innerHTML = `
      ${node.logoPath ? `<img class="panel-logo" src="${escapeAttr(node.logoPath)}" alt="">` : ""}
      <p class="panel-kicker">${escapeHtml(node.type)}</p>
      <h2 class="panel-title">${escapeHtml(node.name)}</h2>
      <p class="panel-id">${escapeHtml(runtimeId)}</p>
      ${panelBody}`;
    setTimeout(() => dom.closePanel.focus(), 50);
  }

  function closePanel() {
    state.panelOpen = false;
    dom.infoPanel.classList.remove("open");
    dom.infoPanel.setAttribute("aria-hidden", "true");
    interact();
  }

  function escapeHtml(text) {
    return safeText(text).replace(/[&<>"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
  }
  function escapeAttr(text) { return escapeHtml(text).replace(/'/g, "&#39;"); }

  function resetView(markInteraction = true) {
    if (markInteraction) interact();
    state.selectedId = null;
    state.hoveredId = null;
    state.targetYaw = 0;
    state.targetPitch = defaultPitchRadians();
    state.targetZoom = state.config.defaultZoom;
    state.velocityYaw = 0;
    state.velocityPitch = 0;
  }

  function interact() {
    state.lastInteraction = performance.now();
    state.idleRotating = false;
    dom.helpHint.classList.add("fade");
  }

  function adjustZoom(delta) {
    interact();
    state.targetZoom = clamp(state.targetZoom + delta, state.config.minZoom, state.config.maxZoom);
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.target.setPointerCapture?.(event.pointerId);
    state.pointerMap.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (state.pointerMap.size === 1) {
      state.drag = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        lastTime: performance.now(),
        moved: false
      };
      state.velocityYaw = 0;
      state.velocityPitch = 0;
      dom.svg.classList.add("dragging");
    } else if (state.pointerMap.size === 2) {
      const points = [...state.pointerMap.values()];
      state.pinchStart = { distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y), zoom: state.targetZoom };
    }
    interact();
  }

  function onPointerMove(event) {
    if (!state.pointerMap.has(event.pointerId)) return;
    state.pointerMap.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (state.pointerMap.size === 2 && state.pinchStart) {
      const points = [...state.pointerMap.values()];
      const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
      if (state.pinchStart.distance > 0) state.targetZoom = clamp(state.pinchStart.zoom * (distance / state.pinchStart.distance), state.config.minZoom, state.config.maxZoom);
      interact();
      return;
    }
    if (!state.drag || state.drag.id !== event.pointerId) return;
    const now = performance.now();
    const dx = event.clientX - state.drag.lastX;
    const dy = event.clientY - state.drag.lastY;
    const total = Math.hypot(event.clientX - state.drag.startX, event.clientY - state.drag.startY);
    if (total > 5) state.drag.moved = true;
    const sensitivity = 0.0062 / Math.max(0.7, state.zoom);
    state.targetYaw += dx * sensitivity;
    state.targetPitch = clamp(state.targetPitch + dy * sensitivity * 0.72, -pitchLimit(), pitchLimit());
    const elapsed = Math.max(1, now - state.drag.lastTime);
    state.velocityYaw = dx * sensitivity / elapsed;
    state.velocityPitch = dy * sensitivity * 0.72 / elapsed;
    state.drag.lastX = event.clientX;
    state.drag.lastY = event.clientY;
    state.drag.lastTime = now;
    interact();
  }

  function onPointerUp(event) {
    state.pointerMap.delete(event.pointerId);
    if (state.pointerMap.size < 2) state.pinchStart = null;
    if (state.drag?.id === event.pointerId) {
      state.suppressClickUntil = state.drag.moved ? performance.now() + 140 : 0;
      state.drag = null;
    }
    if (state.pointerMap.size === 0) dom.svg.classList.remove("dragging");
    interact();
  }

  function onWheel(event) {
    if (!dom.workspace.contains(event.target)) return;
    event.preventDefault();
    adjustZoom(event.deltaY < 0 ? 0.08 : -0.08);
  }

  function onKeyDown(event) {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === "A" || activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") return;
    let handled = true;
    switch (event.key) {
      case "ArrowLeft": state.targetYaw -= 0.14; break;
      case "ArrowRight": state.targetYaw += 0.14; break;
      case "ArrowUp": state.targetPitch = clamp(state.targetPitch - 0.08, -pitchLimit(), pitchLimit()); break;
      case "ArrowDown": state.targetPitch = clamp(state.targetPitch + 0.08, -pitchLimit(), pitchLimit()); break;
      case "+": case "=": adjustZoom(0.1); break;
      case "-": case "_": adjustZoom(-0.1); break;
      case "Escape":
        if (state.settingsOpen) closeSettingsPanel();
        else if (state.panelOpen) closePanel();
        else { state.selectedId = null; state.hoveredId = null; interact(); }
        break;
      default: handled = false;
    }
    if (handled) { event.preventDefault(); interact(); }
  }

  async function toggleFullscreen() {
    interact();
    try {
      if (!document.fullscreenElement) await dom.app.requestFullscreen(); else await document.exitFullscreen();
    } catch (error) { addWarning(`Full-screen request failed: ${error.message}`); }
  }

  function toggleMotion() {
    state.motionEnabled = !state.motionEnabled;
    dom.motion.setAttribute("aria-pressed", String(state.motionEnabled));
    interact();
  }

  function openSettingsPanel() {
    state.settingsOpen = true;
    if (state.panelOpen) closePanel();
    dom.settingsPanel.classList.add("open");
    dom.settingsPanel.setAttribute("aria-hidden", "false");
    syncSettingsControls();
    interact();
    setTimeout(() => dom.settingsClose.focus(), 50);
  }

  function closeSettingsPanel() {
    state.settingsOpen = false;
    dom.settingsPanel.classList.remove("open");
    dom.settingsPanel.setAttribute("aria-hidden", "true");
    interact();
  }

  function resetSettings() {
    state.settings = { ...DEFAULT_SETTINGS };
    saveSettings();
    syncSettingsControls();
    applySettings({ resetViewState: true });
    interact();
  }

  function resize() {
    const rect = dom.workspace.getBoundingClientRect();
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
    state.centerX = state.width / 2;
    state.centerY = state.height / 2;
    dom.svg.setAttribute("viewBox", `0 0 ${state.width} ${state.height}`);
  }

  function bindGlobalEvents() {
    dom.svg.addEventListener("pointerdown", onPointerDown);
    dom.svg.addEventListener("pointermove", onPointerMove);
    dom.svg.addEventListener("pointerup", onPointerUp);
    dom.svg.addEventListener("pointercancel", onPointerUp);
    dom.workspace.addEventListener("wheel", onWheel, { passive: false });
    dom.workspace.addEventListener("click", event => {
      if (event.target === dom.svg || event.target === dom.workspace) {
        state.selectedId = null;
        state.hoveredId = null;
        if (state.panelOpen) closePanel();
        if (state.settingsOpen) closeSettingsPanel();
        interact();
      }
    });
    window.addEventListener("keydown", onKeyDown);
    dom.zoomIn.addEventListener("click", () => adjustZoom(0.12));
    dom.zoomOut.addEventListener("click", () => adjustZoom(-0.12));
    dom.reset.addEventListener("click", () => resetView());
    dom.motion.addEventListener("click", toggleMotion);
    dom.settingsToggle.addEventListener("click", () => state.settingsOpen ? closeSettingsPanel() : openSettingsPanel());
    dom.settingsClose.addEventListener("click", closeSettingsPanel);
    dom.settingsReset.addEventListener("click", resetSettings);
    dom.settingIdleZoom.addEventListener("change", event => setSetting("idleZoom", event.target.value));
    dom.settingViewTilt.addEventListener("change", event => setSetting("viewTilt", event.target.value));
    dom.settingLayoutSpread.addEventListener("change", event => setSetting("layoutSpread", event.target.value));
    dom.settingOrbitBreathing.addEventListener("change", event => setSetting("orbitBreathing", event.target.value));
    dom.settingMotionStrength.addEventListener("change", event => setSetting("motionStrength", event.target.value));
    dom.settingIdleSpeed.addEventListener("change", event => setSetting("idleSpeed", event.target.value));
    dom.fullscreen.addEventListener("click", toggleFullscreen);
    dom.closePanel.addEventListener("click", closePanel);
    dom.warningButton.addEventListener("click", () => dom.warningDialog.showModal());
    document.addEventListener("fullscreenchange", () => {
      dom.fullscreen.setAttribute("aria-label", document.fullscreenElement ? "Exit full screen" : "Enter full screen");
    });
    state.reduceMotionMedia.addEventListener?.("change", event => {
      if (event.matches) { state.motionEnabled = false; dom.motion.setAttribute("aria-pressed", "false"); }
    });
    new ResizeObserver(resize).observe(dom.workspace);
  }

  async function loadConfig() {
    try {
      const response = await fetch("matrix-config.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      addWarning(`matrix-config.json could not be loaded (${error.message}); internal defaults were used.`);
      return {
        idleRotationDelayMs: 10000, idleRotationSpeedRadiansPerSecond: 0.018,
        revealDurationMs: 2600, defaultZoom: 1.16, minZoom: .65, maxZoom: 1.8,
        verticalTiltLimitDegrees: 20, defaultPitchDegrees: -8, clientOrbScale: 2,
        providerSize: { min: 64, max: 92 }, productSize: { min: 38, max: 54 },
        providerRadiusScale: 1.02, providerRadiusStagger: 0.09, providerBreathingAmplitude: 0.022,
        motionStrength: 1
      };
    }
  }

  async function init() {
    loadSettings();
    bindGlobalEvents();
    resize();
    dom.motion.setAttribute("aria-pressed", String(state.motionEnabled));
    try {
      state.config = await loadConfig();
      applySettings();
      syncSettingsControls();
      state.targetZoom = state.zoom = state.config.defaultZoom;
      state.targetPitch = state.pitch = defaultPitchRadians();
      const raw = await loadMatrixData();
      state.data = validateData(raw);
      buildGraph(state.data);
      renderGraphDom();
      dom.emptyState.classList.toggle("hidden", state.providerNodes.length > 0);
      dom.loadingState.classList.add("hidden");
      state.startTime = performance.now();
      requestAnimationFrame(animate);
    } catch (error) {
      dom.loadingState.classList.add("hidden");
      dom.emptyState.classList.remove("hidden");
      dom.emptyState.textContent = "AI EcoSphere could not load its data";
      addWarning(`${error.message}. Start the included local server before opening the application.`);
      state.config = state.config || await loadConfig();
      state.data = { providers: [] };
      createClient();
      requestAnimationFrame(animate);
    }
  }

  init();
})();
