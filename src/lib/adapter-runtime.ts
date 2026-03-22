/* eslint-disable jsdoc/require-jsdoc */

import { resolveEffectiveConfig } from './config';
import { createHourlyStateKeys } from './dates';
import { ForecastService } from './forecast-service';
import type { DailyForecast, ForecastRow, ForecastSnapshot } from './types';

type TimeoutHandle = ReturnType<typeof setTimeout>;
type RefreshTrigger = 'startup' | 'timer' | 'manual';

export const HOURLY_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
export const REQUEST_TIMEOUT_MS = 30_000;

export interface AdapterRuntimeHost {
    config: ioBroker.AdapterConfig;
    namespace: string;
    log: Pick<ioBroker.Logger, 'error' | 'warn'>;
    setInterval(callback: () => void, ms: number): ioBroker.Interval | undefined;
    clearInterval(id: ioBroker.Interval): void;
    setStateAsync(id: string, state: ioBroker.StateValue | ioBroker.SettableState): Promise<unknown>;
    setObjectNotExistsAsync(id: string, obj: ioBroker.SettableObject): Promise<unknown>;
    getAdapterObjectsAsync(): Promise<Record<string, ioBroker.Object>>;
    delObjectAsync(id: string, options?: ioBroker.DelObjectOptions): Promise<void>;
}

export interface AdapterRuntimeOptions {
    forecastService?: Pick<ForecastService, 'fetchSnapshot'>;
    now?: () => Date;
    setTimeout?: (callback: () => void, ms: number) => TimeoutHandle;
    clearTimeout?: (id: TimeoutHandle) => void;
    createAbortController?: () => AbortController;
}

/**
 * Coordinates refresh scheduling, Open-Meteo requests and ioBroker state writes.
 */
export class AdapterRuntime {
    private refreshTimer: ioBroker.Interval | undefined;
    private activeRefresh: Promise<void> | undefined;
    private activeAbortController: AbortController | undefined;
    private activeTimeout: TimeoutHandle | undefined;
    private isUnloading = false;
    private readonly forecastService: Pick<ForecastService, 'fetchSnapshot'>;
    private readonly now: () => Date;
    private readonly scheduleTimeout: (callback: () => void, ms: number) => TimeoutHandle;
    private readonly cancelTimeout: (id: TimeoutHandle) => void;
    private readonly createAbortController: () => AbortController;

    public constructor(
        private readonly adapter: AdapterRuntimeHost,
        options: AdapterRuntimeOptions = {},
    ) {
        this.forecastService = options.forecastService ?? new ForecastService();
        this.now = options.now ?? (() => new Date());
        this.scheduleTimeout = options.setTimeout ?? setTimeout;
        this.cancelTimeout = options.clearTimeout ?? clearTimeout;
        this.createAbortController = options.createAbortController ?? (() => new AbortController());
    }

    public async onReady(): Promise<void> {
        this.isUnloading = false;

        await this.ensureStaticObjects();
        await this.adapter.setStateAsync('info.connection', { val: false, ack: true });
        await this.adapter.setStateAsync('info.lastError', { val: '', ack: true });
        await this.refreshForecast('startup');

        this.refreshTimer = this.adapter.setInterval(() => {
            void this.refreshForecast('timer');
        }, HOURLY_REFRESH_INTERVAL_MS);
    }

    public onUnload(callback: () => void): void {
        try {
            this.isUnloading = true;

            if (this.refreshTimer) {
                this.adapter.clearInterval(this.refreshTimer);
                this.refreshTimer = undefined;
            }

            this.abortActiveRefresh(new Error('Adapter is unloading.'));
            callback();
        } catch (error) {
            this.adapter.log.error(`Error during unloading: ${this.toErrorMessage(error)}`);
            callback();
        }
    }

