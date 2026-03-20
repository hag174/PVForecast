import type { GeocodingResult, OpenMeteoForecastResponse } from './types';

interface GeocodingApiResponse {
    results?: Array<{
        name?: string;
        admin1?: string;
        country?: string;
        country_code?: string;
        latitude?: number;
        longitude?: number;
        timezone?: string;
    }>;
}

interface ForecastRequestOptions {
    latitude: number;
    longitude: number;
    timeZone: string;
    tiltDeg: number;
    azimuthDeg: number;
}

function isDefinedNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Handles the Open-Meteo geocoding and forecast HTTP requests.
 */
export class OpenMeteoClient {
    /**
     * Creates a new Open-Meteo client.
     *
     * @param fetchImpl - Fetch implementation used for HTTP requests and tests.
     */
    public constructor(private readonly fetchImpl: typeof fetch = fetch) {}

    /**
     * Resolves a city name into coordinates and a timezone.
     *
     * @param city - User configured city name.
     * @param countryCode - Optional ISO country code filter.
     * @returns The best matching geocoding result.
     */
    public async geocode(city: string, countryCode?: string): Promise<GeocodingResult> {
        const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
        url.searchParams.set('name', city);
        url.searchParams.set('count', '10');
        url.searchParams.set('language', 'en');
        url.searchParams.set('format', 'json');

        const response = await this.fetchJson<GeocodingApiResponse>(url);
        const results = response.results ?? [];

        const filteredResults = countryCode
            ? results.filter(result => result.country_code?.toUpperCase() === countryCode)
            : results;
        const candidates = filteredResults.length > 0 ? filteredResults : results;

        const match = candidates.find(
            candidate =>
                typeof candidate.name === 'string' &&
                isDefinedNumber(candidate.latitude) &&
                isDefinedNumber(candidate.longitude) &&
                typeof candidate.timezone === 'string',
        );

        if (!match) {
            throw new Error(`No matching location was found for "${city}".`);
        }

        const latitude = match.latitude;
        const longitude = match.longitude;
        const timeZone = match.timezone;
        const resolvedName = [match.name, match.admin1, match.country].filter(Boolean).join(', ');

        if (!isDefinedNumber(latitude) || !isDefinedNumber(longitude) || typeof timeZone !== 'string') {
            throw new Error(`The geocoding response for "${city}" was incomplete.`);
        }

        return {
            resolvedName,
            countryCode: match.country_code?.toUpperCase() ?? '',
            latitude,
            longitude,
            timeZone,
        };
    }

    /**
     * Fetches the hourly solar forecast from Open-Meteo.
     *
     * @param options - Coordinates and panel settings for the forecast request.
     * @returns The raw Open-Meteo forecast payload.
     */
    public async fetchForecast(options: ForecastRequestOptions): Promise<OpenMeteoForecastResponse> {
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.searchParams.set('latitude', options.latitude.toString());
        url.searchParams.set('longitude', options.longitude.toString());
        url.searchParams.set('hourly', 'global_tilted_irradiance,cloud_cover');
        url.searchParams.set('past_days', '31');
        url.searchParams.set('forecast_days', '16');
        url.searchParams.set('timezone', options.timeZone);
        url.searchParams.set('tilt', options.tiltDeg.toString());
        url.searchParams.set('azimuth', options.azimuthDeg.toString());

        return this.fetchJson<OpenMeteoForecastResponse>(url);
    }

    private async fetchJson<T>(url: URL): Promise<T> {
        const response = await this.fetchImpl(url);

        if (!response.ok) {
            const responseBody = await response.text();
            throw new Error(
                `Open-Meteo request failed with ${response.status} ${response.statusText}: ${responseBody}`.trim(),
            );
        }

        return (await response.json()) as T;
    }
}
