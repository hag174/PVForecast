import { expect } from 'chai';
import sinon from 'sinon';

import {
    LOCATION_VALIDATED_KEY_FIELD,
    LOCATION_VALIDATION_MESSAGE_FIELD,
    LOCATION_VALIDATION_STATE_FIELD,
    LocationResolver,
} from '../src/lib/location-resolver';

describe('LocationResolver', () => {
    it('returns normalized coordinates and timezone for automatic city validation', async () => {
        const geocodeStub = sinon.stub().resolves({
            resolvedName: 'Berlin, Germany',
            countryCode: 'DE',
            latitude: 52.52,
            longitude: 13.405,
            timeZone: 'Europe/Berlin',
        });
        const resolver = new LocationResolver({ geocode: geocodeStub });

        const result = await resolver.validateGeocodeLocation({
            city: ' Berlin ',
            countryCode: 'de',
            timezoneMode: 'auto',
            timezone: 'Europe/Paris',
        });

        expect(geocodeStub.calledOnceWithExactly('Berlin', 'DE', undefined)).to.equal(true);
        expect(result.native.city).to.equal('Berlin');
        expect(result.native.countryCode).to.equal('DE');
        expect(result.native.latitude).to.equal(52.52);
        expect(result.native.longitude).to.equal(13.405);
        expect(result.native.timezone).to.equal('Europe/Berlin');
        expect(result.native[LOCATION_VALIDATED_KEY_FIELD]).to.equal('Berlin|DE');
        expect(result.native[LOCATION_VALIDATION_STATE_FIELD]).to.equal('success');
        expect(result.native[LOCATION_VALIDATION_MESSAGE_FIELD]).to.contain('Found: Berlin, Germany');
    });

    it('keeps the manual timezone override during a successful city validation', async () => {
        const geocodeStub = sinon.stub().resolves({
            resolvedName: 'Berlin, Germany',
            countryCode: 'DE',
            latitude: 52.52,
            longitude: 13.405,
            timeZone: 'Europe/Berlin',
        });
        const resolver = new LocationResolver({ geocode: geocodeStub });

        const result = await resolver.validateGeocodeLocation({
            city: 'Berlin',
            countryCode: '',
            timezoneMode: 'manual',
            timezone: 'Europe/Paris',
        });

        expect(geocodeStub.calledOnceWithExactly('Berlin', undefined, undefined)).to.equal(true);
        expect(result.native).to.not.have.property('timezone');
        expect(result.native[LOCATION_VALIDATED_KEY_FIELD]).to.equal('Berlin|');
        expect(result.native[LOCATION_VALIDATION_MESSAGE_FIELD]).to.contain('Europe/Paris');
    });

    it('returns an error response when the city lookup fails', async () => {
        const geocodeStub = sinon.stub().rejects(new Error('No matching location was found for "Atlantis".'));
        const resolver = new LocationResolver({ geocode: geocodeStub });

        const result = await resolver.validateGeocodeLocation({
            city: 'Atlantis',
            countryCode: 'de',
            timezoneMode: 'auto',
            timezone: 'Europe/Berlin',
        });

        expect(result.native.city).to.equal('Atlantis');
        expect(result.native.countryCode).to.equal('DE');
        expect(result.native[LOCATION_VALIDATED_KEY_FIELD]).to.equal('Atlantis|DE');
        expect(result.native[LOCATION_VALIDATION_STATE_FIELD]).to.equal('error');
        expect(result.native[LOCATION_VALIDATION_MESSAGE_FIELD]).to.equal(
            'No matching location was found for "Atlantis".',
        );
    });

    it('rejects invalid manual timezones before the geocoding request is sent', async () => {
        const geocodeStub = sinon.stub();
        const resolver = new LocationResolver({ geocode: geocodeStub });

        const result = await resolver.validateGeocodeLocation({
            city: 'Berlin',
            countryCode: 'DE',
            timezoneMode: 'manual',
            timezone: 'Mars/Base',
        });

        expect(geocodeStub.called).to.equal(false);
        expect(result.native[LOCATION_VALIDATED_KEY_FIELD]).to.equal('Berlin|DE');
        expect(result.native[LOCATION_VALIDATION_STATE_FIELD]).to.equal('error');
        expect(result.native[LOCATION_VALIDATION_MESSAGE_FIELD]).to.equal(
            'The configured timezone "Mars/Base" is not valid.',
        );
    });
});
