# Supported Chart Matrix

The guided builder enables only the chart types listed for each measure.

| Dataset | Measure | Enabled chart types |
|---|---|---|
| Product registry | Products by category | Vertical bar, horizontal bar, pie, doughnut, treemap, table |
| Product registry | Products by provider | Vertical bar, horizontal bar, pie, doughnut, treemap, table |
| Product registry | Tag frequency | Vertical bar, horizontal bar, pie, doughnut, treemap, table |
| Pricing | Entry paid tier price | Vertical bar, horizontal bar, scatter, table |
| Pricing | Entry / mid / pro tier prices | Grouped bar, table |
| Pricing | Free tier availability | Vertical bar, horizontal bar, pie, doughnut, table |
| Pricing | Business tier availability | Vertical bar, horizontal bar, pie, doughnut, table |
| Pricing | Enterprise tier availability | Vertical bar, horizontal bar, pie, doughnut, table |
| Pricing | Usage-based API pricing | Vertical bar, horizontal bar, pie, doughnut, table |
| Pricing | Entry price vs confirmed capabilities | Scatter, table |
| Capability facts | Confirmed capability count | Vertical bar, horizontal bar, treemap, table |
| Capability facts | Available in some form | Vertical bar, horizontal bar, treemap, table |
| Capability facts | Status composition | Stacked bar, grouped bar, table |
| Capability facts | Known-data percentage | Vertical bar, horizontal bar, table |
| Capability facts | Capability matrix | Heatmap, table |
| Capability facts | Section capability profile | Radar, table |
| Platforms/interfaces | Platform support matrix | Heatmap, table |
| Platforms/interfaces | Confirmed interface count | Vertical bar, horizontal bar, treemap, table |
| Platforms/interfaces | Interface status composition | Stacked bar, grouped bar, table |
| Tools/connectors | Tools per product | Vertical bar, horizontal bar, treemap, table |
| Tools/connectors | Connectors per product | Vertical bar, horizontal bar, treemap, table |
| Tools/connectors | Tools and connectors per product | Grouped bar, stacked bar, table |
| Research quality | Unknown facts by product | Vertical bar, horizontal bar, treemap, table |
| Research quality | Research coverage | Vertical bar, horizontal bar, table |
| Research quality | Snapshot age within export | Vertical bar, horizontal bar, table |
| Research quality | Snapshot parser status | Vertical bar, horizontal bar, pie, doughnut, table |
| Research quality | Timeline date quality | Vertical bar, horizontal bar, pie, doughnut, table |

## Density limits

- Pie/doughnut requires eight or fewer slices.
- Radar requires five or fewer selected products.
- Bar charts display a warning above twenty groups.
- Heatmaps retain larger datasets through scroll/zoom controls.
- No chart silently discards low-value records.
