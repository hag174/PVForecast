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
var dates_exports = {};
__export(dates_exports, {
  addDays: () => addDays,
  boundaryTimestamp: () => boundaryTimestamp,
  formatLocalDate: () => formatLocalDate,
  getIsoWeekRange: () => getIsoWeekRange,
  getMonthRange: () => getMonthRange,
  roundNumber: () => roundNumber,
  sanitizeStateKey: () => sanitizeStateKey
});
module.exports = __toCommonJS(dates_exports);
function parseDate(dateString) {
  const [year, month, day] = dateString.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day));
}
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
function formatLocalDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  return `${values.year}-${values.month}-${values.day}`;
}
function addDays(dateString, days) {
  const date = parseDate(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}
function getIsoWeekRange(dateString) {
  const date = parseDate(dateString);
  const dayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  const startDate = addDays(dateString, 1 - dayOfWeek);
  return {
    startDate,
    endDate: addDays(startDate, 6)
  };
}
function getMonthRange(dateString) {
  const [year, month] = dateString.split("-").map((part) => Number(part));
  const startDate = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-01`;
  const endDate = formatDate(new Date(Date.UTC(year, month, 0)));
  return { startDate, endDate };
}
function boundaryTimestamp(dateString, endOfDay) {
  return `${dateString}T${endOfDay ? "23:00" : "00:00"}`;
}
function sanitizeStateKey(timestamp) {
  return timestamp.replace(/[^a-zA-Z0-9]/g, "_");
}
function roundNumber(value, fractionDigits = 3) {
  return Number(value.toFixed(fractionDigits));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addDays,
  boundaryTimestamp,
  formatLocalDate,
  getIsoWeekRange,
  getMonthRange,
  roundNumber,
  sanitizeStateKey
});
//# sourceMappingURL=dates.js.map
