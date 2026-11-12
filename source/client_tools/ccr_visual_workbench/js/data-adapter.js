(function (global) {
  'use strict';

  const CCR = global.CCRVisual = global.CCRVisual || {};
  const Core = CCR.Core;

  const REQUIRED_ARRAYS = ['providers', 'products', 'snapshots'];
  const OPTIONAL_ARRAYS = ['primers', 'test_runs', 'test_run_products', 'snapshot_pricing', 'snapshot_facts', 'snapshot_list_items'];
  const ALLOWED_STATUSES = new Set(Core.STATUS_ORDER);
  const PRICING_ALIASES = {
    'base paid tier available': 'Entry paid tier available',
    'base paid tier name': 'Entry paid tier name',
    'base paid tier price': 'Entry paid tier price',
    'base paid tier currency': 'Entry paid tier currency',
    'base paid tier billing period': 'Entry paid tier billing period'
  };

  function requireObject(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('The selected file is not a Cdash JSON object.');
    }
  }

  function ensureArrays(raw, warnings) {
    REQUIRED_ARRAYS.forEach((key) => {
      if (!Array.isArray(raw[key])) throw new Error(`Required array missing: ${key}`);
    });
    OPTIONAL_ARRAYS.forEach((key) => {
      if (!Array.isArray(raw[key])) {
        raw[key] = [];
        warnings.push(`Optional array missing and treated as empty: ${key}`);
      }
    });
  }

  function normalizeTags(value, warnings, productName) {
    const parts = Array.isArray(value) ? value : Core.text(value).split(',');
    const output = [];
    const seen = new Set();
    parts.forEach((part) => {
      const label = Core.text(part);
      if (!label) return;
      const key = Core.normalizeKey(label);
      if (seen.has(key)) {
        warnings.push(`Duplicate tag ignored for ${productName}: ${label}`);
        return;
      }
      seen.add(key);
      output.push(label);
    });
    return output;
  }

  function sortSnapshotsDescending(a, b) {
    const ad = Core.text(a.snapshotDate ?? a.snapshot_date);
    const bd = Core.text(b.snapshotDate ?? b.snapshot_date);
    if (ad !== bd) return bd.localeCompare(ad);
    return Core.text(b.acceptedAt ?? b.accepted_at).localeCompare(Core.text(a.acceptedAt ?? a.accepted_at));
  }

  function selectCurrentSnapshot(candidates) {
    const accepted = candidates.filter((row) => Core.normalizeKey(row.parserStatus ?? row.parser_status) === 'accepted').sort(sortSnapshotsDescending);
    if (accepted.length) return accepted[0];
    const warnings = candidates.filter((row) => Core.normalizeKey(row.parserStatus ?? row.parser_status) === 'accepted with warnings').sort(sortSnapshotsDescending);
    if (warnings.length) return warnings[0];
    return null;
  }

  function normalize(rawInput, options = {}) {
    const sourceName = Core.text(options.sourceName, 'Cdash export');
    const raw = Core.clone(rawInput);
    const warnings = [];
    requireObject(raw);
    ensureArrays(raw, warnings);

    const providerById = new Map();
    const providers = raw.providers.map((row, index) => {
      const provider = {
        id: Core.text(row.id, `provider-${index + 1}`),
        name: Core.text(row.name, 'Unnamed provider'),
        website: Core.text(row.website),
        logoPath: Core.text(row.logo_path),
        status: Core.text(row.status, 'Unknown')
      };
      if (providerById.has(provider.id)) warnings.push(`Duplicate provider ID: ${provider.id}`);
      providerById.set(provider.id, provider);
      return provider;
    });

    const productById = new Map();
    const products = raw.products.map((row, index) => {
      const name = Core.text(row.name, `Unnamed product ${index + 1}`);
      const providerId = Core.text(row.provider_id);
      const product = {
        id: Core.text(row.id, `product-${index + 1}`),
        providerId,
        providerName: providerById.get(providerId)?.name || 'Unknown provider',
        name,
        website: Core.text(row.website),
        logoPath: Core.text(row.logo_path),
        status: Core.text(row.status, 'Unknown'),
        category: Core.text(row.category, 'Uncategorised'),
        tags: normalizeTags(row.tags, warnings, name)
      };
      if (!providerById.has(providerId)) warnings.push(`Product ${name} references missing provider: ${providerId || '(blank)'}`);
      if (productById.has(product.id)) warnings.push(`Duplicate product ID: ${product.id}`);
      productById.set(product.id, product);
      return product;
    });

    const snapshotsByProduct = new Map();
    const snapshotById = new Map();
    raw.snapshots.forEach((row) => {
      const snapshot = {
        id: Core.text(row.id),
        productId: Core.text(row.product_id),
        snapshotDate: Core.text(row.snapshot_date),
        parserStatus: Core.text(row.parser_status, 'Unknown'),
        acceptedAt: Core.text(row.accepted_at),
        rawMarkdown: Core.text(row.raw_markdown)
      };
      snapshotById.set(snapshot.id, snapshot);
      if (!productById.has(snapshot.productId)) warnings.push(`Snapshot ${snapshot.id} references missing product: ${snapshot.productId}`);
      if (!snapshotsByProduct.has(snapshot.productId)) snapshotsByProduct.set(snapshot.productId, []);
      snapshotsByProduct.get(snapshot.productId).push(snapshot);
    });

    const currentSnapshotByProduct = new Map();
    let acceptedCount = 0;
    let acceptedWithWarningsCount = 0;
    products.forEach((product) => {
      const current = selectCurrentSnapshot(snapshotsByProduct.get(product.id) || []);
      if (!current) {
        warnings.push(`No accepted snapshot available for ${product.name}`);
        return;
      }
      currentSnapshotByProduct.set(product.id, current);
      const status = Core.normalizeKey(current.parserStatus);
      if (status === 'accepted') acceptedCount += 1;
      else if (status === 'accepted with warnings') acceptedWithWarningsCount += 1;
    });

    const activeSnapshotIds = new Set(Array.from(currentSnapshotByProduct.values()).map((row) => row.id));
    const productIdBySnapshotId = new Map(Array.from(currentSnapshotByProduct.entries()).map(([productId, snapshot]) => [snapshot.id, productId]));

    const pricingMapBySnapshot = new Map();
    raw.snapshot_pricing.forEach((row) => {
      const snapshotId = Core.text(row.snapshot_id);
      if (!snapshotById.has(snapshotId)) warnings.push(`Pricing row ${row.id ?? '(no id)'} references missing snapshot: ${snapshotId}`);
      if (!activeSnapshotIds.has(snapshotId)) return;
      const originalField = Core.text(row.field);
      const field = PRICING_ALIASES[Core.normalizeKey(originalField)] || originalField;
      if (!pricingMapBySnapshot.has(snapshotId)) pricingMapBySnapshot.set(snapshotId, {});
      const map = pricingMapBySnapshot.get(snapshotId);
      if (Object.prototype.hasOwnProperty.call(map, field)) warnings.push(`Duplicate pricing field retained last value: ${snapshotId} / ${field}`);
      map[field] = Core.text(row.value);
    });

    const pricingRows = [];
    currentSnapshotByProduct.forEach((snapshot, productId) => {
      const product = productById.get(productId);
      pricingRows.push({
        productId,
        productName: product.name,
        providerName: product.providerName,
        category: product.category,
        tags: product.tags.slice(),
        snapshotId: snapshot.id,
        snapshotDate: snapshot.snapshotDate,
        parserStatus: snapshot.parserStatus,
        fields: pricingMapBySnapshot.get(snapshot.id) || {}
      });
    });

    const capabilityRows = [];
    raw.snapshot_facts.forEach((row) => {
      const snapshotId = Core.text(row.snapshot_id);
      if (!snapshotById.has(snapshotId)) warnings.push(`Capability row ${row.id ?? '(no id)'} references missing snapshot: ${snapshotId}`);
      if (!activeSnapshotIds.has(snapshotId)) return;
      const productId = productIdBySnapshotId.get(snapshotId);
      const product = productById.get(productId);
      let available = Core.text(row.available, 'UNKNOWN').toUpperCase();
      if (!ALLOWED_STATUSES.has(available)) {
        warnings.push(`Unsupported capability status changed to UNKNOWN: ${product.name} / ${row.capability} / ${available}`);
        available = 'UNKNOWN';
      }
      capabilityRows.push({
        id: row.id,
        productId,
        productName: product.name,
        providerName: product.providerName,
        category: product.category,
        tags: product.tags.slice(),
        snapshotId,
        snapshotDate: currentSnapshotByProduct.get(productId).snapshotDate,
        section: Core.text(row.section, 'Uncategorised facts'),
        capability: Core.text(row.capability, 'Unnamed capability'),
        available,
        note: Core.text(row.note),
        reviewFlag: Core.text(row.review_flag, 'UNKNOWN')
      });
    });

    const listRows = [];
    raw.snapshot_list_items.forEach((row) => {
      const snapshotId = Core.text(row.snapshot_id);
      if (!snapshotById.has(snapshotId)) warnings.push(`List row ${row.id ?? '(no id)'} references missing snapshot: ${snapshotId}`);
      if (!activeSnapshotIds.has(snapshotId)) return;
      const productId = productIdBySnapshotId.get(snapshotId);
      const product = productById.get(productId);
      const snapshot = currentSnapshotByProduct.get(productId);
      const dateCandidate = Core.text(row.type).toLowerCase() === 'date' ? Core.text(row.name) : '';
      listRows.push({
        id: row.id,
        productId,
        productName: product.name,
        providerName: product.providerName,
        category: product.category,
        tags: product.tags.slice(),
        snapshotId,
        snapshotDate: snapshot.snapshotDate,
        listType: Core.text(row.list_type, 'Unknown'),
        name: Core.text(row.name),
        type: Core.text(row.type),
        purpose: Core.text(row.purpose),
        accessOrStatus: Core.text(row.access_or_status),
        note: Core.text(row.note),
        dateClass: dateCandidate ? Core.classifyDate(dateCandidate, snapshot.snapshotDate) : null
      });
    });

    const sections = Core.uniqueLabels(capabilityRows.map((row) => row.section));
    const allCapabilities = Core.uniqueLabels(capabilityRows.filter((row) => row.section !== 'Interfaces').map((row) => row.capability));
    const expectedBySection = new Map();
    capabilityRows.forEach((row) => {
      if (!expectedBySection.has(row.section)) expectedBySection.set(row.section, new Set());
      expectedBySection.get(row.section).add(row.capability);
    });
    let missingCapabilityRecords = 0;
    currentSnapshotByProduct.forEach((snapshot, productId) => {
      expectedBySection.forEach((capabilities, section) => {
        const present = new Set(capabilityRows.filter((row) => row.productId === productId && row.section === section).map((row) => row.capability));
        capabilities.forEach((capability) => {
          if (!present.has(capability)) missingCapabilityRecords += 1;
        });
      });
    });

    const futureDates = listRows.filter((row) => row.dateClass?.kind === 'future').length;
    const invalidDates = listRows.filter((row) => row.dateClass?.kind === 'invalid').length;
    const reviewWarnings = capabilityRows.filter((row) => Core.normalizeKey(row.reviewFlag) !== 'ok').length;
    const categories = Core.uniqueLabels(products.map((row) => row.category)).sort((a, b) => a.localeCompare(b));
    const tags = Core.uniqueLabels(products.flatMap((row) => row.tags)).sort((a, b) => a.localeCompare(b));
    const latestSnapshotDate = Array.from(currentSnapshotByProduct.values()).map((row) => row.snapshotDate).filter(Core.toISODate).sort().at(-1) || '';

    const health = {
      providers: providers.length,
      products: products.length,
      snapshotsSelected: currentSnapshotByProduct.size,
      accepted: acceptedCount,
      acceptedWithWarnings: acceptedWithWarningsCount,
      productsWithoutSnapshot: products.length - currentSnapshotByProduct.size,
      pricingRows: raw.snapshot_pricing.filter((row) => activeSnapshotIds.has(Core.text(row.snapshot_id))).length,
      capabilityRows: capabilityRows.length,
      listRows: listRows.length,
      missingCapabilityRecords,
      futureDates,
      invalidDates,
      reviewWarnings,
      warningCount: warnings.length
    };

    return {
      meta: {
        sourceName,
        importedAt: new Date().toISOString(),
        latestSnapshotDate,
        schemaHint: products.some((row) => row.category && row.tags.length) ? 'category-tags' : 'legacy'
      },
      providers,
      products,
      snapshots: Array.from(currentSnapshotByProduct.values()),
      pricingRows,
      capabilityRows,
      listRows,
      categories,
      tags,
      sections,
      allCapabilities,
      health,
      warnings,
      indexes: {
        providerById,
        productById,
        currentSnapshotByProduct
      }
    };
  }

  CCR.DataAdapter = {
    normalize,
    PRICING_ALIASES
  };
})(window);
