import { describe, expect, it } from 'vitest';
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
