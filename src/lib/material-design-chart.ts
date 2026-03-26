/* eslint-disable jsdoc/require-jsdoc */

import type { DailyForecast, ForecastRow } from './types';

export interface MaterialDesignChartGraph {
    data: number[];
    type: 'bar';
    color: string;
    legendText: string;
    yAxis_appendix: string;
    tooltip_AppendText: string;
    yAxis_min: number;
    datalabel_show: boolean;
}

export interface MaterialDesignChart {
    axisLabels: string[];
    graphs: MaterialDesignChartGraph[];
}

const ENERGY_GRAPH_TEMPLATE = {
    type: 'bar',
    color: '#f9a825',
    legendText: 'Energy forecast',
    yAxis_appendix: ' kWh',
    tooltip_AppendText: ' kWh',
    yAxis_min: 0,
    datalabel_show: false,
} as const;

export function formatHourlyMaterialDesignChart(rows: readonly ForecastRow[]): MaterialDesignChart {
    return {
        axisLabels: appendDuplicateSuffixes(rows.map(row => `${formatAxisDate(row.localDate)}\n${row.localTime}`)),
        graphs: [createEnergyGraph(rows.map(row => row.energyKwh))],
    };
}

export function formatDailyMaterialDesignChart(days: readonly DailyForecast[]): MaterialDesignChart {
    return {
        axisLabels: days.map(day => formatAxisDate(day.date)),
        graphs: [createEnergyGraph(days.map(day => day.energyKwh))],
    };
}

function createEnergyGraph(data: readonly number[]): MaterialDesignChartGraph {
    return {
        ...ENERGY_GRAPH_TEMPLATE,
        data: [...data],
    };
}

function formatAxisDate(date: string): string {
    return `${date.slice(8, 10)}.${date.slice(5, 7)}.`;
}

function appendDuplicateSuffixes(labels: readonly string[]): string[] {
    const totalOccurrences = new Map<string, number>();
    for (const label of labels) {
        totalOccurrences.set(label, (totalOccurrences.get(label) ?? 0) + 1);
    }

    const seenOccurrences = new Map<string, number>();

    return labels.map(label => {
        if ((totalOccurrences.get(label) ?? 0) <= 1) {
            return label;
        }

        const occurrence = (seenOccurrences.get(label) ?? 0) + 1;
        seenOccurrences.set(label, occurrence);
        return `${label} (${occurrence})`;
    });
}
