import { describe, expect, it } from 'vitest';
import { buildQuickCreateConsultantData } from './index';

describe('buildQuickCreateConsultantData', () => {
    it('binds a quick-created consultant to the current tenant, agency and topics', () => {
        expect(
            buildQuickCreateConsultantData({ firstname: 'Ada', lastname: 'Lovelace' }, 84, '282', ['7', 12]),
        ).toMatchObject({
            firstname: 'Ada',
            lastname: 'Lovelace',
            tenantId: '84',
            agencyIds: [282],
            topicIds: [7, 12],
        });
    });
});
