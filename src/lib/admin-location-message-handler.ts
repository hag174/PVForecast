/* eslint-disable jsdoc/require-jsdoc */

import { buildLocationValidationKey, isValidTimeZone, normalizeCountryCode, normalizeOptionalText } from './config';
import {
    LOCATION_VALIDATED_KEY_FIELD,
    LOCATION_VALIDATION_DISPLAY_TEXT_FIELD,
    LOCATION_VALIDATION_MESSAGE_FIELD,
    LOCATION_VALIDATION_STATE_FIELD,
    LocationResolver,
    RESOLVE_LOCATION_CONFIG_COMMAND,
} from './location-resolver';
import type { AdminLocationValidationRequest, AdminLocationValidationResponse } from './types';

type TimeoutHandle = ReturnType<typeof setTimeout>;

const ADMIN_MESSAGEBOX_PREFIX = 'system.adapter.admin.';
const MAX_CITY_LENGTH = 120;
const MAX_TIME_ZONE_LENGTH = 100;

export const ADMIN_LOCATION_VALIDATION_TIMEOUT_MS = 10_000;
export const ADMIN_LOCATION_VALIDATION_THROTTLE_MS = 1_000;

interface AdminLocationMessageHandlerHost {
    sendTo(to: string, command: string, message: unknown, callback: unknown): void;
}

interface AdminLocationMessageHandlerOptions {
    locationResolver?: Pick<LocationResolver, 'validateGeocodeLocation'>;
    now?: () => number;
    setTimeout?: (callback: () => void, ms: number) => TimeoutHandle;
    clearTimeout?: (id: TimeoutHandle) => void;
    createAbortController?: () => AbortController;
}

interface ValidatedAdminLocationRequest {
    city: string;
    countryCode: string;
    timezoneMode: 'auto' | 'manual';
    timezone: string;
}

/**
 * Restricts admin-side location checks to validated requests from the admin adapter.
 */
export class AdminLocationMessageHandler {
    private readonly locationResolver: Pick<LocationResolver, 'validateGeocodeLocation'>;
    private readonly now: () => number;
    private readonly scheduleTimeout: (callback: () => void, ms: number) => TimeoutHandle;
    private readonly cancelTimeout: (id: TimeoutHandle) => void;
    private readonly createAbortController: () => AbortController;
    private activeRequest: Promise<void> | undefined;
    private lastAcceptedAt: number | undefined;

    public constructor(
        private readonly adapter: AdminLocationMessageHandlerHost,
        options: AdminLocationMessageHandlerOptions = {},
    ) {
        this.locationResolver = options.locationResolver ?? new LocationResolver();
        this.now = options.now ?? Date.now;
        this.scheduleTimeout = options.setTimeout ?? setTimeout;
        this.cancelTimeout = options.clearTimeout ?? clearTimeout;
        this.createAbortController = options.createAbortController ?? (() => new AbortController());
    }

    public async handleMessage(obj: ioBroker.Message | undefined): Promise<boolean> {
        if (!this.isSupportedMessage(obj)) {
            return false;
        }

        const requestValidation = this.validateRequest(obj.message);
        if (!requestValidation.ok) {
            this.reply(
                obj,
                this.createErrorResponse(
                    requestValidation.city,
                    requestValidation.countryCode,
                    requestValidation.message,
                ),
            );
            return true;
        }

        if (this.activeRequest) {
            this.reply(
                obj,
                this.createErrorResponse(
                    requestValidation.request.city,
                    requestValidation.request.countryCode,
                    'Another city check is already running. Please wait until it finishes.',
                ),
            );
            return true;
        }

        const now = this.now();
        if (this.lastAcceptedAt !== undefined && now - this.lastAcceptedAt < ADMIN_LOCATION_VALIDATION_THROTTLE_MS) {
            this.reply(
                obj,
                this.createErrorResponse(
                    requestValidation.request.city,
                    requestValidation.request.countryCode,
                    `Please wait at least ${ADMIN_LOCATION_VALIDATION_THROTTLE_MS} ms between city checks.`,
                ),
            );
            return true;
        }

        this.lastAcceptedAt = now;

        const requestPromise = this.runValidation(obj, requestValidation.request).finally(() => {
            if (this.activeRequest === requestPromise) {
                this.activeRequest = undefined;
            }
        });

        this.activeRequest = requestPromise;
        await requestPromise;
        return true;
    }

