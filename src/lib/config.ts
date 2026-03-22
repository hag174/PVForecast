import type { EffectiveConfig, LocationMode, TimezoneMode } from './types';

const DEFAULT_CITY = 'Berlin';
const DEFAULT_TIME_ZONE = 'Europe/Berlin';
const DEFAULT_TILT_DEG = 0;
const DEFAULT_AZIMUTH_DEG = 0;
const REQUIRED_CONFIG_MESSAGE_SUFFIX = 'Open the adapter settings and save the instance again.';

/**
 * Normalizes optional text inputs from the adapter config or admin UI.
 *
 * @param value - Raw value that may or may not be a string.
 * @returns Trimmed text or an empty string.
 */
export function normalizeOptionalText(value: unknown): string {
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

function toRequiredFiniteNumber(value: unknown, fieldName: string): number {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        throw new Error(`The configuration field "${fieldName}" is required. ${REQUIRED_CONFIG_MESSAGE_SUFFIX}`);
    }

    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
        return numericValue;
    }

    throw new Error(`The configuration field "${fieldName}" must be a number.`);
}

/**
 * Normalizes ISO-like country codes to uppercase.
 *
 * @param value - Raw user or config value.
 * @returns Uppercased two-letter code or an empty string.
 */
export function normalizeCountryCode(value: unknown): string {
    return normalizeOptionalText(value).toUpperCase();
}

/**
 * Checks whether an IANA time zone identifier can be used by the runtime.
 *
 * @param timeZone - Candidate time zone string.
 * @returns True when the time zone is accepted by Intl.
 */
export function isValidTimeZone(timeZone: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

/**
 * Builds a stable key for matching a validated city and country selection in the admin UI.
 *
 * @param city - Configured city.
 * @param countryCode - Optional country code.
 * @returns A normalized lookup key or an empty string if no city is set.
 */
export function buildLocationValidationKey(city: string, countryCode: string): string {
    const normalizedCity = normalizeOptionalText(city);
    if (!normalizedCity) {
        return '';
    }

    return `${normalizedCity}|${normalizeCountryCode(countryCode)}`;
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
    const countryCode = normalizeCountryCode(config.countryCode);

    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
        throw new Error('countryCode must contain a two-letter ISO country code.');
    }

    const tiltDeg = toFiniteNumber(config.tiltDeg, 'tiltDeg', DEFAULT_TILT_DEG);
    const azimuthDeg = toFiniteNumber(config.azimuthDeg, 'azimuthDeg', DEFAULT_AZIMUTH_DEG);
    const peakPowerKwp = toRequiredFiniteNumber(config.peakPowerKwp, 'peakPowerKwp');

    if (peakPowerKwp <= 0) {
        throw new Error('peakPowerKwp must be greater than zero.');
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
        peakPowerKwp,
    };
}
