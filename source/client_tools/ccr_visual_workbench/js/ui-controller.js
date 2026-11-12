(function (global) {
  'use strict';

  const CCR = global.CCRVisual = global.CCRVisual || {};
  const Core = CCR.Core;
  const Registry = CCR.DatasetRegistry;

  const dom = {};
  let normalizedData = null;
  let rawData = null;
  let currentModel = null;
  let currentOption = null;
  let savedConfigs = [];
  let pendingLastImport = null;
  let titleTouched = false;
  let subtitleTouched = false;
  let evidenceSort = { key: '', direction: 'asc' };

  let state = defaultState();

  function defaultState() {
    return {
      dataset: 'products',
      measure: 'products_by_category',
      groupBy: 'Category',
      providerIds: [],
      categories: [],
      tags: [],
      tagMatch: 'any',
      productIds: null,
      section: 'Core Capability Facts',
      pricingBasis: '',
      chartType: 'horizontal-bar',
      sort: 'value-desc',
      title: '',
      subtitle: ''
    };
  }

  function cacheDom() {
    [
      'app-version', 'status-region', 'status-message', 'open-health-button', 'load-export-button', 'use-sample-button', 'file-input',
      'preset-select', 'preset-help', 'dataset-select', 'dataset-help', 'measure-select', 'measure-help', 'group-select',
      'filter-fieldset', 'provider-filter', 'category-filter', 'tag-search', 'tag-any-button', 'tag-all-button', 'selected-tag-chips', 'tag-options',
      'product-search', 'product-checklist', 'select-all-products', 'clear-products', 'section-control', 'section-select',
      'pricing-basis-control', 'pricing-basis-select', 'chart-type-select', 'chart-type-help', 'sort-select', 'chart-title', 'chart-subtitle',
      'build-chart-button', 'save-config-button', 'reset-chart-button', 'saved-config-select', 'load-config-button', 'duplicate-config-button',
      'rename-config-button', 'delete-config-button', 'export-png-button', 'export-config-button', 'import-config-button', 'config-file-input',
      'export-csv-button', 'workspace-title', 'chart-message', 'chart-canvas', 'table-chart', 'chart-text-summary', 'source-line',
      'evidence-drawer', 'interpretation-text', 'derived-rule', 'warning-list', 'evidence-search', 'technical-view-toggle', 'evidence-table-wrap',
      'clear-saved-button', 'forget-data-button', 'start-dialog', 'dialog-sample-button', 'dialog-load-button', 'dialog-restore-button', 'dialog-close-button',
      'health-dialog', 'health-summary', 'health-details'
    ].forEach((id) => { dom[id] = document.getElementById(id); });
  }

  function setStatus(message, status = '') {
    dom['status-message'].textContent = message;
    dom['status-region'].dataset.state = status;
  }

  function setBusy(message) {
    setStatus(message, 'working');
    document.body.setAttribute('aria-busy', 'true');
  }

  function clearBusy() {
    document.body.removeAttribute('aria-busy');
  }

  function selectedValues(select) {
    return Array.from(select.selectedOptions).map((option) => option.value);
  }

  function option(value, label, disabled = false, title = '') {
    const element = document.createElement('option');
    element.value = value;
    element.textContent = label;
    element.disabled = disabled;
    if (title) element.title = title;
    return element;
  }

  function fillSelect(select, items, selectedValue, includeBlank) {
    select.replaceChildren();
    if (includeBlank) select.appendChild(option('', includeBlank));
    items.forEach((item) => select.appendChild(option(item.value ?? item.id, item.label, item.disabled, item.reason)));
    if (selectedValue !== undefined && selectedValue !== null) select.value = selectedValue;
  }

  function enableBuilder(enabled) {
    ['preset-select', 'dataset-select', 'measure-select', 'group-select', 'chart-type-select', 'sort-select', 'chart-title', 'chart-subtitle', 'build-chart-button']
      .forEach((key) => { dom[key].disabled = !enabled; });
    dom['filter-fieldset'].disabled = !enabled;
    dom['forget-data-button'].disabled = !enabled;
    dom['open-health-button'].disabled = !enabled;
    dom['save-config-button'].disabled = !enabled;
  }

  function bindEvents() {
    dom['load-export-button'].addEventListener('click', () => dom['file-input'].click());
    dom['use-sample-button'].addEventListener('click', loadSample);
    dom['dialog-load-button'].addEventListener('click', () => dom['file-input'].click());
    dom['dialog-sample-button'].addEventListener('click', loadSample);
    dom['dialog-restore-button'].addEventListener('click', restorePreviousSession);
    dom['file-input'].addEventListener('change', handleDataFile);

    dom['preset-select'].addEventListener('change', () => {
      const preset = Registry.PRESETS.find((row) => row.id === dom['preset-select'].value);
      if (!preset) return;
      applyState({ ...state, ...Core.clone(preset.state), title: '', subtitle: '' }, { resetTouched: true, refresh: true });
      dom['preset-help'].textContent = preset.description;
      setStatus(`Preset loaded: ${preset.label}. Review the controls, then build the chart.`, 'success');
    });

    dom['dataset-select'].addEventListener('change', () => {
      state.dataset = dom['dataset-select'].value;
      const firstMeasure = Object.keys(Registry.DATASETS[state.dataset].measures)[0];
      state.measure = firstMeasure;
      state.groupBy = Registry.groupsFor(state.dataset, firstMeasure)[0];
      state.chartType = Registry.DATASETS[state.dataset].measures[firstMeasure].charts[0];
      state.pricingBasis = '';
      titleTouched = false;
      subtitleTouched = false;
      refreshBuilder();
    });

    dom['measure-select'].addEventListener('change', () => {
      state.measure = dom['measure-select'].value;
      const measure = Registry.DATASETS[state.dataset].measures[state.measure];
      if (!measure.charts.includes(state.chartType)) state.chartType = measure.charts[0];
      state.pricingBasis = '';
      titleTouched = false;
      subtitleTouched = false;
      refreshBuilder();
    });

    dom['group-select'].addEventListener('change', () => { state.groupBy = dom['group-select'].value; refreshDependentControls(); });
    dom['provider-filter'].addEventListener('change', () => { state.providerIds = selectedValues(dom['provider-filter']); onFiltersChanged(); });
    dom['category-filter'].addEventListener('change', () => { state.categories = selectedValues(dom['category-filter']); onFiltersChanged(); });
    dom['tag-search'].addEventListener('input', Core.debounce(renderTagOptions, 80));
    dom['product-search'].addEventListener('input', Core.debounce(renderProductChecklist, 80));
    dom['tag-any-button'].addEventListener('click', () => setTagMatch('any'));
    dom['tag-all-button'].addEventListener('click', () => setTagMatch('all'));
    dom['select-all-products'].addEventListener('click', () => { state.productIds = null; renderProductChecklist(); refreshDependentControls(); });
    dom['clear-products'].addEventListener('click', () => { state.productIds = []; renderProductChecklist(); refreshDependentControls(); });
    dom['section-select'].addEventListener('change', () => { state.section = dom['section-select'].value; refreshDependentControls(); });
    dom['pricing-basis-select'].addEventListener('change', () => { state.pricingBasis = dom['pricing-basis-select'].value; refreshSuggestedTitles(); });
    dom['chart-type-select'].addEventListener('change', () => { state.chartType = dom['chart-type-select'].value; refreshChartTypeHelp(); });
    dom['sort-select'].addEventListener('change', () => { state.sort = dom['sort-select'].value; });
    dom['chart-title'].addEventListener('input', () => { titleTouched = true; state.title = dom['chart-title'].value; });
    dom['chart-subtitle'].addEventListener('input', () => { subtitleTouched = true; state.subtitle = dom['chart-subtitle'].value; });

    dom['build-chart-button'].addEventListener('click', buildChart);
    dom['reset-chart-button'].addEventListener('click', resetChart);
    dom['save-config-button'].addEventListener('click', saveCurrentConfig);
    dom['saved-config-select'].addEventListener('change', updateSavedButtons);
    dom['load-config-button'].addEventListener('click', loadSelectedConfig);
    dom['duplicate-config-button'].addEventListener('click', duplicateSelectedConfig);
    dom['rename-config-button'].addEventListener('click', renameSelectedConfig);
    dom['delete-config-button'].addEventListener('click', deleteSelectedConfig);

    dom['export-png-button'].addEventListener('click', exportPNG);
    dom['export-config-button'].addEventListener('click', exportConfig);
    dom['import-config-button'].addEventListener('click', () => dom['config-file-input'].click());
    dom['config-file-input'].addEventListener('change', importConfigFile);
    dom['export-csv-button'].addEventListener('click', exportCSV);

    dom['evidence-search'].addEventListener('input', Core.debounce(renderEvidenceTable, 100));
    dom['technical-view-toggle'].addEventListener('change', renderEvidenceTable);
    dom['open-health-button'].addEventListener('click', showHealthDialog);
    dom['clear-saved-button'].addEventListener('click', clearSavedCharts);
    dom['forget-data-button'].addEventListener('click', forgetLoadedData);
  }

  async function init() {
    cacheDom();
    bindEvents();
    dom['app-version'].textContent = `v${Core.APP_VERSION}`;
    fillSelect(dom['dataset-select'], Object.entries(Registry.DATASETS).map(([id, item]) => ({ id, label: item.label })), state.dataset);
    fillSelect(dom['preset-select'], Registry.PRESETS.map((row) => ({ id: row.id, label: row.label })), '', 'Choose a preset');
    await refreshSavedConfigs();
    try {
      pendingLastImport = await CCR.Storage.getLastImport();
      if (pendingLastImport) dom['dialog-restore-button'].classList.remove('hidden');
    } catch (_) { /* storage fallback is handled internally */ }
    if (typeof dom['start-dialog'].showModal === 'function') dom['start-dialog'].showModal();
    else dom['start-dialog'].setAttribute('open', '');
    setStatus('Choose Sample Data or load a current Cdash export.');
  }

  async function loadSample() {
    if (!global.CDASH_SAMPLE_FIXTURE) {
      setStatus('The bundled sample fixture is missing.', 'error');
      return;
    }
    await loadRawData(Core.clone(global.CDASH_SAMPLE_FIXTURE), 'cdash-export-sample.json', { persist: true });
  }

  async function restorePreviousSession() {
    if (!pendingLastImport) return;
    await loadRawData(pendingLastImport.raw, pendingLastImport.sourceName || 'Restored Cdash export', { persist: false });
  }

  async function handleDataFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(`Validating ${file.name}…`);
    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);
      await loadRawData(parsed, file.name, { persist: true });
    } catch (error) {
      setStatus(`Import failed: ${error.message}`, 'error');
      clearBusy();
      fireHostCallback('onError', error);
    }
  }

  async function loadRawData(raw, sourceName, options = {}) {
    setBusy(`Validating ${sourceName}…`);
    let candidate;
    try {
      candidate = CCR.DataAdapter.normalize(raw, { sourceName });
    } catch (error) {
      setStatus(`Import rejected: ${error.message}`, 'error');
      clearBusy();
      fireHostCallback('onError', error);
      throw error;
    }

    rawData = Core.clone(raw);
    normalizedData = candidate;
    currentModel = null;
    currentOption = null;
    state = defaultState();
    titleTouched = false;
    subtitleTouched = false;
    if (options.persist !== false) await CCR.Storage.saveLastImport(rawData, sourceName);
    pendingLastImport = { raw: rawData, sourceName };

    enableBuilder(true);
    populateImportControls();
    resetChartDisplay();
    refreshBuilder();
    updateHealthSummary();
    dom['start-dialog'].close?.();
    clearBusy();
    setStatus(`${candidate.health.products} products loaded from ${sourceName}. ${candidate.health.warningCount} import warning${candidate.health.warningCount === 1 ? '' : 's'}.`, candidate.health.warningCount ? 'working' : 'success');
    fireHostCallback('onImportComplete', candidate.health);
    return candidate.health;
  }

  function populateImportControls() {
    fillSelect(dom['provider-filter'], normalizedData.providers.map((row) => ({ id: row.id, label: row.name })), null);
    fillSelect(dom['category-filter'], normalizedData.categories.map((label) => ({ id: label, label })), null);
    renderTagOptions();
    renderSelectedTagChips();
    renderProductChecklist();
    dom['open-health-button'].disabled = false;
    dom['forget-data-button'].disabled = false;
  }

  function refreshBuilder() {
    if (!normalizedData) return;
    dom['dataset-select'].value = state.dataset;
    const dataset = Registry.DATASETS[state.dataset];
    dom['dataset-help'].textContent = dataset.help;
    fillSelect(dom['measure-select'], Object.entries(dataset.measures).map(([id, item]) => ({ id, label: item.label })), state.measure);
    const groups = Registry.groupsFor(state.dataset, state.measure);
    if (!groups.includes(state.groupBy)) state.groupBy = groups[0];
    fillSelect(dom['group-select'], groups.map((label) => ({ id: label, label })), state.groupBy);
    dom['group-select'].disabled = groups.length <= 1;
    dom['measure-help'].textContent = dataset.measures[state.measure].help;
    dom['sort-select'].value = state.sort;

    const sectionVisible = state.dataset === 'capabilities' && ['yes_count', 'yes_limited_count', 'status_composition', 'known_percentage', 'capability_matrix'].includes(state.measure);
    dom['section-control'].classList.toggle('hidden', !sectionVisible);
    if (sectionVisible) {
      const sections = ['All capability sections', ...normalizedData.sections.filter((label) => label !== 'Interfaces')];
      if (!sections.includes(state.section)) state.section = sections.includes('Core Capability Facts') ? 'Core Capability Facts' : sections[0];
      fillSelect(dom['section-select'], sections.map((label) => ({ id: label, label })), state.section);
    }

    updatePricingBasis();
    updateChartTypes();
    renderTagOptions();
    renderSelectedTagChips();
    renderProductChecklist();
    refreshSuggestedTitles();
  }

  function refreshDependentControls() {
    if (!normalizedData) return;
    updatePricingBasis();
    renderProductChecklist();
    refreshSuggestedTitles();
  }

  function onFiltersChanged() {
    renderTagOptions();
    renderProductChecklist();
    refreshDependentControls();
  }

  function setTagMatch(mode) {
    state.tagMatch = mode;
    dom['tag-any-button'].classList.toggle('active', mode === 'any');
    dom['tag-all-button'].classList.toggle('active', mode === 'all');
    dom['tag-any-button'].setAttribute('aria-pressed', String(mode === 'any'));
    dom['tag-all-button'].setAttribute('aria-pressed', String(mode === 'all'));
    renderProductChecklist();
    refreshDependentControls();
  }

  function renderTagOptions() {
    if (!normalizedData) return;
    const query = Core.normalizeKey(dom['tag-search'].value);
    const counts = new Map();
    normalizedData.products.forEach((product) => product.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
    const selectedKeys = new Set(state.tags.map(Core.normalizeKey));
    dom['tag-options'].replaceChildren();
    Array.from(counts.entries())
      .filter(([tag]) => !query || Core.normalizeKey(tag).includes(query))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .forEach(([tag, count]) => {
        const row = document.createElement('div');
        row.className = 'tag-option';
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', String(selectedKeys.has(Core.normalizeKey(tag))));
        const label = document.createElement('span');
        label.textContent = tag;
        const frequency = document.createElement('span');
        frequency.className = 'product-meta';
        frequency.textContent = `${count}`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'text-button';
        button.textContent = selectedKeys.has(Core.normalizeKey(tag)) ? 'Remove' : 'Add';
        button.addEventListener('click', () => toggleTag(tag));
        row.append(label, frequency, button);
        dom['tag-options'].appendChild(row);
      });
  }

  function toggleTag(tag) {
    const key = Core.normalizeKey(tag);
    const existingIndex = state.tags.findIndex((item) => Core.normalizeKey(item) === key);
    if (existingIndex >= 0) state.tags.splice(existingIndex, 1);
    else state.tags.push(tag);
    renderSelectedTagChips();
    renderTagOptions();
    renderProductChecklist();
    refreshDependentControls();
  }

  function renderSelectedTagChips() {
    dom['selected-tag-chips'].replaceChildren();
    state.tags.forEach((tag) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      const text = document.createElement('span');
      text.textContent = tag;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove tag ${tag}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => toggleTag(tag));
      chip.append(text, remove);
      dom['selected-tag-chips'].appendChild(chip);
    });
  }

  function candidateProductsIgnoringExplicitSelection() {
    return Registry.selectedProducts(normalizedData, { ...state, productIds: null });
  }

  function renderProductChecklist() {
    if (!normalizedData) return;
    const query = Core.normalizeKey(dom['product-search'].value);
    const candidates = candidateProductsIgnoringExplicitSelection().filter((product) => !query || [product.name, product.providerName, product.category].some((value) => Core.normalizeKey(value).includes(query)));
    const selectedSet = state.productIds === null ? null : new Set(state.productIds);
    dom['product-checklist'].replaceChildren();
    candidates.forEach((product) => {
      const label = document.createElement('label');
      label.className = 'product-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = product.id;
      checkbox.checked = selectedSet === null || selectedSet.has(product.id);
      checkbox.addEventListener('change', () => {
        if (state.productIds === null) state.productIds = normalizedData.products.map((row) => row.id);
        const set = new Set(state.productIds);
        if (checkbox.checked) set.add(product.id); else set.delete(product.id);
        state.productIds = Array.from(set);
        refreshDependentControls();
      });
      const initials = document.createElement('span');
      initials.className = 'product-initials';
      initials.textContent = Core.initials(product.name);
      const textWrap = document.createElement('span');
      const name = document.createElement('span');
      name.textContent = product.name;
      const meta = document.createElement('span');
      meta.className = 'product-meta';
      meta.textContent = ` · ${product.providerName} · ${product.category}`;
      textWrap.append(name, meta);
      label.append(checkbox, initials, textWrap);
      dom['product-checklist'].appendChild(label);
    });
    if (!candidates.length) {
      const empty = document.createElement('p');
      empty.className = 'field-help';
      empty.textContent = 'No products match the current filters.';
      dom['product-checklist'].appendChild(empty);
    }
  }

  function updatePricingBasis() {
    const measure = Registry.DATASETS[state.dataset]?.measures?.[state.measure];
    const visible = Boolean(measure?.pricingBasis);
    dom['pricing-basis-control'].classList.toggle('hidden', !visible);
    if (!visible || !normalizedData) return;
    const products = Registry.selectedProducts(normalizedData, state);
    const options = Registry.pricingBasisOptions(normalizedData, state, products);
    if (!options.some((row) => row.key === state.pricingBasis)) state.pricingBasis = options[0]?.key || '';
    fillSelect(dom['pricing-basis-select'], options.map((row) => ({ id: row.key, label: row.label })), state.pricingBasis, options.length ? undefined : 'No comparable numeric basis');
  }

  function updateChartTypes() {
    const types = Registry.chartTypeCompatibility(state.dataset, state.measure);
    const enabled = types.filter((row) => row.enabled);
    if (!enabled.some((row) => row.id === state.chartType)) state.chartType = enabled[0]?.id || 'table';
    fillSelect(dom['chart-type-select'], types.map((row) => ({ id: row.id, label: row.enabled ? row.label : `${row.label} — unavailable`, disabled: !row.enabled, reason: row.reason })), state.chartType);
    refreshChartTypeHelp();
  }

  function refreshChartTypeHelp() {
    const entry = Registry.chartTypeCompatibility(state.dataset, state.measure).find((row) => row.id === state.chartType);
    dom['chart-type-help'].textContent = entry?.enabled ? 'Only chart types valid for the selected measure are enabled.' : entry?.reason || '';
  }

  function refreshSuggestedTitles() {
    if (!normalizedData) return;
    try {
      const previewState = captureState();
      const model = Registry.prepare(normalizedData, previewState);
      if (!titleTouched) {
        state.title = model.title;
        dom['chart-title'].value = model.title;
      }
      if (!subtitleTouched) {
        state.subtitle = model.subtitle;
        dom['chart-subtitle'].value = model.subtitle;
      }
    } catch (_) {
      if (!titleTouched) dom['chart-title'].value = Registry.DATASETS[state.dataset].measures[state.measure].label;
    }
  }

  function captureState() {
    state.dataset = dom['dataset-select'].value || state.dataset;
    state.measure = dom['measure-select'].value || state.measure;
    state.groupBy = dom['group-select'].value || state.groupBy;
    state.providerIds = selectedValues(dom['provider-filter']);
    state.categories = selectedValues(dom['category-filter']);
    state.section = dom['section-select'].value || state.section;
    state.pricingBasis = dom['pricing-basis-select'].value || state.pricingBasis;
    state.chartType = dom['chart-type-select'].value || state.chartType;
    state.sort = dom['sort-select'].value || state.sort;
    state.title = dom['chart-title'].value.trim();
    state.subtitle = dom['chart-subtitle'].value.trim();
    return Core.clone(state);
  }

  function applyState(nextState, options = {}) {
    state = { ...defaultState(), ...Core.clone(nextState) };
    if (options.resetTouched) {
      titleTouched = Boolean(state.title);
      subtitleTouched = Boolean(state.subtitle);
    }
    if (!normalizedData) return;

    dom['provider-filter'].querySelectorAll('option').forEach((entry) => { entry.selected = (state.providerIds || []).includes(entry.value); });
    dom['category-filter'].querySelectorAll('option').forEach((entry) => { entry.selected = (state.categories || []).includes(entry.value); });
    if (options.refresh !== false) refreshBuilder();
    setTagMatch(state.tagMatch === 'all' ? 'all' : 'any');
    dom['chart-title'].value = state.title || dom['chart-title'].value;
    dom['chart-subtitle'].value = state.subtitle || dom['chart-subtitle'].value;
  }

  function resetChartDisplay() {
    CCR.ChartBuilder.dispose();
    currentModel = null;
    currentOption = null;
    dom['chart-canvas'].hidden = true;
    dom['table-chart'].hidden = true;
    dom['chart-message'].hidden = false;
    dom['source-line'].hidden = true;
    dom['workspace-title'].textContent = normalizedData ? 'Configure and build a chart' : 'Load data to begin';
    dom['build-chart-button'].textContent = 'Build Chart';
    ['export-png-button', 'export-config-button', 'export-csv-button'].forEach((key) => { dom[key].disabled = true; });
    dom['interpretation-text'].textContent = 'No chart has been built.';
    dom['derived-rule'].textContent = 'Not applicable.';
    dom['warning-list'].replaceChildren();
    dom['evidence-table-wrap'].replaceChildren();
  }

  function resetChart() {
    state = defaultState();
    titleTouched = false;
    subtitleTouched = false;
    dom['provider-filter'].querySelectorAll('option').forEach((entry) => { entry.selected = false; });
    dom['category-filter'].querySelectorAll('option').forEach((entry) => { entry.selected = false; });
    dom['preset-select'].value = '';
    dom['preset-help'].textContent = 'Presets fill the controls and remain editable.';
    resetChartDisplay();
    refreshBuilder();
    setStatus('Current chart configuration reset. Loaded data and saved charts were retained.', 'success');
  }

  async function buildChart() {
    if (!normalizedData) return;
    setBusy('Building chart from the filtered local dataset…');
    try {
      const buildState = captureState();
      const model = Registry.prepare(normalizedData, buildState);
      if (!model.rows?.length) throw new Error(model.warnings?.[0] || 'No rows are available for the selected chart.');
      if (['pie', 'doughnut'].includes(buildState.chartType) && model.rows.length > 8) throw new Error('Pie and doughnut charts require eight or fewer slices. Narrow the filters or choose a bar chart.');
      if (buildState.chartType === 'radar' && model.products.length > 5) throw new Error('Radar charts require five or fewer selected products. Narrow the product filter.');

      currentModel = model;
      state = buildState;
      dom['chart-message'].hidden = true;
      dom['workspace-title'].textContent = state.title || model.title;
      dom['source-line'].textContent = model.sourceLine;
      dom['source-line'].hidden = false;

      if (state.chartType === 'table') {
        CCR.ChartBuilder.dispose();
        dom['chart-canvas'].hidden = true;
        dom['table-chart'].hidden = false;
        renderStandaloneTable(model.evidenceRows, dom['table-chart'], true);
        currentOption = null;
      } else {
        dom['table-chart'].hidden = true;
        dom['chart-canvas'].hidden = false;
        const rendered = CCR.ChartBuilder.render(dom['chart-canvas'], model, state);
        currentOption = rendered.option;
      }

      renderEvidence();
      dom['chart-text-summary'].textContent = `${state.title || model.title}. ${model.interpretation} ${model.rows.length} displayed data rows.`;
      dom['build-chart-button'].textContent = 'Update Chart';
      dom['export-png-button'].disabled = state.chartType === 'table';
      dom['export-config-button'].disabled = false;
      dom['export-csv-button'].disabled = false;
      dom['save-config-button'].disabled = false;
      clearBusy();
      const warningCount = model.warnings.length + model.exclusions.length;
      setStatus(`Chart built from ${model.rows.length} displayed rows${warningCount ? ` with ${warningCount} warning/exclusion item${warningCount === 1 ? '' : 's'}` : ''}.`, warningCount ? 'working' : 'success');
    } catch (error) {
      clearBusy();
      setStatus(`Chart not built: ${error.message}`, 'error');
      fireHostCallback('onError', error);
    }
  }

  function renderEvidence() {
    dom['interpretation-text'].textContent = currentModel.interpretation || 'No interpretation available.';
    dom['derived-rule'].textContent = currentModel.derivedRule || 'Not applicable.';
    dom['warning-list'].replaceChildren();
    const warnings = [...(currentModel.warnings || []), ...(currentModel.exclusions || []).map((item) => `Excluded: ${item}`)];
    if (!warnings.length) warnings.push('No warnings or exclusions for this chart.');
    warnings.forEach((warning) => {
      const item = document.createElement('li');
      item.textContent = warning;
      dom['warning-list'].appendChild(item);
    });
    evidenceSort = { key: '', direction: 'asc' };
    renderEvidenceTable();
  }

  function friendlyLabel(key) {
    return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (match) => match.toUpperCase());
  }

  function visibleEvidenceRows() {
    const rows = currentModel?.evidenceRows || [];
    const query = Core.normalizeKey(dom['evidence-search'].value);
    let output = rows.filter((row) => !query || Object.entries(row).some(([key, value]) => key !== '__technicalColumns' && Core.normalizeKey(Array.isArray(value) ? value.join(', ') : value).includes(query)));
    if (evidenceSort.key) {
      const { key, direction } = evidenceSort;
      output = output.slice().sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        const numeric = Number.isFinite(Number(av)) && Number.isFinite(Number(bv));
        const result = numeric ? Number(av) - Number(bv) : Core.text(av).localeCompare(Core.text(bv));
        return direction === 'asc' ? result : -result;
      });
    }
    return output;
  }

  function renderEvidenceTable() {
    if (!currentModel) return;
    renderStandaloneTable(visibleEvidenceRows(), dom['evidence-table-wrap'], dom['technical-view-toggle'].checked);
  }

  function renderStandaloneTable(rows, container, includeTechnical) {
    container.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'field-help';
      empty.textContent = 'No evidence rows match the current search.';
      container.appendChild(empty);
      return;
    }
    const technical = new Set(rows.flatMap((row) => row.__technicalColumns || []));
    const columns = [];
    rows.forEach((row) => Object.keys(row).forEach((key) => {
      if (key === '__technicalColumns' || columns.includes(key)) return;
      if (!includeTechnical && technical.has(key)) return;
      columns.push(key);
    }));

    const table = document.createElement('table');
    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach((column) => {
      const th = document.createElement('th');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'text-button';
      button.textContent = `${friendlyLabel(column)}${evidenceSort.key === column ? (evidenceSort.direction === 'asc' ? ' ↑' : ' ↓') : ''}`;
      button.addEventListener('click', () => {
        if (evidenceSort.key === column) evidenceSort.direction = evidenceSort.direction === 'asc' ? 'desc' : 'asc';
        else evidenceSort = { key: column, direction: 'asc' };
        renderEvidenceTable();
      });
      th.appendChild(button);
      headerRow.appendChild(th);
    });
    head.appendChild(headerRow);
    table.appendChild(head);

    const body = document.createElement('tbody');
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      columns.forEach((column) => {
        const td = document.createElement('td');
        const value = Array.isArray(row[column]) ? row[column].join(', ') : row[column];
        const status = Core.text(value).toUpperCase();
        if (Core.STATUS_ORDER.includes(status)) {
          const pill = document.createElement('span');
          pill.className = `status-pill status-${status.toLowerCase()}`;
          pill.textContent = status;
          td.appendChild(pill);
        } else {
          td.textContent = value === null || value === undefined ? '' : String(value);
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    container.appendChild(table);
  }

  async function saveCurrentConfig() {
    if (!normalizedData) return;
    const configState = captureState();
    const name = global.prompt('Saved chart name:', configState.title || 'Untitled chart');
    if (!name) return;
    await CCR.Storage.saveConfig(configState, name);
    await refreshSavedConfigs();
    setStatus(`Saved chart configuration: ${name}`, 'success');
  }

  async function refreshSavedConfigs(selectId) {
    savedConfigs = await CCR.Storage.listConfigs();
    fillSelect(dom['saved-config-select'], savedConfigs.map((row) => ({ id: row.id, label: row.name })), selectId || '', savedConfigs.length ? 'Choose a saved chart' : 'No saved charts');
    updateSavedButtons();
  }

  function updateSavedButtons() {
    const enabled = Boolean(dom['saved-config-select'].value);
    ['load-config-button', 'duplicate-config-button', 'rename-config-button', 'delete-config-button'].forEach((key) => { dom[key].disabled = !enabled; });
  }

  async function loadSelectedConfig() {
    const record = await CCR.Storage.getConfig(dom['saved-config-select'].value);
    if (!record) return;
    applyState(record.config, { resetTouched: true, refresh: true });
    setStatus(`Loaded saved configuration: ${record.name}. Press Build Chart to render it.`, 'success');
  }

  async function duplicateSelectedConfig() {
    const record = await CCR.Storage.getConfig(dom['saved-config-select'].value);
    if (!record) return;
    const name = global.prompt('Name for duplicated chart:', `${record.name} copy`);
    if (!name) return;
    const saved = await CCR.Storage.saveConfig(record.config, name);
    await refreshSavedConfigs(saved.id);
    setStatus(`Duplicated saved chart: ${name}`, 'success');
  }

  async function renameSelectedConfig() {
    const record = await CCR.Storage.getConfig(dom['saved-config-select'].value);
    if (!record) return;
    const name = global.prompt('Rename saved chart:', record.name);
    if (!name) return;
    const saved = await CCR.Storage.saveConfig(record.config, name, record.id);
    await refreshSavedConfigs(saved.id);
    setStatus(`Renamed saved chart to: ${name}`, 'success');
  }

  async function deleteSelectedConfig() {
    const record = await CCR.Storage.getConfig(dom['saved-config-select'].value);
    if (!record || !global.confirm(`Delete saved chart “${record.name}”?`)) return;
    await CCR.Storage.deleteConfig(record.id);
    await refreshSavedConfigs();
    setStatus(`Deleted saved chart: ${record.name}`, 'success');
  }

  async function clearSavedCharts() {
    if (!savedConfigs.length || !global.confirm('Clear all saved chart configurations from this browser? Loaded Cdash data will be retained.')) return;
    await CCR.Storage.clearConfigs();
    await refreshSavedConfigs();
    setStatus('All saved chart configurations were cleared.', 'success');
  }

  async function forgetLoadedData() {
    if (!normalizedData || !global.confirm('Forget the loaded Cdash data from this browser? Saved chart configurations will be retained.')) return;
    await CCR.Storage.forgetLastImport();
    normalizedData = null;
    rawData = null;
    pendingLastImport = null;
    enableBuilder(false);
    resetChartDisplay();
    dom['open-health-button'].disabled = true;
    dom['forget-data-button'].disabled = true;
    dom['dialog-restore-button'].classList.add('hidden');
    setStatus('Loaded data was forgotten. Choose Sample Data or load another export.', 'success');
    dom['start-dialog'].showModal?.();
  }

  async function exportPNG() {
    if (!currentModel) return;
    setBusy('Rendering 1600 × 900 PNG…');
    try {
      await CCR.Exporters.exportPNG(currentModel, captureState());
      clearBusy();
      setStatus('PNG export created at 1600 × 900.', 'success');
    } catch (error) {
      clearBusy();
      setStatus(`PNG export failed: ${error.message}`, 'error');
    }
  }

  function exportConfig() {
    if (!normalizedData) return;
    CCR.Exporters.exportConfiguration(captureState(), normalizedData.meta);
    setStatus('Versioned chart configuration JSON exported.', 'success');
  }

  function exportCSV() {
    if (!currentModel) return;
    try {
      const result = CCR.Exporters.exportCSV(currentModel.evidenceRows, state.title || currentModel.title);
      setStatus(`Filtered evidence CSV exported with ${result.rowCount} rows.`, 'success');
    } catch (error) {
      setStatus(`CSV export failed: ${error.message}`, 'error');
    }
  }

  async function importConfigFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const config = CCR.Exporters.validateConfigurationEnvelope(parsed);
      applyState(config, { resetTouched: true, refresh: true });
      setStatus(`Configuration imported from ${file.name}. Press Build Chart to render it.`, 'success');
    } catch (error) {
      setStatus(`Configuration import failed: ${error.message}`, 'error');
    }
  }

  function updateHealthSummary() {
    const health = normalizedData.health;
    dom['health-summary'].replaceChildren();
    [
      ['Products', health.products], ['Selected snapshots', health.snapshotsSelected], ['Accepted', health.accepted],
      ['Accepted with warnings', health.acceptedWithWarnings], ['Capability rows', health.capabilityRows], ['List rows', health.listRows],
      ['Missing capability cells', health.missingCapabilityRecords], ['Import warnings', health.warningCount]
    ].forEach(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'health-card';
      const strong = document.createElement('strong');
      strong.textContent = String(value);
      const span = document.createElement('span');
      span.textContent = label;
      card.append(strong, span);
      dom['health-summary'].appendChild(card);
    });
    dom['health-details'].replaceChildren();
    const summary = document.createElement('p');
    summary.textContent = `${normalizedData.categories.length} categories · ${normalizedData.tags.length} canonical display tags · ${health.futureDates} future-dated timeline items · ${health.invalidDates} invalid timeline dates.`;
    dom['health-details'].appendChild(summary);
    if (normalizedData.warnings.length) {
      const list = document.createElement('ul');
      normalizedData.warnings.forEach((warning) => {
        const item = document.createElement('li');
        item.textContent = warning;
        list.appendChild(item);
      });
      dom['health-details'].appendChild(list);
    } else {
      const clean = document.createElement('p');
      clean.textContent = 'No structural import warnings were detected.';
      dom['health-details'].appendChild(clean);
    }
  }

  function showHealthDialog() {
    updateHealthSummary();
    dom['health-dialog'].showModal?.();
  }

  function fireHostCallback(name, payload) {
    const callback = CCR.HostOptions?.[name];
    if (typeof callback === 'function') {
      try { callback(payload); } catch (_) { /* host callback errors do not break the tool */ }
    }
  }

  function getState() { return captureState(); }
  function getData() { return normalizedData; }

  CCR.UIController = {
    init,
    loadRawData,
    getState,
    getData
  };
})(window);
