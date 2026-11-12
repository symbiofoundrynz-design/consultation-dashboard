(function (global) {
  'use strict';

  const CCR = global.CCRVisual = global.CCRVisual || {};
  const Core = CCR.Core;

  const CHART_TYPES = {
    'vertical-bar': { label: 'Vertical bar' },
    'horizontal-bar': { label: 'Horizontal bar' },
    'grouped-bar': { label: 'Grouped bar' },
    'stacked-bar': { label: 'Stacked bar' },
    pie: { label: 'Pie' },
    doughnut: { label: 'Doughnut' },
    heatmap: { label: 'Heatmap' },
    radar: { label: 'Radar' },
    scatter: { label: 'Scatter' },
    treemap: { label: 'Treemap' },
    table: { label: 'Table' }
  };

  const DATASETS = {
    products: {
      label: 'Product registry',
      help: 'Organisational metadata: products, providers, categories and tags. Categories and tags are filters, not evidence of capability.',
      groups: ['Category', 'Provider', 'Tag'],
      measures: {
        products_by_category: {
          label: 'Products by category',
          help: 'Count of selected products in each editorial category.',
          charts: ['vertical-bar', 'horizontal-bar', 'pie', 'doughnut', 'treemap', 'table'],
          partToWhole: true
        },
        products_by_provider: {
          label: 'Products by provider',
          help: 'Count of selected products joined to each provider.',
          charts: ['vertical-bar', 'horizontal-bar', 'pie', 'doughnut', 'treemap', 'table'],
          partToWhole: true
        },
        tag_frequency: {
          label: 'Tag frequency',
          help: 'Number of selected products carrying each editorial tag.',
          charts: ['vertical-bar', 'horizontal-bar', 'pie', 'doughnut', 'treemap', 'table'],
          partToWhole: true
        }
      }
    },
    pricing: {
      label: 'Pricing',
      help: 'Pricing facts from the current selected snapshot. Numeric comparisons are restricted to matching currency and billing basis.',
      groups: ['Product', 'Category', 'Provider'],
      measures: {
        entry_price: {
          label: 'Entry paid tier price',
          help: 'Numeric Entry paid tier price using one matching currency and billing basis.',
          charts: ['vertical-bar', 'horizontal-bar', 'scatter', 'table'],
          pricingBasis: true
        },
        tier_price_comparison: {
          label: 'Entry / mid / pro tier prices',
          help: 'Grouped comparison of numeric Entry, Mid and Pro prices on one matching basis.',
          charts: ['grouped-bar', 'table'],
          pricingBasis: true
        },
        free_tier_availability: {
          label: 'Free tier availability',
          help: 'Composition of YES, NO and UNKNOWN free-tier records.',
          charts: ['vertical-bar', 'horizontal-bar', 'pie', 'doughnut', 'table'],
          partToWhole: true
        },
        business_tier_availability: {
          label: 'Business tier availability',
          help: 'Composition of Team or business tier availability.',
          charts: ['vertical-bar', 'horizontal-bar', 'pie', 'doughnut', 'table'],
          partToWhole: true
        },
        enterprise_availability: {
          label: 'Enterprise tier availability',
          help: 'Composition of enterprise availability.',
          charts: ['vertical-bar', 'horizontal-bar', 'pie', 'doughnut', 'table'],
          partToWhole: true
        },
        api_pricing_availability: {
          label: 'Usage-based API pricing',
          help: 'Composition of published usage-based API pricing availability.',
          charts: ['vertical-bar', 'horizontal-bar', 'pie', 'doughnut', 'table'],
          partToWhole: true
        },
        entry_price_vs_capabilities: {
          label: 'Entry price vs confirmed capabilities',
          help: 'Scatter plot of numeric entry price against YES capability count. This is descriptive, not a recommendation score.',
          charts: ['scatter', 'table'],
          pricingBasis: true
        }
      }
    },
    capabilities: {
      label: 'Capability facts',
      help: 'Verified capability statuses from current snapshots. Categories and tags only narrow the product set.',
      groups: ['Product', 'Category', 'Provider'],
      measures: {
        yes_count: {
          label: 'Confirmed capability count',
          help: 'Count of facts marked YES in the selected section.',
          charts: ['vertical-bar', 'horizontal-bar', 'treemap', 'table']
        },
        yes_limited_count: {
          label: 'Available in some form',
          help: 'Count of facts marked YES or LIMITED in the selected section.',
          charts: ['vertical-bar', 'horizontal-bar', 'treemap', 'table']
        },
        status_composition: {
          label: 'Status composition',
          help: 'Separate YES, LIMITED, NO, UNKNOWN and NONE counts. No weighted score is applied.',
          charts: ['stacked-bar', 'grouped-bar', 'table']
        },
        known_percentage: {
          label: 'Known-data percentage',
          help: 'Known statuses divided by all researched facts in the selected section. UNKNOWN is the only unknown status.',
          charts: ['vertical-bar', 'horizontal-bar', 'table']
        },
        capability_matrix: {
          label: 'Capability matrix',
          help: 'Product-by-capability status heatmap for the selected section.',
          charts: ['heatmap', 'table']
        },
        section_profile: {
          label: 'Section capability profile',
          help: 'YES + LIMITED count across capability sections for up to five products.',
          charts: ['radar', 'table']
        }
      }
    },
    interfaces: {
      label: 'Platforms and interfaces',
      help: 'Interface facts from the Interfaces section, including desktop, mobile, browser, command-line and API access.',
      groups: ['Product', 'Category', 'Provider'],
      measures: {
        interface_matrix: {
          label: 'Platform support matrix',
          help: 'Product-by-interface status heatmap.',
          charts: ['heatmap', 'table']
        },
        interface_yes_count: {
          label: 'Confirmed interface count',
          help: 'Count of interface facts marked YES.',
          charts: ['vertical-bar', 'horizontal-bar', 'treemap', 'table']
        },
        interface_status_composition: {
          label: 'Interface status composition',
          help: 'Separate interface YES, LIMITED, NO, UNKNOWN and NONE counts.',
          charts: ['stacked-bar', 'grouped-bar', 'table']
        }
      }
    },
    ecosystem: {
      label: 'Tools and connectors',
      help: 'Counts of researched tool and connector list items. Counts reflect catalogue breadth, not suitability or quality.',
      groups: ['Product', 'Category', 'Provider'],
      measures: {
        tool_count: {
          label: 'Tools per product',
          help: 'Count of list items with type Tool.',
          charts: ['vertical-bar', 'horizontal-bar', 'treemap', 'table']
        },
        connector_count: {
          label: 'Connectors per product',
          help: 'Count of list items with type Connector.',
          charts: ['vertical-bar', 'horizontal-bar', 'treemap', 'table']
        },
        tool_connector_counts: {
          label: 'Tools and connectors per product',
          help: 'Grouped count of tool and connector list items.',
          charts: ['grouped-bar', 'stacked-bar', 'table']
        }
      }
    },
    research: {
      label: 'Research quality',
      help: 'Completeness, parser status and timeline diagnostics. These measures describe the evidence record, not the product.',
      groups: ['Product', 'Category', 'Provider'],
      measures: {
        unknown_fact_count: {
          label: 'Unknown facts by product',
          help: 'Count of capability facts marked UNKNOWN.',
          charts: ['vertical-bar', 'horizontal-bar', 'treemap', 'table']
        },
        known_percentage: {
          label: 'Research coverage',
          help: 'Percentage of capability facts that are not UNKNOWN.',
          charts: ['vertical-bar', 'horizontal-bar', 'table']
        },
        snapshot_age: {
          label: 'Snapshot age within export',
          help: 'Days between each product snapshot and the latest selected snapshot date in the export.',
          charts: ['vertical-bar', 'horizontal-bar', 'table']
        },
        parser_status: {
          label: 'Snapshot parser status',
          help: 'Composition of Accepted and Accepted with warnings snapshots.',
          charts: ['vertical-bar', 'horizontal-bar', 'pie', 'doughnut', 'table'],
          partToWhole: true
        },
        timeline_quality: {
          label: 'Timeline date quality',
          help: 'Count of current/past, future, unknown and invalid recent-change dates.',
          charts: ['vertical-bar', 'horizontal-bar', 'pie', 'doughnut', 'table'],
          partToWhole: true
        }
      }
    }
  };

  const PRESETS = [
    {
      id: 'products-by-category',
      label: 'Products by category',
      description: 'Shows the current catalogue shape using editorial categories.',
      state: { dataset: 'products', measure: 'products_by_category', groupBy: 'Category', chartType: 'horizontal-bar', sort: 'value-desc' }
    },
    {
      id: 'entry-monthly-price',
      label: 'Entry monthly price comparison',
      description: 'Compares like-for-like numeric entry prices on one currency and billing basis.',
      state: { dataset: 'pricing', measure: 'entry_price', groupBy: 'Product', chartType: 'horizontal-bar', sort: 'value-asc' }
    },
    {
      id: 'capability-status',
      label: 'Capability status comparison',
      description: 'Separates YES, LIMITED, NO and UNKNOWN facts by product.',
      state: { dataset: 'capabilities', measure: 'status_composition', groupBy: 'Product', chartType: 'stacked-bar', sort: 'value-desc', section: 'Core Capability Facts' }
    },
    {
      id: 'platform-support',
      label: 'Platform support heatmap',
      description: 'Shows interface support status across selected products.',
      state: { dataset: 'interfaces', measure: 'interface_matrix', groupBy: 'Product', chartType: 'heatmap', sort: 'label-asc' }
    },
    {
      id: 'tools-connectors',
      label: 'Tools and connectors by product',
      description: 'Compares researched ecosystem breadth without treating count as quality.',
      state: { dataset: 'ecosystem', measure: 'tool_connector_counts', groupBy: 'Product', chartType: 'grouped-bar', sort: 'value-desc' }
    },
    {
      id: 'research-unknowns',
      label: 'Research unknowns by product',
      description: 'Highlights products with the largest number of unresolved capability facts.',
      state: { dataset: 'research', measure: 'unknown_fact_count', groupBy: 'Product', chartType: 'horizontal-bar', sort: 'value-desc' }
    }
  ];


  function groupsFor(datasetKey, measureKey) {
    if (datasetKey === 'products') {
      if (measureKey === 'products_by_category') return ['Category'];
      if (measureKey === 'products_by_provider') return ['Provider'];
      return ['Tag'];
    }
    if (datasetKey === 'pricing') {
      if (['entry_price', 'tier_price_comparison', 'entry_price_vs_capabilities'].includes(measureKey)) return ['Product'];
      return ['Status'];
    }
    return ['Product', 'Category', 'Provider'];
  }

  function selectedProducts(data, state) {
    let products = data.products.slice();
    const providerSet = new Set(state.providerIds || []);
    const categorySet = new Set((state.categories || []).map(Core.normalizeKey));
    const hasExplicitProductSelection = Array.isArray(state.productIds);
    const productSet = new Set(state.productIds || []);
    const selectedTagKeys = (state.tags || []).map(Core.normalizeKey);

    if (providerSet.size) products = products.filter((row) => providerSet.has(row.providerId));
    if (categorySet.size) products = products.filter((row) => categorySet.has(Core.normalizeKey(row.category)));
    if (selectedTagKeys.length) {
      products = products.filter((row) => {
        const keys = new Set(row.tags.map(Core.normalizeKey));
        return state.tagMatch === 'all'
          ? selectedTagKeys.every((key) => keys.has(key))
          : selectedTagKeys.some((key) => keys.has(key));
      });
    }
    if (hasExplicitProductSelection) products = products.filter((row) => productSet.has(row.id));
    return products;
  }

  function groupLabel(product, groupBy) {
    if (groupBy === 'Provider') return product.providerName;
    if (groupBy === 'Category') return product.category;
    return product.name;
  }

  function aggregateSimple(rows, groupBy, valueAccessor) {
    const map = new Map();
    rows.forEach((row) => {
      const label = groupLabel(row.product, groupBy);
      const value = valueAccessor(row);
      map.set(label, (map.get(label) || 0) + value);
    });
    return Array.from(map, ([label, value]) => ({ label, value }));
  }

  function statusCounts(values) {
    const counts = Object.fromEntries(Core.STATUS_ORDER.map((status) => [status, 0]));
    values.forEach((value) => {
      const status = Core.text(value, 'UNKNOWN').toUpperCase();
      counts[Core.STATUS_ORDER.includes(status) ? status : 'UNKNOWN'] += 1;
    });
    return counts;
  }

  function priceFieldPrefix(measure) {
    if (measure === 'entry_price' || measure === 'entry_price_vs_capabilities') return 'Entry paid tier';
    return 'Entry paid tier';
  }

  function billingKey(currency, period) {
    return `${Core.text(currency, 'UNKNOWN')}|||${Core.text(period, 'UNKNOWN')}`;
  }

  function pricingBasisOptions(data, state, products) {
    const productIds = new Set(products.map((row) => row.id));
    const measure = state.measure;
    const prefixes = measure === 'tier_price_comparison'
      ? ['Entry paid tier', 'Mid paid tier', 'Pro paid tier']
      : [priceFieldPrefix(measure)];
    const counts = new Map();
    data.pricingRows.filter((row) => productIds.has(row.productId)).forEach((row) => {
      prefixes.forEach((prefix) => {
        const price = Core.safeNumber(row.fields[`${prefix} price`]);
        const currency = row.fields[`${prefix} currency`];
        const period = row.fields[`${prefix} billing period`];
        if (price === null || !Core.text(currency) || !Core.text(period)) return;
        const key = billingKey(currency, period);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });
    return Array.from(counts, ([key, count]) => {
      const [currency, period] = key.split('|||');
      return { key, currency, period, count, label: `${currency} · ${period} (${count})` };
    }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  function createEvidenceRows(rows, technicalColumns) {
    return rows.map((row) => ({ ...row, __technicalColumns: technicalColumns || [] }));
  }

  function prepareProducts(data, state, products) {
    const warnings = [];
    let rows = [];
    if (state.measure === 'products_by_category') {
      const map = new Map();
      products.forEach((product) => map.set(product.category, (map.get(product.category) || 0) + 1));
      rows = Array.from(map, ([label, value]) => ({ label, value, category: label, productCount: value }));
    } else if (state.measure === 'products_by_provider') {
      const map = new Map();
      products.forEach((product) => map.set(product.providerName, (map.get(product.providerName) || 0) + 1));
      rows = Array.from(map, ([label, value]) => ({ label, value, provider: label, productCount: value }));
    } else {
      const map = new Map();
      products.forEach((product) => product.tags.forEach((tag) => map.set(tag, (map.get(tag) || 0) + 1)));
      rows = Array.from(map, ([label, value]) => ({ label, value, tag: label, productCount: value }));
    }
    rows = Core.sortRows(rows, state.sort);
    return {
      shape: 'single', rows, evidenceRows: createEvidenceRows(rows), warnings,
      valueLabel: 'Products',
      title: DATASETS.products.measures[state.measure].label,
      subtitle: `${products.length} selected products · editorial organisation metadata`,
      interpretation: `This chart describes how ${products.length} selected products are organised. Category and tag labels are navigation metadata, not verified capability evidence.`,
      derivedRule: 'Derived measure: count of selected product records in each displayed group.'
    };
  }

  function prepareAvailability(data, state, products, field, title) {
    const productIds = new Set(products.map((row) => row.id));
    const source = data.pricingRows.filter((row) => productIds.has(row.productId));
    const counts = statusCounts(source.map((row) => row.fields[field] || 'UNKNOWN'));
    const rows = Core.STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => ({
      label: status,
      value: counts[status],
      status,
      productCount: counts[status]
    }));
    return {
      shape: 'status-single', rows, evidenceRows: createEvidenceRows(source.map((row) => ({
        product: row.productName,
        provider: row.providerName,
        category: row.category,
        status: Core.text(row.fields[field], 'UNKNOWN').toUpperCase(),
        snapshotDate: row.snapshotDate,
        productId: row.productId,
        snapshotId: row.snapshotId
      })), ['productId', 'snapshotId']), warnings: [], valueLabel: 'Products', title,
      subtitle: `${source.length} selected products · current accepted snapshots`,
      interpretation: `The chart separates published ${title.toLowerCase()} statuses. UNKNOWN remains visible and is not treated as NO.`,
      derivedRule: `Derived measure: count of product pricing records by the stored “${field}” status.`
    };
  }

  function preparePricing(data, state, products) {
    if (state.measure === 'free_tier_availability') return prepareAvailability(data, state, products, 'Free tier available', 'Free tier availability');
    if (state.measure === 'business_tier_availability') return prepareAvailability(data, state, products, 'Team or business tier available', 'Business tier availability');
    if (state.measure === 'enterprise_availability') return prepareAvailability(data, state, products, 'Enterprise tier available', 'Enterprise tier availability');
    if (state.measure === 'api_pricing_availability') return prepareAvailability(data, state, products, 'Usage-based API pricing available', 'Usage-based API pricing availability');

    const warnings = [];
    const exclusions = [];
    const productIds = new Set(products.map((row) => row.id));
    const source = data.pricingRows.filter((row) => productIds.has(row.productId));
    const options = pricingBasisOptions(data, state, products);
    const basisKey = options.some((row) => row.key === state.pricingBasis) ? state.pricingBasis : options[0]?.key;
    const basis = options.find((row) => row.key === basisKey);
    if (!basis) {
      return {
        shape: 'single', rows: [], evidenceRows: [], warnings: ['No comparable numeric pricing basis is available for the selected products.'], exclusions,
        title: DATASETS.pricing.measures[state.measure].label, subtitle: 'No comparable pricing records', interpretation: 'No chart was produced because the selected records do not share a numeric currency and billing basis.', derivedRule: 'No derived measure calculated.'
      };
    }

    const exactBasis = (row, prefix) => billingKey(row.fields[`${prefix} currency`], row.fields[`${prefix} billing period`]) === basisKey;

    if (state.measure === 'tier_price_comparison') {
      const prefixes = [
        ['Entry', 'Entry paid tier'],
        ['Mid', 'Mid paid tier'],
        ['Pro', 'Pro paid tier']
      ];
      const rows = [];
      source.forEach((row) => {
        const product = data.indexes.productById.get(row.productId);
        const out = { label: groupLabel(product, state.groupBy), product: row.productName, provider: row.providerName, category: row.category };
        let valid = false;
        prefixes.forEach(([series, prefix]) => {
          const value = Core.safeNumber(row.fields[`${prefix} price`]);
          if (value !== null && exactBasis(row, prefix)) {
            out[series] = value;
            valid = true;
          } else {
            out[series] = null;
          }
        });
        if (valid) rows.push(out);
        else exclusions.push(`${row.productName} — no numeric Entry/Mid/Pro price on ${basis.currency} · ${basis.period}`);
      });
      return {
        shape: 'multi', rows, series: ['Entry', 'Mid', 'Pro'], evidenceRows: createEvidenceRows(rows), warnings, exclusions,
        pricingBasisOptions: options, pricingBasis: basisKey,
        title: 'Entry, mid and pro tier prices', subtitle: `${basis.currency} · ${basis.period} · ${rows.length} matching products`,
        interpretation: 'Only numeric prices sharing the displayed currency and billing basis are included. Missing or non-numeric tiers remain excluded rather than converted.',
        derivedRule: 'Derived measure: numeric tier prices filtered to one exact currency and billing-period pair.'
      };
    }

    const prefix = 'Entry paid tier';
    const rows = [];
    source.forEach((row) => {
      const product = data.indexes.productById.get(row.productId);
      const rawPrice = row.fields[`${prefix} price`];
      const price = Core.safeNumber(rawPrice);
      const rowBasis = billingKey(row.fields[`${prefix} currency`], row.fields[`${prefix} billing period`]);
      if (price === null) {
        exclusions.push(`${row.productName} — ${Core.text(rawPrice, 'missing/non-numeric price')}`);
        return;
      }
      if (rowBasis !== basisKey) {
        exclusions.push(`${row.productName} — ${Core.text(row.fields[`${prefix} currency`], 'UNKNOWN')} · ${Core.text(row.fields[`${prefix} billing period`], 'UNKNOWN')}`);
        return;
      }
      const capabilityYes = data.capabilityRows.filter((fact) => fact.productId === row.productId && fact.section !== 'Interfaces' && fact.available === 'YES').length;
      rows.push({
        label: groupLabel(product, state.groupBy),
        value: price,
        price,
        confirmedCapabilities: capabilityYes,
        product: row.productName,
        provider: row.providerName,
        category: row.category,
        currency: basis.currency,
        billingPeriod: basis.period,
        tierName: row.fields[`${prefix} name`] || '',
        rawPrice,
        snapshotDate: row.snapshotDate,
        productId: row.productId,
        snapshotId: row.snapshotId
      });
    });

    const sorted = Core.sortRows(rows, state.sort, 'value', 'label');
    return {
      shape: state.measure === 'entry_price_vs_capabilities' ? 'scatter' : 'single',
      rows: sorted,
      evidenceRows: createEvidenceRows(sorted, ['productId', 'snapshotId']), warnings, exclusions,
      pricingBasisOptions: options, pricingBasis: basisKey,
      valueLabel: `${basis.currency} price`,
      title: state.measure === 'entry_price_vs_capabilities' ? 'Entry price vs confirmed capabilities' : 'Entry paid tier price',
      subtitle: `${basis.currency} · ${basis.period} · ${sorted.length} matching products`,
      interpretation: state.measure === 'entry_price_vs_capabilities'
        ? 'Each point compares a like-for-like entry price with the number of facts marked YES. Position does not imply suitability or value.'
        : 'Only like-for-like numeric entry prices are displayed. Quote, usage-based, unknown, mixed-currency and mismatched-period records are excluded.',
      derivedRule: state.measure === 'entry_price_vs_capabilities'
        ? 'Derived measure: stored numeric entry price paired with a simple count of YES capability facts; no weighting is applied.'
        : 'Derived measure: stored numeric Entry paid tier price filtered to one exact currency and billing-period pair.'
    };
  }

  function factsFor(data, products, section, interfacesOnly) {
    const productIds = new Set(products.map((row) => row.id));
    return data.capabilityRows.filter((row) => {
      if (!productIds.has(row.productId)) return false;
      if (interfacesOnly) return row.section === 'Interfaces';
      if (row.section === 'Interfaces') return false;
      return !section || section === 'All capability sections' || row.section === section;
    });
  }

  function rowsByProductFacts(data, products, facts, state, mode) {
    const result = [];
    products.forEach((product) => {
      const rows = facts.filter((row) => row.productId === product.id);
      const counts = statusCounts(rows.map((row) => row.available));
      const total = rows.length;
      const known = total - counts.UNKNOWN;
      const base = { label: groupLabel(product, state.groupBy), product: product.name, provider: product.providerName, category: product.category };
      if (mode === 'yes') base.value = counts.YES;
      if (mode === 'yes_limited') base.value = counts.YES + counts.LIMITED;
      if (mode === 'known') base.value = total ? (known / total) * 100 : 0;
      if (mode === 'composition') Object.assign(base, counts);
      base.totalFacts = total;
      result.push(base);
    });
    return result;
  }

  function prepareCapabilities(data, state, products, interfacesOnly) {
    const section = interfacesOnly ? 'Interfaces' : state.section;
    const facts = factsFor(data, products, section, interfacesOnly);
    const dataset = interfacesOnly ? DATASETS.interfaces : DATASETS.capabilities;
    const warnings = [];
    const selectedSectionLabel = interfacesOnly ? 'Interfaces' : (section || 'All capability sections');

    if (state.measure === 'capability_matrix' || state.measure === 'interface_matrix') {
      const capabilities = Core.uniqueLabels(facts.map((row) => row.capability));
      const rows = [];
      products.forEach((product) => {
        capabilities.forEach((capability) => {
          const match = facts.find((row) => row.productId === product.id && row.capability === capability);
          rows.push({
            product: product.name,
            provider: product.providerName,
            category: product.category,
            capability,
            status: match?.available || 'UNKNOWN',
            note: match?.note || (match ? '' : 'Missing capability record'),
            productId: product.id,
            factId: match?.id || ''
          });
        });
      });
      return {
        shape: 'heatmap', rows, products: products.map((row) => row.name), capabilities,
        evidenceRows: createEvidenceRows(rows, ['productId', 'factId']), warnings,
        title: interfacesOnly ? 'Platform support matrix' : `${selectedSectionLabel} capability matrix`,
        subtitle: `${products.length} products · ${capabilities.length} facts · missing cells shown as UNKNOWN`,
        interpretation: 'Each cell preserves the stored status. Missing records are displayed as UNKNOWN and are not silently treated as NO.',
        derivedRule: 'Derived view: joined product-by-capability matrix using the current selected snapshot for each product.'
      };
    }

    if (state.measure === 'section_profile') {
      const selected = products.slice(0, 5);
      if (products.length > 5) warnings.push(`Radar charts are limited to five products; ${products.length - 5} selected products are not shown.`);
      const sections = Core.uniqueLabels(data.capabilityRows.filter((row) => row.section !== 'Interfaces').map((row) => row.section));
      const rows = selected.map((product) => {
        const values = {};
        sections.forEach((sectionName) => {
          values[sectionName] = data.capabilityRows.filter((row) => row.productId === product.id && row.section === sectionName && (row.available === 'YES' || row.available === 'LIMITED')).length;
        });
        return { product: product.name, provider: product.providerName, category: product.category, ...values };
      });
      return {
        shape: 'radar', rows, series: selected.map((row) => row.name), axes: sections,
        evidenceRows: createEvidenceRows(rows), warnings,
        title: 'Capability section profile', subtitle: `${selected.length} products · YES + LIMITED counts by section`,
        interpretation: 'The radar compares section breadth using a direct YES + LIMITED count. It does not score quality, limits, price or suitability.',
        derivedRule: 'Derived measure: count of YES and LIMITED facts in each capability section.'
      };
    }

    const mode = state.measure === 'yes_count' || state.measure === 'interface_yes_count' ? 'yes'
      : state.measure === 'yes_limited_count' ? 'yes_limited'
      : state.measure === 'known_percentage' ? 'known'
      : 'composition';
    let rows = rowsByProductFacts(data, products, facts, state, mode);

    if (state.groupBy !== 'Product') {
      if (mode === 'composition') {
        const map = new Map();
        rows.forEach((row) => {
          const key = row.label;
          if (!map.has(key)) map.set(key, { label: key, YES: 0, LIMITED: 0, NO: 0, UNKNOWN: 0, NONE: 0, totalFacts: 0 });
          const target = map.get(key);
          Core.STATUS_ORDER.forEach((status) => target[status] += row[status] || 0);
          target.totalFacts += row.totalFacts || 0;
        });
        rows = Array.from(map.values());
      } else {
        const groups = new Map();
        rows.forEach((row) => {
          if (!groups.has(row.label)) groups.set(row.label, []);
          groups.get(row.label).push(row);
        });
        rows = Array.from(groups, ([label, groupRows]) => ({
          label,
          value: mode === 'known'
            ? groupRows.reduce((sum, row) => sum + row.value, 0) / groupRows.length
            : groupRows.reduce((sum, row) => sum + row.value, 0),
          productCount: groupRows.length,
          totalFacts: groupRows.reduce((sum, row) => sum + row.totalFacts, 0)
        }));
      }
    }

    if (mode !== 'composition') rows = Core.sortRows(rows, state.sort);
    const measure = dataset.measures[state.measure];
    return {
      shape: mode === 'composition' ? 'status-multi' : 'single', rows,
      series: mode === 'composition' ? Core.STATUS_ORDER.filter((status) => rows.some((row) => (row[status] || 0) > 0)) : undefined,
      evidenceRows: createEvidenceRows(rows), warnings,
      valueLabel: mode === 'known' ? 'Known data (%)' : 'Capability facts',
      title: measure.label,
      subtitle: `${products.length} selected products · ${selectedSectionLabel}`,
      interpretation: mode === 'composition'
        ? 'Statuses remain separated so LIMITED and UNKNOWN are not concealed inside a single score.'
        : `The chart uses direct counts or percentages from ${selectedSectionLabel}. It does not weight or rank products.`,
      derivedRule: mode === 'yes' ? 'Derived measure: count of facts marked YES.'
        : mode === 'yes_limited' ? 'Derived measure: count of facts marked YES plus facts marked LIMITED.'
        : mode === 'known' ? 'Derived measure: (all facts except UNKNOWN) divided by total facts, expressed as a percentage.'
        : 'Derived measure: separate count of each stored capability status.'
    };
  }

  function prepareEcosystem(data, state, products) {
    const productIds = new Set(products.map((row) => row.id));
    const relevant = data.listRows.filter((row) => productIds.has(row.productId) && ['tool', 'connector'].includes(Core.normalizeKey(row.listType)));
    let rows = products.map((product) => {
      const items = relevant.filter((row) => row.productId === product.id);
      return {
        label: groupLabel(product, state.groupBy),
        product: product.name,
        provider: product.providerName,
        category: product.category,
        Tools: items.filter((row) => Core.normalizeKey(row.listType) === 'tool').length,
        Connectors: items.filter((row) => Core.normalizeKey(row.listType) === 'connector').length
      };
    });
    if (state.groupBy !== 'Product') {
      const map = new Map();
      rows.forEach((row) => {
        if (!map.has(row.label)) map.set(row.label, { label: row.label, Tools: 0, Connectors: 0 });
        map.get(row.label).Tools += row.Tools;
        map.get(row.label).Connectors += row.Connectors;
      });
      rows = Array.from(map.values());
    }
    if (state.measure === 'tool_count') rows = rows.map((row) => ({ ...row, value: row.Tools }));
    if (state.measure === 'connector_count') rows = rows.map((row) => ({ ...row, value: row.Connectors }));
    if (state.measure !== 'tool_connector_counts') rows = Core.sortRows(rows, state.sort);
    return {
      shape: state.measure === 'tool_connector_counts' ? 'multi' : 'single', rows,
      series: state.measure === 'tool_connector_counts' ? ['Tools', 'Connectors'] : undefined,
      evidenceRows: createEvidenceRows(rows), warnings: [],
      valueLabel: 'List items',
      title: DATASETS.ecosystem.measures[state.measure].label,
      subtitle: `${products.length} selected products · current researched list items`,
      interpretation: 'Counts indicate catalogue breadth only. A larger number of tools or connectors does not establish quality, fit or availability on a particular plan.',
      derivedRule: state.measure === 'tool_connector_counts'
        ? 'Derived measure: separate count of list items typed Tool and Connector.'
        : `Derived measure: count of list items typed ${state.measure === 'tool_count' ? 'Tool' : 'Connector'}.`
    };
  }

  function daysBetween(a, b) {
    const ad = Core.toISODate(a);
    const bd = Core.toISODate(b);
    if (!ad || !bd) return null;
    return Math.round((new Date(bd + 'T00:00:00Z') - new Date(ad + 'T00:00:00Z')) / 86400000);
  }

  function prepareResearch(data, state, products) {
    const productIds = new Set(products.map((row) => row.id));
    const facts = data.capabilityRows.filter((row) => productIds.has(row.productId));
    if (state.measure === 'parser_status') {
      const values = products.map((product) => data.indexes.currentSnapshotByProduct.get(product.id)?.parserStatus || 'No accepted snapshot');
      const map = new Map();
      values.forEach((value) => map.set(value, (map.get(value) || 0) + 1));
      const rows = Array.from(map, ([label, value]) => ({ label, value, parserStatus: label, productCount: value }));
      return {
        shape: 'single', rows, evidenceRows: createEvidenceRows(products.map((product) => ({
          product: product.name,
          provider: product.providerName,
          parserStatus: data.indexes.currentSnapshotByProduct.get(product.id)?.parserStatus || 'No accepted snapshot',
          snapshotDate: data.indexes.currentSnapshotByProduct.get(product.id)?.snapshotDate || ''
        }))), warnings: [], title: 'Snapshot parser status', subtitle: `${products.length} selected products`,
        interpretation: 'Accepted-with-warnings snapshots remain usable but are visibly separated from fully accepted snapshots.',
        derivedRule: 'Derived measure: count of selected current snapshots by parser status.'
      };
    }
    if (state.measure === 'timeline_quality') {
      const recent = data.listRows.filter((row) => productIds.has(row.productId) && Core.normalizeKey(row.listType) === 'recent change');
      const map = new Map([['current_or_past', 0], ['future', 0], ['unknown', 0], ['invalid', 0]]);
      recent.forEach((row) => {
        const kind = row.dateClass?.kind || 'unknown';
        map.set(kind, (map.get(kind) || 0) + 1);
      });
      const labels = { current_or_past: 'Current or past', future: 'Future-dated', unknown: 'Unknown date', invalid: 'Invalid date' };
      const rows = Array.from(map, ([kind, value]) => ({ label: labels[kind], value, dateClass: kind, itemCount: value })).filter((row) => row.value > 0);
      return {
        shape: 'single', rows, evidenceRows: createEvidenceRows(recent.map((row) => ({
          product: row.productName, date: row.name, classification: row.dateClass?.kind || 'unknown', change: row.purpose, status: row.accessOrStatus, listItemId: row.id
        })), ['listItemId']), warnings: recent.some((row) => row.dateClass?.kind === 'future') ? ['Future-dated changes are shown separately and excluded from normal completed-change interpretation.'] : [],
        title: 'Timeline date quality', subtitle: `${recent.length} recent-change records`,
        interpretation: 'Date quality is shown without silently deleting future, unknown or invalid records.',
        derivedRule: 'Derived measure: classification of recent-change dates against each selected snapshot date.'
      };
    }

    let rows = products.map((product) => {
      const productFacts = facts.filter((row) => row.productId === product.id);
      const unknown = productFacts.filter((row) => row.available === 'UNKNOWN').length;
      const total = productFacts.length;
      const snapshot = data.indexes.currentSnapshotByProduct.get(product.id);
      return {
        label: groupLabel(product, state.groupBy), product: product.name, provider: product.providerName, category: product.category,
        unknownFacts: unknown, totalFacts: total, knownPercentage: total ? ((total - unknown) / total) * 100 : 0,
        snapshotAgeDays: daysBetween(snapshot?.snapshotDate, data.meta.latestSnapshotDate) ?? null,
        snapshotDate: snapshot?.snapshotDate || '', parserStatus: snapshot?.parserStatus || 'No accepted snapshot'
      };
    });
    if (state.measure === 'unknown_fact_count') rows.forEach((row) => { row.value = row.unknownFacts; });
    if (state.measure === 'known_percentage') rows.forEach((row) => { row.value = row.knownPercentage; });
    if (state.measure === 'snapshot_age') rows.forEach((row) => { row.value = row.snapshotAgeDays ?? 0; });
    rows = Core.sortRows(rows, state.sort);
    return {
      shape: 'single', rows, evidenceRows: createEvidenceRows(rows), warnings: [],
      valueLabel: state.measure === 'known_percentage' ? 'Known data (%)' : state.measure === 'snapshot_age' ? 'Days behind latest snapshot' : 'Unknown facts',
      title: DATASETS.research.measures[state.measure].label,
      subtitle: `${products.length} selected products · latest export snapshot ${data.meta.latestSnapshotDate || 'unknown'}`,
      interpretation: state.measure === 'snapshot_age'
        ? 'Snapshot age is measured within the loaded export, not against the current internet. A value of zero means the latest selected snapshot date in this file.'
        : 'This chart describes research completeness. It is not a product quality ranking.',
      derivedRule: state.measure === 'unknown_fact_count' ? 'Derived measure: count of capability facts marked UNKNOWN.'
        : state.measure === 'known_percentage' ? 'Derived measure: (all capability facts except UNKNOWN) divided by total capability facts.'
        : 'Derived measure: calendar-day difference between each snapshot date and the latest selected snapshot date in the loaded export.'
    };
  }

  function densityWarnings(model, chartType) {
    const warnings = [];
    const count = model.rows?.length || 0;
    if (['pie', 'doughnut'].includes(chartType) && count > 8) warnings.push(`Pie and doughnut charts are limited to eight slices for readability. Filter the data or choose a bar chart.`);
    if (chartType === 'radar' && (model.series?.length || 0) > 5) warnings.push('Radar charts are limited to five products.');
    if (['vertical-bar', 'horizontal-bar', 'grouped-bar', 'stacked-bar'].includes(chartType) && count > 20) warnings.push(`This bar chart contains ${count} groups and may be crowded. Consider filtering the product set.`);
    return warnings;
  }

  function chartTypeCompatibility(datasetKey, measureKey) {
    const measure = DATASETS[datasetKey]?.measures?.[measureKey];
    const compatible = new Set(measure?.charts || []);
    return Object.entries(CHART_TYPES).map(([id, meta]) => ({
      id,
      label: meta.label,
      enabled: compatible.has(id),
      reason: compatible.has(id) ? '' : incompatibleReason(datasetKey, measureKey, id)
    }));
  }

  function incompatibleReason(datasetKey, measureKey, chartType) {
    const measure = DATASETS[datasetKey]?.measures?.[measureKey];
    if (['pie', 'doughnut'].includes(chartType) && !measure?.partToWhole) return 'This measure is not a part-to-whole composition.';
    if (chartType === 'heatmap') return 'Heatmaps require a two-dimensional status matrix.';
    if (chartType === 'radar') return 'Radar requires the capability section profile measure.';
    if (chartType === 'scatter') return 'Scatter requires two numeric measures.';
    if (chartType === 'grouped-bar') return 'Grouped bars require multiple series.';
    if (chartType === 'stacked-bar') return 'Stacked bars require status or multi-series composition.';
    return 'Not compatible with the selected measure.';
  }

  function prepare(data, state) {
    if (!data) throw new Error('No normalized dataset is loaded.');
    const products = selectedProducts(data, state);
    if (!products.length) {
      return {
        shape: 'single', rows: [], evidenceRows: [], warnings: ['No products match the current filters.'], exclusions: [],
        title: 'No matching products', subtitle: 'Adjust provider, category, tag or product filters.', interpretation: 'No chart was produced.', derivedRule: 'No derived measure calculated.', products: []
      };
    }

    let model;
    if (state.dataset === 'products') model = prepareProducts(data, state, products);
    else if (state.dataset === 'pricing') model = preparePricing(data, state, products);
    else if (state.dataset === 'capabilities') model = prepareCapabilities(data, state, products, false);
    else if (state.dataset === 'interfaces') model = prepareCapabilities(data, state, products, true);
    else if (state.dataset === 'ecosystem') model = prepareEcosystem(data, state, products);
    else model = prepareResearch(data, state, products);

    model.products = products;
    model.exclusions = model.exclusions || [];
    model.warnings = (model.warnings || []).concat(densityWarnings(model, state.chartType));
    model.sourceLine = `Source: ${data.meta.sourceName} · Snapshots: latest accepted per product, with accepted-with-warnings fallback · Loaded: ${new Date(data.meta.importedAt).toLocaleString()}`;
    model.chartType = state.chartType;
    model.dataset = state.dataset;
    model.measure = state.measure;
    return model;
  }

  CCR.DatasetRegistry = {
    CHART_TYPES,
    DATASETS,
    PRESETS,
    groupsFor,
    selectedProducts,
    pricingBasisOptions,
    chartTypeCompatibility,
    prepare
  };
})(window);
