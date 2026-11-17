import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const source = readFileSync(resolve(__dirname, './App.tsx'), 'utf8');

/**
 * ORISO-UserService#1666: the route table itself is covered by StatisticsReaderRoutes.test.tsx;
 * this pins that App hands a Statistik-Leser·in to it and lands them on statistics after login.
 */
describe('Statistik-Leser·in routing in App', () => {
    it('renders the reader route table instead of the admin routes', () => {
        expect(source).toMatch(/if \(isStatisticsReader\) \{[\s\S]*?<StatisticsReaderRoutes/);
    });

    it('lands the reader on statistics instead of Home', () => {
        expect(source).toMatch(/navigate\(isStatisticsReader \? routePathNames\.statistic : routePathNames\.home\)/);
    });
});
