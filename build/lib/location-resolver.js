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
var location_resolver_exports = {};
__export(location_resolver_exports, {
  LOCATION_VALIDATED_KEY_FIELD: () => LOCATION_VALIDATED_KEY_FIELD,
  LOCATION_VALIDATION_DISPLAY_TEXT_FIELD: () => LOCATION_VALIDATION_DISPLAY_TEXT_FIELD,
  LOCATION_VALIDATION_MESSAGE_FIELD: () => LOCATION_VALIDATION_MESSAGE_FIELD,
  LOCATION_VALIDATION_STATE_FIELD: () => LOCATION_VALIDATION_STATE_FIELD,
  LocationResolver: () => LocationResolver,
  RESOLVE_LOCATION_CONFIG_COMMAND: () => RESOLVE_LOCATION_CONFIG_COMMAND
});
module.exports = __toCommonJS(location_resolver_exports);
var import_config = require("./config");
var import_open_meteo_client = require("./open-meteo-client");
const RESOLVE_LOCATION_CONFIG_COMMAND = "resolveLocationConfig";
const LOCATION_VALIDATED_KEY_FIELD = "_validatedLocationKey";
const LOCATION_VALIDATION_MESSAGE_FIELD = "_locationValidationMessage";
const LOCATION_VALIDATION_STATE_FIELD = "_locationValidationState";
const LOCATION_VALIDATION_DISPLAY_TEXT_FIELD = "_locationValidationDisplayText";
function formatCoordinate(value) {
  return value.toFixed(4);
}
function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
class LocationResolver {
  /**
   * Creates a resolver backed by the Open-Meteo geocoding client.
   *
   * @param client - Geocoding client abstraction used in production and tests.
   */
  constructor(client = new import_open_meteo_client.OpenMeteoClient()) {
    this.client = client;
  }
  /**
   * Resolves the effective runtime location from either manual coordinates or geocoding.
   *
   * @param config - Normalized location-related adapter configuration.
   * @param signal - Abort signal for the geocoding request.
   * @returns The effective location context used by the forecast runtime.
   */
  async resolveLocation(config, signal) {
    var _a, _b, _c, _d, _e, _f;
    if (config.locationMode === "manual") {
      return {
        resolvedName: config.city || `${(_b = (_a = config.latitude) == null ? void 0 : _a.toFixed(4)) != null ? _b : "0.0000"}, ${(_d = (_c = config.longitude) == null ? void 0 : _c.toFixed(4)) != null ? _d : "0.0000"}`,
        countryCode: config.countryCode,
        latitude: (_e = config.latitude) != null ? _e : 0,
        longitude: (_f = config.longitude) != null ? _f : 0,
        timeZone: config.timezoneMode === "manual" ? config.timeZone : "auto"
      };
    }
    const geocodingResult = await this.client.geocode(config.city, config.countryCode || void 0, signal);
    return {
      resolvedName: geocodingResult.resolvedName,
      countryCode: geocodingResult.countryCode,
      latitude: geocodingResult.latitude,
      longitude: geocodingResult.longitude,
      timeZone: config.timezoneMode === "manual" ? config.timeZone : geocodingResult.timeZone
    };
  }
  /**
   * Validates a geocoded city selection from the admin dialog and returns native field updates.
   *
   * @param request - Raw admin-side validation request payload.
   * @param signal - Abort signal for the geocoding request.
   * @returns A jsonConfig-compatible response containing status text and native updates.
   */
  async validateGeocodeLocation(request, signal) {
    const city = (0, import_config.normalizeOptionalText)(request.city);
    const countryCode = (0, import_config.normalizeCountryCode)(request.countryCode);
    const timezoneMode = request.timezoneMode === "manual" ? "manual" : "auto";
    const timezone = (0, import_config.normalizeOptionalText)(request.timezone);
    const validationKey = (0, import_config.buildLocationValidationKey)(city, countryCode);
    if (!city) {
      return this.createErrorResponse(
        validationKey,
        city,
        countryCode,
        "Please enter a city before checking the location."
      );
    }
    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
      return this.createErrorResponse(
        validationKey,
        city,
        countryCode,
        "Country code must contain a two-letter ISO country code."
      );
    }
    if (timezoneMode === "manual" && (!timezone || !(0, import_config.isValidTimeZone)(timezone))) {
      return this.createErrorResponse(
        validationKey,
        city,
        countryCode,
        `The configured timezone "${timezone || "empty"}" is not valid.`
      );
    }
    try {
      const geocodingResult = await this.client.geocode(city, countryCode || void 0, signal);
      const resolvedCountryCode = geocodingResult.countryCode || countryCode;
      const successValidationKey = (0, import_config.buildLocationValidationKey)(city, resolvedCountryCode);
      const effectiveTimeZone = timezoneMode === "manual" ? timezone : geocodingResult.timeZone;
      const message = `Found: ${geocodingResult.resolvedName} (${formatCoordinate(geocodingResult.latitude)}, ${formatCoordinate(geocodingResult.longitude)}), time zone ${effectiveTimeZone}.`;
      return {
        native: {
          city,
          countryCode: resolvedCountryCode,
          latitude: geocodingResult.latitude,
          longitude: geocodingResult.longitude,
          ...timezoneMode === "auto" ? { timezone: geocodingResult.timeZone } : {},
          [LOCATION_VALIDATED_KEY_FIELD]: successValidationKey,
          [LOCATION_VALIDATION_STATE_FIELD]: "success",
          [LOCATION_VALIDATION_MESSAGE_FIELD]: message,
          [LOCATION_VALIDATION_DISPLAY_TEXT_FIELD]: message
        },
        text: message,
        icon: "connection",
        style: { color: "#2e7d32" }
      };
    } catch (error) {
      return this.createErrorResponse(validationKey, city, countryCode, toErrorMessage(error));
    }
  }
  createErrorResponse(validationKey, city, countryCode, message) {
    return {
      native: {
        city,
        countryCode,
        [LOCATION_VALIDATED_KEY_FIELD]: validationKey,
        [LOCATION_VALIDATION_STATE_FIELD]: "error",
        [LOCATION_VALIDATION_MESSAGE_FIELD]: message,
        [LOCATION_VALIDATION_DISPLAY_TEXT_FIELD]: message
      },
      text: message,
      icon: "no-connection",
      style: { color: "#c62828" }
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LOCATION_VALIDATED_KEY_FIELD,
  LOCATION_VALIDATION_DISPLAY_TEXT_FIELD,
  LOCATION_VALIDATION_MESSAGE_FIELD,
  LOCATION_VALIDATION_STATE_FIELD,
  LocationResolver,
  RESOLVE_LOCATION_CONFIG_COMMAND
});
//# sourceMappingURL=location-resolver.js.map
