const path = require('node:path');

const FIXTURE_ENV = 'SOLARFORECAST_OPEN_METEO_FIXTURE';
const GEOCODING_HOST = 'geocoding-api.open-meteo.com';
const FORECAST_HOST = 'api.open-meteo.com';

function getFixture() {
    const fixtureName = process.env[FIXTURE_ENV];
    if (!fixtureName) {
        return undefined;
    }

    const fixtureModulePath = path.join(__dirname, 'fixtures', `${fixtureName}.js`);
    // Clear the cache so dynamic fixtures can evaluate the current date for each adapter process.
    delete require.cache[require.resolve(fixtureModulePath)];
    const createFixture = require(fixtureModulePath);
    return typeof createFixture === 'function' ? createFixture() : createFixture;
}

function createJsonResponse(payload) {
    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}

function createAbortError(signal) {
    if (signal && signal.reason instanceof Error) {
        return signal.reason;
    }

    return new Error('The operation was aborted.');
}

function getRequestUrl(input) {
    if (typeof input === 'string') {
        return input;
    }
    if (input instanceof URL) {
        return input.toString();
    }
    if (input && typeof input === 'object' && 'url' in input && typeof input.url === 'string') {
        return input.url;
    }

    return input.toString();
}

const originalFetch = globalThis.fetch?.bind(globalThis);
if (typeof originalFetch === 'function') {
    globalThis.fetch = async (input, init = {}) => {
        const fixture = getFixture();
        if (!fixture) {
            return originalFetch(input, init);
        }

        const url = new URL(getRequestUrl(input));
        if (init.signal?.aborted) {
            throw createAbortError(init.signal);
        }

        if (url.hostname === GEOCODING_HOST) {
            return createJsonResponse(fixture.geocode);
        }
        if (url.hostname === FORECAST_HOST) {
            return createJsonResponse(fixture.forecast);
        }

        return originalFetch(input, init);
    };
}
