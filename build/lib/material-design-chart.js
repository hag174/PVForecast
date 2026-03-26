"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var material_design_chart_exports = {};
__export(material_design_chart_exports, {
  formatDailyMaterialDesignChart: () => formatDailyMaterialDesignChart,
  formatHourlyMaterialDesignChart: () => formatHourlyMaterialDesignChart
});
module.exports = __toCommonJS(material_design_chart_exports);
const ENERGY_GRAPH_TEMPLATE = {
  type: "bar",
  color: "#f9a825",
  legendText: "Energy forecast",
  yAxis_appendix: " kWh",
  tooltip_AppendText: " kWh",
  yAxis_min: 0,
  datalabel_show: false
};
function formatHourlyMaterialDesignChart(rows) {
  return {
    axisLabels: appendDuplicateSuffixes(rows.map((row) => `${formatAxisDate(row.localDate)}
${row.localTime}`)),
    graphs: [createEnergyGraph(rows.map((row) => row.energyKwh))]
  };
}
function formatDailyMaterialDesignChart(days) {
  return {
    axisLabels: days.map((day) => formatAxisDate(day.date)),
    graphs: [createEnergyGraph(days.map((day) => day.energyKwh))]
  };
}
function createEnergyGraph(data) {
  return {
    ...ENERGY_GRAPH_TEMPLATE,
    data: [...data]
  };
}
function formatAxisDate(date) {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}.`;
}
function appendDuplicateSuffixes(labels) {
  var _a;
  const totalOccurrences = /* @__PURE__ */ new Map();
  for (const label of labels) {
    totalOccurrences.set(label, ((_a = totalOccurrences.get(label)) != null ? _a : 0) + 1);
  }
  const seenOccurrences = /* @__PURE__ */ new Map();
  return labels.map((label) => {
    var _a2, _b;
    if (((_a2 = totalOccurrences.get(label)) != null ? _a2 : 0) <= 1) {
      return label;
    }
    const occurrence = ((_b = seenOccurrences.get(label)) != null ? _b : 0) + 1;
    seenOccurrences.set(label, occurrence);
    return `${label} (${occurrence})`;
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatDailyMaterialDesignChart,
  formatHourlyMaterialDesignChart
});
//# sourceMappingURL=material-design-chart.js.map