    public async refreshForecast(trigger: RefreshTrigger = 'manual'): Promise<void> {
        if (this.activeRefresh) {
            if (trigger === 'timer') {
                this.adapter.log.warn(
                    'Skipping scheduled forecast refresh because the previous refresh is still running.',
                );
            }
            return this.activeRefresh;
        }

        const refreshPromise = this.runRefresh().finally(() => {
            if (this.activeRefresh === refreshPromise) {
                this.activeRefresh = undefined;
            }
        });

        this.activeRefresh = refreshPromise;
        return refreshPromise;
    }

    private async runRefresh(): Promise<void> {
        const config = resolveEffectiveConfig(this.adapter.config);
        const { signal, dispose } = this.createRefreshAbortContext();

        try {
            const snapshot = await this.forecastService.fetchSnapshot(config, signal);
            if (this.isUnloading) {
                return;
            }

            await this.writeSnapshot(snapshot);
            await this.adapter.setStateAsync('info.connection', { val: true, ack: true });
            await this.adapter.setStateAsync('info.lastError', { val: '', ack: true });
            await this.adapter.setStateAsync('info.lastUpdate', { val: this.now().toISOString(), ack: true });
        } catch (error) {
            if (this.isUnloading && signal.aborted) {
                return;
            }

            const message = this.getRefreshErrorMessage(error, signal);
            this.adapter.log.error(`Forecast refresh failed: ${message}`);
            await this.adapter.setStateAsync('info.connection', { val: false, ack: true });
            await this.adapter.setStateAsync('info.lastError', { val: message, ack: true });
        } finally {
            dispose();
        }
    }

    private createRefreshAbortContext(): { signal: AbortSignal; dispose: () => void } {
        const abortController = this.createAbortController();
        const timeoutHandle = this.scheduleTimeout(() => {
            abortController.abort(new Error(`Open-Meteo request timed out after ${REQUEST_TIMEOUT_MS} ms.`));
        }, REQUEST_TIMEOUT_MS);

        this.activeAbortController = abortController;
        this.activeTimeout = timeoutHandle;

        return {
            signal: abortController.signal,
            dispose: () => {
                this.cancelTimeout(timeoutHandle);
                if (this.activeTimeout === timeoutHandle) {
                    this.activeTimeout = undefined;
                }
                if (this.activeAbortController === abortController) {
                    this.activeAbortController = undefined;
                }
            },
        };
    }

    private abortActiveRefresh(reason: Error): void {
        if (this.activeTimeout) {
            this.cancelTimeout(this.activeTimeout);
            this.activeTimeout = undefined;
        }
        if (this.activeAbortController) {
            this.activeAbortController.abort(reason);
            this.activeAbortController = undefined;
        }
    }

    private getRefreshErrorMessage(error: unknown, signal: AbortSignal): string {
        if (signal.aborted && signal.reason !== undefined) {
            return this.toErrorMessage(signal.reason);
        }

        return this.toErrorMessage(error);
    }

