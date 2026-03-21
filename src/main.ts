/*
 * Created with @iobroker/create-adapter v3.1.2
 */

import * as utils from '@iobroker/adapter-core';
import { AdapterRuntime } from './lib/adapter-runtime';
import { LocationResolver, RESOLVE_LOCATION_CONFIG_COMMAND } from './lib/location-resolver';

class Solarforecast extends utils.Adapter {
    private readonly runtime = new AdapterRuntime(this);
    private readonly locationResolver = new LocationResolver();

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'solarforecast',
        });

        this.on('ready', this.runtime.onReady.bind(this.runtime));
        this.on('unload', this.runtime.onUnload.bind(this.runtime));
        this.on('message', this.onMessage.bind(this));
    }

    private async onMessage(obj: ioBroker.Message): Promise<void> {
        if (!obj || obj.command !== RESOLVE_LOCATION_CONFIG_COMMAND || !obj.callback) {
            return;
        }

        const response = await this.locationResolver.validateGeocodeLocation(obj.message);
        this.sendTo(obj.from, obj.command, response, obj.callback);
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Solarforecast(options);
} else {
    // otherwise start the instance directly
    (() => new Solarforecast())();
}
