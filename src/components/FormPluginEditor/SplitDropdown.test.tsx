import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { SplitDropdown } from './SplitDropdown';

describe('SplitDropdown accessible name', () => {
    it('announces an identical visible label and title only once', () => {
        render(
            <SplitDropdown
                icon={null}
                label="Platzhalter einfügen"
                title="Platzhalter einfügen"
                menu={{ items: [] }}
            />,
        );
        expect(screen.getByRole('button')).toHaveAccessibleName('Platzhalter einfügen');
    });

    it('announces both a visible value and its different action title', () => {
        render(
            <SplitDropdown
                icon={null}
                label={<span>Alle Fachbereiche</span>}
                title="Fachbereich wählen"
                menu={{ items: [] }}
            />,
        );
        expect(screen.getByRole('button')).toHaveAccessibleName('Alle Fachbereiche Fachbereich wählen');
    });
});
