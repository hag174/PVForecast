import { expect } from 'chai';

import { formatDailyMaterialDesignChart, formatHourlyMaterialDesignChart } from '../src/lib/material-design-chart';
import type { DailyForecast, ForecastRow } from '../src/lib/types';

describe('material-design-chart', () => {
    it('formats hourly energy rows for the Material Design chart widget', () => {
        const rows: ForecastRow[] = [
            {
                timestamp: '2026-03-21T10:00',
                localDate: '2026-03-21',
                localTime: '10:00',
                energyKwh: 1.25,
                cloudCoverPercent: 20,
                gtiWm2: 400,
            },
            {
                timestamp: '2026-03-21T11:00',
                localDate: '2026-03-21',
                localTime: '11:00',
                energyKwh: 1.5,
                cloudCoverPercent: 18,
                gtiWm2: 430,
            },
        ];

        expect(formatHourlyMaterialDesignChart(rows)).to.deep.equal({
            axisLabels: ['21.03.\n10:00', '21.03.\n11:00'],
            graphs: [
                {
                    data: [1.25, 1.5],
                    type: 'bar',
                    color: '#f9a825',
                    legendText: 'Energy forecast',
                    yAxis_appendix: ' kWh',
                    tooltip_AppendText: ' kWh',
                    yAxis_min: 0,
                    datalabel_show: false,
                },
            ],
        });
    });

    it('formats daily energy rows for the Material Design chart widget', () => {
        const days: DailyForecast[] = [
            {
                date: '2026-03-21',
                energyKwh: 5.28,
            },
            {
                date: '2026-03-22',
                energyKwh: 5.14,
            },
        ];

        expect(formatDailyMaterialDesignChart(days)).to.deep.equal({
            axisLabels: ['21.03.', '22.03.'],
            graphs: [
                {
                    data: [5.28, 5.14],
                    type: 'bar',
                    color: '#f9a825',
                    legendText: 'Energy forecast',
                    yAxis_appendix: ' kWh',
                    tooltip_AppendText: ' kWh',
                    yAxis_min: 0,
                    datalabel_show: false,
                },
            ],
        });
    });

    it('adds deterministic suffixes for duplicate hourly labels during DST fallback', () => {
        const rows: ForecastRow[] = [
            {
                timestamp: '2026-10-25T02:00',
                localDate: '2026-10-25',
                localTime: '02:00',
                energyKwh: 0.9,
                cloudCoverPercent: 15,
                gtiWm2: 320,
            },
            {
                timestamp: '2026-10-25T02:00',
                localDate: '2026-10-25',
                localTime: '02:00',
                energyKwh: 1.1,
                cloudCoverPercent: 18,
                gtiWm2: 360,
            },
            {
                timestamp: '2026-10-25T03:00',
                localDate: '2026-10-25',
                localTime: '03:00',
                energyKwh: 1.4,
                cloudCoverPercent: 12,
                gtiWm2: 410,
            },
        ];

        expect(formatHourlyMaterialDesignChart(rows)).to.deep.equal({
            axisLabels: ['25.10.\n02:00 (1)', '25.10.\n02:00 (2)', '25.10.\n03:00'],
            graphs: [
                {
                    data: [0.9, 1.1, 1.4],
                    type: 'bar',
                    color: '#f9a825',
                    legendText: 'Energy forecast',
                    yAxis_appendix: ' kWh',
                    tooltip_AppendText: ' kWh',
                    yAxis_min: 0,
                    datalabel_show: false,
                },
            ],
        });
    });
});
