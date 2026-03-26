/*
 * Created with @iobroker/create-adapter v3.1.2
 */

import * as utils from '@iobroker/adapter-core';
import { AdapterRuntime } from './lib/adapter-runtime';
import { AdminLocationMessageHandler } from './lib/admin-location-message-handler';

class Solarforecast extends utils.Adapter {
    private readonly runtime = new AdapterRuntime(this);
    private readonly adminLocationMessageHandler = new AdminLocationMessageHandler(this);

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
        await this.adminLocationMessageHandler.handleMessage(obj);
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Solarforecast(options);
} else {
    // otherwise start the instance directly
    (() => new Solarforecast())();
}
