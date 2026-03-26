function parseDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(part => Number(part));
    return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

/**
 * Formats the current date as a local calendar day inside the requested timezone.
 *
 * @param date - Date instance to format.
 * @param timeZone - IANA timezone identifier used for the local calendar day.
 * @returns The formatted local date in YYYY-MM-DD format.
 */
export function formatLocalDate(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const values = Object.fromEntries(
        parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
}

/**
 * Formats the local hour of a date inside the requested timezone.
 *
 * @param date - Date instance to format.
 * @param timeZone - IANA timezone identifier used for the local hour.
 * @returns The local hour in HH:00 format.
 */
export function formatLocalHour(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);

    const values = Object.fromEntries(
        parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]),
    );
    return `${values.hour}:00`;
}

/**
 * Adds a number of days to a calendar date without relying on the host timezone.
 *
 * @param dateString - The source date in YYYY-MM-DD format.
 * @param days - Number of days to add or subtract.
 * @returns The shifted date in YYYY-MM-DD format.
 */
export function addDays(dateString: string, days: number): string {
    const date = parseDate(dateString);
    date.setUTCDate(date.getUTCDate() + days);
    return formatDate(date);
}

/**
 * Calculates the ISO week boundaries for a local calendar day.
 *
 * @param dateString - A local date in YYYY-MM-DD format.
 * @returns The inclusive Monday-to-Sunday range of the ISO week.
 */
export function getIsoWeekRange(dateString: string): { startDate: string; endDate: string } {
    const date = parseDate(dateString);
    const dayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
    const startDate = addDays(dateString, 1 - dayOfWeek);
    return {
        startDate,
        endDate: addDays(startDate, 6),
    };
}

/**
 * Calculates the first and last local calendar day of the current month.
 *
 * @param dateString - A local date in YYYY-MM-DD format.
 * @returns The inclusive start and end date of the month.
 */
export function getMonthRange(dateString: string): { startDate: string; endDate: string } {
    const [year, month] = dateString.split('-').map(part => Number(part));
    const startDate = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-01`;
    const endDate = formatDate(new Date(Date.UTC(year, month, 0)));
    return { startDate, endDate };
}

/**
 * Creates a comparable local timestamp boundary for an entire day.
 *
 * @param dateString - The local date in YYYY-MM-DD format.
 * @param endOfDay - Whether the boundary should point to 23:00 instead of 00:00.
 * @returns The boundary timestamp used for completeness checks.
 */
export function boundaryTimestamp(dateString: string, endOfDay: boolean): string {
    return `${dateString}T${endOfDay ? '23:00' : '00:00'}`;
}

/**
 * Converts an ISO-like timestamp into a valid ioBroker object suffix.
 *
 * @param timestamp - The local timestamp from Open-Meteo.
 * @returns A sanitized object key that only contains letters, numbers and underscores.
 */
export function sanitizeStateKey(timestamp: string): string {
    return timestamp.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Creates stable ioBroker object keys for hourly timestamps, including repeated local hours.
 *
 * @param timestamps - Local timestamps in API order.
 * @returns A unique object key for each timestamp.
 */
export function createHourlyStateKeys(timestamps: readonly string[]): string[] {
    const totalOccurrences = new Map<string, number>();
    for (const timestamp of timestamps) {
        totalOccurrences.set(timestamp, (totalOccurrences.get(timestamp) ?? 0) + 1);
    }

    const seenOccurrences = new Map<string, number>();

    return timestamps.map(timestamp => {
        const baseKey = sanitizeStateKey(timestamp);
        const totalCount = totalOccurrences.get(timestamp) ?? 0;
        if (totalCount <= 1) {
            return baseKey;
        }

        const occurrence = (seenOccurrences.get(timestamp) ?? 0) + 1;
        seenOccurrences.set(timestamp, occurrence);
        return `${baseKey}__${occurrence}`;
    });
}

/**
 * Rounds floating-point values to a predictable number of decimals for state output.
 *
 * @param value - Numeric value to round.
 * @param fractionDigits - Number of decimals to keep.
 * @returns The rounded number.
 */
export function roundNumber(value: number, fractionDigits = 3): number {
    return Number(value.toFixed(fractionDigits));
}
