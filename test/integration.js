const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { expect } = require('chai');
const { tests } = require('@iobroker/testing');

const TIME_ZONE = 'Europe/Berlin';
const FIXTURE_ENV = 'PVFORECAST_TEST_FIXTURES';
const ADAPTER_NAMESPACE = 'pvforecast.0';
const FIXTURE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pvforecast-integration-'));

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

function sanitizeStateKey(timestamp) {
    return timestamp.replace(/[^a-zA-Z0-9]/g, '_');
}

function createSuccessFixture() {
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
}

function createFailureFixture() {
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
}

function writeFixtureFile(name, content) {
    const filePath = path.join(FIXTURE_DIR, name);
    fs.writeFileSync(filePath, JSON.stringify(content), 'utf8');
    return filePath;
}

async function waitForState(harness, id, predicate, timeoutMs = 10000) {
    const existingState = await harness.states.getStateAsync(id);
    if (predicate(existingState)) {
        return existingState;
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            harness.off('stateChange', onStateChange);
            reject(new Error(`Timed out while waiting for state "${id}".`));
        }, timeoutMs);

        const onStateChange = (changedId, state) => {
            if (changedId !== id || !predicate(state)) {
                return;
            }

            clearTimeout(timeout);
            harness.off('stateChange', onStateChange);
            resolve(state);
        };

        harness.on('stateChange', onStateChange);
    });
}

async function seedStaleHourlyChannel(harness) {
    await harness.objects.setObjectAsync(`${ADAPTER_NAMESPACE}.forecast.hourly.timestamps.stale_fixture`, {
        type: 'channel',
        common: {
            name: 'stale fixture',
        },
        native: {},
    });
    await harness.objects.setObjectAsync(`${ADAPTER_NAMESPACE}.forecast.hourly.timestamps.stale_fixture.timestamp`, {
        type: 'state',
        common: {
            name: 'stale timestamp',
            type: 'string',
            role: 'text',
            read: true,
            write: false,
        },
        native: {},
    });
}

async function configureAdapter(harness) {
    await harness.changeAdapterConfig('pvforecast', {
        native: {
            locationMode: 'geocode',
            city: 'Berlin',
            countryCode: 'DE',
            timezoneMode: 'auto',
            timezone: TIME_ZONE,
            tiltDeg: 0,
            azimuthDeg: 0,
            arrayAreaM2: 10,
            panelEfficiencyPct: 22,
        },
    });
}

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, '..'), {
    defineAdditionalTests({ suite }) {
        suite('Publishes forecast states', (getHarness) => {
            let harness;
            let fixturePath;

            before(() => {
                harness = getHarness();
                fixturePath = writeFixtureFile('success-fixture.json', createSuccessFixture());
            });

            it('writes forecast states and removes stale hourly channels', async function () {
                this.timeout(30000);

                await configureAdapter(harness);
                await seedStaleHourlyChannel(harness);
                await harness.startAdapterAndWait(true, {
                    [FIXTURE_ENV]: fixturePath,
                });

                const today = formatLocalDate(new Date());
                const tomorrow = addDays(today, 1);
                const firstHourKey = sanitizeStateKey(`${today}T00:00`);
                const connectionState = await harness.states.getStateAsync(`${ADAPTER_NAMESPACE}.info.connection`);
                const lastErrorState = await harness.states.getStateAsync(`${ADAPTER_NAMESPACE}.info.lastError`);
                const todayEnergyState = await harness.states.getStateAsync(`${ADAPTER_NAMESPACE}.summary.today.energy_kwh`);
                const resolvedNameState = await harness.states.getStateAsync(`${ADAPTER_NAMESPACE}.location.resolvedName`);
                const timezoneState = await harness.states.getStateAsync(`${ADAPTER_NAMESPACE}.location.timezone`);
                const day0DateState = await harness.states.getStateAsync(`${ADAPTER_NAMESPACE}.forecast.daily.day0.date`);
                const day1DateState = await harness.states.getStateAsync(`${ADAPTER_NAMESPACE}.forecast.daily.day1.date`);
                const hourlyTimestampState = await harness.states.getStateAsync(
                    `${ADAPTER_NAMESPACE}.forecast.hourly.timestamps.${firstHourKey}.timestamp`,
                );
                const hourlyJsonState = await harness.states.getStateAsync(`${ADAPTER_NAMESPACE}.forecast.json.hourly`);
                const dailyJsonState = await harness.states.getStateAsync(`${ADAPTER_NAMESPACE}.forecast.json.daily`);
                const lastUpdateObject = await harness.objects.getObjectAsync(`${ADAPTER_NAMESPACE}.info.lastUpdate`);
                const staleChannel = await harness.objects.getObjectAsync(
                    `${ADAPTER_NAMESPACE}.forecast.hourly.timestamps.stale_fixture`,
                );

                expect(connectionState?.val).to.equal(true);
                expect(lastErrorState?.val).to.equal('');
                expect(todayEnergyState?.val).to.equal(5.28);
                expect(resolvedNameState?.val).to.equal('Berlin, Germany');
                expect(timezoneState?.val).to.equal(TIME_ZONE);
                expect(day0DateState?.val).to.equal(today);
                expect(day1DateState?.val).to.equal(tomorrow);
                expect(hourlyTimestampState?.val).to.equal(`${today}T00:00`);
                expect(lastUpdateObject?.common.role).to.equal('value.datetime');

                const hourlyJson = JSON.parse(hourlyJsonState.val);
                const dailyJson = JSON.parse(dailyJsonState.val);
                expect(hourlyJson).to.have.lengthOf(48);
                expect(dailyJson[0]).to.deep.equal({
                    date: today,
                    energyKwh: 5.28,
                });
                expect(dailyJson[1]).to.deep.equal({
                    date: tomorrow,
                    energyKwh: 5.28,
                });
                expect(staleChannel).to.equal(null);
            });
        });

        suite('Reports refresh failures', (getHarness) => {
            let harness;
            let fixturePath;

            before(() => {
                harness = getHarness();
                fixturePath = writeFixtureFile('failure-fixture.json', createFailureFixture());
            });

            it('sets info.lastError when the forecast payload is invalid', async function () {
                this.timeout(30000);

                await configureAdapter(harness);
                await harness.startAdapterAndWait(false, {
                    [FIXTURE_ENV]: fixturePath,
                });

                const lastErrorState = await waitForState(
                    harness,
                    `${ADAPTER_NAMESPACE}.info.lastError`,
                    (state) => Boolean(state && state.val),
                );
                const connectionState = await harness.states.getStateAsync(`${ADAPTER_NAMESPACE}.info.connection`);

                expect(connectionState?.val).to.equal(false);
                expect(lastErrorState.val).to.equal('The forecast payload is missing hourly GTI or cloud cover values.');
            });
        });
    },
});
