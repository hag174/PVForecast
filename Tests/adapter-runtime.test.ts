import { expect } from 'chai';
import sinon from 'sinon';

import {
    AdapterRuntime,
    HOURLY_REFRESH_INTERVAL_MS,
    REQUEST_TIMEOUT_MS,
    type AdapterRuntimeHost,
} from '../src/lib/adapter-runtime';
import type { ForecastRow, ForecastSnapshot } from '../src/lib/types';

function createAdapterConfig(): ioBroker.AdapterConfig {
    return {
        locationMode: 'geocode',
        city: 'Berlin',
        countryCode: 'DE',
        latitude: 52.52,
        longitude: 13.405,
        timezoneMode: 'auto',
        timezone: 'Europe/Berlin',
        tiltDeg: 35,
        azimuthDeg: -15,
        arrayAreaM2: 10,
        panelEfficiencyPct: 22,
    } as ioBroker.AdapterConfig;
}

function createDailyForecast(): ForecastSnapshot['daily'] {
    return Array.from({ length: 7 }, (_, index) => ({
        date: `2026-03-${(21 + index).toString().padStart(2, '0')}`,
        energyKwh: Number((4.5 + index).toFixed(3)),
    }));
}

function createSnapshot(hourly?: ForecastRow[]): ForecastSnapshot {
    return {
        location: {
            resolvedName: 'Berlin, Germany',
            countryCode: 'DE',
            latitude: 52.52,
            longitude: 13.405,
            timeZone: 'Europe/Berlin',
        },
        hourly: hourly ?? [
            {
                timestamp: '2026-03-21T10:00',
                localDate: '2026-03-21',
                localTime: '10:00',
                energyKwh: 1.25,
                cloudCoverPercent: 20,
                gtiWm2: 400,
            },
            {
                timestamp: '2026-03-21T11:00',
                localDate: '2026-03-21',
                localTime: '11:00',
                energyKwh: 1.5,
                cloudCoverPercent: 18,
                gtiWm2: 430,
            },
        ],
        daily: createDailyForecast(),
        todayEnergyKwh: 6.75,
        currentWeek: {
            energyKwh: 32.4,
            complete: true,
        },
        currentMonth: {
            energyKwh: 109.2,
            complete: false,
        },
    };
}

class TestHost implements AdapterRuntimeHost {
    public config: ioBroker.AdapterConfig;
    public readonly namespace = 'solarforecast.0';
    public readonly log = {
        error: sinon.spy(),
        warn: sinon.spy(),
    };
    public readonly states = new Map<string, ioBroker.StateValue | ioBroker.SettableState>();
    public readonly objects = new Map<string, ioBroker.Object>();
    public readonly intervals: Array<{ callback: () => void; ms: number; handle: ioBroker.Interval }> = [];
    public readonly clearedIntervals: ioBroker.Interval[] = [];
    public readonly deletedIds: string[] = [];

    public constructor(config: ioBroker.AdapterConfig = createAdapterConfig()) {
        this.config = config;
    }

    public setInterval(callback: () => void, ms: number): ioBroker.Interval {
        const handle = { callback, ms } as unknown as ioBroker.Interval;
        this.intervals.push({ callback, ms, handle });
        return handle;
    }

    public clearInterval(id: ioBroker.Interval): void {
        this.clearedIntervals.push(id);
    }

    public setStateAsync(id: string, state: ioBroker.StateValue | ioBroker.SettableState): Promise<unknown> {
        this.states.set(id, state);
        return Promise.resolve(undefined);
    }

    public setObjectNotExistsAsync(id: string, obj: ioBroker.SettableObject): Promise<unknown> {
        const fullId = `${this.namespace}.${id}`;
        if (!this.objects.has(fullId)) {
            this.objects.set(fullId, {
                _id: fullId,
                ...obj,
            } as ioBroker.Object);
        }

        return Promise.resolve(undefined);
    }

    public getAdapterObjectsAsync(): Promise<Record<string, ioBroker.Object>> {
        return Promise.resolve(Object.fromEntries(this.objects.entries()));
    }

    public delObjectAsync(id: string): Promise<void> {
        this.deletedIds.push(id);
        const prefix = `${this.namespace}.${id}`;

        for (const fullId of Array.from(this.objects.keys())) {
            if (fullId === prefix || fullId.startsWith(`${prefix}.`)) {
                this.objects.delete(fullId);
            }
        }

        return Promise.resolve();
    }

