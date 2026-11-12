(function (global) {
  'use strict';

  const CCR = global.CCRVisual = global.CCRVisual || {};
  const Core = CCR.Core;

  function configurationEnvelope(state, sourceMeta) {
    return {
      schema_version: Core.CONFIG_SCHEMA_VERSION,
      tool: Core.TOOL_ID,
      display_name: Core.DISPLAY_NAME,
      app_version: Core.APP_VERSION,
      exported_at: new Date().toISOString(),
      source: {
        name: sourceMeta?.sourceName || '',
        latest_snapshot_date: sourceMeta?.latestSnapshotDate || ''
      },
      configuration: Core.clone(state)
    };
  }

  function validateConfigurationEnvelope(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configuration file must contain a JSON object.');
    if (value.tool !== Core.TOOL_ID) throw new Error(`Unsupported configuration tool: ${Core.text(value.tool, 'missing')}`);
    if (Number(value.schema_version) !== Core.CONFIG_SCHEMA_VERSION) throw new Error(`Unsupported configuration schema version: ${Core.text(value.schema_version, 'missing')}`);
    if (!value.configuration || typeof value.configuration !== 'object') throw new Error('Configuration payload is missing.');
    return Core.clone(value.configuration);
  }

  function exportConfiguration(state, sourceMeta) {
    const envelope = configurationEnvelope(state, sourceMeta);
    const name = `${Core.slug(state.title || 'chart')}-configuration-v${Core.CONFIG_SCHEMA_VERSION}.json`;
    Core.downloadBlob(JSON.stringify(envelope, null, 2), 'application/json;charset=utf-8', name);
    return envelope;
  }

  function exportCSV(rows, title) {
    if (!Array.isArray(rows) || !rows.length) throw new Error('No evidence rows are available for CSV export.');
    const columns = [];
    rows.forEach((row) => Object.keys(row).forEach((key) => {
      if (key === '__technicalColumns' || !columns.includes(key)) columns.push(key);
    }));
    const lines = [columns.map(Core.csvEscape).join(',')];
    rows.forEach((row) => lines.push(columns.map((column) => Core.csvEscape(row[column])).join(',')));
    const fileName = `${Core.slug(title || 'chart')}-filtered-evidence.csv`;
    Core.downloadBlob('\ufeff' + lines.join('\r\n'), 'text/csv;charset=utf-8', fileName);
    return { columns, rowCount: rows.length };
  }

  function dataUrlToBlob(dataUrl) {
    const [header, body] = dataUrl.split(',');
    const mime = header.match(/data:([^;]+)/)?.[1] || 'image/png';
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function exportPNG(model, state) {
    if (!global.echarts) throw new Error('Apache ECharts is unavailable.');
    if (state.chartType === 'table') throw new Error('Table views cannot be exported as a chart PNG.');
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-10000px';
    host.style.top = '0';
    host.style.width = '1600px';
    host.style.height = '900px';
    host.style.background = '#111a24';
    document.body.appendChild(host);
    let chart;
    try {
      chart = global.echarts.init(host, null, { renderer: 'canvas', width: 1600, height: 900 });
      const option = CCR.ChartBuilder.buildOption(model, state);
      option.backgroundColor = '#111a24';
      chart.setOption(option, true);
      await new Promise((resolve) => setTimeout(resolve, 80));
      const dataUrl = chart.getDataURL({ type: 'png', pixelRatio: 1, backgroundColor: '#111a24', excludeComponents: ['toolbox'] });
      Core.downloadBlob(dataUrlToBlob(dataUrl), 'image/png', `${Core.slug(state.title || model.title || 'chart')}-1600x900.png`);
    } finally {
      chart?.dispose();
      host.remove();
    }
  }

  CCR.Exporters = {
    configurationEnvelope,
    validateConfigurationEnvelope,
    exportConfiguration,
    exportCSV,
    exportPNG
  };
})(window);
