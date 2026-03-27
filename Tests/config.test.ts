import { expect } from 'chai';

import { resolveEffectiveConfig } from '../src/lib/config';

describe('resolveEffectiveConfig', () => {
    it('normalizes the geocoding mode with the new peak power setting', () => {
        const config = resolveEffectiveConfig({
            locationMode: 'geocode',
            city: '',
            countryCode: '',
            latitude: undefined as unknown as number,
            longitude: undefined as unknown as number,
            timezoneMode: 'auto',
            timezone: '',
            refreshIntervalMinutes: undefined as unknown as number,
            tiltDeg: undefined as unknown as number,
            azimuthDeg: undefined as unknown as number,
            peakPowerKwp: 2.2,
            morningDampingPct: undefined as unknown as number,
            afternoonDampingPct: undefined as unknown as number,
        } as ioBroker.AdapterConfig);

        expect(config.locationMode).to.equal('geocode');
        expect(config.city).to.equal('Berlin');
        expect(config.countryCode).to.equal('');
        expect(config.latitude).to.equal(null);
        expect(config.longitude).to.equal(null);
        expect(config.timezoneMode).to.equal('auto');
        expect(config.timeZone).to.equal('auto');
        expect(config.refreshIntervalMinutes).to.equal(60);
        expect(config.tiltDeg).to.equal(0);
        expect(config.azimuthDeg).to.equal(0);
        expect(config.peakPowerKwp).to.equal(2.2);
        expect(config.morningDampingPct).to.equal(100);
        expect(config.afternoonDampingPct).to.equal(100);
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
            refreshIntervalMinutes: 15,
            tiltDeg: 35,
            azimuthDeg: -15,
            peakPowerKwp: 9.8,
            morningDampingPct: 85,
            afternoonDampingPct: 70,
        } as ioBroker.AdapterConfig);

        expect(config.locationMode).to.equal('manual');
        expect(config.countryCode).to.equal('DE');
        expect(config.latitude).to.equal(50.5);
        expect(config.longitude).to.equal(11.8);
        expect(config.timeZone).to.equal('Europe/Berlin');
        expect(config.refreshIntervalMinutes).to.equal(15);
        expect(config.tiltDeg).to.equal(35);
        expect(config.azimuthDeg).to.equal(-15);
        expect(config.peakPowerKwp).to.equal(9.8);
        expect(config.morningDampingPct).to.equal(85);
        expect(config.afternoonDampingPct).to.equal(70);
    });

    it('rejects missing legacy-to-new peak power migrations', () => {
        expect(() =>
            resolveEffectiveConfig({
                locationMode: 'geocode',
                city: 'Berlin',
                countryCode: 'DE',
                latitude: 0,
                longitude: 0,
                timezoneMode: 'auto',
                timezone: '',
                refreshIntervalMinutes: 60,
                tiltDeg: 0,
                azimuthDeg: 0,
                peakPowerKwp: undefined as unknown as number,
                morningDampingPct: 100,
                afternoonDampingPct: 100,
            } as ioBroker.AdapterConfig),
        ).to.throw('peakPowerKwp');
    });

    it('rejects invalid coordinates, timezones and peak power values', () => {
        expect(() =>
            resolveEffectiveConfig({
                locationMode: 'manual',
                city: 'Invalid setup',
                countryCode: '',
                latitude: 95,
                longitude: 11.8,
                timezoneMode: 'auto',
                timezone: '',
                refreshIntervalMinutes: 60,
                tiltDeg: 0,
                azimuthDeg: 0,
                peakPowerKwp: 2.2,
                morningDampingPct: 100,
                afternoonDampingPct: 100,
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
                refreshIntervalMinutes: 60,
                tiltDeg: 0,
                azimuthDeg: 0,
                peakPowerKwp: 2.2,
                morningDampingPct: 100,
                afternoonDampingPct: 100,
            } as ioBroker.AdapterConfig),
        ).to.throw('timezone');

        expect(() =>
            resolveEffectiveConfig({
                locationMode: 'geocode',
                city: 'Berlin',
                countryCode: '',
                latitude: 0,
                longitude: 0,
                timezoneMode: 'auto',
                timezone: '',
                refreshIntervalMinutes: 60,
                tiltDeg: 0,
                azimuthDeg: 0,
                peakPowerKwp: 0,
                morningDampingPct: 100,
                afternoonDampingPct: 100,
            } as ioBroker.AdapterConfig),
        ).to.throw('peakPowerKwp');

        expect(() =>
            resolveEffectiveConfig({
                locationMode: 'geocode',
                city: 'Berlin',
                countryCode: '',
                latitude: 0,
                longitude: 0,
                timezoneMode: 'auto',
                timezone: '',
                refreshIntervalMinutes: 60,
                tiltDeg: 0,
                azimuthDeg: 0,
                peakPowerKwp: 2.2,
                morningDampingPct: 101,
                afternoonDampingPct: 100,
            } as ioBroker.AdapterConfig),
        ).to.throw('morningDampingPct');

        expect(() =>
            resolveEffectiveConfig({
                locationMode: 'geocode',
                city: 'Berlin',
                countryCode: '',
                latitude: 0,
                longitude: 0,
                timezoneMode: 'auto',
                timezone: '',
                refreshIntervalMinutes: 60,
                tiltDeg: 0,
                azimuthDeg: 0,
                peakPowerKwp: 2.2,
                morningDampingPct: 100,
                afternoonDampingPct: -1,
            } as ioBroker.AdapterConfig),
        ).to.throw('afternoonDampingPct');

        expect(() =>
            resolveEffectiveConfig({
                locationMode: 'geocode',
                city: 'Berlin',
                countryCode: '',
                latitude: 0,
                longitude: 0,
                timezoneMode: 'auto',
                timezone: '',
                refreshIntervalMinutes: 0,
                tiltDeg: 0,
                azimuthDeg: 0,
                peakPowerKwp: 2.2,
                morningDampingPct: 100,
                afternoonDampingPct: 100,
            } as ioBroker.AdapterConfig),
        ).to.throw('refreshIntervalMinutes');

        expect(() =>
            resolveEffectiveConfig({
                locationMode: 'geocode',
                city: 'Berlin',
                countryCode: '',
                latitude: 0,
                longitude: 0,
                timezoneMode: 'auto',
                timezone: '',
                refreshIntervalMinutes: 1.5,
                tiltDeg: 0,
                azimuthDeg: 0,
                peakPowerKwp: 2.2,
                morningDampingPct: 100,
                afternoonDampingPct: 100,
            } as ioBroker.AdapterConfig),
        ).to.throw('refreshIntervalMinutes');
    });
});
