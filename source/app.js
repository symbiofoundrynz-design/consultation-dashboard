(function () {
  "use strict";

  const STORAGE_KEY = "cdash_v1_core_store";
  const CLIENT_REGISTRY_KEY = "cdash_client_registry_v1";
  const CONSULTANT_REGISTRY_KEY = "cdash_consultant_registry_v1";
  const MATRIX_PREFS_KEY = "cdash_matrix_row_prefs_v1";
  const MATRIX_PRODUCT_PREFS_KEY = "cdash_matrix_product_prefs_v1";
  const MATRIX_LAYOUT_KEY = "cdash_matrix_layout_v1";
  const MATRIX_SAVED_VIEWS_KEY = "cdash_matrix_saved_views_v1";
  const ACTIVE_STATUSES = ["Active"];
  const STATUSES = ["Active", "Watchlist", "Retired", "Hidden"];
  const CLIENT_TYPES = ["individual", "sole_trader", "business", "organisation", "unknown"];
  const CLIENT_STATUSES = ["prospect", "active", "paused", "complete", "archived"];
  const CLIENT_TYPE_LABELS = {
    individual: "Individual",
    sole_trader: "Sole trader",
    business: "Business",
    organisation: "Organisation",
    unknown: "Unknown"
  };
  const CLIENT_STATUS_LABELS = {
    prospect: "Prospect",
    active: "Active",
    paused: "Paused",
    complete: "Complete",
    archived: "Archived"
  };
  const CONSULTANT_STATUSES = ["active", "paused", "retired", "archived"];
  const CONSULTANT_STATUS_LABELS = {
    active: "Active",
    paused: "Paused",
    retired: "Retired",
    archived: "Archived"
  };
  const SAMPLE_FILES = [
    "../base44_15-07-2026.md",
    "../chatGPT_15-07-2026.md",
    "../gemini_15-07-2026.md",
    "../grok_15-07-2026.md",
    "../vibe_15-07-2026.md"
  ];
  const PRIORITY_TERMS = [
    "pricing", "free tier", "base paid tier", "image generation", "audio generation",
    "video generation", "coding agent", "api access", "deployment", "automation",
    "data analysis", "file upload", "live web search", "local desktop use",
    "self-hosted server", "open-weight models", "offline use"
  ];
  const FACT_SECTIONS = new Set([
    "Core Capability Facts",
    "Data, Search and File Facts",
    "Media Capability Facts",
    "Coding and Build Facts",
    "Automation and Agent Facts",
    "API and Developer Facts",
    "Local, Open and Self-Hosted Facts",
    "Interfaces"
  ]);
  const LIST_SECTION_MAP = {
    "Product and Service List": "Product",
    "Tool List": "Tool",
    "Connector and Integration List": "Connector",
    "Major Limits": "Limit",
    "Recent Changes": "Recent change"
  };
  const PRICING_FIELDS = [
    "Free tier available",
    "Free tier price",
    "Free tier currency",
    "Free tier billing period",
    "Entry paid tier available",
    "Entry paid tier name",
    "Entry paid tier price",
    "Entry paid tier currency",
    "Entry paid tier billing period",
    "Mid paid tier available",
    "Mid paid tier name",
    "Mid paid tier price",
    "Mid paid tier currency",
    "Mid paid tier billing period",
    "Pro paid tier available",
    "Pro paid tier name",
    "Pro paid tier price",
    "Pro paid tier currency",
    "Pro paid tier billing period",
    "Team or business tier available",
    "Team or business tier name",
    "Team or business tier price",
    "Team or business tier currency",
    "Team or business tier billing period",
    "Team or business tier per-user pricing",
    "Enterprise tier available",
    "Enterprise quote required",
    "Enterprise public starting price",
    "Usage-based API pricing available",
    "API input token price",
    "API output token price",
    "API image generation price",
    "API audio price",
    "API video price",
    "Add-on or tool costs",
    "Media generation extra cost",
    "Included credits or usage allowance",
    "Free tier usage caps",
    "Paid tier usage caps",
    "Annual billing discount available",
    "Annual billing discount detail",
    "Pricing checked date"
  ];
  const FX_DISPLAY = {
    sourceCurrency: "USD",
    targetCurrency: "NZD",
    rate: 1.65,
    rateDate: "2026-07-16",
    note: "Approximate NZD estimate only. It excludes GST, card fees, regional pricing, and exchange-rate movement."
  };
  const ESSENTIAL_PRICING_FIELDS = [
    "Free tier available",
    "Free tier price",
    "Entry paid tier name",
    "Entry paid tier price",
    "Mid paid tier name",
    "Mid paid tier price",
    "Pro paid tier name",
    "Pro paid tier price",
    "Team or business tier available",
    "Team or business tier price",
    "Team or business tier per-user pricing",
    "Enterprise quote required",
    "Enterprise public starting price",
    "Usage-based API pricing available",
    "Included credits or usage allowance",
    "Free tier usage caps",
    "Paid tier usage caps",
    "Annual billing discount available",
    "Pricing checked date"
  ];
  const PRICING_PRESETS = {
    essentials: ESSENTIAL_PRICING_FIELDS,
    monthly: [
      "Free tier available",
      "Free tier price",
      "Entry paid tier available",
      "Entry paid tier name",
      "Entry paid tier price",
      "Entry paid tier billing period",
      "Mid paid tier available",
      "Mid paid tier name",
      "Mid paid tier price",
      "Mid paid tier billing period",
      "Pro paid tier available",
      "Pro paid tier name",
      "Pro paid tier price",
      "Pro paid tier billing period",
      "Annual billing discount available",
      "Annual billing discount detail",
      "Pricing checked date"
    ],
    team: [
      "Team or business tier available",
      "Team or business tier name",
      "Team or business tier price",
      "Team or business tier currency",
      "Team or business tier billing period",
      "Team or business tier per-user pricing",
      "Enterprise tier available",
      "Enterprise quote required",
      "Enterprise public starting price",
      "Pricing checked date"
    ],
    api: [
      "Usage-based API pricing available",
      "API input token price",
      "API output token price",
      "API image generation price",
      "API audio price",
      "API video price",
      "Add-on or tool costs",
      "Media generation extra cost",
      "Pricing checked date"
    ],
    limits: [
      "Included credits or usage allowance",
      "Free tier usage caps",
      "Paid tier usage caps",
      "Add-on or tool costs",
      "Media generation extra cost",
      "Annual billing discount available",
      "Pricing checked date"
    ]
  };
  const ESSENTIAL_CAPABILITY_FIELDS = [
    "General chat",
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
    "Tool calling",
    "Agent API",
    "Local desktop use",
    "Windows app",
    "macOS app",
    "Linux app",
    "Self-hosted server",
    "Open-weight models"
  ];

  const state = {
    main: "client",
    view: "client",
    openPrimerId: null,
    draftSnapshot: null,
    matrixSearch: "",
    matrixMode: "capabilities",
    matrixLayout: "standard",
    matrixHidden: {
      capabilities: [],
      pricing: []
    },
    matrixHiddenProducts: [],
    matrixSavedViews: [],
    showUnknown: true,
    showCheck: true
  };

  let db = defaultStore();
  let storeMode = "local";
  let clientRegistry = defaultClientRegistry();
  let clientRegistryMode = "local";
  let consultantRegistry = defaultConsultantRegistry();
  let consultantRegistryMode = "local";

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
      console.error(error);
      db = defaultStore();
      renderAll();
    });
  });

  async function init() {
    db = await loadStore();
    clientRegistry = await loadClientRegistry();
    consultantRegistry = await loadConsultantRegistry();
    loadMatrixPrefs();
    loadMatrixSavedViews();
    bindNavigation();
    bindEvents();
    loadMatrixLayout();
    seedDates();
    renderAll();
  }

  function defaultStore() {
    return {
      providers: [
        provider("provider-openai", "OpenAI", "https://openai.com", "assets/placeholder.svg", "Active"),
        provider("provider-google", "Google", "https://google.com", "assets/placeholder.svg", "Active"),
        provider("provider-xai", "xAI", "https://x.ai", "assets/placeholder.svg", "Active"),
        provider("provider-mistral", "Mistral", "https://mistral.ai", "assets/placeholder.svg", "Active"),
        provider("provider-wix", "Wix", "https://wix.com", "assets/placeholder.svg", "Active")
      ],
      products: [
        product("product-chatgpt", "provider-openai", "ChatGPT", "https://chatgpt.com", "assets/placeholder.svg", "Active", "General Assistant", "Chat, Research, Coding, Image Generation, Data Analysis, Voice, API"),
        product("product-gemini", "provider-google", "Gemini", "https://gemini.google.com", "assets/placeholder.svg", "Active", "General Assistant", "Chat, Research, Coding, Google Workspace, Multimodal, API"),
        product("product-grok", "provider-xai", "Grok", "https://grok.com", "assets/placeholder.svg", "Active", "General Assistant", "Chat, Live Search, Social/X, Image Generation, API"),
        product("product-vibe", "provider-mistral", "Vibe", "https://mistral.ai", "assets/placeholder.svg", "Active", "Coding Agent", "Developer Tool, Agent, Web App, Mistral"),
        product("product-base44", "provider-wix", "Base44", "https://base44.com", "assets/placeholder.svg", "Active", "App Builder", "Vibe Coding, Web App, Automation, Database, Deployment")
      ],
      primers: [
        {
          id: id("primer"),
          title: "Base AI Ecosystem Snapshot Primer v1.0",
          primer_text: "Stored source: CDASH_BASE_AI_ECOSYSTEM_PRIMER_v1.0.md\n\nOpen the source file for the locked full primer, or paste it here and save if you want it copied into the local store."
        }
      ],
      test_runs: [],
      test_run_products: [],
      snapshots: [],
      snapshot_pricing: [],
      snapshot_facts: [],
      snapshot_list_items: []
    };
  }

  function provider(idValue, name, website, logoPath, status) {
    return { id: idValue, name, website, logo_path: logoPath, status };
  }

  function product(idValue, providerId, name, website, logoPath, status, category = "", tags = "") {
    return { id: idValue, provider_id: providerId, name, website, logo_path: logoPath, category, tags, status };
  }

  function defaultClientRegistry() {
    return { clients: [] };
  }

  function defaultConsultantRegistry() {
    return { consultants: [] };
  }

  async function loadStore() {
    try {
      const response = await fetch("/api/store", { cache: "no-store" });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      storeMode = "server";
      return normalizeStore(await response.json());
    } catch (error) {
      console.warn("Server store unavailable; falling back to local storage.", error);
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      storeMode = "local";
      if (!raw) return defaultStore();
      return normalizeStore(JSON.parse(raw));
    } catch (error) {
      console.warn(error);
      return defaultStore();
    }
  }

  function normalizeStore(store) {
    const base = defaultStore();
    const normalized = Object.assign(base, store || {});
    normalized.products = (normalized.products || []).map((item) => ({
      ...item,
      category: item.category || "",
      tags: item.tags || ""
    }));
    return normalized;
  }

  function saveStore() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    if (storeMode === "server") {
      fetch("/api/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(db)
      }).catch((error) => {
        console.warn("Server save failed; local backup remains available.", error);
        storeMode = "local";
        updateIndicator();
      });
    }
    updateIndicator();
  }

  async function loadClientRegistry() {
    try {
      const response = await fetch("/api/client-registry", { cache: "no-store" });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      clientRegistryMode = "server";
      return normalizeClientRegistry(await response.json());
    } catch (error) {
      console.warn("Server client registry unavailable; falling back to local registry.", error);
    }
    try {
      const raw = localStorage.getItem(CLIENT_REGISTRY_KEY);
      clientRegistryMode = "local";
      if (!raw) return defaultClientRegistry();
      return normalizeClientRegistry(JSON.parse(raw));
    } catch (error) {
      console.warn(error);
      return defaultClientRegistry();
    }
  }

  function normalizeClientRegistry(registry) {
    const normalized = Object.assign(defaultClientRegistry(), registry || {});
    normalized.clients = (normalized.clients || []).map((client) => ({
      client_record_ref: client.client_record_ref || "",
      display_name: client.display_name || "",
      client_type: CLIENT_TYPES.includes(client.client_type) ? client.client_type : "unknown",
      contact_name: client.contact_name || "",
      email: client.email || "",
      phone: client.phone || "",
      business_name: client.business_name || "",
      website: client.website || "",
      status: CLIENT_STATUSES.includes(client.status) ? client.status : "prospect",
      notes: client.notes || "",
      created_at: client.created_at || "",
      updated_at: client.updated_at || ""
    }));
    return normalized;
  }

  function saveClientRegistryLocal() {
    localStorage.setItem(CLIENT_REGISTRY_KEY, JSON.stringify(clientRegistry));
  }

  async function postClientRegistryClient(payload) {
    if (clientRegistryMode !== "server") {
      const now = new Date().toISOString();
      const client = {
        client_record_ref: nextLocalClientRef(),
        ...payload,
        created_at: now,
        updated_at: now
      };
      clientRegistry.clients.unshift(client);
      saveClientRegistryLocal();
      return client;
    }
    const response = await fetch("/api/client-registry/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text() || `Server returned ${response.status}`);
    const result = await response.json();
    return result.client;
  }

  async function putClientRegistryClient(clientRef, payload) {
    if (clientRegistryMode !== "server") {
      const index = clientRegistry.clients.findIndex((client) => client.client_record_ref === clientRef);
      if (index < 0) throw new Error("Client not found");
      clientRegistry.clients[index] = {
        ...clientRegistry.clients[index],
        ...payload,
        updated_at: new Date().toISOString()
      };
      saveClientRegistryLocal();
      return clientRegistry.clients[index];
    }
    const response = await fetch(`/api/client-registry/clients/${encodeURIComponent(clientRef)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text() || `Server returned ${response.status}`);
    const result = await response.json();
    return result.client;
  }

  function nextLocalClientRef() {
    const prefix = `CL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-`;
    const latest = clientRegistry.clients
      .map((client) => client.client_record_ref || "")
      .filter((ref) => ref.startsWith(prefix))
      .sort()
      .pop();
    const number = latest ? Number(latest.split("-").pop()) + 1 : 1;
    return `${prefix}${String(Number.isFinite(number) ? number : 1).padStart(4, "0")}`;
  }

  async function loadConsultantRegistry() {
    try {
      const response = await fetch("/api/consultant-registry", { cache: "no-store" });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      consultantRegistryMode = "server";
      return normalizeConsultantRegistry(await response.json());
    } catch (error) {
      console.warn("Server consultant registry unavailable; falling back to local registry.", error);
    }
    try {
      const raw = localStorage.getItem(CONSULTANT_REGISTRY_KEY);
      consultantRegistryMode = "local";
      if (!raw) return defaultConsultantRegistry();
      return normalizeConsultantRegistry(JSON.parse(raw));
    } catch (error) {
      console.warn(error);
      return defaultConsultantRegistry();
    }
  }

  function normalizeConsultantRegistry(registry) {
    const normalized = Object.assign(defaultConsultantRegistry(), registry || {});
    normalized.consultants = (normalized.consultants || []).map((consultant) => ({
      consultant_ref: consultant.consultant_ref || "",
      display_name: consultant.display_name || "",
      role: consultant.role || "",
      email: consultant.email || "",
      phone: consultant.phone || "",
      organisation: consultant.organisation || "",
      website: consultant.website || "",
      status: CONSULTANT_STATUSES.includes(consultant.status) ? consultant.status : "active",
      notes: consultant.notes || "",
      created_at: consultant.created_at || "",
      updated_at: consultant.updated_at || ""
    }));
    return normalized;
  }

  function saveConsultantRegistryLocal() {
    localStorage.setItem(CONSULTANT_REGISTRY_KEY, JSON.stringify(consultantRegistry));
  }

  async function postConsultantRegistryConsultant(payload) {
    if (consultantRegistryMode !== "server") {
      const now = new Date().toISOString();
      const consultant = {
        consultant_ref: nextLocalConsultantRef(),
        ...payload,
        created_at: now,
        updated_at: now
      };
      consultantRegistry.consultants.unshift(consultant);
      saveConsultantRegistryLocal();
      return consultant;
    }
    const response = await fetch("/api/consultant-registry/consultants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text() || `Server returned ${response.status}`);
    const result = await response.json();
    return result.consultant;
  }

  async function putConsultantRegistryConsultant(consultantRef, payload) {
    if (consultantRegistryMode !== "server") {
      const index = consultantRegistry.consultants.findIndex((consultant) => consultant.consultant_ref === consultantRef);
      if (index < 0) throw new Error("Consultant not found");
      consultantRegistry.consultants[index] = {
        ...consultantRegistry.consultants[index],
        ...payload,
        updated_at: new Date().toISOString()
      };
      saveConsultantRegistryLocal();
      return consultantRegistry.consultants[index];
    }
    const response = await fetch(`/api/consultant-registry/consultants/${encodeURIComponent(consultantRef)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text() || `Server returned ${response.status}`);
    const result = await response.json();
    return result.consultant;
  }

  function nextLocalConsultantRef() {
    const prefix = `CONS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-`;
    const latest = consultantRegistry.consultants
      .map((consultant) => consultant.consultant_ref || "")
      .filter((ref) => ref.startsWith(prefix))
      .sort()
      .pop();
    const number = latest ? Number(latest.split("-").pop()) + 1 : 1;
    return `${prefix}${String(Number.isFinite(number) ? number : 1).padStart(4, "0")}`;
  }

  function updateIndicator() {
    const el = byId("dbIndicator");
    el.textContent = storeMode === "server" ? "Database connected" : "Local store connected";
  }

  function bindNavigation() {
    document.querySelectorAll(".tab").forEach((button) => {
      button.addEventListener("click", () => {
        state.main = button.dataset.section;
        if (state.main === "client") state.view = "client";
        if (state.main === "lab") state.view = "primer";
        if (state.main === "control") state.view = "client-registry";
        renderNavigation();
        showView(state.view);
      });
    });
  }

  function bindEvents() {
    byId("addPrimerBtn").addEventListener("click", addPrimer);
    byId("runForm").addEventListener("submit", saveRun);
    byId("snapshotFile").addEventListener("change", readSnapshotFile);
    byId("parseBtn").addEventListener("click", parseCurrentText);
    byId("acceptBtn").addEventListener("click", acceptSnapshot);
    byId("clientRegistryForm").addEventListener("submit", createClientRegistryClient);
    byId("consultantRegistryForm").addEventListener("submit", createConsultantRegistryConsultant);
    byId("addProviderBtn").addEventListener("click", addProvider);
    byId("serverBackupBtn").addEventListener("click", createServerBackup);
    byId("exportDbBtn").addEventListener("click", exportDb);
    byId("importDbFile").addEventListener("change", importDb);
    byId("resetDbBtn").addEventListener("click", resetDb);
    byId("loadSamplesBtn").addEventListener("click", loadSampleSnapshots);
    byId("matrixMode").addEventListener("change", (event) => {
      state.matrixMode = event.target.value;
      byId("matrixSearch").placeholder = state.matrixMode === "pricing" ? "Search pricing" : "Search facts";
      renderMatrix();
    });
    byId("matrixLayout").addEventListener("change", (event) => {
      state.matrixLayout = event.target.value;
      saveMatrixLayout();
      applyMatrixLayout();
    });
    byId("matrixShowAll").addEventListener("click", () => setMatrixRowsVisible(true));
    byId("matrixHideAll").addEventListener("click", () => setMatrixRowsVisible(false));
    byId("matrixEssentials").addEventListener("click", applyMatrixEssentials);
    byId("matrixResetRows").addEventListener("click", resetMatrixRows);
    byId("matrixPricingPresets").addEventListener("click", (event) => {
      const button = event.target.closest("[data-pricing-preset]");
      if (button) applyPricingPreset(button.dataset.pricingPreset);
    });
    byId("matrixProductsShowAll").addEventListener("click", () => setMatrixProductsVisible(true));
    byId("matrixProductsHideAll").addEventListener("click", () => setMatrixProductsVisible(false));
    byId("matrixProductsReset").addEventListener("click", resetMatrixProducts);
    byId("matrixCategoryActions").addEventListener("click", (event) => {
      const button = event.target.closest("[data-category]");
      if (button) showOnlyMatrixCategory(button.dataset.category);
    });
    byId("matrixSaveView").addEventListener("click", saveCurrentMatrixView);
    byId("showUnknown").addEventListener("change", (event) => {
      state.showUnknown = event.target.checked;
      renderMatrix();
    });
    byId("showCheck").addEventListener("change", (event) => {
      state.showCheck = event.target.checked;
      renderMatrix();
    });
    byId("matrixSearch").addEventListener("input", (event) => {
      state.matrixSearch = event.target.value.trim().toLowerCase();
      renderMatrix();
    });
  }

  function loadMatrixPrefs() {
    try {
      const prefs = JSON.parse(localStorage.getItem(MATRIX_PREFS_KEY) || "{}");
      state.matrixHidden = {
        capabilities: Array.isArray(prefs.capabilities) ? prefs.capabilities : [],
        pricing: Array.isArray(prefs.pricing) ? prefs.pricing : []
      };
    } catch (error) {
      console.warn("Matrix row preferences could not be read.", error);
      state.matrixHidden = { capabilities: [], pricing: [] };
    }
    try {
      const productPrefs = JSON.parse(localStorage.getItem(MATRIX_PRODUCT_PREFS_KEY) || "[]");
      state.matrixHiddenProducts = Array.isArray(productPrefs) ? productPrefs : [];
    } catch (error) {
      console.warn("Matrix product preferences could not be read.", error);
      state.matrixHiddenProducts = [];
    }
  }

  function loadMatrixSavedViews() {
    try {
      const savedViews = JSON.parse(localStorage.getItem(MATRIX_SAVED_VIEWS_KEY) || "[]");
      state.matrixSavedViews = Array.isArray(savedViews)
        ? savedViews.map(sanitizeMatrixSavedView).filter(Boolean)
        : [];
    } catch (error) {
      console.warn("Matrix saved views could not be read.", error);
      state.matrixSavedViews = [];
    }
  }

  function loadMatrixLayout() {
    const saved = localStorage.getItem(MATRIX_LAYOUT_KEY);
    state.matrixLayout = ["standard", "wide", "full"].includes(saved) ? saved : "standard";
    byId("matrixLayout").value = state.matrixLayout;
    applyMatrixLayout();
  }

  function saveMatrixLayout() {
    localStorage.setItem(MATRIX_LAYOUT_KEY, state.matrixLayout);
  }

  function applyMatrixLayout() {
    document.body.classList.toggle("matrix-layout-wide", state.matrixLayout === "wide");
    document.body.classList.toggle("matrix-layout-full", state.matrixLayout === "full");
  }

  function saveMatrixPrefs() {
    localStorage.setItem(MATRIX_PREFS_KEY, JSON.stringify(state.matrixHidden));
  }

  function saveMatrixProductPrefs() {
    localStorage.setItem(MATRIX_PRODUCT_PREFS_KEY, JSON.stringify(state.matrixHiddenProducts));
  }

  function saveMatrixSavedViews() {
    localStorage.setItem(MATRIX_SAVED_VIEWS_KEY, JSON.stringify(state.matrixSavedViews));
  }

  function seedDates() {
    const today = new Date().toISOString().slice(0, 10);
    byId("runDate").value = today;
    byId("snapshotDate").value = today;
  }

  function renderAll() {
    renderNavigation();
    showView(state.view);
    renderPrimerList();
    renderRunForm();
    renderDiary();
    renderParserSelectors();
    renderRegistry();
    renderClientRegistry();
    renderConsultantRegistry();
    renderRecords();
    renderMatrix();
    updateIndicator();
  }

  function renderNavigation() {
    document.querySelectorAll(".tab").forEach((button) => {
      button.classList.toggle("active", button.dataset.section === state.main);
    });
    const nav = byId("subNav");
    const items = {
      client: [["client", "Overview"], ["ai-ecosphere", "AI EcoSphere"], ["graphs-charts", "Graphs & Charts"], ["matrix", "Current Matrix"]],
      lab: [["primer", "Primer Library"], ["recorder", "Test Recorder"], ["parser", "Data Parser"], ["matrix", "Matrix Copy"]],
      control: [["client-registry", "Client Registry"], ["consultant-registry", "Consultant Registry"], ["registry", "AI Registry"], ["records", "Records"]]
    }[state.main];
    nav.innerHTML = items.map(([view, label]) => `<button data-view="${view}" class="${state.view === view ? "active" : ""}">${escapeHtml(label)}</button>`).join("");
    nav.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.view = button.dataset.view;
        showView(state.view);
        renderNavigation();
      });
    });
  }

  function showView(view) {
    document.querySelectorAll(".view").forEach((section) => {
      section.classList.toggle("active", section.dataset.view === view);
    });
    document.body.classList.toggle("matrix-mode", view === "matrix");
    applyMatrixLayout();
    if (view === "graphs-charts") loadGraphsChartsData();
  }

  async function loadGraphsChartsData() {
    const frame = byId("graphsChartsFrame");
    const notice = byId("graphsChartsNotice");
    if (!frame || !notice) return;
    notice.textContent = "Loading current Cdash data into Graphs & Charts.";
    try {
      await waitForGraphsCharts(frame);
      const api = frame.contentWindow?.CCRVisualWorkbench;
      if (!api?.loadCdashExport) throw new Error("Graphs & Charts host API is unavailable.");
      const health = await api.loadCdashExport(db, {
        sourceName: "Current Cdash database",
        persist: true
      });
      notice.textContent = `${health.products} products loaded into Graphs & Charts.`;
    } catch (error) {
      console.warn(error);
      notice.textContent = `Graphs & Charts is open, but automatic data handoff failed: ${error.message}`;
    }
  }

  function waitForGraphsCharts(frame) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        if (frame.contentWindow?.CCRVisualWorkbench?.loadCdashExport) {
          resolve();
          return;
        }
        if (Date.now() - started > 8000) {
          reject(new Error("Timed out waiting for Graphs & Charts."));
          return;
        }
        setTimeout(check, 100);
      };
      check();
    });
  }

  function renderPrimerList() {
    const list = byId("primerList");
    if (!db.primers.length) {
      list.innerHTML = `<div class="quiet-panel">No primers stored yet.</div>`;
      return;
    }
    list.innerHTML = db.primers.map((primer) => {
      const open = primer.id === state.openPrimerId;
      return `
        <div class="primer-item" data-id="${escapeAttr(primer.id)}">
          <button class="primer-title" type="button">${escapeHtml(primer.title || "Untitled primer")}</button>
          <div class="primer-body" ${open ? "" : "hidden"}>
            <input class="primer-name" value="${escapeAttr(primer.title)}" aria-label="Primer title">
            <textarea class="primer-text" spellcheck="false">${escapeHtml(primer.primer_text)}</textarea>
            <div class="button-row">
              <button class="ghost copy-primer" type="button">Copy All</button>
              <button class="primary save-primer" type="button">Save</button>
              <button class="danger delete-primer" type="button">Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll(".primer-title").forEach((button) => {
      button.addEventListener("click", () => {
        const idValue = button.closest(".primer-item").dataset.id;
        state.openPrimerId = state.openPrimerId === idValue ? null : idValue;
        renderPrimerList();
      });
    });
    list.querySelectorAll(".save-primer").forEach((button) => {
      button.addEventListener("click", () => {
        const item = button.closest(".primer-item");
        const primer = db.primers.find((entry) => entry.id === item.dataset.id);
        primer.title = item.querySelector(".primer-name").value.trim() || "Untitled primer";
        primer.primer_text = item.querySelector(".primer-text").value;
        saveStore();
        renderPrimerList();
        renderRunForm();
      });
    });
    list.querySelectorAll(".copy-primer").forEach((button) => {
      button.addEventListener("click", async () => {
        const text = button.closest(".primer-item").querySelector(".primer-text").value;
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = "Copy All"; }, 1200);
      });
    });
    list.querySelectorAll(".delete-primer").forEach((button) => {
      button.addEventListener("click", () => {
        const idValue = button.closest(".primer-item").dataset.id;
        if (!confirm("Delete this primer completely?")) return;
        db.primers = db.primers.filter((primer) => primer.id !== idValue);
        state.openPrimerId = null;
        saveStore();
        renderPrimerList();
        renderRunForm();
      });
    });
  }

  function addPrimer() {
    const primer = { id: id("primer"), title: "New Primer", primer_text: "" };
    db.primers.unshift(primer);
    state.openPrimerId = primer.id;
    saveStore();
    renderPrimerList();
    renderRunForm();
  }

  function renderRunForm() {
    const primerSelect = byId("runPrimer");
    primerSelect.innerHTML = db.primers.map((primer) => `<option value="${escapeAttr(primer.id)}">${escapeHtml(primer.title)}</option>`).join("");
    const productWrap = byId("runProducts");
    productWrap.innerHTML = activeProducts().map(({ product: item, provider: parent }) => `
      <label><input type="checkbox" value="${escapeAttr(item.id)}"> ${escapeHtml(parent.name)} / ${escapeHtml(item.name)}</label>
    `).join("");
  }

  function saveRun(event) {
    event.preventDefault();
    const checked = Array.from(byId("runProducts").querySelectorAll("input:checked")).map((input) => input.value);
    if (!checked.length) return alert("Tick at least one product.");
    if (!byId("runPrimer").value) return alert("Add a primer first.");
    const runId = id("run");
    db.test_runs.unshift({
      id: runId,
      run_date: byId("runDate").value,
      primer_id: byId("runPrimer").value
    });
    checked.forEach((productId) => db.test_run_products.push({ test_run_id: runId, product_id: productId }));
    saveStore();
    renderDiary();
    renderRecords();
    byId("runProducts").querySelectorAll("input").forEach((input) => { input.checked = false; });
  }

  function renderDiary() {
    byId("recorderCount").textContent = `${db.test_runs.length} entries`;
    const diary = byId("runDiary");
    if (!db.test_runs.length) {
      diary.innerHTML = `<div class="notice">No run entries yet.</div>`;
      return;
    }
    diary.innerHTML = db.test_runs.map((run) => {
      const primer = db.primers.find((entry) => entry.id === run.primer_id);
      const productNames = db.test_run_products
        .filter((entry) => entry.test_run_id === run.id)
        .map((entry) => productLabel(entry.product_id))
        .join(", ");
      const age = daysSince(run.run_date);
      return `
        <div class="diary-row">
          <strong>${escapeHtml(run.run_date)} ${age > 40 ? `<span class="stale">Data getting stale</span>` : ""}</strong>
          <span>${escapeHtml(primer ? primer.title : "Deleted primer")}</span>
          <p>${escapeHtml(productNames)}</p>
        </div>
      `;
    }).join("");
  }

  function renderParserSelectors() {
    const options = activeProducts().map(({ product: item, provider: parent }) => `<option value="${escapeAttr(item.id)}">${escapeHtml(parent.name)} / ${escapeHtml(item.name)}</option>`).join("");
    byId("parserProduct").innerHTML = options;
  }

  function readSnapshotFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      byId("snapshotText").value = String(reader.result || "");
      parseCurrentText();
    };
    reader.readAsText(file);
  }

  function parseCurrentText() {
    const raw = byId("snapshotText").value;
    if (!raw.trim()) return alert("Paste or upload snapshot Markdown first.");
    const parsed = parseSnapshot(raw);
    state.draftSnapshot = parsed;
    renderPriorityFacts(parsed);
    byId("acceptBtn").disabled = false;
    byId("parseNotice").textContent = `${parsed.facts.length} facts, ${parsed.pricing.length} pricing rows, ${parsed.listItems.length} list rows extracted. ${parsed.warnings.length ? "Warnings: " + parsed.warnings.join("; ") : "No blocking issues."}`;
  }

  function parseSnapshot(rawMarkdown) {
    const clean = normalizeMarkdown(rawMarkdown);
    const warnings = [];
    if (clean === rawMarkdown.trimStart()) {
      const lower = rawMarkdown.toLowerCase();
      if (!lower.includes("ai ecosystem snapshot")) warnings.push("Main snapshot heading was not found.");
    }
    const sections = splitSections(clean);
    if (!sections.length) warnings.push("No Markdown sections found.");
    const pricing = [];
    const facts = [];
    const listItems = [];

    sections.forEach((section) => {
      const rows = parseTables(section.body);
      if (section.title === "Pricing Facts") {
        rows.forEach((row) => {
          const field = firstValue(row, ["pricing field", "field", "plan", "item", "capability"]);
          const value = firstValue(row, ["value", "cost", "price", "available", "note"]);
          if (field || value) {
            pricing.push({ field: canonicalPricingField(field || "Pricing"), value: value || "" });
            return;
          }
          const compact = Object.entries(row)
            .filter(([, entryValue]) => entryValue)
            .map(([entryKey, entryValue]) => `${entryKey}: ${entryValue}`)
            .join("; ");
          if (compact) pricing.push({ field: "Pricing", value: compact });
        });
      }
      if (FACT_SECTIONS.has(section.title)) {
        rows.forEach((row) => {
          const capability = firstValue(row, ["capability", "interface", "field", "feature", "item"]);
          if (!capability) return;
          const available = normalizeAvailable(firstValue(row, ["available", "value", "status"]));
          const note = firstValue(row, ["note", "limit", "limits", "details", "comment"]);
          facts.push({
            section: section.title,
            capability,
            available,
            note,
            review_flag: isPriority(capability, section.title) ? "OK" : "OK"
          });
        });
      }
      if (LIST_SECTION_MAP[section.title]) {
        rows.forEach((row) => {
          const values = Object.values(row);
          listItems.push({
            list_type: LIST_SECTION_MAP[section.title],
            name: firstValue(row, ["name", "item", "product", "tool", "connector", "change", "limit"]) || values[0] || "",
            type: firstValue(row, ["type", "category"]) || values[1] || "",
            purpose: firstValue(row, ["purpose", "description", "summary"]) || values[2] || "",
            access_or_status: firstValue(row, ["access", "status", "date", "setup"]) || values[3] || "",
            note: firstValue(row, ["note", "limits", "detail"]) || values[4] || ""
          });
        });
      }
    });

    addMissingPricingFields(pricing);

    return { raw_markdown: rawMarkdown, clean, sections, pricing, facts, listItems, warnings };
  }

  function normalizeMarkdown(raw) {
    let text = String(raw || "").replace(/\r\n/g, "\n");
    text = text.replace(/^\s*\*\*(#+\s*AI Ecosystem Snapshot.*?)\*\*/im, "$1");
    const index = text.search(/^#{1,6}\s*AI Ecosystem Snapshot/im);
    if (index >= 0) text = text.slice(index);
    return text.trim();
  }

  function splitSections(text) {
    const lines = text.split("\n");
    const sections = [];
    let current = null;
    lines.forEach((line) => {
      const match = line.match(/^#{2,6}\s+(?:\d+\.\s*)?(.+?)\s*$/);
      if (match) {
        if (current) sections.push(current);
        current = { title: normalizeSectionTitle(stripDecor(match[1])), body: "" };
      } else if (current) {
        current.body += line + "\n";
      }
    });
    if (current) sections.push(current);
    return sections;
  }

  function normalizeSectionTitle(title) {
    const clean = stripDecor(title).replace(/\s+/g, " ").trim();
    if (/^pricing$/i.test(clean)) return "Pricing Facts";
    return clean;
  }

  function parseTables(body) {
    const lines = body.split("\n");
    const rows = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i].trim().startsWith("|")) continue;
      const header = parseTableLine(lines[i]);
      const separator = lines[i + 1] || "";
      if (!separator.includes("---")) continue;
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = parseTableLine(lines[i]);
        const row = {};
        header.forEach((key, index) => {
          row[normalizeKey(key)] = stripDecor(cells[index] || "");
        });
        rows.push(row);
        i += 1;
      }
    }
    return rows;
  }

  function parseTableLine(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => stripDecor(cell.trim()));
  }

  function renderPriorityFacts(parsed) {
    const wrap = byId("priorityFacts");
    const combined = [
      ...parsed.pricing.map((row) => ({ kind: "price", label: row.field, value: row.value, note: "" })),
      ...parsed.facts
        .filter((row) => isPriority(row.capability, row.section))
        .map((row) => ({ kind: "fact", label: row.capability, value: row.available, note: row.note, row }))
    ];
    if (!combined.length) {
      wrap.innerHTML = `<div class="notice">No priority rows were extracted.</div>`;
      return;
    }
    wrap.innerHTML = combined.map((item, index) => `
      <div class="fact-row" data-index="${index}">
        <strong>${escapeHtml(item.label)}</strong>
        <span class="value-chip ${valueClass(item.kind === "price" ? "price" : item.value)}">${escapeHtml(item.value || "UNKNOWN")}</span>
        ${item.kind === "fact" ? `<select class="review-flag"><option>OK</option><option>Check</option></select>` : `<span></span>`}
        ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
      </div>
    `).join("");
    wrap.querySelectorAll(".review-flag").forEach((select, index) => {
      select.addEventListener("change", () => {
        const factRows = parsed.facts.filter((row) => isPriority(row.capability, row.section));
        if (factRows[index]) factRows[index].review_flag = select.value;
      });
    });
  }

  async function acceptSnapshot() {
    const parsed = state.draftSnapshot;
    if (!parsed) return;
    const button = byId("acceptBtn");
    const productId = byId("parserProduct").value;
    const snapshotId = id("snapshot");
    const snapshot = {
      id: snapshotId,
      product_id: productId,
      snapshot_date: byId("snapshotDate").value,
      raw_markdown: parsed.raw_markdown,
      parser_status: parsed.warnings.length ? "Accepted with warnings" : "Accepted",
      accepted_at: new Date().toISOString()
    };
    const pricing = parsed.pricing.map((row) => ({ snapshot_id: snapshotId, field: row.field, value: row.value }));
    const facts = parsed.facts.map((row) => Object.assign({ snapshot_id: snapshotId }, row));
    const listItems = parsed.listItems.map((row) => Object.assign({ snapshot_id: snapshotId }, row));

    button.disabled = true;
    byId("parseNotice").textContent = `Saving current snapshot for ${productLabel(productId)}...`;

    if (storeMode === "server") {
      try {
        const response = await fetch("/api/accept-snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot, pricing, facts, listItems })
        });
        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || `Server returned ${response.status}`);
        }
      } catch (error) {
        console.warn("Snapshot save failed.", error);
        button.disabled = false;
        byId("parseNotice").textContent = `Snapshot save failed: ${error.message}`;
        return;
      }
    }

    const oldIds = new Set(db.snapshots.filter((snapshot) => snapshot.product_id === productId).map((snapshot) => snapshot.id));
    db.snapshots = db.snapshots.filter((snapshot) => snapshot.product_id !== productId);
    db.snapshot_pricing = db.snapshot_pricing.filter((row) => !oldIds.has(row.snapshot_id));
    db.snapshot_facts = db.snapshot_facts.filter((row) => !oldIds.has(row.snapshot_id));
    db.snapshot_list_items = db.snapshot_list_items.filter((row) => !oldIds.has(row.snapshot_id));
    db.snapshots.push(snapshot);
    pricing.forEach((row) => db.snapshot_pricing.push(row));
    facts.forEach((row) => db.snapshot_facts.push(row));
    listItems.forEach((row) => db.snapshot_list_items.push(row));
    if (storeMode !== "server") saveStore();
    state.draftSnapshot = null;
    button.disabled = true;
    byId("parseNotice").textContent = `Accepted current snapshot for ${productLabel(productId)}. Server saved ${pricing.length} pricing, ${facts.length} facts, and ${listItems.length} list rows.`;
    renderRecords();
    renderMatrix();
  }

  function clientPayloadFrom(root) {
    const displayName = root.querySelector(".client-display-name").value.trim();
    if (!displayName) throw new Error("Client display name is required.");
    return {
      display_name: displayName,
      client_type: root.querySelector(".client-type").value,
      contact_name: root.querySelector(".client-contact-name").value.trim(),
      email: root.querySelector(".client-email").value.trim(),
      phone: root.querySelector(".client-phone").value.trim(),
      business_name: root.querySelector(".client-business-name").value.trim(),
      website: root.querySelector(".client-website").value.trim(),
      status: root.querySelector(".client-status").value,
      notes: root.querySelector(".client-notes").value.trim()
    };
  }

  async function createClientRegistryClient(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const notice = byId("clientRegistryNotice");
    const button = form.querySelector("button[type='submit']");
    try {
      button.disabled = true;
      notice.textContent = "Creating client record...";
      const client = await postClientRegistryClient(clientPayloadFrom(form));
      if (clientRegistryMode === "server") {
        clientRegistry = await loadClientRegistry();
      }
      form.reset();
      form.querySelector(".client-type").value = "unknown";
      form.querySelector(".client-status").value = "prospect";
      notice.textContent = `Client created: ${client.client_record_ref}`;
      renderClientRegistry();
      renderRecords();
    } catch (error) {
      console.warn(error);
      notice.textContent = `Client creation failed: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  function renderClientRegistry() {
    const count = byId("clientRegistryCount");
    const list = byId("clientRegistryList");
    const activeClients = clientRegistry.clients.filter((client) => client.status !== "archived");
    count.textContent = `${activeClients.length} active / ${clientRegistry.clients.length} total`;
    if (!clientRegistry.clients.length) {
      list.innerHTML = `<div class="quiet-panel">No clients registered yet.</div>`;
      return;
    }
    list.innerHTML = clientRegistry.clients.map((client) => `
      <article class="client-card ${client.status === "archived" ? "archived" : ""}" data-client-ref="${escapeAttr(client.client_record_ref)}">
        <div class="card-head client-card-head">
          <div class="logo-box">${escapeHtml((client.display_name || "C").slice(0, 1).toUpperCase())}</div>
          <div>
            <strong>${escapeHtml(client.display_name || "Unnamed client")}</strong>
            <div class="muted-note">${escapeHtml(client.client_record_ref)} - ${escapeHtml(CLIENT_STATUS_LABELS[client.status] || client.status)}</div>
          </div>
          <button class="ghost copy-client-ref" type="button">Copy Ref</button>
        </div>
        <div class="edit-grid client-edit-grid">
          ${fieldInput("Display name", "client-display-name", client.display_name)}
          ${clientTypeSelect("client-type", client.client_type)}
          ${fieldInput("Contact name", "client-contact-name", client.contact_name)}
          ${fieldInput("Email", "client-email", client.email)}
          ${fieldInput("Phone", "client-phone", client.phone)}
          ${fieldInput("Business name", "client-business-name", client.business_name)}
          ${fieldInput("Website", "client-website", client.website)}
          ${clientStatusSelect("client-status", client.status)}
          <label class="client-notes-field">Notes<textarea class="client-notes">${escapeHtml(client.notes)}</textarea></label>
        </div>
        <div class="button-row">
          <button class="primary save-client" type="button">Save Client</button>
          <button class="ghost archive-client" type="button">${client.status === "archived" ? "Restore to Prospect" : "Archive"}</button>
        </div>
      </article>
    `).join("");
    bindClientRegistryButtons();
  }

  function bindClientRegistryButtons() {
    byId("clientRegistryList").querySelectorAll(".save-client").forEach((button) => {
      button.addEventListener("click", async () => {
        const card = button.closest(".client-card");
        const notice = byId("clientRegistryNotice");
        try {
          button.disabled = true;
          notice.textContent = `Saving ${card.dataset.clientRef}...`;
          await putClientRegistryClient(card.dataset.clientRef, clientPayloadFrom(card));
          if (clientRegistryMode === "server") {
            clientRegistry = await loadClientRegistry();
          }
          notice.textContent = `Saved ${card.dataset.clientRef}.`;
          renderClientRegistry();
          renderRecords();
        } catch (error) {
          console.warn(error);
          notice.textContent = `Client save failed: ${error.message}`;
        } finally {
          button.disabled = false;
        }
      });
    });

    byId("clientRegistryList").querySelectorAll(".archive-client").forEach((button) => {
      button.addEventListener("click", async () => {
        const card = button.closest(".client-card");
        const current = clientRegistry.clients.find((client) => client.client_record_ref === card.dataset.clientRef);
        if (!current) return;
        const nextStatus = current.status === "archived" ? "prospect" : "archived";
        try {
          button.disabled = true;
          await putClientRegistryClient(card.dataset.clientRef, { ...current, status: nextStatus });
          if (clientRegistryMode === "server") {
            clientRegistry = await loadClientRegistry();
          }
          byId("clientRegistryNotice").textContent = `${card.dataset.clientRef} set to ${CLIENT_STATUS_LABELS[nextStatus]}.`;
          renderClientRegistry();
          renderRecords();
        } catch (error) {
          console.warn(error);
          byId("clientRegistryNotice").textContent = `Client status update failed: ${error.message}`;
        } finally {
          button.disabled = false;
        }
      });
    });

    byId("clientRegistryList").querySelectorAll(".copy-client-ref").forEach((button) => {
      button.addEventListener("click", async () => {
        const ref = button.closest(".client-card").dataset.clientRef;
        try {
          await navigator.clipboard.writeText(ref);
          byId("clientRegistryNotice").textContent = `Copied ${ref}.`;
        } catch (error) {
          console.warn(error);
          byId("clientRegistryNotice").textContent = ref;
        }
      });
    });
  }

  function consultantPayloadFrom(root) {
    const displayName = root.querySelector(".consultant-display-name").value.trim();
    if (!displayName) throw new Error("Consultant display name is required.");
    return {
      display_name: displayName,
      role: root.querySelector(".consultant-role").value.trim(),
      email: root.querySelector(".consultant-email").value.trim(),
      phone: root.querySelector(".consultant-phone").value.trim(),
      organisation: root.querySelector(".consultant-organisation").value.trim(),
      website: root.querySelector(".consultant-website").value.trim(),
      status: root.querySelector(".consultant-status").value,
      notes: root.querySelector(".consultant-notes").value.trim()
    };
  }

  async function createConsultantRegistryConsultant(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const notice = byId("consultantRegistryNotice");
    const button = form.querySelector("button[type='submit']");
    try {
      button.disabled = true;
      notice.textContent = "Creating consultant record...";
      const consultant = await postConsultantRegistryConsultant(consultantPayloadFrom(form));
      if (consultantRegistryMode === "server") {
        consultantRegistry = await loadConsultantRegistry();
      }
      form.reset();
      form.querySelector(".consultant-status").value = "active";
      notice.textContent = `Consultant created: ${consultant.consultant_ref}`;
      renderConsultantRegistry();
      renderRecords();
    } catch (error) {
      console.warn(error);
      notice.textContent = `Consultant creation failed: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  function renderConsultantRegistry() {
    const count = byId("consultantRegistryCount");
    const list = byId("consultantRegistryList");
    const activeConsultants = consultantRegistry.consultants.filter((consultant) => consultant.status !== "archived" && consultant.status !== "retired");
    count.textContent = `${activeConsultants.length} active / ${consultantRegistry.consultants.length} total`;
    if (!consultantRegistry.consultants.length) {
      list.innerHTML = `<div class="quiet-panel">No consultants registered yet.</div>`;
      return;
    }
    list.innerHTML = consultantRegistry.consultants.map((consultant) => `
      <article class="client-card consultant-card ${consultant.status === "archived" ? "archived" : ""}" data-consultant-ref="${escapeAttr(consultant.consultant_ref)}">
        <div class="card-head client-card-head">
          <div class="logo-box">${escapeHtml((consultant.display_name || "C").slice(0, 1).toUpperCase())}</div>
          <div>
            <strong>${escapeHtml(consultant.display_name || "Unnamed consultant")}</strong>
            <div class="muted-note">${escapeHtml(consultant.consultant_ref)} - ${escapeHtml(CONSULTANT_STATUS_LABELS[consultant.status] || consultant.status)}</div>
          </div>
          <button class="ghost copy-consultant-ref" type="button">Copy Ref</button>
        </div>
        <div class="edit-grid client-edit-grid">
          ${fieldInput("Display name", "consultant-display-name", consultant.display_name)}
          ${fieldInput("Role", "consultant-role", consultant.role)}
          ${fieldInput("Email", "consultant-email", consultant.email)}
          ${fieldInput("Phone", "consultant-phone", consultant.phone)}
          ${fieldInput("Organisation", "consultant-organisation", consultant.organisation)}
          ${fieldInput("Website", "consultant-website", consultant.website)}
          ${consultantStatusSelect("consultant-status", consultant.status)}
          <label class="client-notes-field">Notes<textarea class="consultant-notes">${escapeHtml(consultant.notes)}</textarea></label>
        </div>
        <div class="button-row">
          <button class="primary save-consultant" type="button">Save Consultant</button>
          <button class="ghost archive-consultant" type="button">${consultant.status === "archived" ? "Restore to Active" : "Archive"}</button>
        </div>
      </article>
    `).join("");
    bindConsultantRegistryButtons();
  }

  function bindConsultantRegistryButtons() {
    byId("consultantRegistryList").querySelectorAll(".save-consultant").forEach((button) => {
      button.addEventListener("click", async () => {
        const card = button.closest(".consultant-card");
        const notice = byId("consultantRegistryNotice");
        try {
          button.disabled = true;
          notice.textContent = `Saving ${card.dataset.consultantRef}...`;
          await putConsultantRegistryConsultant(card.dataset.consultantRef, consultantPayloadFrom(card));
          if (consultantRegistryMode === "server") {
            consultantRegistry = await loadConsultantRegistry();
          }
          notice.textContent = `Saved ${card.dataset.consultantRef}.`;
          renderConsultantRegistry();
          renderRecords();
        } catch (error) {
          console.warn(error);
          notice.textContent = `Consultant save failed: ${error.message}`;
        } finally {
          button.disabled = false;
        }
      });
    });

    byId("consultantRegistryList").querySelectorAll(".archive-consultant").forEach((button) => {
      button.addEventListener("click", async () => {
        const card = button.closest(".consultant-card");
        const current = consultantRegistry.consultants.find((consultant) => consultant.consultant_ref === card.dataset.consultantRef);
        if (!current) return;
        const nextStatus = current.status === "archived" ? "active" : "archived";
        try {
          button.disabled = true;
          await putConsultantRegistryConsultant(card.dataset.consultantRef, { ...current, status: nextStatus });
          if (consultantRegistryMode === "server") {
            consultantRegistry = await loadConsultantRegistry();
          }
          byId("consultantRegistryNotice").textContent = `${card.dataset.consultantRef} set to ${CONSULTANT_STATUS_LABELS[nextStatus]}.`;
          renderConsultantRegistry();
          renderRecords();
        } catch (error) {
          console.warn(error);
          byId("consultantRegistryNotice").textContent = `Consultant status update failed: ${error.message}`;
        } finally {
          button.disabled = false;
        }
      });
    });

    byId("consultantRegistryList").querySelectorAll(".copy-consultant-ref").forEach((button) => {
      button.addEventListener("click", async () => {
        const ref = button.closest(".consultant-card").dataset.consultantRef;
        try {
          await navigator.clipboard.writeText(ref);
          byId("consultantRegistryNotice").textContent = `Copied ${ref}.`;
        } catch (error) {
          console.warn(error);
          byId("consultantRegistryNotice").textContent = ref;
        }
      });
    });
  }

  function addProvider() {
    const name = prompt("Provider name?");
    if (!name) return;
    const newProvider = provider(id("provider"), name.trim(), "", "", "Active");
    db.providers.push(newProvider);
    saveStore();
    renderRegistry();
    renderRunForm();
    renderParserSelectors();
  }

  function renderRegistry() {
    const wrap = byId("registryList");
    wrap.innerHTML = db.providers.map((providerRow) => {
      const products = db.products.filter((entry) => entry.provider_id === providerRow.id);
      return `
        <article class="provider-card" data-provider-id="${escapeAttr(providerRow.id)}">
          <div class="card-head">
            ${logoHtml(providerRow.logo_path, providerRow.name)}
            <div>
              <strong>${escapeHtml(providerRow.name)}</strong>
              <div>${escapeHtml(providerRow.status)}</div>
            </div>
            <button class="ghost add-product" type="button">Add Product</button>
          </div>
          <div class="edit-grid">
            ${fieldInput("Provider", "provider-name", providerRow.name)}
            ${fieldInput("Website", "provider-website", providerRow.website)}
            ${fieldInput("Logo", "provider-logo", providerRow.logo_path)}
            ${fileInput("Upload Logo", "provider-logo-upload")}
            ${statusSelect("provider-status", providerRow.status)}
          </div>
          <div class="button-row">
            <button class="primary save-provider" type="button">Save Provider</button>
            <button class="danger delete-provider" type="button">Delete Provider</button>
          </div>
          <div class="product-list">
            ${products.map((productRow) => productEditor(productRow, providerRow)).join("") || `<div class="notice">No products yet.</div>`}
          </div>
        </article>
      `;
    }).join("");
    bindRegistryButtons();
  }

  function productEditor(productRow, providerRow) {
    return `
      <div class="product-row" data-product-id="${escapeAttr(productRow.id)}">
        ${logoHtml(productRow.logo_path || providerRow.logo_path, productRow.name)}
        <input class="product-name" value="${escapeAttr(productRow.name)}" aria-label="Product name">
        <input class="product-website" value="${escapeAttr(productRow.website)}" aria-label="Product website">
        <input class="product-logo" value="${escapeAttr(productRow.logo_path)}" aria-label="Product logo">
        <input class="product-category" value="${escapeAttr(productRow.category)}" aria-label="Product category" placeholder="Category">
        <input class="product-tags" value="${escapeAttr(productRow.tags)}" aria-label="Product tags" placeholder="Tags">
        <label class="file-inline">Logo file<input class="product-logo-upload" type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp,image/gif"></label>
        ${statusSelect("product-status", productRow.status)}
        <button class="primary save-product" type="button">Save</button>
        <button class="danger delete-product" type="button">Delete</button>
      </div>
    `;
  }

  function bindRegistryButtons() {
    byId("registryList").querySelectorAll(".save-provider").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".provider-card");
        const item = db.providers.find((row) => row.id === card.dataset.providerId);
        item.name = card.querySelector(".provider-name").value.trim() || item.name;
        item.website = card.querySelector(".provider-website").value.trim();
        item.logo_path = card.querySelector(".provider-logo").value.trim();
        item.status = card.querySelector(".provider-status").value;
        saveStore();
        renderAll();
      });
    });
    byId("registryList").querySelectorAll(".provider-logo-upload").forEach((input) => {
      input.addEventListener("change", async () => {
        const card = input.closest(".provider-card");
        const logoPath = await uploadLogoFile(input.files[0]);
        if (!logoPath) return;
        card.querySelector(".provider-logo").value = logoPath;
      });
    });
    byId("registryList").querySelectorAll(".delete-provider").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".provider-card");
        if (!confirm("Delete this provider and its products?")) return;
        db.providers = db.providers.filter((row) => row.id !== card.dataset.providerId);
        db.products = db.products.filter((row) => row.provider_id !== card.dataset.providerId);
        saveStore();
        renderAll();
      });
    });
    byId("registryList").querySelectorAll(".add-product").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".provider-card");
        const name = prompt("Product name?");
        if (!name) return;
        db.products.push(product(id("product"), card.dataset.providerId, name.trim(), "", "", "Active"));
        saveStore();
        renderAll();
      });
    });
    byId("registryList").querySelectorAll(".save-product").forEach((button) => {
      button.addEventListener("click", () => {
        const row = button.closest(".product-row");
        const item = db.products.find((entry) => entry.id === row.dataset.productId);
        item.name = row.querySelector(".product-name").value.trim() || item.name;
        item.website = row.querySelector(".product-website").value.trim();
        item.logo_path = row.querySelector(".product-logo").value.trim();
        item.category = row.querySelector(".product-category").value.trim();
        item.tags = row.querySelector(".product-tags").value.trim();
        item.status = row.querySelector(".product-status").value;
        saveStore();
        renderAll();
      });
    });
    byId("registryList").querySelectorAll(".product-logo-upload").forEach((input) => {
      input.addEventListener("change", async () => {
        const row = input.closest(".product-row");
        const logoPath = await uploadLogoFile(input.files[0]);
        if (!logoPath) return;
        row.querySelector(".product-logo").value = logoPath;
      });
    });
    byId("registryList").querySelectorAll(".delete-product").forEach((button) => {
      button.addEventListener("click", () => {
        const row = button.closest(".product-row");
        if (!confirm("Delete this product?")) return;
        db.products = db.products.filter((entry) => entry.id !== row.dataset.productId);
        saveStore();
        renderAll();
      });
    });
  }

  function renderRecords() {
    const totals = {
      client_registry_clients: clientRegistry.clients.length,
      consultant_registry_consultants: consultantRegistry.consultants.length,
      providers: db.providers.length,
      products: db.products.length,
      primers: db.primers.length,
      test_runs: db.test_runs.length,
      snapshots: db.snapshots.length,
      snapshot_pricing: db.snapshot_pricing.length,
      snapshot_facts: db.snapshot_facts.length,
      snapshot_list_items: db.snapshot_list_items.length
    };
    byId("recordTotals").textContent = `${Object.values(totals).reduce((sum, value) => sum + value, 0)} records`;
    byId("schemaBox").textContent = JSON.stringify(totals, null, 2);
  }

  async function createServerBackup() {
    const notice = byId("backupNotice");
    notice.textContent = "Creating server backup...";
    try {
      const response = await fetch("/api/backup", { method: "POST" });
      if (!response.ok) throw new Error(`Backup failed with ${response.status}`);
      const result = await response.json();
      notice.textContent = `Backup complete: ${result.dump}`;
    } catch (error) {
      console.warn(error);
      notice.textContent = "Backup failed. Check server logs.";
    }
  }

  function exportDb() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cdash-v1-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function importDb(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        db = normalizeStore(JSON.parse(String(reader.result)));
        saveStore();
        renderAll();
      } catch (error) {
        alert("That backup JSON could not be read.");
      }
    };
    reader.readAsText(file);
  }

  function resetDb() {
    if (!confirm("Reset the local Cdash store? This only affects this browser.")) return;
    db = defaultStore();
    saveStore();
    renderAll();
  }

  async function loadSampleSnapshots() {
    const notice = byId("parseNotice");
    notice.textContent = "Trying workspace sample files...";
    const loaded = [];
    for (const path of SAMPLE_FILES) {
      try {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) throw new Error(response.statusText);
        const markdown = await response.text();
        loaded.push({ path, markdown });
      } catch (error) {
        console.warn(error);
      }
    }
    if (!loaded.length) {
      notice.textContent = "Samples could not be fetched from this browser. Use the upload control instead.";
      return;
    }
    byId("snapshotText").value = loaded[0].markdown;
    notice.textContent = `Loaded ${loaded.length} workspace samples. First sample placed in the parser.`;
    parseCurrentText();
  }

  function renderMatrix() {
    const wrap = byId("matrixWrap");
    byId("detailDrawer").hidden = true;
    renderSavedMatrixViews();
    const allProducts = activeProducts();
    const products = visibleMatrixProducts(allProducts);
    const current = currentSnapshots();
    if (state.matrixMode === "pricing") {
      renderPricingMatrix(wrap, products, current);
      return;
    }
    const capabilities = collectCapabilities(current);
    const filteredCaps = capabilities.filter((cap) => {
      if (isMatrixRowHidden("capabilities", cap)) return false;
      if (state.matrixSearch && !cap.toLowerCase().includes(state.matrixSearch)) return false;
      if (state.showUnknown) return true;
      return products.some(({ product: item }) => {
        const fact = findFactFor(current, item.id, cap);
        return fact && fact.available !== "UNKNOWN";
      });
    });
    renderMatrixConfig(capabilities, filteredCaps.length);
    renderMatrixProductConfig(allProducts, products.length);
    if (!products.length) {
      wrap.innerHTML = `<div class="quiet-panel">No products match the current Matrix product filters.</div>`;
      return;
    }
    if (!filteredCaps.length) {
      wrap.innerHTML = `<div class="quiet-panel">Accept snapshots to populate the current matrix.</div>`;
      return;
    }
    wrap.innerHTML = `
      <table class="matrix">
        <thead>
          <tr>
            <th>Capability</th>
            ${products.map(({ product: item, provider: parent }) => `<th>${logoHtml(item.logo_path || parent.logo_path, item.name)}${escapeHtml(item.name)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${filteredCaps.map((capability) => `
            <tr>
              <td><strong>${escapeHtml(capability)}</strong></td>
              ${products.map(({ product: item }) => matrixCell(current, item.id, capability)).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    wrap.querySelectorAll(".matrix-cell").forEach((cell) => {
      cell.addEventListener("click", () => showFactDetail(cell.dataset.productId, cell.dataset.capability));
    });
  }

  function renderPricingMatrix(wrap, products, current) {
    const allProducts = activeProducts();
    const fields = collectPricingFields(current);
    const filteredFields = fields.filter((field) => {
      if (isMatrixRowHidden("pricing", field)) return false;
      return !state.matrixSearch || field.toLowerCase().includes(state.matrixSearch);
    });
    renderMatrixConfig(fields, filteredFields.length);
    renderMatrixProductConfig(allProducts, products.length);
    if (!products.length) {
      wrap.innerHTML = `<div class="quiet-panel">No products match the current Matrix product filters.</div>`;
      return;
    }
    if (!filteredFields.length) {
      wrap.innerHTML = `<div class="quiet-panel">No pricing rows match the current Matrix filters.</div>`;
      return;
    }
    wrap.innerHTML = `
      <table class="matrix pricing-matrix">
        <thead>
          <tr>
            <th>Pricing Field</th>
            ${products.map(({ product: item, provider: parent }) => `<th>${logoHtml(item.logo_path || parent.logo_path, item.name)}${escapeHtml(item.name)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${filteredFields.map((field) => `
            <tr>
              <td><strong>${escapeHtml(field)}</strong></td>
              ${products.map(({ product: item }) => pricingCell(current, item.id, field)).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    wrap.querySelectorAll(".pricing-cell").forEach((cell) => {
      cell.addEventListener("click", () => showPricingDetail(cell.dataset.productId, cell.dataset.field));
    });
  }

  function renderSavedMatrixViews() {
    const list = byId("matrixSavedViewList");
    byId("matrixSavedViewsCount").textContent = `${state.matrixSavedViews.length} saved`;
    if (!state.matrixSavedViews.length) {
      list.innerHTML = `<div class="quiet-panel compact">No saved Matrix views yet.</div>`;
      return;
    }
    list.innerHTML = state.matrixSavedViews.map((view) => `
      <div class="matrix-saved-view-row" data-view-id="${escapeAttr(view.id)}">
        <span>
          <strong>${escapeHtml(view.name)}</strong>
          <small>${escapeHtml(matrixSavedViewSummary(view.state))}</small>
        </span>
        <button class="ghost" type="button" data-saved-view-action="apply" data-view-id="${escapeAttr(view.id)}">Apply</button>
        <button class="danger" type="button" data-saved-view-action="delete" data-view-id="${escapeAttr(view.id)}">Delete</button>
      </div>
    `).join("");
    list.querySelectorAll("[data-saved-view-action='apply']").forEach((button) => {
      button.addEventListener("click", () => applyMatrixSavedView(button.dataset.viewId));
    });
    list.querySelectorAll("[data-saved-view-action='delete']").forEach((button) => {
      button.addEventListener("click", () => deleteMatrixSavedView(button.dataset.viewId));
    });
  }

  function saveCurrentMatrixView() {
    const nameInput = byId("matrixSaveViewName");
    const name = nameInput.value;
    if (!name || !name.trim()) return;
    state.matrixSavedViews.unshift({
      id: id("matrix-view"),
      name: name.trim().slice(0, 60),
      state: matrixViewSnapshot(),
      savedAt: new Date().toISOString()
    });
    nameInput.value = "";
    saveMatrixSavedViews();
    renderSavedMatrixViews();
  }

  function applyMatrixSavedView(viewId) {
    const view = state.matrixSavedViews.find((item) => item.id === viewId);
    if (!view) return;
    applyMatrixViewSnapshot(view.state);
  }

  function deleteMatrixSavedView(viewId) {
    const view = state.matrixSavedViews.find((item) => item.id === viewId);
    if (!view) return;
    state.matrixSavedViews = state.matrixSavedViews.filter((item) => item.id !== viewId);
    saveMatrixSavedViews();
    renderSavedMatrixViews();
  }

  function matrixViewSnapshot() {
    return {
      matrixMode: state.matrixMode,
      matrixLayout: state.matrixLayout,
      matrixSearch: state.matrixSearch,
      showUnknown: state.showUnknown,
      showCheck: state.showCheck,
      matrixHidden: {
        capabilities: [...(state.matrixHidden.capabilities || [])],
        pricing: [...(state.matrixHidden.pricing || [])]
      },
      matrixHiddenProducts: [...state.matrixHiddenProducts]
    };
  }

  function applyMatrixViewSnapshot(snapshot) {
    const clean = sanitizeMatrixViewState(snapshot);
    state.matrixMode = clean.matrixMode;
    state.matrixLayout = clean.matrixLayout;
    state.matrixSearch = clean.matrixSearch;
    state.showUnknown = clean.showUnknown;
    state.showCheck = clean.showCheck;
    state.matrixHidden = clean.matrixHidden;
    state.matrixHiddenProducts = clean.matrixHiddenProducts;
    byId("matrixMode").value = state.matrixMode;
    byId("matrixLayout").value = state.matrixLayout;
    byId("matrixSearch").value = state.matrixSearch;
    byId("matrixSearch").placeholder = state.matrixMode === "pricing" ? "Search pricing" : "Search facts";
    byId("showUnknown").checked = state.showUnknown;
    byId("showCheck").checked = state.showCheck;
    saveMatrixPrefs();
    saveMatrixProductPrefs();
    saveMatrixLayout();
    applyMatrixLayout();
    renderMatrix();
  }

  function sanitizeMatrixSavedView(view) {
    if (!view || typeof view !== "object") return null;
    const name = String(view.name || "").trim();
    if (!name) return null;
    return {
      id: String(view.id || id("matrix-view")),
      name: name.slice(0, 60),
      state: sanitizeMatrixViewState(view.state || {}),
      savedAt: view.savedAt || null
    };
  }

  function sanitizeMatrixViewState(snapshot) {
    const mode = snapshot.matrixMode === "pricing" ? "pricing" : "capabilities";
    const layout = ["standard", "wide", "full"].includes(snapshot.matrixLayout) ? snapshot.matrixLayout : "standard";
    const hidden = snapshot.matrixHidden || {};
    return {
      matrixMode: mode,
      matrixLayout: layout,
      matrixSearch: String(snapshot.matrixSearch || "").trim().toLowerCase(),
      showUnknown: snapshot.showUnknown !== false,
      showCheck: snapshot.showCheck !== false,
      matrixHidden: {
        capabilities: Array.isArray(hidden.capabilities) ? hidden.capabilities.map(String) : [],
        pricing: Array.isArray(hidden.pricing) ? hidden.pricing.map(String) : []
      },
      matrixHiddenProducts: Array.isArray(snapshot.matrixHiddenProducts) ? snapshot.matrixHiddenProducts.map(String) : []
    };
  }

  function matrixSavedViewSummary(snapshot) {
    const mode = snapshot.matrixMode === "pricing" ? "Pricing" : "Capabilities";
    const layout = snapshot.matrixLayout ? `${snapshot.matrixLayout.slice(0, 1).toUpperCase()}${snapshot.matrixLayout.slice(1)}` : "Standard";
    const hiddenRows = (snapshot.matrixHidden?.[snapshot.matrixMode] || []).length;
    const hiddenProducts = (snapshot.matrixHiddenProducts || []).length;
    const search = snapshot.matrixSearch ? `, search: ${snapshot.matrixSearch}` : "";
    return `${mode} / ${layout}, ${hiddenRows} hidden rows, ${hiddenProducts} hidden products${search}`;
  }

  function renderMatrixConfig(allRows, shownCount) {
    const list = byId("matrixConfigList");
    const hidden = new Set(matrixHiddenForMode());
    byId("matrixConfigCount").textContent = `${shownCount} shown`;
    byId("matrixPricingPresets").hidden = state.matrixMode !== "pricing";
    list.innerHTML = allRows.map((row) => `
      <label class="matrix-config-row">
        <input type="checkbox" value="${escapeAttr(row)}" ${hidden.has(row) ? "" : "checked"}>
        <span>${escapeHtml(row)}</span>
      </label>
    `).join("");
    list.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        setMatrixRowHidden(input.value, !input.checked);
        saveMatrixPrefs();
        renderMatrix();
      });
    });
  }

  function renderMatrixProductConfig(allProducts, shownCount) {
    const list = byId("matrixProductConfigList");
    const hidden = new Set(state.matrixHiddenProducts);
    byId("matrixProductConfigCount").textContent = `${shownCount} shown`;
    renderMatrixCategoryActions(allProducts);
    list.innerHTML = allProducts.map(({ product: item, provider: parent }) => {
      const category = item.category || "Uncategorised";
      return `
        <label class="matrix-config-row matrix-product-row">
          <input type="checkbox" value="${escapeAttr(item.id)}" ${hidden.has(item.id) ? "" : "checked"}>
          <span>
            <strong>${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(parent.name)} - ${escapeHtml(category)}</small>
          </span>
        </label>
      `;
    }).join("");
    list.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        setMatrixProductHidden(input.value, !input.checked);
        saveMatrixProductPrefs();
        renderMatrix();
      });
    });
  }

  function renderMatrixCategoryActions(allProducts) {
    const wrap = byId("matrixCategoryActions");
    const categories = Array.from(new Set(allProducts.map(({ product: item }) => item.category || "Uncategorised"))).sort((a, b) => a.localeCompare(b));
    wrap.innerHTML = categories.map((category) => `<button class="ghost" type="button" data-category="${escapeAttr(category)}">${escapeHtml(category)}</button>`).join("");
  }

  function visibleMatrixProducts(allProducts) {
    const hidden = new Set(state.matrixHiddenProducts);
    return allProducts.filter(({ product: item }) => !hidden.has(item.id));
  }

  function setMatrixProductHidden(productId, hidden) {
    const current = new Set(state.matrixHiddenProducts);
    if (hidden) current.add(productId);
    else current.delete(productId);
    state.matrixHiddenProducts = Array.from(current);
  }

  function setMatrixProductsVisible(visible) {
    const products = activeProducts();
    state.matrixHiddenProducts = visible ? [] : products.map(({ product: item }) => item.id);
    saveMatrixProductPrefs();
    renderMatrix();
  }

  function showOnlyMatrixCategory(category) {
    const products = activeProducts();
    state.matrixHiddenProducts = products
      .filter(({ product: item }) => (item.category || "Uncategorised") !== category)
      .map(({ product: item }) => item.id);
    saveMatrixProductPrefs();
    renderMatrix();
  }

  function resetMatrixProducts() {
    state.matrixHiddenProducts = [];
    saveMatrixProductPrefs();
    renderMatrix();
  }

  function matrixHiddenForMode() {
    return state.matrixHidden[state.matrixMode] || [];
  }

  function isMatrixRowHidden(mode, row) {
    return (state.matrixHidden[mode] || []).includes(row);
  }

  function setMatrixRowHidden(row, hidden) {
    const mode = state.matrixMode;
    const current = new Set(state.matrixHidden[mode] || []);
    if (hidden) current.add(row);
    else current.delete(row);
    state.matrixHidden[mode] = Array.from(current);
  }

  function setMatrixRowsVisible(visible) {
    const rows = state.matrixMode === "pricing" ? collectPricingFields(currentSnapshots()) : collectCapabilities(currentSnapshots());
    state.matrixHidden[state.matrixMode] = visible ? [] : rows;
    saveMatrixPrefs();
    renderMatrix();
  }

  function applyMatrixEssentials() {
    const rows = state.matrixMode === "pricing" ? collectPricingFields(currentSnapshots()) : collectCapabilities(currentSnapshots());
    const essentials = new Set(state.matrixMode === "pricing" ? ESSENTIAL_PRICING_FIELDS : ESSENTIAL_CAPABILITY_FIELDS);
    state.matrixHidden[state.matrixMode] = rows.filter((row) => !essentials.has(row));
    saveMatrixPrefs();
    renderMatrix();
  }

  function applyPricingPreset(presetName) {
    if (state.matrixMode !== "pricing") return;
    const rows = collectPricingFields(currentSnapshots());
    const preset = new Set(PRICING_PRESETS[presetName] || ESSENTIAL_PRICING_FIELDS);
    state.matrixHidden.pricing = rows.filter((row) => !preset.has(row));
    saveMatrixPrefs();
    renderMatrix();
  }

  function resetMatrixRows() {
    state.matrixHidden[state.matrixMode] = [];
    saveMatrixPrefs();
    renderMatrix();
  }

  function matrixCell(current, productId, capability) {
    const fact = findFactFor(current, productId, capability);
    if (!fact) return `<td><div class="matrix-cell v-unknown"><strong>UNKNOWN</strong></div></td>`;
    const check = fact.review_flag === "Check" && state.showCheck ? `<span class="check-mark">Check</span>` : "";
    return `
      <td>
        <div class="matrix-cell ${valueClass(fact.available)}" data-product-id="${escapeAttr(productId)}" data-capability="${escapeAttr(capability)}">
          <strong>${escapeHtml(fact.available)}</strong>
          ${check}
          ${fact.note ? `<small>${escapeHtml(fact.note.slice(0, 80))}</small>` : ""}
        </div>
      </td>
    `;
  }

  function pricingCell(current, productId, field) {
    const row = findPricingFor(current, productId, field);
    if (!row) return `<td><div class="matrix-cell pricing-cell v-unknown" data-product-id="${escapeAttr(productId)}" data-field="${escapeAttr(field)}"><strong>UNKNOWN</strong></div></td>`;
    const estimate = nzdEstimateFor(current, productId, field, row.value);
    return `
      <td>
        <div class="matrix-cell pricing-cell ${pricingValueClass(row.value)}" data-product-id="${escapeAttr(productId)}" data-field="${escapeAttr(field)}">
          <strong>${escapeHtml(formatPricingValue(row.value))}</strong>
          ${estimate ? `<small class="nzd-estimate">${escapeHtml(estimate.short)}</small>` : ""}
        </div>
      </td>
    `;
  }

  function showFactDetail(productId, capability) {
    const fact = findFactFor(currentSnapshots(), productId, capability);
    const drawer = byId("detailDrawer");
    if (!fact) {
      drawer.hidden = true;
      return;
    }
    drawer.hidden = false;
    drawer.innerHTML = `
      <h3>${escapeHtml(productLabel(productId))}: ${escapeHtml(capability)}</h3>
      <p><strong>${escapeHtml(fact.available)}</strong> ${fact.review_flag === "Check" ? `<span class="check-mark">Check</span>` : ""}</p>
      <p>${escapeHtml(fact.note || "No note stored.")}</p>
      <p class="eyebrow">${escapeHtml(fact.section)}</p>
    `;
  }

  function showPricingDetail(productId, field) {
    const row = findPricingFor(currentSnapshots(), productId, field);
    const drawer = byId("detailDrawer");
    if (!row) {
      drawer.hidden = true;
      return;
    }
    const estimate = nzdEstimateFor(currentSnapshots(), productId, field, row.value);
    drawer.hidden = false;
    drawer.innerHTML = `
      <h3>${escapeHtml(productLabel(productId))}: ${escapeHtml(field)}</h3>
      <p>${escapeHtml(row.value || "No pricing value stored.")}</p>
      ${estimate ? `
        <p><strong>${escapeHtml(estimate.long)}</strong></p>
        <p class="muted-note">${escapeHtml(FX_DISPLAY.note)} Rate used: 1 ${escapeHtml(FX_DISPLAY.sourceCurrency)} = ${FX_DISPLAY.rate.toFixed(2)} ${escapeHtml(FX_DISPLAY.targetCurrency)} on ${escapeHtml(FX_DISPLAY.rateDate)}.</p>
      ` : ""}
      <p class="eyebrow">Pricing</p>
    `;
  }

  function currentSnapshots() {
    const byProduct = new Map();
    db.snapshots.forEach((snapshot) => {
      const existing = byProduct.get(snapshot.product_id);
      if (!existing || String(snapshot.accepted_at) > String(existing.accepted_at)) byProduct.set(snapshot.product_id, snapshot);
    });
    return Array.from(byProduct.values()).map((snapshot) => ({
      snapshot,
      facts: db.snapshot_facts.filter((fact) => fact.snapshot_id === snapshot.id),
      pricing: db.snapshot_pricing.filter((price) => price.snapshot_id === snapshot.id)
    }));
  }

  function collectCapabilities(current) {
    const set = new Set();
    current.forEach((entry) => entry.facts.forEach((fact) => set.add(fact.capability)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function collectPricingFields(current) {
    const set = new Set();
    current.forEach((entry) => entry.pricing.forEach((price) => set.add(price.field)));
    PRICING_FIELDS.forEach((field) => set.add(field));
    return Array.from(set).sort((a, b) => pricingFieldRank(a) - pricingFieldRank(b) || a.localeCompare(b));
  }

  function pricingFieldRank(field) {
    const index = PRICING_FIELDS.indexOf(field);
    return index >= 0 ? index : PRICING_FIELDS.length + 1;
  }

  function canonicalPricingField(field) {
    const clean = String(field || "").replace(/\s+/g, " ").trim();
    const key = normalizeKey(clean);
    const aliases = {
      "base paid tier available": "Entry paid tier available",
      "base paid tier name": "Entry paid tier name",
      "base paid tier price": "Entry paid tier price",
      "base paid tier currency": "Entry paid tier currency",
      "base paid tier billing period": "Entry paid tier billing period",
      "starter tier available": "Entry paid tier available",
      "starter tier name": "Entry paid tier name",
      "starter tier price": "Entry paid tier price",
      "starter tier currency": "Entry paid tier currency",
      "starter tier billing period": "Entry paid tier billing period",
      "professional tier available": "Pro paid tier available",
      "professional tier name": "Pro paid tier name",
      "professional tier price": "Pro paid tier price",
      "professional tier currency": "Pro paid tier currency",
      "professional tier billing period": "Pro paid tier billing period",
      "business tier available": "Team or business tier available",
      "business tier name": "Team or business tier name",
      "business tier price": "Team or business tier price",
      "business tier currency": "Team or business tier currency",
      "business tier billing period": "Team or business tier billing period",
      "team tier available": "Team or business tier available",
      "team tier name": "Team or business tier name",
      "team tier price": "Team or business tier price",
      "team tier currency": "Team or business tier currency",
      "team tier billing period": "Team or business tier billing period",
      "per user pricing": "Team or business tier per-user pricing",
      "team per user pricing": "Team or business tier per-user pricing",
      "enterprise starting price": "Enterprise public starting price",
      "public enterprise starting price": "Enterprise public starting price",
      "api pricing available": "Usage-based API pricing available",
      "usage based pricing available": "Usage-based API pricing available",
      "input token price": "API input token price",
      "output token price": "API output token price",
      "image generation api price": "API image generation price",
      "audio api price": "API audio price",
      "video api price": "API video price",
      "tool costs": "Add-on or tool costs",
      "add on costs": "Add-on or tool costs",
      "included credits": "Included credits or usage allowance",
      "usage allowance": "Included credits or usage allowance",
      "annual discount available": "Annual billing discount available",
      "annual discount detail": "Annual billing discount detail"
    };
    return aliases[key] || PRICING_FIELDS.find((item) => normalizeKey(item) === key) || clean;
  }

  function addMissingPricingFields(pricing) {
    if (!pricing.length) return;
    const seen = new Set(pricing.map((row) => row.field));
    PRICING_FIELDS.forEach((field) => {
      if (!seen.has(field)) pricing.push({ field, value: "UNKNOWN" });
    });
    pricing.sort((a, b) => pricingFieldRank(a.field) - pricingFieldRank(b.field) || a.field.localeCompare(b.field));
  }

  function findFactFor(current, productId, capability) {
    const entry = current.find((item) => item.snapshot.product_id === productId);
    if (!entry) return null;
    return entry.facts.find((fact) => fact.capability === capability) || null;
  }

  function findPricingFor(current, productId, field) {
    const entry = current.find((item) => item.snapshot.product_id === productId);
    if (!entry) return null;
    return entry.pricing.find((price) => price.field === field) || null;
  }

  function nzdEstimateFor(current, productId, field, rawValue) {
    if (!isConvertiblePricingField(field)) return null;
    const amount = firstMoneyAmount(rawValue);
    if (amount === null) return null;
    const currency = pricingCurrencyFor(current, productId, field, rawValue);
    if (currency !== FX_DISPLAY.sourceCurrency) return null;
    const nzd = amount * FX_DISPLAY.rate;
    return {
      short: `~NZD ${formatMoney(nzd)}`,
      long: `Approx NZD ${formatMoney(nzd)}`
    };
  }

  function pricingCurrencyFor(current, productId, field, rawValue) {
    const inline = String(rawValue || "").match(/\b(NZD|USD|AUD|EUR|GBP|CAD)\b/i);
    if (inline) return inline[1].toUpperCase();
    const currencyField = pairedPricingCurrencyField(field);
    if (!currencyField) return "";
    const currencyRow = findPricingFor(current, productId, currencyField);
    return String(currencyRow?.value || "").trim().toUpperCase();
  }

  function pairedPricingCurrencyField(field) {
    const pairs = [
      ["Free tier price", "Free tier currency"],
      ["Entry paid tier price", "Entry paid tier currency"],
      ["Mid paid tier price", "Mid paid tier currency"],
      ["Pro paid tier price", "Pro paid tier currency"],
      ["Team or business tier price", "Team or business tier currency"],
      ["Enterprise public starting price", "Team or business tier currency"]
    ];
    const pair = pairs.find(([priceField]) => priceField === field);
    return pair ? pair[1] : "";
  }

  function isConvertiblePricingField(field) {
    return /price|cost|starting/i.test(field) && !/currency|date|available|required|period|detail|caps|credits|allowance/i.test(field);
  }

  function firstMoneyAmount(value) {
    const text = String(value || "").replace(/,/g, "");
    if (!text || /^(UNKNOWN|NONE|N\/A|QUOTE|USAGE_BASED)$/i.test(text.trim())) return null;
    const withoutDates = text.replace(/\b20\d{2}-\d{2}-\d{2}\b/g, "");
    const match = withoutDates.match(/(?:[$]|USD|NZD|AUD|EUR|GBP|CAD)?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (!match) return null;
    const amount = Number(match[1]);
    return Number.isFinite(amount) ? amount : null;
  }

  function formatMoney(value) {
    return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function activeProducts() {
    return db.products
      .map((item) => ({ product: item, provider: db.providers.find((parent) => parent.id === item.provider_id) }))
      .filter((entry) => entry.provider && ACTIVE_STATUSES.includes(entry.provider.status) && ACTIVE_STATUSES.includes(entry.product.status))
      .sort((a, b) => productLabel(a.product.id).localeCompare(productLabel(b.product.id)));
  }

  function productLabel(productId) {
    const item = db.products.find((row) => row.id === productId);
    if (!item) return "Unknown product";
    const parent = db.providers.find((row) => row.id === item.provider_id);
    return `${parent ? parent.name : "Unknown"} / ${item.name}`;
  }

  function daysSince(dateValue) {
    const then = new Date(dateValue + "T00:00:00");
    const now = new Date();
    return Math.floor((now - then) / 86400000);
  }

  function firstValue(row, keys) {
    for (const key of keys) {
      const normalized = normalizeKey(key);
      if (row[normalized]) return row[normalized];
    }
    return "";
  }

  function normalizeAvailable(value) {
    const clean = stripDecor(value || "").trim().toUpperCase();
    if (clean.startsWith("YES")) return "YES";
    if (clean.startsWith("NO")) return "NO";
    if (clean.startsWith("LIMITED")) return "LIMITED";
    if (clean.startsWith("NONE")) return "NONE";
    if (clean.startsWith("UNKNOWN")) return "UNKNOWN";
    return clean || "UNKNOWN";
  }

  function isPriority(capability, section) {
    const text = `${capability} ${section}`.toLowerCase();
    return PRIORITY_TERMS.some((term) => text.includes(term));
  }

  function normalizeKey(value) {
    return stripDecor(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function stripDecor(value) {
    return String(value || "").replace(/\*\*/g, "").trim();
  }

  function valueClass(value) {
    const key = String(value || "").toLowerCase();
    if (key === "yes") return "v-yes";
    if (key === "no") return "v-no";
    if (key === "limited") return "v-limited";
    if (key === "none") return "v-none";
    if (key === "price") return "v-price";
    return "v-unknown";
  }

  function pricingValueClass(value) {
    const key = String(value || "").trim().toLowerCase();
    if (!key || key === "unknown") return "v-unknown";
    if (key === "yes") return "v-yes";
    if (key === "no" || key === "none") return "v-no";
    if (key === "limited") return "v-limited";
    return "v-price";
  }

  function formatPricingValue(value) {
    const text = String(value || "").trim();
    return text.length > 64 ? `${text.slice(0, 61)}...` : text || "UNKNOWN";
  }

  function fieldInput(label, className, value) {
    return `<label>${escapeHtml(label)}<input class="${escapeAttr(className)}" value="${escapeAttr(value || "")}"></label>`;
  }

  function fileInput(label, className) {
    return `<label>${escapeHtml(label)}<input class="${escapeAttr(className)}" type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp,image/gif"></label>`;
  }

  function uploadLogoFile(file) {
    if (!file) return Promise.resolve("");
    if (!file.type.startsWith("image/")) {
      alert("Choose an image file.");
      return Promise.resolve("");
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo files must be 2 MB or smaller.");
      return Promise.resolve("");
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const response = await fetch("/api/upload-logo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, dataUrl: reader.result })
          });
          if (!response.ok) throw new Error(`Upload failed with ${response.status}`);
          const result = await response.json();
          resolve(result.path || "");
        } catch (error) {
          console.warn(error);
          alert("Logo upload failed.");
          resolve("");
        }
      };
      reader.onerror = () => {
        alert("Logo file could not be read.");
        resolve("");
      };
      reader.readAsDataURL(file);
    });
  }

  function statusSelect(className, value) {
    return `
      <label>Status
        <select class="${escapeAttr(className)}">
          ${STATUSES.map((status) => `<option ${status === value ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function clientTypeSelect(className, value) {
    return `
      <label>Client type
        <select class="${escapeAttr(className)}">
          ${CLIENT_TYPES.map((type) => `<option value="${escapeAttr(type)}" ${type === value ? "selected" : ""}>${escapeHtml(CLIENT_TYPE_LABELS[type] || type)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function clientStatusSelect(className, value) {
    return `
      <label>Status
        <select class="${escapeAttr(className)}">
          ${CLIENT_STATUSES.map((status) => `<option value="${escapeAttr(status)}" ${status === value ? "selected" : ""}>${escapeHtml(CLIENT_STATUS_LABELS[status] || status)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function consultantStatusSelect(className, value) {
    return `
      <label>Status
        <select class="${escapeAttr(className)}">
          ${CONSULTANT_STATUSES.map((status) => `<option value="${escapeAttr(status)}" ${status === value ? "selected" : ""}>${escapeHtml(CONSULTANT_STATUS_LABELS[status] || status)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function logoHtml(path, label) {
    if (!path) return `<div class="logo-box">${escapeHtml((label || "?").slice(0, 1).toUpperCase())}</div>`;
    return `<div class="logo-box"><img src="${escapeAttr(path)}" alt="${escapeAttr(label || "Logo")}"></div>`;
  }

  function id(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function byId(idValue) {
    return document.getElementById(idValue);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();
