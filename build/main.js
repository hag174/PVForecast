"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_dates = require("./lib/dates");
var import_config = require("./lib/config");
var import_forecast_service = require("./lib/forecast-service");
class Pvforecast extends utils.Adapter {
  refreshTimer;
  forecastService = new import_forecast_service.ForecastService();
  constructor(options = {}) {
    super({
      ...options,
      name: "pvforecast"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    await this.ensureStaticObjects();
    await this.setStateAsync("info.connection", { val: false, ack: true });
    await this.setStateAsync("info.lastError", { val: "", ack: true });
    await this.refreshForecast();
    this.refreshTimer = this.setInterval(
      () => {
        void this.refreshForecast();
      },
      60 * 60 * 1e3
    );
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   *
   * @param callback - Callback function
   */
  onUnload(callback) {
    try {
      if (this.refreshTimer) {
        this.clearInterval(this.refreshTimer);
        this.refreshTimer = void 0;
      }
      callback();
    } catch (error) {
      this.log.error(`Error during unloading: ${error.message}`);
      callback();
    }
  }
  async refreshForecast() {
    try {
      const config = (0, import_config.resolveEffectiveConfig)(this.config);
      const snapshot = await this.forecastService.fetchSnapshot(config);
      await this.writeSnapshot(snapshot);
      await this.setStateAsync("info.connection", { val: true, ack: true });
      await this.setStateAsync("info.lastError", { val: "", ack: true });
      await this.setStateAsync("info.lastUpdate", { val: (/* @__PURE__ */ new Date()).toISOString(), ack: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.error(`Forecast refresh failed: ${message}`);
      await this.setStateAsync("info.connection", { val: false, ack: true });
      await this.setStateAsync("info.lastError", { val: message, ack: true });
    }
  }
  async ensureStaticObjects() {
    await this.ensureChannel("info", "Information");
    await this.ensureState("info.connection", "Connection to Open-Meteo", "boolean", "indicator.connected", false);
    await this.ensureState("info.lastUpdate", "Last successful update", "string", "value.time", false);
    await this.ensureState("info.lastError", "Last error message", "string", "text", false);
    await this.ensureChannel("location", "Resolved location");
    await this.ensureState("location.resolvedName", "Resolved location name", "string", "text", false);
    await this.ensureState("location.countryCode", "Country code", "string", "text", false);
    await this.ensureState("location.latitude", "Latitude", "number", "value.gps.latitude", false, "\xB0");
    await this.ensureState("location.longitude", "Longitude", "number", "value.gps.longitude", false, "\xB0");
    await this.ensureState("location.timezone", "Effective timezone", "string", "text", false);
    await this.ensureChannel("summary", "Energy summaries");
    await this.ensureState("summary.today.energy_kwh", "Today energy forecast", "number", "value", false, "kWh");
    await this.ensureState(
      "summary.currentWeek.energy_kwh",
      "Current week energy forecast",
      "number",
      "value",
      false,
      "kWh"
    );
    await this.ensureState(
      "summary.currentWeek.complete",
      "Current week forecast complete",
      "boolean",
      "indicator",
      false
    );
    await this.ensureState(
      "summary.currentMonth.energy_kwh",
      "Current month energy forecast",
      "number",
      "value",
      false,
      "kWh"
    );
    await this.ensureState(
      "summary.currentMonth.complete",
      "Current month forecast complete",
      "boolean",
      "indicator",
      false
    );
    await this.ensureChannel("forecast", "Forecast data");
    await this.ensureChannel("forecast.daily", "Daily forecast data");
    await this.ensureChannel("forecast.hourly", "Hourly forecast data");
    await this.ensureChannel("forecast.hourly.timestamps", "Hourly forecast grouped by local timestamp");
    await this.ensureChannel("forecast.json", "JSON mirrors");
    await this.ensureState("forecast.json.hourly", "Hourly forecast JSON", "string", "json", false);
    await this.ensureState("forecast.json.daily", "Daily forecast JSON", "string", "json", false);
    await this.ensureState("forecast.json.summary", "Summary JSON", "string", "json", false);
    for (let index = 0; index < 7; index++) {
      const prefix = `forecast.daily.day${index}`;
      await this.ensureChannel(prefix, `Daily forecast day ${index}`);
      await this.ensureState(`${prefix}.date`, `Date for day ${index}`, "string", "value.date", false);
      await this.ensureState(`${prefix}.energy_kwh`, `Energy for day ${index}`, "number", "value", false, "kWh");
    }
  }
  async writeSnapshot(snapshot) {
    await this.writeLocationStates(snapshot);
    await this.writeSummaryStates(snapshot);
    await this.writeDailyStates(snapshot.daily);
    await this.syncHourlyStates(snapshot.hourly);
    await this.setStateAsync("forecast.json.hourly", {
      val: JSON.stringify(snapshot.hourly),
      ack: true
    });
    await this.setStateAsync("forecast.json.daily", {
      val: JSON.stringify(snapshot.daily),
      ack: true
    });
    await this.setStateAsync("forecast.json.summary", {
      val: JSON.stringify({
        todayEnergyKwh: snapshot.todayEnergyKwh,
        currentWeek: snapshot.currentWeek,
        currentMonth: snapshot.currentMonth
      }),
      ack: true
    });
  }
  async writeLocationStates(snapshot) {
    await this.setStateAsync("location.resolvedName", { val: snapshot.location.resolvedName, ack: true });
    await this.setStateAsync("location.countryCode", { val: snapshot.location.countryCode, ack: true });
    await this.setStateAsync("location.latitude", { val: snapshot.location.latitude, ack: true });
    await this.setStateAsync("location.longitude", { val: snapshot.location.longitude, ack: true });
    await this.setStateAsync("location.timezone", { val: snapshot.location.timeZone, ack: true });
  }
  async writeSummaryStates(snapshot) {
    await this.setStateAsync("summary.today.energy_kwh", { val: snapshot.todayEnergyKwh, ack: true });
    await this.setStateAsync("summary.currentWeek.energy_kwh", { val: snapshot.currentWeek.energyKwh, ack: true });
    await this.setStateAsync("summary.currentWeek.complete", { val: snapshot.currentWeek.complete, ack: true });
    await this.setStateAsync("summary.currentMonth.energy_kwh", {
      val: snapshot.currentMonth.energyKwh,
      ack: true
    });
    await this.setStateAsync("summary.currentMonth.complete", { val: snapshot.currentMonth.complete, ack: true });
  }
  async writeDailyStates(days) {
    for (let index = 0; index < days.length; index++) {
      const day = days[index];
      await this.setStateAsync(`forecast.daily.day${index}.date`, { val: day.date, ack: true });
      await this.setStateAsync(`forecast.daily.day${index}.energy_kwh`, { val: day.energyKwh, ack: true });
    }
  }
  async syncHourlyStates(rows) {
    const desiredChannels = /* @__PURE__ */ new Set();
    for (const row of rows) {
      const channelId = `forecast.hourly.timestamps.${(0, import_dates.sanitizeStateKey)(row.timestamp)}`;
      desiredChannels.add(channelId);
      await this.ensureChannel(channelId, row.timestamp);
      await this.ensureState(`${channelId}.timestamp`, "Local forecast timestamp", "string", "text", false);
      await this.ensureState(`${channelId}.local_date`, "Local forecast date", "string", "value.date", false);
      await this.ensureState(`${channelId}.local_time`, "Local forecast time", "string", "text", false);
      await this.ensureState(
        `${channelId}.energy_kwh`,
        "Forecast energy for this hour",
        "number",
        "value",
        false,
        "kWh"
      );
      await this.ensureState(
        `${channelId}.cloud_cover_percent`,
        "Cloud cover for this hour",
        "number",
        "value",
        false,
        "%"
      );
      await this.ensureState(
        `${channelId}.gti_wm2`,
        "Global tilted irradiance for this hour",
        "number",
        "value",
        false,
        "W/m\xB2"
      );
      await this.setStateAsync(`${channelId}.timestamp`, { val: row.timestamp, ack: true });
      await this.setStateAsync(`${channelId}.local_date`, { val: row.localDate, ack: true });
      await this.setStateAsync(`${channelId}.local_time`, { val: row.localTime, ack: true });
      await this.setStateAsync(`${channelId}.energy_kwh`, { val: row.energyKwh, ack: true });
      await this.setStateAsync(`${channelId}.cloud_cover_percent`, { val: row.cloudCoverPercent, ack: true });
      await this.setStateAsync(`${channelId}.gti_wm2`, { val: row.gtiWm2, ack: true });
    }
    const adapterObjects = await this.getAdapterObjectsAsync();
    const staleChannels = /* @__PURE__ */ new Set();
    const prefix = `${this.namespace}.forecast.hourly.timestamps.`;
    for (const fullId of Object.keys(adapterObjects)) {
      if (!fullId.startsWith(prefix)) {
        continue;
      }
      const relativeId = fullId.slice(this.namespace.length + 1);
      const segments = relativeId.split(".");
      if (segments.length < 4) {
        continue;
      }
      const channelId = segments.slice(0, 4).join(".");
      if (!desiredChannels.has(channelId)) {
        staleChannels.add(channelId);
      }
    }
    for (const channelId of staleChannels) {
      await this.delObjectAsync(channelId, { recursive: true });
    }
  }
  async ensureChannel(id, name) {
    await this.setObjectNotExistsAsync(id, {
      type: "channel",
      common: {
        name
      },
      native: {}
    });
  }
  async ensureState(id, name, type, role, write, unit) {
    await this.setObjectNotExistsAsync(id, {
      type: "state",
      common: {
        name,
        type,
        role,
        read: true,
        write,
        unit
      },
      native: {}
    });
  }
}
if (require.main !== module) {
  module.exports = (options) => new Pvforecast(options);
} else {
  (() => new Pvforecast())();
}
//# sourceMappingURL=main.js.map
