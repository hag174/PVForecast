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
var config_exports = {};
__export(config_exports, {
  resolveEffectiveConfig: () => resolveEffectiveConfig
});
module.exports = __toCommonJS(config_exports);
const DEFAULT_CITY = "Berlin";
const DEFAULT_TIME_ZONE = "Europe/Berlin";
const DEFAULT_TILT_DEG = 0;
const DEFAULT_AZIMUTH_DEG = 0;
const DEFAULT_ARRAY_AREA_M2 = 10;
const DEFAULT_PANEL_EFFICIENCY_PCT = 22;
function normalizeOptionalText(value) {
  return typeof value === "string" ? value.trim() : "";
}
function toFiniteNumber(value, fieldName, fallback) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }
  if (fallback !== void 0) {
    return fallback;
  }
  throw new Error(`The configuration field "${fieldName}" must be a number.`);
}
function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(/* @__PURE__ */ new Date());
    return true;
  } catch {
    return false;
  }
}
function resolveEffectiveConfig(config) {
  const locationMode = config.locationMode === "manual" ? "manual" : "geocode";
  const timezoneMode = config.timezoneMode === "manual" ? "manual" : "auto";
  const city = normalizeOptionalText(config.city) || DEFAULT_CITY;
  const countryCode = normalizeOptionalText(config.countryCode).toUpperCase();
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error("countryCode must contain a two-letter ISO country code.");
  }
  const tiltDeg = toFiniteNumber(config.tiltDeg, "tiltDeg", DEFAULT_TILT_DEG);
  const azimuthDeg = toFiniteNumber(config.azimuthDeg, "azimuthDeg", DEFAULT_AZIMUTH_DEG);
  const arrayAreaM2 = toFiniteNumber(config.arrayAreaM2, "arrayAreaM2", DEFAULT_ARRAY_AREA_M2);
  const panelEfficiencyPct = toFiniteNumber(
    config.panelEfficiencyPct,
    "panelEfficiencyPct",
    DEFAULT_PANEL_EFFICIENCY_PCT
  );
  if (arrayAreaM2 <= 0) {
    throw new Error("arrayAreaM2 must be greater than zero.");
  }
  if (panelEfficiencyPct <= 0 || panelEfficiencyPct > 100) {
    throw new Error("panelEfficiencyPct must be greater than 0 and less than or equal to 100.");
  }
  if (tiltDeg < 0 || tiltDeg > 90) {
    throw new Error("tiltDeg must be between 0 and 90 degrees.");
  }
  if (azimuthDeg < -180 || azimuthDeg > 180) {
    throw new Error("azimuthDeg must be between -180 and 180 degrees.");
  }
  let latitude = null;
  let longitude = null;
  if (locationMode === "manual") {
    latitude = toFiniteNumber(config.latitude, "latitude");
    longitude = toFiniteNumber(config.longitude, "longitude");
    if (latitude < -90 || latitude > 90) {
      throw new Error("latitude must be between -90 and 90.");
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error("longitude must be between -180 and 180.");
    }
  }
  const configuredTimeZone = normalizeOptionalText(config.timezone) || DEFAULT_TIME_ZONE;
  if (timezoneMode === "manual" && !isValidTimeZone(configuredTimeZone)) {
    throw new Error(`The configured timezone "${configuredTimeZone}" is not valid.`);
  }
  return {
    locationMode,
    city,
    countryCode,
    latitude,
    longitude,
    timezoneMode,
    timeZone: timezoneMode === "manual" ? configuredTimeZone : "auto",
    tiltDeg,
    azimuthDeg,
    arrayAreaM2,
    panelEfficiencyPct
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  resolveEffectiveConfig
});
//# sourceMappingURL=config.js.map
