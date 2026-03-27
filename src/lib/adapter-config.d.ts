// This file extends the AdapterConfig type from "@iobroker/types"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            locationMode: 'geocode' | 'manual';
            city: string;
            countryCode: string;
            latitude: number;
            longitude: number;
            timezoneMode: 'auto' | 'manual';
            timezone: string;
            refreshIntervalMinutes: number;
            tiltDeg: number;
            azimuthDeg: number;
            peakPowerKwp: number;
            morningDampingPct: number;
            afternoonDampingPct: number;
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
