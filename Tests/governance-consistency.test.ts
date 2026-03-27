import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GOVERNANCE_FILES = [
    'AGENTS.MD',
    'README.md',
    'memory/project_index.md',
    'memory/core/codex_workflow.md',
    'memory/architecture/adapter_v1_plan.md',
    'memory/history/2026_03_20_initial_implementation.md',
];

const FORBIDDEN_TERMS = ['arrayAreaM2', 'panelEfficiencyPct', 'PVForecast', 'pvforecast', 'PVFORECAST_TEST_FIXTURES'];

function readRepoFile(relativePath: string): string {
    return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

describe('Governance consistency', () => {
    it('keeps the documented config keys aligned with the implemented adapter config', () => {
        const agents = readRepoFile('AGENTS.MD');
        const readme = readRepoFile('README.md');

        for (const content of [agents, readme]) {
            expect(content).to.include('refreshIntervalMinutes');
            expect(content).to.include('peakPowerKwp');
            expect(content).to.include('morningDampingPct');
            expect(content).to.include('afternoonDampingPct');
        }
    });

    it('removes known legacy project terms from checked-in governance files', () => {
        for (const relativePath of GOVERNANCE_FILES) {
            const content = readRepoFile(relativePath);

            for (const forbiddenTerm of FORBIDDEN_TERMS) {
                expect(content, `${relativePath} should not reference ${forbiddenTerm}`).to.not.include(forbiddenTerm);
            }
        }
    });

    it('documents the current repository and memory location in the project index', () => {
        const projectIndex = readRepoFile('memory/project_index.md');

        expect(projectIndex).to.include('SolarForecast Project Index');
        expect(projectIndex).to.include('/home/hagen/Programming/SolarForecast/memory');
        expect(projectIndex).to.include('npm run verify');
    });
});
