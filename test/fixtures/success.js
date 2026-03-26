const TIME_ZONE = 'Europe/Berlin';

function formatLocalDate(date, timeZone = TIME_ZONE) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const values = Object.fromEntries(
        parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
}

function addDays(dateString, days) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

module.exports = function createSuccessFixture() {
    const today = formatLocalDate(new Date());
    const startDate = addDays(today, -1);
    const endDate = addDays(today, 3);
    const times = [];
    const irradiance = [];
    const cloudCover = [];

    let currentDate = startDate;
    while (currentDate <= endDate) {
        for (let hour = 0; hour < 24; hour++) {
            times.push(`${currentDate}T${hour.toString().padStart(2, '0')}:00`);
            irradiance.push(100);
            cloudCover.push(20);
        }
        currentDate = addDays(currentDate, 1);
    }

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
                time: times,
                global_tilted_irradiance: irradiance,
                cloud_cover: cloudCover,
            },
        },
    };
};
