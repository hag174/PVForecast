import { expect } from 'chai';

import { resolveEffectiveConfig } from '../src/lib/config';

describe('resolveEffectiveConfig', () => {
    it('uses the planned defaults for geocoding mode', () => {
        const config = resolveEffectiveConfig({
            locationMode: 'geocode',
            city: '',
            countryCode: '',
            latitude: undefined as unknown as number,
            longitude: undefined as unknown as number,
            timezoneMode: 'auto',
            timezone: '',
            tiltDeg: undefined as unknown as number,
            azimuthDeg: undefined as unknown as number,
            arrayAreaM2: undefined as unknown as number,
            panelEfficiencyPct: undefined as unknown as number,
        } as ioBroker.AdapterConfig);

        expect(config.locationMode).to.equal('geocode');
        expect(config.city).to.equal('Berlin');
        expect(config.countryCode).to.equal('');
        expect(config.latitude).to.equal(null);
        expect(config.longitude).to.equal(null);
        expect(config.timezoneMode).to.equal('auto');
        expect(config.timeZone).to.equal('auto');
        expect(config.tiltDeg).to.equal(0);
        expect(config.azimuthDeg).to.equal(0);
        expect(config.arrayAreaM2).to.equal(10);
        expect(config.panelEfficiencyPct).to.equal(22);
        expect(config.refreshIntervalMinutes).to.equal(60);
    });

    it('validates the manual coordinate mode', () => {
        const config = resolveEffectiveConfig({
            locationMode: 'manual',
            city: 'Roof array',
            countryCode: 'de',
            latitude: 50.5,
            longitude: 11.8,
            timezoneMode: 'manual',
            timezone: 'Europe/Berlin',
            tiltDeg: 35,
            azimuthDeg: -15,
            arrayAreaM2: 29.3,
            panelEfficiencyPct: 22.3,
        } as ioBroker.AdapterConfig);

        expect(config.locationMode).to.equal('manual');
        expect(config.countryCode).to.equal('DE');
        expect(config.latitude).to.equal(50.5);
        expect(config.longitude).to.equal(11.8);
        expect(config.timeZone).to.equal('Europe/Berlin');
        expect(config.tiltDeg).to.equal(35);
        expect(config.azimuthDeg).to.equal(-15);
        expect(config.arrayAreaM2).to.equal(29.3);
        expect(config.panelEfficiencyPct).to.equal(22.3);
    });

    it('rejects invalid coordinates and timezones', () => {
        expect(() =>
            resolveEffectiveConfig({
                locationMode: 'manual',
                city: 'Invalid setup',
                countryCode: '',
                latitude: 95,
                longitude: 11.8,
                timezoneMode: 'auto',
                timezone: '',
                tiltDeg: 0,
                azimuthDeg: 0,
                arrayAreaM2: 10,
                panelEfficiencyPct: 22,
            } as ioBroker.AdapterConfig),
        ).to.throw('latitude');

        expect(() =>
            resolveEffectiveConfig({
                locationMode: 'geocode',
                city: 'Berlin',
                countryCode: '',
                latitude: 0,
                longitude: 0,
                timezoneMode: 'manual',
                timezone: 'Mars/Base',
                tiltDeg: 0,
                azimuthDeg: 0,
                arrayAreaM2: 10,
                panelEfficiencyPct: 22,
            } as ioBroker.AdapterConfig),
        ).to.throw('timezone');
    });
});
