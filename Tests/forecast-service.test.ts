import { expect } from 'chai';
import sinon from 'sinon';

import { ForecastService } from '../src/lib/forecast-service';
import type { EffectiveConfig, OpenMeteoForecastResponse } from '../src/lib/types';

function createHourlyResponse(startDate: string, endDate: string): OpenMeteoForecastResponse {
    const times: string[] = [];
    const irradiance: number[] = [];
    const cloudCover: number[] = [];

    let current = new Date(`${startDate}T00:00:00Z`);
    const limit = new Date(`${endDate}T23:00:00Z`);

    while (current <= limit) {
        const isoTimestamp = current.toISOString().slice(0, 16);
        times.push(isoTimestamp);
        irradiance.push(100);
        cloudCover.push(20);
        current = new Date(current.getTime() + 60 * 60 * 1000);
    }

    return {
        timezone: 'Europe/Berlin',
        hourly: {
            time: times,
            global_tilted_irradiance: irradiance,
            cloud_cover: cloudCover,
        },
    };
}

describe('ForecastService', () => {
    const baseConfig: EffectiveConfig = {
        locationMode: 'geocode',
        city: 'Berlin',
        countryCode: 'DE',
        latitude: null,
        longitude: null,
        timezoneMode: 'auto',
        timeZone: 'auto',
        tiltDeg: 0,
        azimuthDeg: 0,
        arrayAreaM2: 10,
        panelEfficiencyPct: 22,
    };

    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
        clock = sinon.useFakeTimers(new Date('2026-03-20T10:00:00Z'));
    });

    afterEach(() => {
        clock.restore();
    });

    it('creates hourly, daily, weekly and monthly summaries from a complete response', async () => {
        const geocodeStub = sinon.stub().resolves({
            resolvedName: 'Berlin, Germany',
            countryCode: 'DE',
            latitude: 52.52,
            longitude: 13.405,
            timeZone: 'Europe/Berlin',
        });
        const forecastStub = sinon.stub().resolves(createHourlyResponse('2026-03-01', '2026-03-31'));

        const service = new ForecastService({
            geocode: geocodeStub,
            fetchForecast: forecastStub,
        });

        const snapshot = await service.fetchSnapshot(baseConfig);

        expect(snapshot.location.resolvedName).to.equal('Berlin, Germany');
        expect(snapshot.hourly).to.have.lengthOf(48);
        expect(snapshot.daily).to.have.lengthOf(7);
        expect(snapshot.daily[0]).to.deep.equal({
            date: '2026-03-20',
            energyKwh: 5.28,
        });
        expect(snapshot.todayEnergyKwh).to.equal(5.28);
        expect(snapshot.currentWeek.complete).to.equal(true);
        expect(snapshot.currentMonth.complete).to.equal(true);
        expect(snapshot.currentMonth.energyKwh).to.equal(163.68);
        expect(geocodeStub.calledOnce).to.equal(true);
        expect(forecastStub.calledOnce).to.equal(true);
    });

    it('marks the current month as partial when the response does not cover the full range', async () => {
        const geocodeStub = sinon.stub().resolves({
            resolvedName: 'Berlin, Germany',
            countryCode: 'DE',
            latitude: 52.52,
            longitude: 13.405,
            timeZone: 'Europe/Berlin',
        });
        const forecastStub = sinon.stub().resolves(createHourlyResponse('2026-03-10', '2026-03-31'));

        const service = new ForecastService({
            geocode: geocodeStub,
            fetchForecast: forecastStub,
        });

        const snapshot = await service.fetchSnapshot(baseConfig);

        expect(snapshot.currentMonth.complete).to.equal(false);
        expect(snapshot.currentWeek.complete).to.equal(true);
    });

    it('skips geocoding in manual mode', async () => {
        const geocodeStub = sinon.stub();
        const forecastStub = sinon.stub().resolves(createHourlyResponse('2026-03-01', '2026-03-31'));

        const service = new ForecastService({
            geocode: geocodeStub,
            fetchForecast: forecastStub,
        });

        await service.fetchSnapshot({
            ...baseConfig,
            locationMode: 'manual',
            city: 'Roof array',
            latitude: 50.57,
            longitude: 11.82,
            timezoneMode: 'manual',
            timeZone: 'Europe/Berlin',
        });

        expect(geocodeStub.called).to.equal(false);
        expect(forecastStub.calledOnce).to.equal(true);
    });

    it('forwards abort signals to geocoding and forecast requests', async () => {
        const signal = new AbortController().signal;
        const geocodeStub = sinon.stub().resolves({
            resolvedName: 'Berlin, Germany',
            countryCode: 'DE',
            latitude: 52.52,
            longitude: 13.405,
            timeZone: 'Europe/Berlin',
        });
        const forecastStub = sinon.stub().resolves(createHourlyResponse('2026-03-01', '2026-03-31'));

        const service = new ForecastService({
            geocode: geocodeStub,
            fetchForecast: forecastStub,
        });

        await service.fetchSnapshot(baseConfig, signal);

        expect(geocodeStub.firstCall.args[2]).to.equal(signal);
        expect(forecastStub.firstCall.args[0].signal).to.equal(signal);
    });
});