    public seedObject(id: string, type: ioBroker.ObjectType = 'state'): void {
        const fullId = `${this.namespace}.${id}`;
        this.objects.set(fullId, {
            _id: fullId,
            type,
            common: {},
            native: {},
        } as ioBroker.Object);
    }

    public getState(id: string): ioBroker.SettableState | undefined {
        return this.states.get(id) as ioBroker.SettableState | undefined;
    }

    public getObject(id: string): ioBroker.Object | undefined {
        return this.objects.get(`${this.namespace}.${id}`);
    }

    public hasObject(id: string): boolean {
        return this.objects.has(`${this.namespace}.${id}`);
    }
}

describe('AdapterRuntime', () => {
    let clock: sinon.SinonFakeTimers | undefined;

    afterEach(() => {
        clock?.restore();
        clock = undefined;
    });

    it('initializes static objects, writes snapshot states and schedules hourly refreshes', async () => {
        const host = new TestHost();
        const snapshot = createSnapshot();
        const fetchSnapshot = sinon.stub().resolves(snapshot);
        const runtime = new AdapterRuntime(host, {
            forecastService: { fetchSnapshot },
            now: () => new Date('2026-03-21T08:15:00.000Z'),
        });

        await runtime.onReady();

        expect(fetchSnapshot.calledOnce).to.equal(true);
        expect(host.hasObject('info.connection')).to.equal(true);
        expect(host.hasObject('forecast.hourly.timestamps.2026_03_21T10_00')).to.equal(true);
        expect(host.getState('info.connection')?.val).to.equal(true);
        expect(host.getState('info.lastError')?.val).to.equal('');
        expect(host.getState('info.lastUpdate')?.val).to.equal('2026-03-21T08:15:00.000Z');
        expect(host.getObject('info.lastUpdate')?.common.role).to.equal('value.datetime');
        expect(host.getState('forecast.json.hourly')?.val).to.equal(JSON.stringify(snapshot.hourly));
        expect(host.intervals).to.have.lengthOf(1);
        expect(host.intervals[0].ms).to.equal(HOURLY_REFRESH_INTERVAL_MS);
    });

    it('keeps the previous forecast values when a refresh fails', async () => {
        const host = new TestHost();
        const firstSnapshot = createSnapshot();
        const fetchSnapshot = sinon.stub();
        fetchSnapshot.onFirstCall().resolves(firstSnapshot);
        fetchSnapshot.onSecondCall().rejects(new Error('boom'));

        const runtime = new AdapterRuntime(host, {
            forecastService: { fetchSnapshot },
            now: () => new Date('2026-03-21T08:15:00.000Z'),
        });

        await runtime.onReady();
        const previousHourlyJson = host.getState('forecast.json.hourly')?.val;

        await runtime.refreshForecast();

        expect(host.getState('forecast.json.hourly')?.val).to.equal(previousHourlyJson);
        expect(host.getState('info.connection')?.val).to.equal(false);
        expect(host.getState('info.lastError')?.val).to.equal('boom');
        expect(host.log.error.calledOnce).to.equal(true);
    });

    it('aborts in-flight refreshes during unload and clears the scheduler', async () => {
        const host = new TestHost();
        const fetchSnapshot = sinon.stub();
        fetchSnapshot.onFirstCall().resolves(createSnapshot());
        fetchSnapshot.onSecondCall().callsFake(
            async (_config: ioBroker.AdapterConfig, signal?: AbortSignal): Promise<ForecastSnapshot> =>
                new Promise((resolve, reject) => {
                    signal?.addEventListener(
                        'abort',
                        () => {
                            reject(
                                signal.reason instanceof Error
                                    ? signal.reason
                                    : new Error(String(signal.reason ?? 'aborted')),
                            );
                        },
                        { once: true },
                    );
                }),
        );

        const runtime = new AdapterRuntime(host, {
            forecastService: { fetchSnapshot },
        });

        await runtime.onReady();

        const refreshPromise = runtime.refreshForecast();
        let unloadCalled = false;
        runtime.onUnload(() => {
            unloadCalled = true;
        });
        await refreshPromise;

        const abortSignal = fetchSnapshot.secondCall.args[1] as AbortSignal;
        expect(unloadCalled).to.equal(true);
        expect(host.clearedIntervals).to.have.lengthOf(1);
        expect(abortSignal.aborted).to.equal(true);
        expect(host.log.error.called).to.equal(false);
    });

    it('skips overlapping scheduled refreshes', async () => {
        const host = new TestHost();
        const fetchSnapshot = sinon.stub();
        let resolvePendingRefresh: ((snapshot: ForecastSnapshot) => void) | undefined;

        fetchSnapshot.onFirstCall().resolves(createSnapshot());
        fetchSnapshot.onSecondCall().returns(
            new Promise<ForecastSnapshot>(resolve => {
                resolvePendingRefresh = resolve;
            }),
        );

        const runtime = new AdapterRuntime(host, {
            forecastService: { fetchSnapshot },
        });

        await runtime.onReady();

        const pendingRefresh = runtime.refreshForecast();
        host.intervals[0].callback();

        expect(fetchSnapshot.callCount).to.equal(2);
        expect(host.log.warn.calledOnce).to.equal(true);

        resolvePendingRefresh?.(createSnapshot());
        await pendingRefresh;
    });

    it('marks the refresh as failed when a request times out', async () => {
        clock = sinon.useFakeTimers(new Date('2026-03-21T08:00:00.000Z'));

        const host = new TestHost();
        const fetchSnapshot = sinon.stub().callsFake(
            async (_config: ioBroker.AdapterConfig, signal?: AbortSignal): Promise<ForecastSnapshot> =>
                new Promise((resolve, reject) => {
                    signal?.addEventListener(
                        'abort',
                        () => {
                            reject(
                                signal.reason instanceof Error
                                    ? signal.reason
                                    : new Error(String(signal.reason ?? 'aborted')),
                            );
                        },
                        { once: true },
                    );
                }),
        );

        const runtime = new AdapterRuntime(host, {
            forecastService: { fetchSnapshot },
        });

        const refreshPromise = runtime.refreshForecast();
        await clock.tickAsync(REQUEST_TIMEOUT_MS);
        await refreshPromise;

        expect(host.getState('info.connection')?.val).to.equal(false);
        expect(host.getState('info.lastError')?.val).to.equal(
            `Open-Meteo request timed out after ${REQUEST_TIMEOUT_MS} ms.`,
        );
        expect(host.log.error.calledOnce).to.equal(true);
    });

    it('creates DST-safe hourly keys and removes stale hourly channels', async () => {
        const host = new TestHost();
        host.seedObject('forecast.hourly.timestamps.2026_10_24T23_00.timestamp');

        const snapshot = createSnapshot([
            {
                timestamp: '2026-10-25T02:00',
                localDate: '2026-10-25',
                localTime: '02:00',
                energyKwh: 0.9,
                cloudCoverPercent: 15,
                gtiWm2: 320,
            },
            {
                timestamp: '2026-10-25T02:00',
                localDate: '2026-10-25',
                localTime: '02:00',
                energyKwh: 1.1,
                cloudCoverPercent: 18,
                gtiWm2: 360,
            },
            {
                timestamp: '2026-10-25T03:00',
                localDate: '2026-10-25',
                localTime: '03:00',
                energyKwh: 1.4,
                cloudCoverPercent: 12,
                gtiWm2: 410,
            },
        ]);

        const runtime = new AdapterRuntime(host, {
            forecastService: {
                fetchSnapshot: sinon.stub().resolves(snapshot),
            },
        });

        await runtime.onReady();

        expect(host.hasObject('forecast.hourly.timestamps.2026_10_25T02_00__1')).to.equal(true);
        expect(host.hasObject('forecast.hourly.timestamps.2026_10_25T02_00__2')).to.equal(true);
        expect(host.hasObject('forecast.hourly.timestamps.2026_10_25T03_00')).to.equal(true);
        expect(host.getState('forecast.hourly.timestamps.2026_10_25T02_00__1.timestamp')?.val).to.equal(
            '2026-10-25T02:00',
        );
        expect(host.getState('forecast.hourly.timestamps.2026_10_25T02_00__2.energy_kwh')?.val).to.equal(1.1);
        expect(host.deletedIds).to.include('forecast.hourly.timestamps.2026_10_24T23_00');
    });
});
