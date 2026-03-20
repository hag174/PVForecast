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
            tiltDeg: number;
            azimuthDeg: number;
            arrayAreaM2: number;
            panelEfficiencyPct: number;
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
