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
var admin_location_message_handler_exports = {};
__export(admin_location_message_handler_exports, {
  ADMIN_LOCATION_VALIDATION_THROTTLE_MS: () => ADMIN_LOCATION_VALIDATION_THROTTLE_MS,
  ADMIN_LOCATION_VALIDATION_TIMEOUT_MS: () => ADMIN_LOCATION_VALIDATION_TIMEOUT_MS,
  AdminLocationMessageHandler: () => AdminLocationMessageHandler
});
module.exports = __toCommonJS(admin_location_message_handler_exports);
var import_config = require("./config");
var import_location_resolver = require("./location-resolver");
const ADMIN_MESSAGEBOX_PREFIX = "system.adapter.admin.";
const MAX_CITY_LENGTH = 120;
const MAX_TIME_ZONE_LENGTH = 100;
const ADMIN_LOCATION_VALIDATION_TIMEOUT_MS = 1e4;
const ADMIN_LOCATION_VALIDATION_THROTTLE_MS = 1e3;
class AdminLocationMessageHandler {
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    var _a, _b, _c, _d, _e;
    this.locationResolver = (_a = options.locationResolver) != null ? _a : new import_location_resolver.LocationResolver();
    this.now = (_b = options.now) != null ? _b : Date.now;
    this.scheduleTimeout = (_c = options.setTimeout) != null ? _c : setTimeout;
    this.cancelTimeout = (_d = options.clearTimeout) != null ? _d : clearTimeout;
    this.createAbortController = (_e = options.createAbortController) != null ? _e : (() => new AbortController());
  }
  locationResolver;
  now;
  scheduleTimeout;
  cancelTimeout;
  createAbortController;
  activeRequest;
  lastAcceptedAt;
  async handleMessage(obj) {
    if (!this.isSupportedMessage(obj)) {
      return false;
    }
    const requestValidation = this.validateRequest(obj.message);
    if (!requestValidation.ok) {
      this.reply(
        obj,
        this.createErrorResponse(
          requestValidation.city,
          requestValidation.countryCode,
          requestValidation.message
        )
      );
      return true;
    }
    if (this.activeRequest) {
      this.reply(
        obj,
        this.createErrorResponse(
          requestValidation.request.city,
          requestValidation.request.countryCode,
          "Another city check is already running. Please wait until it finishes."
        )
      );
      return true;
    }
    const now = this.now();
    if (this.lastAcceptedAt !== void 0 && now - this.lastAcceptedAt < ADMIN_LOCATION_VALIDATION_THROTTLE_MS) {
      this.reply(
        obj,
        this.createErrorResponse(
          requestValidation.request.city,
          requestValidation.request.countryCode,
          `Please wait at least ${ADMIN_LOCATION_VALIDATION_THROTTLE_MS} ms between city checks.`
        )
      );
      return true;
    }
    this.lastAcceptedAt = now;
    const requestPromise = this.runValidation(obj, requestValidation.request).finally(() => {
      if (this.activeRequest === requestPromise) {
        this.activeRequest = void 0;
      }
    });
    this.activeRequest = requestPromise;
    await requestPromise;
    return true;
  }
  isSupportedMessage(obj) {
    return Boolean(
      obj && obj.command === import_location_resolver.RESOLVE_LOCATION_CONFIG_COMMAND && obj.callback && typeof obj.from === "string" && obj.from.startsWith(ADMIN_MESSAGEBOX_PREFIX)
    );
  }
  validateRequest(rawRequest) {
    const request = rawRequest && typeof rawRequest === "object" ? rawRequest : {};
    const city = (0, import_config.normalizeOptionalText)(request.city);
    const countryCode = (0, import_config.normalizeCountryCode)(request.countryCode);
    const timezoneMode = request.timezoneMode;
    const timezone = (0, import_config.normalizeOptionalText)(request.timezone);
    if (!city) {
      return {
        ok: false,
        city,
        countryCode,
        message: "Please enter a city before checking the location."
      };
    }
    if (city.length > MAX_CITY_LENGTH) {
      return {
        ok: false,
        city,
        countryCode,
        message: `City names must not exceed ${MAX_CITY_LENGTH} characters.`
      };
    }
    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
      return {
        ok: false,
        city,
        countryCode,
        message: "Country code must contain a two-letter ISO country code."
      };
    }
    if (timezoneMode !== "auto" && timezoneMode !== "manual") {
      return {
        ok: false,
        city,
        countryCode,
        message: 'timezoneMode must be either "auto" or "manual".'
      };
    }
    if (timezone.length > MAX_TIME_ZONE_LENGTH) {
      return {
        ok: false,
        city,
        countryCode,
        message: `Timezones must not exceed ${MAX_TIME_ZONE_LENGTH} characters.`
      };
    }
    if (timezoneMode === "manual" && (!timezone || !(0, import_config.isValidTimeZone)(timezone))) {
      return {
        ok: false,
        city,
        countryCode,
        message: `The configured timezone "${timezone || "empty"}" is not valid.`
      };
    }
    return {
      ok: true,
      request: {
        city,
        countryCode,
        timezoneMode,
        timezone
      }
    };
  }
  async runValidation(obj, request) {
    const abortController = this.createAbortController();
    const timeoutHandle = this.scheduleTimeout(() => {
      abortController.abort(
        new Error(`City validation timed out after ${ADMIN_LOCATION_VALIDATION_TIMEOUT_MS} ms.`)
      );
    }, ADMIN_LOCATION_VALIDATION_TIMEOUT_MS);
    try {
      const response = await this.locationResolver.validateGeocodeLocation(request, abortController.signal);
      this.reply(obj, response);
    } catch (error) {
      this.reply(
        obj,
        this.createErrorResponse(
          request.city,
          request.countryCode,
          error instanceof Error ? error.message : String(error)
        )
      );
    } finally {
      this.cancelTimeout(timeoutHandle);
    }
  }
  createErrorResponse(city, countryCode, message) {
    return {
      native: {
        city,
        countryCode,
        [import_location_resolver.LOCATION_VALIDATED_KEY_FIELD]: (0, import_config.buildLocationValidationKey)(city, countryCode),
        [import_location_resolver.LOCATION_VALIDATION_STATE_FIELD]: "error",
        [import_location_resolver.LOCATION_VALIDATION_MESSAGE_FIELD]: message,
        [import_location_resolver.LOCATION_VALIDATION_DISPLAY_TEXT_FIELD]: message
      },
      text: message,
      icon: "no-connection",
      style: { color: "#c62828" }
    };
  }
  reply(obj, response) {
    this.adapter.sendTo(obj.from, obj.command, response, obj.callback);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ADMIN_LOCATION_VALIDATION_THROTTLE_MS,
  ADMIN_LOCATION_VALIDATION_TIMEOUT_MS,
  AdminLocationMessageHandler
});
//# sourceMappingURL=admin-location-message-handler.js.map