    private toErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    private async ensureStaticObjects(): Promise<void> {
        await this.ensureChannel('info', 'Information');
        await this.ensureState('info.connection', 'Connection to Open-Meteo', 'boolean', 'indicator.connected', false);
        await this.ensureState('info.lastUpdate', 'Last successful update', 'string', 'value.datetime', false);
        await this.ensureState('info.lastError', 'Last error message', 'string', 'text', false);

        await this.ensureChannel('location', 'Resolved location');
        await this.ensureState('location.resolvedName', 'Resolved location name', 'string', 'text', false);
        await this.ensureState('location.countryCode', 'Country code', 'string', 'text', false);
        await this.ensureState('location.latitude', 'Latitude', 'number', 'value.gps.latitude', false, '°');
        await this.ensureState('location.longitude', 'Longitude', 'number', 'value.gps.longitude', false, '°');
        await this.ensureState('location.timezone', 'Effective timezone', 'string', 'text', false);

        await this.ensureChannel('summary', 'Energy summaries');
        await this.ensureState('summary.today.energy_kwh', 'Today energy forecast', 'number', 'value', false, 'kWh');
        await this.ensureState(
            'summary.today.remaining_energy_kwh',
            'Remaining energy forecast for today',
            'number',
            'value',
            false,
            'kWh',
        );
        await this.ensureState(
            'summary.currentWeek.energy_kwh',
            'Current week energy forecast',
            'number',
            'value',
            false,
            'kWh',
        );
        await this.ensureState(
            'summary.currentWeek.complete',
            'Current week forecast complete',
            'boolean',
            'indicator',
            false,
        );
        await this.ensureState(
            'summary.currentMonth.energy_kwh',
            'Current month energy forecast',
            'number',
            'value',
            false,
            'kWh',
        );
        await this.ensureState(
            'summary.currentMonth.complete',
            'Current month forecast complete',
            'boolean',
            'indicator',
            false,
        );

        await this.ensureChannel('forecast', 'Forecast data');
        await this.ensureChannel('forecast.daily', 'Daily forecast data');
        await this.ensureChannel('forecast.hourly', 'Hourly forecast data');
        await this.ensureChannel('forecast.hourly.timestamps', 'Hourly forecast grouped by local timestamp');
        await this.ensureChannel('forecast.json', 'JSON mirrors');
        await this.ensureState('forecast.json.hourly', 'Hourly forecast JSON', 'string', 'json', false);
        await this.ensureState('forecast.json.daily', 'Daily forecast JSON', 'string', 'json', false);
        await this.ensureState('forecast.json.summary', 'Summary JSON', 'string', 'json', false);

        for (let index = 0; index < 7; index++) {
            const prefix = `forecast.daily.day${index}`;
            await this.ensureChannel(prefix, `Daily forecast day ${index}`);
            await this.ensureState(`${prefix}.date`, `Date for day ${index}`, 'string', 'value.date', false);
            await this.ensureState(`${prefix}.energy_kwh`, `Energy for day ${index}`, 'number', 'value', false, 'kWh');
        }
    }

    private async writeSnapshot(snapshot: ForecastSnapshot): Promise<void> {
        await this.writeLocationStates(snapshot);
        await this.writeSummaryStates(snapshot);
        await this.writeDailyStates(snapshot.daily);
        await this.syncHourlyStates(snapshot.hourly);

        await this.adapter.setStateAsync('forecast.json.hourly', {
            val: JSON.stringify(snapshot.hourly),
            ack: true,
        });
        await this.adapter.setStateAsync('forecast.json.daily', {
            val: JSON.stringify(snapshot.daily),
            ack: true,
        });
        await this.adapter.setStateAsync('forecast.json.summary', {
            val: JSON.stringify({
                todayEnergyKwh: snapshot.todayEnergyKwh,
                todayRemainingEnergyKwh: snapshot.todayRemainingEnergyKwh,
                currentWeek: snapshot.currentWeek,
                currentMonth: snapshot.currentMonth,
            }),
            ack: true,
        });
    }

    private async writeLocationStates(snapshot: ForecastSnapshot): Promise<void> {
        await this.adapter.setStateAsync('location.resolvedName', { val: snapshot.location.resolvedName, ack: true });
        await this.adapter.setStateAsync('location.countryCode', { val: snapshot.location.countryCode, ack: true });
        await this.adapter.setStateAsync('location.latitude', { val: snapshot.location.latitude, ack: true });
        await this.adapter.setStateAsync('location.longitude', { val: snapshot.location.longitude, ack: true });
        await this.adapter.setStateAsync('location.timezone', { val: snapshot.location.timeZone, ack: true });
    }

    private async writeSummaryStates(snapshot: ForecastSnapshot): Promise<void> {
        await this.adapter.setStateAsync('summary.today.energy_kwh', { val: snapshot.todayEnergyKwh, ack: true });
        await this.adapter.setStateAsync('summary.today.remaining_energy_kwh', {
            val: snapshot.todayRemainingEnergyKwh,
            ack: true,
        });
        await this.adapter.setStateAsync('summary.currentWeek.energy_kwh', {
            val: snapshot.currentWeek.energyKwh,
            ack: true,
        });
        await this.adapter.setStateAsync('summary.currentWeek.complete', {
            val: snapshot.currentWeek.complete,
            ack: true,
        });
        await this.adapter.setStateAsync('summary.currentMonth.energy_kwh', {
            val: snapshot.currentMonth.energyKwh,
            ack: true,
        });
        await this.adapter.setStateAsync('summary.currentMonth.complete', {
            val: snapshot.currentMonth.complete,
            ack: true,
        });
    }

