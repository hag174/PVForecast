import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sinon from 'sinon';

import {
    LOCATION_VALIDATION_DISPLAY_TEXT_FIELD,
    LOCATION_VALIDATED_KEY_FIELD,
    LocationResolver,
} from '../src/lib/location-resolver';

type JsonConfigItem = {
    type?: string;
    disabled?: boolean | string;
    min?: number;
    step?: number;
    onChange?: {
        calculateFunc?: string;
    };
};

function loadJsonConfig(): { items?: Record<string, JsonConfigItem> } {
    return JSON.parse(readFileSync(join(process.cwd(), 'admin', 'jsonConfig.json'), 'utf8')) as {
        items?: Record<string, JsonConfigItem>;
    };
}

function loadLocationValidationCalculateFunc(): (data: Record<string, unknown>, alive: boolean) => string {
    const jsonConfig = loadJsonConfig();
    const calculateFunc = jsonConfig.items?._locationValidationDisplay?.onChange?.calculateFunc;

    if (!calculateFunc) {
        throw new Error('The admin jsonConfig is missing the city validation display calculate function.');
    }

    return new Function('data', '_alive', calculateFunc) as (data: Record<string, unknown>, alive: boolean) => string;
}

describe('admin jsonConfig city validation display', () => {
    const evaluateDisplay = loadLocationValidationCalculateFunc();

    it('shows the success message after a successful city check in the settings dialog', async () => {
        const geocodeStub = sinon.stub().resolves({
            resolvedName: 'Schleiz, Germany',
            countryCode: 'DE',
            latitude: 50.5788,
            longitude: 11.8114,
            timeZone: 'Europe/Berlin',
        });
        const resolver = new LocationResolver({ geocode: geocodeStub });

        const result = await resolver.validateGeocodeLocation({
            city: 'Schleiz',
            countryCode: '',
            timezoneMode: 'auto',
            timezone: '',
        });

        const displayText = evaluateDisplay(
            {
                locationMode: 'geocode',
                city: 'Schleiz',
                countryCode: '',
                ...result.native,
            },
            true,
        );

        expect(displayText).to.equal(result.native[LOCATION_VALIDATION_DISPLAY_TEXT_FIELD]);
        expect(result.native[LOCATION_VALIDATED_KEY_FIELD]).to.equal('Schleiz|DE');
    });

    it('shows the error message after a failed city check in the settings dialog', async () => {
        const geocodeStub = sinon.stub().rejects(new Error('No matching location was found for "Atlantis".'));
        const resolver = new LocationResolver({ geocode: geocodeStub });

        const result = await resolver.validateGeocodeLocation({
            city: 'Atlantis',
            countryCode: 'de',
            timezoneMode: 'auto',
            timezone: '',
        });

        const displayText = evaluateDisplay(
            {
                locationMode: 'geocode',
                city: 'Atlantis',
                countryCode: 'de',
                ...result.native,
            },
            true,
        );

        expect(displayText).to.equal(result.native[LOCATION_VALIDATION_DISPLAY_TEXT_FIELD]);
    });

    it('returns "Not checked yet." after the city input changes since the last validation', async () => {
        const geocodeStub = sinon.stub().resolves({
            resolvedName: 'Schleiz, Germany',
            countryCode: 'DE',
            latitude: 50.5788,
            longitude: 11.8114,
            timeZone: 'Europe/Berlin',
        });
        const resolver = new LocationResolver({ geocode: geocodeStub });

        const result = await resolver.validateGeocodeLocation({
            city: 'Schleiz',
            countryCode: '',
            timezoneMode: 'auto',
            timezone: '',
        });

        const displayText = evaluateDisplay(
            {
                ...result.native,
                locationMode: 'geocode',
                city: 'Schleiz changed',
                countryCode: 'DE',
            },
            true,
        );

        expect(displayText).to.equal('Not checked yet.');
    });

    it('keeps the city validation status as a disabled display field', () => {
        const jsonConfig = loadJsonConfig();
        const statusField = jsonConfig.items?._locationValidationDisplay;

        expect(statusField?.type).to.equal('text');
        expect(statusField?.disabled).to.equal(true);
    });

    it('defines the refresh interval as a positive integer minute field', () => {
        const jsonConfig = loadJsonConfig();
        const refreshField = jsonConfig.items?.refreshIntervalMinutes;

        expect(refreshField?.type).to.equal('number');
        expect(refreshField?.min).to.equal(1);
        expect(refreshField?.step).to.equal(1);
    });
});
