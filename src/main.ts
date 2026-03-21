/*
 * Created with @iobroker/create-adapter v3.1.2
 */

import * as utils from '@iobroker/adapter-core';
import { AdapterRuntime } from './lib/adapter-runtime';

class Pvforecast extends utils.Adapter {
    private readonly runtime = new AdapterRuntime(this);

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'pvforecast',
        });

        this.on('ready', this.runtime.onReady.bind(this.runtime));
        this.on('unload', this.runtime.onUnload.bind(this.runtime));
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Pvforecast(options);
} else {
    // otherwise start the instance directly
    (() => new Pvforecast())();
}