    private async writeDailyStates(days: DailyForecast[]): Promise<void> {
        for (let index = 0; index < days.length; index++) {
            const day = days[index];
            await this.adapter.setStateAsync(`forecast.daily.day${index}.date`, { val: day.date, ack: true });
            await this.adapter.setStateAsync(`forecast.daily.day${index}.energy_kwh`, {
                val: day.energyKwh,
                ack: true,
            });
        }
    }

    private async syncHourlyStates(rows: ForecastRow[]): Promise<void> {
        const desiredChannels = new Set<string>();
        const stateKeys = createHourlyStateKeys(rows.map(row => row.timestamp));

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const channelId = `forecast.hourly.timestamps.${stateKeys[index]}`;
            desiredChannels.add(channelId);

            await this.ensureChannel(channelId, row.timestamp);
            await this.ensureState(`${channelId}.timestamp`, 'Local forecast timestamp', 'string', 'text', false);
            await this.ensureState(`${channelId}.local_date`, 'Local forecast date', 'string', 'value.date', false);
            await this.ensureState(`${channelId}.local_time`, 'Local forecast time', 'string', 'text', false);
            await this.ensureState(
                `${channelId}.energy_kwh`,
                'Forecast energy for this hour',
                'number',
                'value',
                false,
                'kWh',
            );
            await this.ensureState(
                `${channelId}.cloud_cover_percent`,
                'Cloud cover for this hour',
                'number',
                'value',
                false,
                '%',
            );
            await this.ensureState(
                `${channelId}.gti_wm2`,
                'Global tilted irradiance for this hour',
                'number',
                'value',
                false,
                'W/m²',
            );

            await this.adapter.setStateAsync(`${channelId}.timestamp`, { val: row.timestamp, ack: true });
            await this.adapter.setStateAsync(`${channelId}.local_date`, { val: row.localDate, ack: true });
            await this.adapter.setStateAsync(`${channelId}.local_time`, { val: row.localTime, ack: true });
            await this.adapter.setStateAsync(`${channelId}.energy_kwh`, { val: row.energyKwh, ack: true });
            await this.adapter.setStateAsync(`${channelId}.cloud_cover_percent`, {
                val: row.cloudCoverPercent,
                ack: true,
            });
            await this.adapter.setStateAsync(`${channelId}.gti_wm2`, { val: row.gtiWm2, ack: true });
        }

        const adapterObjects = await this.adapter.getAdapterObjectsAsync();
        const staleChannels = new Set<string>();
        const prefix = `${this.adapter.namespace}.forecast.hourly.timestamps.`;

        for (const fullId of Object.keys(adapterObjects)) {
            if (!fullId.startsWith(prefix)) {
                continue;
            }

            const relativeId = fullId.slice(this.adapter.namespace.length + 1);
            const segments = relativeId.split('.');
            if (segments.length < 4) {
                continue;
            }

            const channelId = segments.slice(0, 4).join('.');
            if (!desiredChannels.has(channelId)) {
                staleChannels.add(channelId);
            }
        }

        for (const channelId of staleChannels) {
            await this.adapter.delObjectAsync(channelId, { recursive: true });
        }
    }

    private async ensureChannel(id: string, name: string): Promise<void> {
        await this.adapter.setObjectNotExistsAsync(id, {
            type: 'channel',
            common: {
                name,
            },
            native: {},
        });
    }

    private async ensureState(
        id: string,
        name: string,
        type: ioBroker.CommonType,
        role: string,
        write: boolean,
        unit?: string,
    ): Promise<void> {
        await this.adapter.setObjectNotExistsAsync(id, {
            type: 'state',
            common: {
                name,
                type,
                role,
                read: true,
                write,
                unit,
            },
            native: {},
        });
    }
}
