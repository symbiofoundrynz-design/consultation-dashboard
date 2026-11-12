(function (global) {
  'use strict';

  const CCR = global.CCRVisual = global.CCRVisual || {};

  const STATUS_ORDER = ['YES', 'LIMITED', 'NO', 'UNKNOWN', 'NONE'];
  const STATUS_COLORS = {
    YES: '#62c98d',
    LIMITED: '#f1bd5a',
    NO: '#dc6f78',
    UNKNOWN: '#9aa9b7',
    NONE: '#637588'
  };
  const SERIES_COLORS = ['#51c4b8', '#7aa2f7', '#c792ea', '#e5c07b', '#82aaff', '#f78c6c', '#89ddff', '#c3e88d', '#ffcb6b', '#f07178', '#b4f9f8', '#a6accd'];

  function text(value, fallback = '') {
    if (value === null || value === undefined) return fallback;
    return String(value).trim();
  }

  function normalizeKey(value) {
    return text(value).toLocaleLowerCase().replace(/\s+/g, ' ');
  }

  function uniqueLabels(values) {
    const seen = new Map();
    values.forEach((value) => {
      const cleaned = text(value);
      if (!cleaned) return;
      const key = normalizeKey(cleaned);
      if (!seen.has(key)) seen.set(key, cleaned);
    });
    return Array.from(seen.values());
  }

  function safeNumber(value) {
    const cleaned = text(value);
    if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }

  function toISODate(value) {
    const cleaned = text(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return null;
    const date = new Date(cleaned + 'T00:00:00Z');
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== cleaned) return null;
    return cleaned;
  }

  function classifyDate(value, referenceDate) {
    const cleaned = text(value);
    if (!cleaned || cleaned.toUpperCase() === 'UNKNOWN') return { kind: 'unknown', value: cleaned || 'UNKNOWN' };
    const iso = toISODate(cleaned);
    if (!iso) return { kind: 'invalid', value: cleaned };
    const ref = toISODate(referenceDate) || new Date().toISOString().slice(0, 10);
    return { kind: iso > ref ? 'future' : 'current_or_past', value: iso };
  }

  function initials(name) {
    const parts = text(name, '?').split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatNumber(value, maximumFractionDigits = 2) {
    if (!Number.isFinite(Number(value))) return text(value);
    return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(Number(value));
  }

  function formatPercent(value) {
    if (!Number.isFinite(Number(value))) return text(value);
    return `${Number(value).toFixed(1)}%`;
  }

  function slug(value) {
    return text(value, 'chart')
      .toLocaleLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'chart';
  }

  function csvEscape(value) {
    const raw = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  }

  function downloadBlob(content, mimeType, fileName) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function debounce(fn, delay = 160) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function sortRows(rows, sortMode, valueKey = 'value', labelKey = 'label') {
    const copy = rows.slice();
    copy.sort((a, b) => {
      if (sortMode === 'label-desc') return text(b[labelKey]).localeCompare(text(a[labelKey]));
      if (sortMode === 'label-asc') return text(a[labelKey]).localeCompare(text(b[labelKey]));
      const av = Number(a[valueKey]);
      const bv = Number(b[valueKey]);
      if (sortMode === 'value-asc') return av - bv || text(a[labelKey]).localeCompare(text(b[labelKey]));
      return bv - av || text(a[labelKey]).localeCompare(text(b[labelKey]));
    });
    return copy;
  }

  CCR.Core = {
    APP_VERSION: '1.0.1',
    CONFIG_SCHEMA_VERSION: 1,
    TOOL_ID: 'ccr_visual_workbench',
    DISPLAY_NAME: 'Graphs & Charts',
    STATUS_ORDER,
    STATUS_COLORS,
    SERIES_COLORS,
    text,
    normalizeKey,
    uniqueLabels,
    safeNumber,
    toISODate,
    classifyDate,
    initials,
    formatNumber,
    formatPercent,
    slug,
    csvEscape,
    downloadBlob,
    clone,
    debounce,
    sortRows
  };
})(window);
