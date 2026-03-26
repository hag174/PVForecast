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
var import_adapter_runtime = require("./lib/adapter-runtime");
var import_admin_location_message_handler = require("./lib/admin-location-message-handler");
class Solarforecast extends utils.Adapter {
  runtime = new import_adapter_runtime.AdapterRuntime(this);
  adminLocationMessageHandler = new import_admin_location_message_handler.AdminLocationMessageHandler(this);
  constructor(options = {}) {
    super({
      ...options,
      name: "solarforecast"
    });
    this.on("ready", this.runtime.onReady.bind(this.runtime));
    this.on("unload", this.runtime.onUnload.bind(this.runtime));
    this.on("message", this.onMessage.bind(this));
  }
  async onMessage(obj) {
    await this.adminLocationMessageHandler.handleMessage(obj);
  }
}
if (require.main !== module) {
  module.exports = (options) => new Solarforecast(options);
} else {
  (() => new Solarforecast())();
}
//# sourceMappingURL=main.js.map
