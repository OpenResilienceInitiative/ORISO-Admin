import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import i18n from '../../i18n';
import { AdminEmpty } from '.';

// OBP 2.1 #136: the empty table of "Logs > Inactive audit" said "Keine Daten"
// in the English UI because the `empty.noData` key did not exist.
describe('AdminEmpty', () => {
    afterEach(async () => {
        await i18n.changeLanguage('en');
    });

    it('speaks English in the English UI', async () => {
        await i18n.changeLanguage('en');
        render(<AdminEmpty />);
        expect(screen.getByTestId('admin-empty')).toHaveTextContent('No data');
        expect(screen.queryByText('Keine Daten')).toBeNull();
    });

    it('speaks German in the German UI', async () => {
        await i18n.changeLanguage('de');
        render(<AdminEmpty />);
        expect(screen.getByTestId('admin-empty')).toHaveTextContent('Keine Daten');
    });

    it('prefers an explicit description', () => {
        render(<AdminEmpty description="Nothing here" />);
        expect(screen.getByTestId('admin-empty')).toHaveTextContent('Nothing here');
    });
});
