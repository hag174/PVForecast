import { buildLocationValidationKey, isValidTimeZone, normalizeCountryCode, normalizeOptionalText } from './config';
import { OpenMeteoClient } from './open-meteo-client';
import type {
    AdminLocationValidationRequest,
    AdminLocationValidationResponse,
    LocationContext,
    LocationResolutionConfig,
    TimezoneMode,
} from './types';

export const RESOLVE_LOCATION_CONFIG_COMMAND = 'resolveLocationConfig';
export const LOCATION_VALIDATED_KEY_FIELD = '_validatedLocationKey';
export const LOCATION_VALIDATION_MESSAGE_FIELD = '_locationValidationMessage';
export const LOCATION_VALIDATION_STATE_FIELD = '_locationValidationState';
export const LOCATION_VALIDATION_DISPLAY_TEXT_FIELD = '_locationValidationDisplayText';

function formatCoordinate(value: number): string {
    return value.toFixed(4);
}

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Resolves configured locations for the forecast runtime and for admin-side validation.
 */
export class LocationResolver {
    /**
     * Creates a resolver backed by the Open-Meteo geocoding client.
     *
     * @param client - Geocoding client abstraction used in production and tests.
     */
    public constructor(private readonly client: Pick<OpenMeteoClient, 'geocode'> = new OpenMeteoClient()) {}

    /**
     * Resolves the effective runtime location from either manual coordinates or geocoding.
     *
     * @param config - Normalized location-related adapter configuration.
     * @param signal - Abort signal for the geocoding request.
     * @returns The effective location context used by the forecast runtime.
     */
    public async resolveLocation(config: LocationResolutionConfig, signal?: AbortSignal): Promise<LocationContext> {
        if (config.locationMode === 'manual') {
            return {
                resolvedName:
                    config.city ||
                    `${config.latitude?.toFixed(4) ?? '0.0000'}, ${config.longitude?.toFixed(4) ?? '0.0000'}`,
                countryCode: config.countryCode,
                latitude: config.latitude ?? 0,
                longitude: config.longitude ?? 0,
                timeZone: config.timezoneMode === 'manual' ? config.timeZone : 'auto',
            };
        }

        const geocodingResult = await this.client.geocode(config.city, config.countryCode || undefined, signal);
        return {
            resolvedName: geocodingResult.resolvedName,
            countryCode: geocodingResult.countryCode,
            latitude: geocodingResult.latitude,
            longitude: geocodingResult.longitude,
            timeZone: config.timezoneMode === 'manual' ? config.timeZone : geocodingResult.timeZone,
        };
    }

    /**
     * Validates a geocoded city selection from the admin dialog and returns native field updates.
     *
     * @param request - Raw admin-side validation request payload.
     * @param signal - Abort signal for the geocoding request.
     * @returns A jsonConfig-compatible response containing status text and native updates.
     */
    public async validateGeocodeLocation(
        request: AdminLocationValidationRequest,
        signal?: AbortSignal,
    ): Promise<AdminLocationValidationResponse> {
        const city = normalizeOptionalText(request.city);
        const countryCode = normalizeCountryCode(request.countryCode);
        const timezoneMode: TimezoneMode = request.timezoneMode === 'manual' ? 'manual' : 'auto';
        const timezone = normalizeOptionalText(request.timezone);
        const validationKey = buildLocationValidationKey(city, countryCode);

        if (!city) {
            return this.createErrorResponse(
                validationKey,
                city,
                countryCode,
                'Please enter a city before checking the location.',
            );
        }
        if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
            return this.createErrorResponse(
                validationKey,
                city,
                countryCode,
                'Country code must contain a two-letter ISO country code.',
            );
        }
        if (timezoneMode === 'manual' && (!timezone || !isValidTimeZone(timezone))) {
            return this.createErrorResponse(
                validationKey,
                city,
                countryCode,
                `The configured timezone "${timezone || 'empty'}" is not valid.`,
            );
        }

        try {
            const geocodingResult = await this.client.geocode(city, countryCode || undefined, signal);
            const resolvedCountryCode = geocodingResult.countryCode || countryCode;
            const successValidationKey = buildLocationValidationKey(city, resolvedCountryCode);
            const effectiveTimeZone = timezoneMode === 'manual' ? timezone : geocodingResult.timeZone;
            const message =
                `Found: ${geocodingResult.resolvedName} ` +
                `(${formatCoordinate(geocodingResult.latitude)}, ${formatCoordinate(geocodingResult.longitude)}), ` +
                `time zone ${effectiveTimeZone}.`;

            return {
                native: {
                    city,
                    countryCode: resolvedCountryCode,
                    latitude: geocodingResult.latitude,
                    longitude: geocodingResult.longitude,
                    ...(timezoneMode === 'auto' ? { timezone: geocodingResult.timeZone } : {}),
                    [LOCATION_VALIDATED_KEY_FIELD]: successValidationKey,
                    [LOCATION_VALIDATION_STATE_FIELD]: 'success',
                    [LOCATION_VALIDATION_MESSAGE_FIELD]: message,
                    [LOCATION_VALIDATION_DISPLAY_TEXT_FIELD]: message,
                },
                text: message,
                icon: 'connection',
                style: { color: '#2e7d32' },
            };
        } catch (error) {
            return this.createErrorResponse(validationKey, city, countryCode, toErrorMessage(error));
        }
    }

    private createErrorResponse(
        validationKey: string,
        city: string,
        countryCode: string,
        message: string,
    ): AdminLocationValidationResponse {
        return {
            native: {
                city,
                countryCode,
                [LOCATION_VALIDATED_KEY_FIELD]: validationKey,
                [LOCATION_VALIDATION_STATE_FIELD]: 'error',
                [LOCATION_VALIDATION_MESSAGE_FIELD]: message,
                [LOCATION_VALIDATION_DISPLAY_TEXT_FIELD]: message,
            },
            text: message,
            icon: 'no-connection',
            style: { color: '#c62828' },
        };
    }
}
