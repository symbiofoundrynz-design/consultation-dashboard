(function (global) {
  'use strict';

  const CCR = global.CCRVisual = global.CCRVisual || {};
  const Core = CCR.Core;

  let chartInstance = null;
  let resizeHandler = null;

  function baseOption(title, subtitle) {
    return {
      backgroundColor: 'transparent',
      animationDuration: 450,
      color: Core.SERIES_COLORS,
      textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: '#eef4f8' },
      title: {
        text: title || '',
        subtext: subtitle || '',
        left: 18,
        top: 12,
        textStyle: { color: '#eef4f8', fontSize: 18, fontWeight: 700 },
        subtextStyle: { color: '#9fb0bf', fontSize: 11, lineHeight: 16 }
      },
      tooltip: {
        trigger: 'item',
        renderMode: 'richText',
        backgroundColor: '#0f1822',
        borderColor: '#314256',
        textStyle: { color: '#eef4f8' }
      },
      legend: {
        top: 68,
        textStyle: { color: '#b8c5d0' },
        pageTextStyle: { color: '#b8c5d0' }
      },
      aria: {
        enabled: true,
        decal: { show: true }
      }
    };
  }

  function dataZoomFor(count, horizontal) {
    if (count <= 14) return undefined;
    return horizontal
      ? [{ type: 'slider', yAxisIndex: 0, right: 4, width: 12, start: 0, end: Math.min(100, (14 / count) * 100) }, { type: 'inside', yAxisIndex: 0 }]
      : [{ type: 'slider', xAxisIndex: 0, bottom: 4, height: 14, start: 0, end: Math.min(100, (14 / count) * 100) }, { type: 'inside', xAxisIndex: 0 }];
  }

  function singleBarOption(model, state, horizontal) {
    const option = baseOption(state.title || model.title, state.subtitle || model.subtitle);
    const labels = model.rows.map((row) => row.label);
    const values = model.rows.map((row) => row.value);
    const statusColorData = model.shape === 'status-single'
      ? model.rows.map((row) => ({ value: row.value, itemStyle: { color: Core.STATUS_COLORS[row.status] || Core.SERIES_COLORS[0] } }))
      : values;

    option.grid = horizontal
      ? { left: 150, right: 32, top: 105, bottom: 40, containLabel: false }
      : { left: 60, right: 30, top: 105, bottom: 95, containLabel: true };
    option.xAxis = horizontal
      ? { type: 'value', name: model.valueLabel || '', axisLabel: { color: '#9fb0bf' }, splitLine: { lineStyle: { color: '#253547' } }, nameTextStyle: { color: '#9fb0bf' } }
      : { type: 'category', data: labels, axisLabel: { color: '#9fb0bf', rotate: labels.length > 8 ? 35 : 0, interval: 0 }, axisLine: { lineStyle: { color: '#314256' } } };
    option.yAxis = horizontal
      ? { type: 'category', inverse: false, data: labels, axisLabel: { color: '#c6d1da', width: 135, overflow: 'truncate' }, axisLine: { lineStyle: { color: '#314256' } } }
      : { type: 'value', name: model.valueLabel || '', axisLabel: { color: '#9fb0bf' }, splitLine: { lineStyle: { color: '#253547' } }, nameTextStyle: { color: '#9fb0bf' } };
    option.series = [{
      name: model.valueLabel || model.title,
      type: 'bar',
      data: statusColorData,
      barMaxWidth: 42,
      label: { show: model.rows.length <= 14, position: horizontal ? 'right' : 'top', color: '#d7e0e7', formatter: ({ value }) => Number.isFinite(Number(value)) ? Core.formatNumber(value, 1) : value },
      emphasis: { focus: 'series' }
    }];
    option.dataZoom = dataZoomFor(model.rows.length, horizontal);
    return option;
  }

  function multiBarOption(model, state, stacked) {
    const option = baseOption(state.title || model.title, state.subtitle || model.subtitle);
    const rows = model.rows;
    const labels = rows.map((row) => row.label);
    const seriesNames = model.series || [];
    option.grid = { left: 70, right: 30, top: 112, bottom: 95, containLabel: true };
    option.xAxis = { type: 'category', data: labels, axisLabel: { color: '#9fb0bf', rotate: labels.length > 8 ? 35 : 0, interval: 0 }, axisLine: { lineStyle: { color: '#314256' } } };
    option.yAxis = { type: 'value', axisLabel: { color: '#9fb0bf' }, splitLine: { lineStyle: { color: '#253547' } } };
    option.tooltip = { ...option.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } };
    option.series = seriesNames.map((name, index) => ({
      name,
      type: 'bar',
      stack: stacked ? 'total' : undefined,
      data: rows.map((row) => row[name] ?? 0),
      barMaxWidth: 38,
      itemStyle: { color: Core.STATUS_COLORS[name] || Core.SERIES_COLORS[index % Core.SERIES_COLORS.length] },
      emphasis: { focus: 'series' }
    }));
    option.dataZoom = dataZoomFor(rows.length, false);
    return option;
  }

  function pieOption(model, state, doughnut) {
    const option = baseOption(state.title || model.title, state.subtitle || model.subtitle);
    option.legend = { ...option.legend, orient: 'vertical', right: 20, top: 110, bottom: 20 };
    option.series = [{
      name: model.title,
      type: 'pie',
      radius: doughnut ? ['40%', '68%'] : '68%',
      center: ['42%', '57%'],
      avoidLabelOverlap: true,
      label: { color: '#d7e0e7', formatter: '{b}: {c} ({d}%)' },
      labelLine: { lineStyle: { color: '#748799' } },
      data: model.rows.map((row, index) => ({
        name: row.label,
        value: row.value,
        itemStyle: { color: Core.STATUS_COLORS[row.status] || Core.SERIES_COLORS[index % Core.SERIES_COLORS.length] }
      })),
      emphasis: { scale: true, scaleSize: 8 }
    }];
    return option;
  }

  function heatmapOption(model, state) {
    const option = baseOption(state.title || model.title, state.subtitle || model.subtitle);
    const statusValue = { NONE: 0, UNKNOWN: 1, NO: 2, LIMITED: 3, YES: 4 };
    const products = model.products;
    const capabilities = model.capabilities;
    const productIndex = new Map(products.map((label, index) => [label, index]));
    const capabilityIndex = new Map(capabilities.map((label, index) => [label, index]));
    option.grid = { left: 155, right: 48, top: 115, bottom: 105, containLabel: false };
    option.xAxis = {
      type: 'category', data: capabilities, splitArea: { show: true },
      axisLabel: { color: '#9fb0bf', rotate: 42, interval: 0, width: 110, overflow: 'truncate' }
    };
    option.yAxis = {
      type: 'category', data: products, splitArea: { show: true },
      axisLabel: { color: '#c6d1da', width: 135, overflow: 'truncate' }
    };
    option.visualMap = {
      type: 'piecewise',
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      pieces: Core.STATUS_ORDER.slice().reverse().map((status) => ({ value: statusValue[status], label: status, color: Core.STATUS_COLORS[status] }))
    };
    option.tooltip = {
      ...option.tooltip,
      formatter: (params) => {
        const row = params.data.raw;
        return `${row.product}\n${row.capability}: ${row.status}${row.note ? `\n${row.note}` : ''}`;
      }
    };
    option.series = [{
      name: 'Capability status',
      type: 'heatmap',
      data: model.rows.map((row) => ({
        value: [capabilityIndex.get(row.capability), productIndex.get(row.product), statusValue[row.status] ?? 1],
        raw: row
      })),
      label: { show: capabilities.length <= 18 && products.length <= 15, color: '#07100f', formatter: (params) => params.data.raw.status.slice(0, 1) },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,.55)' } }
    }];
    option.dataZoom = [
      ...(capabilities.length > 18 ? [{ type: 'slider', xAxisIndex: 0, bottom: 44, height: 14, start: 0, end: Math.min(100, (18 / capabilities.length) * 100) }, { type: 'inside', xAxisIndex: 0 }] : []),
      ...(products.length > 15 ? [{ type: 'slider', yAxisIndex: 0, right: 4, width: 12, start: 0, end: Math.min(100, (15 / products.length) * 100) }, { type: 'inside', yAxisIndex: 0 }] : [])
    ];
    return option;
  }

  function radarOption(model, state) {
    const option = baseOption(state.title || model.title, state.subtitle || model.subtitle);
    const axes = model.axes;
    const maxByAxis = {};
    axes.forEach((axis) => {
      maxByAxis[axis] = Math.max(1, ...model.rows.map((row) => Number(row[axis] || 0)));
    });
    option.legend = { ...option.legend, top: 90 };
    option.radar = {
      center: ['50%', '59%'], radius: '63%',
      indicator: axes.map((axis) => ({ name: axis.replace(' Facts', ''), max: maxByAxis[axis] })),
      axisName: { color: '#c6d1da', fontSize: 10 },
      splitLine: { lineStyle: { color: '#314256' } },
      splitArea: { areaStyle: { color: ['rgba(81,196,184,.02)', 'rgba(81,196,184,.06)'] } },
      axisLine: { lineStyle: { color: '#314256' } }
    };
    option.series = [{
      type: 'radar',
      data: model.rows.map((row) => ({ name: row.product, value: axes.map((axis) => Number(row[axis] || 0)) })),
      symbolSize: 5,
      lineStyle: { width: 2 },
      areaStyle: { opacity: .08 }
    }];
    return option;
  }

  function scatterOption(model, state) {
    const option = baseOption(state.title || model.title, state.subtitle || model.subtitle);
    option.grid = { left: 75, right: 40, top: 110, bottom: 70, containLabel: true };
    option.xAxis = {
      type: 'value', name: 'Confirmed capabilities (YES count)',
      nameLocation: 'middle', nameGap: 42, nameTextStyle: { color: '#9fb0bf' },
      axisLabel: { color: '#9fb0bf' }, splitLine: { lineStyle: { color: '#253547' } }
    };
    option.yAxis = {
      type: 'value', name: model.valueLabel || 'Entry price',
      nameLocation: 'middle', nameGap: 54, nameTextStyle: { color: '#9fb0bf' },
      axisLabel: { color: '#9fb0bf' }, splitLine: { lineStyle: { color: '#253547' } }
    };
    option.tooltip = {
      ...option.tooltip,
      formatter: (params) => {
        const row = params.data.raw;
        return `${row.product}\nConfirmed capabilities: ${row.confirmedCapabilities}\nEntry price: ${row.currency} ${Core.formatNumber(row.price)}\n${row.billingPeriod}`;
      }
    };
    option.series = [{
      name: 'Products',
      type: 'scatter',
      symbolSize: (value) => Math.max(11, Math.min(28, 11 + Math.sqrt(Math.max(0, value[0])))),
      data: model.rows.map((row) => ({ value: [row.confirmedCapabilities, row.price], name: row.product, raw: row })),
      label: { show: model.rows.length <= 12, formatter: (params) => params.data.name, position: 'top', color: '#d7e0e7' },
      emphasis: { focus: 'self', scale: 1.25 }
    }];
    return option;
  }

  function treemapOption(model, state) {
    const option = baseOption(state.title || model.title, state.subtitle || model.subtitle);
    option.tooltip = { ...option.tooltip, formatter: (params) => `${params.name}\n${model.valueLabel || 'Value'}: ${Core.formatNumber(params.value)}` };
    option.series = [{
      type: 'treemap',
      top: 100, left: 20, right: 20, bottom: 20,
      roam: false,
      nodeClick: false,
      breadcrumb: { show: false },
      label: { show: true, color: '#eef4f8', formatter: '{b}\n{c}' },
      upperLabel: { show: false },
      itemStyle: { borderColor: '#111a24', borderWidth: 2, gapWidth: 2 },
      data: model.rows.map((row) => ({ name: row.label, value: row.value }))
    }];
    return option;
  }

  function buildOption(model, state) {
    const type = state.chartType;
    if (type === 'vertical-bar') return singleBarOption(model, state, false);
    if (type === 'horizontal-bar') return singleBarOption(model, state, true);
    if (type === 'grouped-bar') return multiBarOption(model, state, false);
    if (type === 'stacked-bar') return multiBarOption(model, state, true);
    if (type === 'pie') return pieOption(model, state, false);
    if (type === 'doughnut') return pieOption(model, state, true);
    if (type === 'heatmap') return heatmapOption(model, state);
    if (type === 'radar') return radarOption(model, state);
    if (type === 'scatter') return scatterOption(model, state);
    if (type === 'treemap') return treemapOption(model, state);
    return null;
  }

  function dispose() {
    if (resizeHandler) global.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
    if (chartInstance) chartInstance.dispose();
    chartInstance = null;
  }

  function render(element, model, state) {
    dispose();
    if (!global.echarts) throw new Error('Apache ECharts is not loaded.');
    chartInstance = global.echarts.init(element, null, { renderer: 'canvas', useDirtyRect: true });
    const option = buildOption(model, state);
    if (!option) throw new Error(`Unsupported chart type: ${state.chartType}`);
    chartInstance.setOption(option, true);
    resizeHandler = Core.debounce(() => chartInstance?.resize(), 120);
    global.addEventListener('resize', resizeHandler);
    return { instance: chartInstance, option };
  }

  function current() {
    return chartInstance;
  }

  CCR.ChartBuilder = {
    buildOption,
    render,
    dispose,
    current
  };
})(window);
