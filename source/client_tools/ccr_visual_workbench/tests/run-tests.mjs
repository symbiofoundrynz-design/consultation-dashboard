import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
globalThis.window = globalThis;
globalThis.Blob = globalThis.Blob || class Blob {};

function load(relativePath) {
  const filePath = path.join(root, relativePath);
  vm.runInThisContext(fs.readFileSync(filePath, 'utf8'), { filename: filePath });
}

load('js/core.js');
load('js/data-adapter.js');
load('js/dataset-registry.js');
load('js/chart-builder.js');
load('js/exporters.js');

const sample = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/cdash-export-sample.json'), 'utf8'));
const data = CCRVisual.DataAdapter.normalize(sample, { sourceName: 'cdash-export-sample.json' });

assert.equal(data.products.length, 8, 'sample product count');
assert.equal(data.snapshots.length, 8, 'sample snapshot count');
assert.ok(data.capabilityRows.length > 100, 'capability rows loaded');
assert.ok(data.tags.length > 10, 'tags normalized');
assert.ok(data.products.every((product) => Array.isArray(product.tags)), 'tags converted to arrays');
assert.doesNotMatch(JSON.stringify(sample), /\.ts\.net\b/i, 'sample contains no private Tailscale URL');

const base = {
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

for (const preset of CCRVisual.DatasetRegistry.PRESETS) {
  const state = { ...base, ...preset.state };
  const model = CCRVisual.DatasetRegistry.prepare(data, state);
  assert.ok(model.rows.length > 0, `preset ${preset.id} returns rows`);
  if (state.chartType !== 'table') {
    const option = CCRVisual.ChartBuilder.buildOption(model, state);
    assert.ok(option && Array.isArray(option.series), `preset ${preset.id} builds ECharts option`);
  }
}

const chartCases = [
  ['vertical-bar', { dataset: 'products', measure: 'products_by_category', groupBy: 'Category' }],
  ['horizontal-bar', { dataset: 'research', measure: 'unknown_fact_count', groupBy: 'Product' }],
  ['pie', { dataset: 'products', measure: 'products_by_category', groupBy: 'Category' }],
  ['doughnut', { dataset: 'pricing', measure: 'free_tier_availability', groupBy: 'Status' }],
  ['treemap', { dataset: 'ecosystem', measure: 'tool_count', groupBy: 'Product' }],
  ['grouped-bar', { dataset: 'ecosystem', measure: 'tool_connector_counts', groupBy: 'Product' }],
  ['stacked-bar', { dataset: 'capabilities', measure: 'status_composition', groupBy: 'Product', section: 'Core Capability Facts' }],
  ['heatmap', { dataset: 'interfaces', measure: 'interface_matrix', groupBy: 'Product' }],
  ['radar', { dataset: 'capabilities', measure: 'section_profile', groupBy: 'Product', productIds: data.products.slice(0, 5).map((p) => p.id) }],
  ['scatter', { dataset: 'pricing', measure: 'entry_price_vs_capabilities', groupBy: 'Product' }]
];

for (const [chartType, patch] of chartCases) {
  const state = { ...base, ...patch, chartType };
  const model = CCRVisual.DatasetRegistry.prepare(data, state);
  assert.ok(model.rows.length > 0, `${chartType} has data`);
  const option = CCRVisual.ChartBuilder.buildOption(model, state);
  assert.ok(option && Array.isArray(option.series), `${chartType} option generated`);
}

const missingOptional = structuredClone(sample);
delete missingOptional.snapshot_list_items;
const missingOptionalData = CCRVisual.DataAdapter.normalize(missingOptional, { sourceName: 'missing-optional.json' });
assert.equal(missingOptionalData.listRows.length, 0, 'missing optional array accepted');
assert.ok(missingOptionalData.warnings.some((warning) => warning.includes('snapshot_list_items')), 'missing optional array reported');

const brokenJoin = structuredClone(sample);
brokenJoin.products[0].provider_id = 'missing-provider';
const brokenJoinData = CCRVisual.DataAdapter.normalize(brokenJoin, { sourceName: 'broken-join.json' });
assert.ok(brokenJoinData.warnings.some((warning) => warning.includes('missing provider')), 'broken provider join reported');

const malformedTags = structuredClone(sample);
malformedTags.products[0].tags = ' Chat, chat, , Research ';
const malformedTagData = CCRVisual.DataAdapter.normalize(malformedTags, { sourceName: 'malformed-tags.json' });
assert.deepEqual(malformedTagData.products[0].tags, ['Chat', 'Research'], 'tag trim, empty removal and case-insensitive dedupe');

const legacyPricing = structuredClone(sample);
const snapshotId = legacyPricing.snapshots[0].id;
legacyPricing.snapshot_pricing = legacyPricing.snapshot_pricing.filter((row) => !(row.snapshot_id === snapshotId && row.field.startsWith('Entry paid tier')));
legacyPricing.snapshot_pricing.push(
  { id: 900001, snapshot_id: snapshotId, field: 'Base paid tier price', value: '12.34' },
  { id: 900002, snapshot_id: snapshotId, field: 'Base paid tier currency', value: 'USD' },
  { id: 900003, snapshot_id: snapshotId, field: 'Base paid tier billing period', value: 'MONTHLY' }
);
const legacyData = CCRVisual.DataAdapter.normalize(legacyPricing, { sourceName: 'legacy-pricing.json' });
const legacyRow = legacyData.pricingRows.find((row) => row.snapshotId === snapshotId);
assert.equal(legacyRow.fields['Entry paid tier price'], '12.34', 'legacy Base paid tier alias normalized');

const validEnvelope = CCRVisual.Exporters.configurationEnvelope(base, data.meta);
assert.deepEqual(CCRVisual.Exporters.validateConfigurationEnvelope(validEnvelope), base, 'configuration round trip');
assert.throws(() => CCRVisual.Exporters.validateConfigurationEnvelope({ ...validEnvelope, schema_version: 999 }), /Unsupported configuration schema version/);

for (const [datasetKey, dataset] of Object.entries(CCRVisual.DatasetRegistry.DATASETS)) {
  for (const [measureKey, measure] of Object.entries(dataset.measures)) {
    const types = CCRVisual.DatasetRegistry.chartTypeCompatibility(datasetKey, measureKey);
    assert.ok(types.some((row) => row.enabled), `${datasetKey}/${measureKey} has compatible charts`);
    assert.deepEqual(types.filter((row) => row.enabled).map((row) => row.id).sort(), measure.charts.slice().sort(), `${datasetKey}/${measureKey} matrix matches definition`);
  }
}

const fullPath = process.env.FULL_EXPORT;
if (fullPath && fs.existsSync(fullPath)) {
  const full = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const fullData = CCRVisual.DataAdapter.normalize(full, { sourceName: path.basename(fullPath) });
  assert.equal(fullData.products.length, 22, 'full export product count');
  assert.equal(fullData.snapshots.length, 22, 'full export selected snapshot count');
  for (const preset of CCRVisual.DatasetRegistry.PRESETS) {
    const state = { ...base, ...preset.state };
    const model = CCRVisual.DatasetRegistry.prepare(fullData, state);
    assert.ok(model.rows.length > 0, `full export preset ${preset.id} returns rows`);
  }
  console.log(`Full export verified: ${fullData.products.length} products, ${fullData.capabilityRows.length} capabilities, ${fullData.listRows.length} list items.`);
}

console.log('All Graphs & Charts logic tests passed.');
