import { expect } from 'chai';
import sinon from 'sinon';

import { OpenMeteoClient } from '../src/lib/open-meteo-client';

describe('OpenMeteoClient', () => {
    it('filters geocoding results by country code when available', async () => {
        const fetchStub = sinon.stub().resolves({
            ok: true,
            json: () =>
                Promise.resolve({
                    results: [
                        {
                            name: 'Berlin',
                            country: 'United States',
                            country_code: 'US',
                            latitude: 40,
                            longitude: -75,
                            timezone: 'America/New_York',
                        },
                        {
                            name: 'Berlin',
                            country: 'Germany',
                            country_code: 'DE',
                            latitude: 52.52,
                            longitude: 13.405,
                            timezone: 'Europe/Berlin',
                        },
                    ],
                }),
        });

        const client = new OpenMeteoClient(fetchStub as unknown as typeof fetch);
        const result = await client.geocode('Berlin', 'DE');

        expect(result.countryCode).to.equal('DE');
        expect(result.latitude).to.equal(52.52);
        expect(result.timeZone).to.equal('Europe/Berlin');
    });

    it('builds the expected forecast query', async () => {
        const fetchStub = sinon.stub().resolves({
            ok: true,
            json: () =>
                Promise.resolve({
                    timezone: 'Europe/Berlin',
                    hourly: {
                        time: ['2026-03-20T00:00'],
                        global_tilted_irradiance: [100],
                        cloud_cover: [20],
                    },
                }),
        });

        const client = new OpenMeteoClient(fetchStub as unknown as typeof fetch);
        await client.fetchForecast({
            latitude: 52.52,
            longitude: 13.405,
            timeZone: 'Europe/Berlin',
            tiltDeg: 35,
            azimuthDeg: -15,
        });

        const calledUrl = new URL(fetchStub.firstCall.args[0].toString());
        expect(calledUrl.hostname).to.equal('api.open-meteo.com');
        expect(calledUrl.searchParams.get('hourly')).to.equal('global_tilted_irradiance,cloud_cover');
        expect(calledUrl.searchParams.get('past_days')).to.equal('31');
        expect(calledUrl.searchParams.get('forecast_days')).to.equal('16');
        expect(calledUrl.searchParams.get('timezone')).to.equal('Europe/Berlin');
        expect(calledUrl.searchParams.get('tilt')).to.equal('35');
        expect(calledUrl.searchParams.get('azimuth')).to.equal('-15');
    });
});