    private isSupportedMessage(obj: ioBroker.Message | undefined): obj is ioBroker.Message {
        return Boolean(
            obj &&
            obj.command === RESOLVE_LOCATION_CONFIG_COMMAND &&
            obj.callback &&
            typeof obj.from === 'string' &&
            obj.from.startsWith(ADMIN_MESSAGEBOX_PREFIX),
        );
    }

    private validateRequest(
        rawRequest: unknown,
    ):
        | { ok: true; request: ValidatedAdminLocationRequest }
        | { ok: false; city: string; countryCode: string; message: string } {
        const request =
            rawRequest && typeof rawRequest === 'object'
                ? (rawRequest as AdminLocationValidationRequest)
                : ({} as AdminLocationValidationRequest);
        const city = normalizeOptionalText(request.city);
        const countryCode = normalizeCountryCode(request.countryCode);
        const timezoneMode = request.timezoneMode;
        const timezone = normalizeOptionalText(request.timezone);

        if (!city) {
            return {
                ok: false,
                city,
                countryCode,
                message: 'Please enter a city before checking the location.',
            };
        }
        if (city.length > MAX_CITY_LENGTH) {
            return {
                ok: false,
                city,
                countryCode,
                message: `City names must not exceed ${MAX_CITY_LENGTH} characters.`,
            };
        }
        if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
            return {
                ok: false,
                city,
                countryCode,
                message: 'Country code must contain a two-letter ISO country code.',
            };
        }
        if (timezoneMode !== 'auto' && timezoneMode !== 'manual') {
            return {
                ok: false,
                city,
                countryCode,
                message: 'timezoneMode must be either "auto" or "manual".',
            };
        }
        if (timezone.length > MAX_TIME_ZONE_LENGTH) {
            return {
                ok: false,
                city,
                countryCode,
                message: `Timezones must not exceed ${MAX_TIME_ZONE_LENGTH} characters.`,
            };
        }
        if (timezoneMode === 'manual' && (!timezone || !isValidTimeZone(timezone))) {
            return {
                ok: false,
                city,
                countryCode,
                message: `The configured timezone "${timezone || 'empty'}" is not valid.`,
            };
        }

        return {
            ok: true,
            request: {
                city,
                countryCode,
                timezoneMode,
                timezone,
            },
        };
    }

    private async runValidation(obj: ioBroker.Message, request: ValidatedAdminLocationRequest): Promise<void> {
        const abortController = this.createAbortController();
        const timeoutHandle = this.scheduleTimeout(() => {
            abortController.abort(
                new Error(`City validation timed out after ${ADMIN_LOCATION_VALIDATION_TIMEOUT_MS} ms.`),
            );
        }, ADMIN_LOCATION_VALIDATION_TIMEOUT_MS);

        try {
            const response = await this.locationResolver.validateGeocodeLocation(request, abortController.signal);
            this.reply(obj, response);
        } catch (error) {
            this.reply(
                obj,
                this.createErrorResponse(
                    request.city,
                    request.countryCode,
                    error instanceof Error ? error.message : String(error),
                ),
            );
        } finally {
            this.cancelTimeout(timeoutHandle);
        }
    }

    private createErrorResponse(city: string, countryCode: string, message: string): AdminLocationValidationResponse {
        return {
            native: {
                city,
                countryCode,
                [LOCATION_VALIDATED_KEY_FIELD]: buildLocationValidationKey(city, countryCode),
                [LOCATION_VALIDATION_STATE_FIELD]: 'error',
                [LOCATION_VALIDATION_MESSAGE_FIELD]: message,
                [LOCATION_VALIDATION_DISPLAY_TEXT_FIELD]: message,
            },
            text: message,
            icon: 'no-connection',
            style: { color: '#c62828' },
        };
    }

    private reply(obj: ioBroker.Message, response: AdminLocationValidationResponse): void {
        this.adapter.sendTo(obj.from, obj.command, response, obj.callback);
    }
}
