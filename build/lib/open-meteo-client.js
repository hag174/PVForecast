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
var open_meteo_client_exports = {};
__export(open_meteo_client_exports, {
  OpenMeteoClient: () => OpenMeteoClient
});
module.exports = __toCommonJS(open_meteo_client_exports);
var import_promises = require("node:fs/promises");
const TEST_FIXTURES_ENV = "SOLARFORECAST_TEST_FIXTURES";
const fixtureCache = /* @__PURE__ */ new Map();
function isDefinedNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
class OpenMeteoClient {
  /**
   * Creates a new Open-Meteo client.
   *
   * @param fetchImpl - Fetch implementation used for HTTP requests and tests.
   */
  constructor(fetchImpl = fetch) {
    this.fetchImpl = fetchImpl;
  }
  /**
   * Resolves a city name into coordinates and a timezone.
   *
   * @param city - User configured city name.
   * @param countryCode - Optional ISO country code filter.
   * @param signal - Abort signal passed to fetch.
   * @returns The best matching geocoding result.
   */
  async geocode(city, countryCode, signal) {
    const fixtureResponse = await this.readFixtureResponse("geocode");
    if (fixtureResponse) {
      return this.extractGeocodingResult(city, countryCode, fixtureResponse);
    }
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", city);
    url.searchParams.set("count", "10");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    const response = await this.fetchJson(url, signal);
    return this.extractGeocodingResult(city, countryCode, response);
  }
  /**
   * Fetches the hourly solar forecast from Open-Meteo.
   *
   * @param options - Coordinates and panel settings for the forecast request.
   * @returns The raw Open-Meteo forecast payload.
   */
  async fetchForecast(options) {
    const fixtureResponse = await this.readFixtureResponse("forecast");
    if (fixtureResponse) {
      return fixtureResponse;
    }
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", options.latitude.toString());
    url.searchParams.set("longitude", options.longitude.toString());
    url.searchParams.set("hourly", "global_tilted_irradiance,cloud_cover");
    url.searchParams.set("past_days", "31");
    url.searchParams.set("forecast_days", "16");
    url.searchParams.set("timezone", options.timeZone);
    url.searchParams.set("tilt", options.tiltDeg.toString());
    url.searchParams.set("azimuth", options.azimuthDeg.toString());
    return this.fetchJson(url, options.signal);
  }
  async fetchJson(url, signal) {
    const response = await this.fetchImpl(url, { signal });
    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(
        `Open-Meteo request failed with ${response.status} ${response.statusText}: ${responseBody}`.trim()
      );
    }
    return await response.json();
  }
  extractGeocodingResult(city, countryCode, response) {
    var _a, _b, _c;
    const results = (_a = response.results) != null ? _a : [];
    const filteredResults = countryCode ? results.filter((result) => {
      var _a2;
      return ((_a2 = result.country_code) == null ? void 0 : _a2.toUpperCase()) === countryCode;
    }) : results;
    const candidates = filteredResults.length > 0 ? filteredResults : results;
    const match = candidates.find(
      (candidate) => typeof candidate.name === "string" && isDefinedNumber(candidate.latitude) && isDefinedNumber(candidate.longitude) && typeof candidate.timezone === "string"
    );
    if (!match) {
      throw new Error(`No matching location was found for "${city}".`);
    }
    const latitude = match.latitude;
    const longitude = match.longitude;
    const timeZone = match.timezone;
    const resolvedName = [match.name, match.admin1, match.country].filter(Boolean).join(", ");
    if (!isDefinedNumber(latitude) || !isDefinedNumber(longitude) || typeof timeZone !== "string") {
      throw new Error(`The geocoding response for "${city}" was incomplete.`);
    }
    return {
      resolvedName,
      countryCode: (_c = (_b = match.country_code) == null ? void 0 : _b.toUpperCase()) != null ? _c : "",
      latitude,
      longitude,
      timeZone
    };
  }
  async readFixtureResponse(kind) {
    const fixturePath = process.env[TEST_FIXTURES_ENV];
    if (!fixturePath) {
      return void 0;
    }
    let fixtures = fixtureCache.get(fixturePath);
    if (!fixtures) {
      const fixtureContent = await (0, import_promises.readFile)(fixturePath, "utf8");
      fixtures = JSON.parse(fixtureContent);
      fixtureCache.set(fixturePath, fixtures);
    }
    return fixtures[kind];
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OpenMeteoClient
});
//# sourceMappingURL=open-meteo-client.js.map
