const TIME_ZONE = 'Europe/Berlin';

module.exports = function createFailureFixture() {
    return {
        geocode: {
            results: [
                {
                    name: 'Berlin',
                    country: 'Germany',
                    country_code: 'DE',
                    latitude: 52.52,
                    longitude: 13.405,
                    timezone: TIME_ZONE,
                },
            ],
        },
        forecast: {
            timezone: TIME_ZONE,
            hourly: {
                time: ['2026-03-21T00:00'],
                global_tilted_irradiance: [],
                cloud_cover: [],
            },
        },
    };
};
