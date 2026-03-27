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
  buildLocationValidationKey: () => buildLocationValidationKey,
  isValidTimeZone: () => isValidTimeZone,
  normalizeCountryCode: () => normalizeCountryCode,
  normalizeOptionalText: () => normalizeOptionalText,
  resolveEffectiveConfig: () => resolveEffectiveConfig
});
module.exports = __toCommonJS(config_exports);
const DEFAULT_CITY = "Berlin";
const DEFAULT_TIME_ZONE = "Europe/Berlin";
const DEFAULT_REFRESH_INTERVAL_MINUTES = 60;
const DEFAULT_TILT_DEG = 0;
const DEFAULT_AZIMUTH_DEG = 0;
const DEFAULT_MORNING_DAMPING_PCT = 100;
const DEFAULT_AFTERNOON_DAMPING_PCT = 100;
const REQUIRED_CONFIG_MESSAGE_SUFFIX = "Open the adapter settings and save the instance again.";
function normalizeOptionalText(value) {
  return typeof value === "string" ? value.trim() : "";
}
function toFiniteNumber(value, fieldName, fallback) {
  if (typeof value === "string" && value.trim() === "") {
    if (fallback !== void 0) {
      return fallback;
    }
    throw new Error(`The configuration field "${fieldName}" must be a number.`);
  }
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }
  if (fallback !== void 0) {
    return fallback;
  }
  throw new Error(`The configuration field "${fieldName}" must be a number.`);
}
function toRequiredFiniteNumber(value, fieldName) {
  if (value === void 0 || value === null || typeof value === "string" && value.trim() === "") {
    throw new Error(`The configuration field "${fieldName}" is required. ${REQUIRED_CONFIG_MESSAGE_SUFFIX}`);
  }
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }
  throw new Error(`The configuration field "${fieldName}" must be a number.`);
}
function normalizeCountryCode(value) {
  return normalizeOptionalText(value).toUpperCase();
}
function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(/* @__PURE__ */ new Date());
    return true;
  } catch {
    return false;
  }
}
function buildLocationValidationKey(city, countryCode) {
  const normalizedCity = normalizeOptionalText(city);
  if (!normalizedCity) {
    return "";
  }
  return `${normalizedCity}|${normalizeCountryCode(countryCode)}`;
}
function resolveEffectiveConfig(config) {
  const locationMode = config.locationMode === "manual" ? "manual" : "geocode";
  const timezoneMode = config.timezoneMode === "manual" ? "manual" : "auto";
  const city = normalizeOptionalText(config.city) || DEFAULT_CITY;
  const countryCode = normalizeCountryCode(config.countryCode);
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error("countryCode must contain a two-letter ISO country code.");
  }
  const tiltDeg = toFiniteNumber(config.tiltDeg, "tiltDeg", DEFAULT_TILT_DEG);
  const azimuthDeg = toFiniteNumber(config.azimuthDeg, "azimuthDeg", DEFAULT_AZIMUTH_DEG);
  const peakPowerKwp = toRequiredFiniteNumber(config.peakPowerKwp, "peakPowerKwp");
  const morningDampingPct = toFiniteNumber(
    config.morningDampingPct,
    "morningDampingPct",
    DEFAULT_MORNING_DAMPING_PCT
  );
  const afternoonDampingPct = toFiniteNumber(
    config.afternoonDampingPct,
    "afternoonDampingPct",
    DEFAULT_AFTERNOON_DAMPING_PCT
  );
  if (peakPowerKwp <= 0) {
    throw new Error("peakPowerKwp must be greater than zero.");
  }
  if (morningDampingPct < 0 || morningDampingPct > 100) {
    throw new Error("morningDampingPct must be between 0 and 100 percent.");
  }
  if (afternoonDampingPct < 0 || afternoonDampingPct > 100) {
    throw new Error("afternoonDampingPct must be between 0 and 100 percent.");
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
  const refreshIntervalMinutes = toFiniteNumber(
    config.refreshIntervalMinutes,
    "refreshIntervalMinutes",
    DEFAULT_REFRESH_INTERVAL_MINUTES
  );
  if (timezoneMode === "manual" && !isValidTimeZone(configuredTimeZone)) {
    throw new Error(`The configured timezone "${configuredTimeZone}" is not valid.`);
  }
  if (!Number.isInteger(refreshIntervalMinutes) || refreshIntervalMinutes < 1) {
    throw new Error("refreshIntervalMinutes must be a whole number greater than or equal to 1.");
  }
  return {
    locationMode,
    city,
    countryCode,
    latitude,
    longitude,
    timezoneMode,
    timeZone: timezoneMode === "manual" ? configuredTimeZone : "auto",
    refreshIntervalMinutes,
    tiltDeg,
    azimuthDeg,
    peakPowerKwp,
    morningDampingPct,
    afternoonDampingPct
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildLocationValidationKey,
  isValidTimeZone,
  normalizeCountryCode,
  normalizeOptionalText,
  resolveEffectiveConfig
});
//# sourceMappingURL=config.js.map
