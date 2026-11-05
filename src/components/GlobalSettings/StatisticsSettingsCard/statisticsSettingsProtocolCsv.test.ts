import { describe, expect, it } from 'vite-plus/test';
import i18n from '../../../i18n';
import { buildStatisticsSettingsProtocolCsv } from './statisticsSettingsProtocolCsv';

describe('buildStatisticsSettingsProtocolCsv', () => {
    it('writes one semicolon line per change with translated setting and value labels', async () => {
        await i18n.changeLanguage('de');
        const csv = buildStatisticsSettingsProtocolCsv(
            [
                {
                    key: 'agencyMinimumCounsellors',
                    oldValue: null,
                    newValue: '5',
                    changedById: null,
                    changedByName: null,
                    effectiveFrom: '2026-11-01T08:00',
                },
                {
                    key: 'messageCountTracking',
                    oldValue: 'ENABLED',
                    newValue: 'DISABLED',
                    changedById: 'admin-id',
                    changedByName: 'platform.admin',
                    effectiveFrom: '2026-11-02T09:30:15',
                },
            ],
            i18n.t,
        );

        expect(csv.startsWith('\ufeff')).toBe(true);
        expect(csv.slice(1).split('\r\n')).toEqual([
            'Einstellung;Bisheriger Wert;Neuer Wert;Geändert von;Gilt ab',
            'Mindestzahl Beratende je Beratungsstelle;;5;System;2026-11-01T08:00',
            'Gesendete Nachrichten der Beratenden zählen;An;Aus;platform.admin;2026-11-02T09:30:15',
            '',
        ]);
    });

    it('writes a stand change as a protocol line with readable values (UserService#1547)', async () => {
        await i18n.changeLanguage('de');
        const csv = buildStatisticsSettingsProtocolCsv(
            [
                {
                    key: 'platformSnapshotInterval',
                    oldValue: 'DAILY',
                    newValue: 'WEEKLY',
                    changedById: 'admin-id',
                    changedByName: 'platform.admin',
                    effectiveFrom: '2026-11-02T10:00',
                },
            ],
            i18n.t,
        );

        expect(csv).toContain(
            'Stand für die Plattform;Täglich um 6 Uhr;Wöchentlich, Mo. 6 Uhr;platform.admin;2026-11-02T10:00',
        );
    });

    it('writes the dashboard time windows with their unit (UserService#1544)', async () => {
        await i18n.changeLanguage('de');
        const csv = buildStatisticsSettingsProtocolCsv(
            [
                {
                    key: 'requestChartWeeks',
                    oldValue: '5',
                    newValue: '12',
                    changedById: 'admin-id',
                    changedByName: 'platform.admin',
                    effectiveFrom: '2026-11-01T10:00',
                },
                {
                    key: 'topicMonths',
                    oldValue: null,
                    newValue: '4',
                    changedById: null,
                    changedByName: null,
                    effectiveFrom: '2026-11-01T08:00',
                },
            ],
            i18n.t,
        );

        expect(csv.slice(1).split('\r\n')).toEqual([
            'Einstellung;Bisheriger Wert;Neuer Wert;Geändert von;Gilt ab',
            'Diagramm „Beratungsfälle“: Zeitraum in Wochen;5 Wochen;12 Wochen;platform.admin;2026-11-01T10:00',
            'Häufigstes Thema: Zeitraum in Monaten;;4 Monate;System;2026-11-01T08:00',
            '',
        ]);
    });

    it('quotes separators and neutralises cells a spreadsheet would run as a formula', async () => {
        await i18n.changeLanguage('de');
        const csv = buildStatisticsSettingsProtocolCsv(
            [
                {
                    key: 'tenantMinimumCounsellors',
                    oldValue: '5',
                    newValue: '2',
                    changedById: 'x',
                    changedByName: '=HYPERLINK("x";"y")',
                    effectiveFrom: '2026-11-01T08:00',
                },
            ],
            i18n.t,
        );

        expect(csv).toContain(`;"'=HYPERLINK(""x"";""y"")";`);
    });
});
