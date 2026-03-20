import type { EffectiveConfig, LocationMode, TimezoneMode } from './types';

const DEFAULT_CITY = 'Berlin';
const DEFAULT_TIME_ZONE = 'Europe/Berlin';
const DEFAULT_TILT_DEG = 0;
const DEFAULT_AZIMUTH_DEG = 0;
const DEFAULT_ARRAY_AREA_M2 = 10;
const DEFAULT_PANEL_EFFICIENCY_PCT = 22;
const DEFAULT_REFRESH_INTERVAL_MINUTES = 60;

function normalizeOptionalText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function toFiniteNumber(value: unknown, fieldName: string, fallback?: number): number {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
        return numericValue;
    }
    if (fallback !== undefined) {
        return fallback;
    }
    throw new Error(`The configuration field "${fieldName}" must be a number.`);
}

function isValidTimeZone(timeZone: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

/**
 * Normalizes and validates the ioBroker instance configuration.
 *
 * @param config - Raw adapter configuration from ioBroker.
 * @returns The validated configuration with defaults applied.
 */
export function resolveEffectiveConfig(config: ioBroker.AdapterConfig): EffectiveConfig {
    const locationMode: LocationMode = config.locationMode === 'manual' ? 'manual' : 'geocode';
    const timezoneMode: TimezoneMode = config.timezoneMode === 'manual' ? 'manual' : 'auto';

    const city = normalizeOptionalText(config.city) || DEFAULT_CITY;
    const countryCode = normalizeOptionalText(config.countryCode).toUpperCase();

    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
        throw new Error('countryCode must contain a two-letter ISO country code.');
    }

    const tiltDeg = toFiniteNumber(config.tiltDeg, 'tiltDeg', DEFAULT_TILT_DEG);
    const azimuthDeg = toFiniteNumber(config.azimuthDeg, 'azimuthDeg', DEFAULT_AZIMUTH_DEG);
    const arrayAreaM2 = toFiniteNumber(config.arrayAreaM2, 'arrayAreaM2', DEFAULT_ARRAY_AREA_M2);
    const panelEfficiencyPct = toFiniteNumber(
        config.panelEfficiencyPct,
        'panelEfficiencyPct',
        DEFAULT_PANEL_EFFICIENCY_PCT,
    );

    if (arrayAreaM2 <= 0) {
        throw new Error('arrayAreaM2 must be greater than zero.');
    }
    if (panelEfficiencyPct <= 0 || panelEfficiencyPct > 100) {
        throw new Error('panelEfficiencyPct must be greater than 0 and less than or equal to 100.');
    }
    if (tiltDeg < 0 || tiltDeg > 90) {
        throw new Error('tiltDeg must be between 0 and 90 degrees.');
    }
    if (azimuthDeg < -180 || azimuthDeg > 180) {
        throw new Error('azimuthDeg must be between -180 and 180 degrees.');
    }

    let latitude: number | null = null;
    let longitude: number | null = null;
    if (locationMode === 'manual') {
        latitude = toFiniteNumber(config.latitude, 'latitude');
        longitude = toFiniteNumber(config.longitude, 'longitude');

        if (latitude < -90 || latitude > 90) {
            throw new Error('latitude must be between -90 and 90.');
        }
        if (longitude < -180 || longitude > 180) {
            throw new Error('longitude must be between -180 and 180.');
        }
    }

    const configuredTimeZone = normalizeOptionalText(config.timezone) || DEFAULT_TIME_ZONE;
    if (timezoneMode === 'manual' && !isValidTimeZone(configuredTimeZone)) {
        throw new Error(`The configured timezone "${configuredTimeZone}" is not valid.`);
    }

    return {
        locationMode,
        city,
        countryCode,
        latitude,
        longitude,
        timezoneMode,
        timeZone: timezoneMode === 'manual' ? configuredTimeZone : 'auto',
        tiltDeg,
        azimuthDeg,
        arrayAreaM2,
        panelEfficiencyPct,
        refreshIntervalMinutes: DEFAULT_REFRESH_INTERVAL_MINUTES,
    };
}
