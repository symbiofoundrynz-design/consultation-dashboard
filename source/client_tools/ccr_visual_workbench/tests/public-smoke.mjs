import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
globalThis.window = globalThis;
for (const file of ['js/core.js', 'js/data-adapter.js', 'js/dataset-registry.js', 'js/chart-builder.js']) {
  const filename=path.join(root,file);
  vm.runInThisContext(fs.readFileSync(filename,'utf8'), {filename});
}
const raw=JSON.parse(fs.readFileSync(path.join(root,'fixtures/cdash-export-sample.json'),'utf8'));
assert.equal(raw.providers.length,2);
assert.equal(raw.products.length,8);
assert.equal(raw.snapshots.length,8);
assert.equal(raw.snapshot_facts.length,160);
const normal=CCRVisual.DataAdapter.normalize(raw,{sourceName:'synthetic-public-sample'});
assert.equal(normal.products.length,8);
assert.ok(normal.capabilityRows.length>=150);
console.log('PUBLIC DEMO SMOKE TEST PASS');
