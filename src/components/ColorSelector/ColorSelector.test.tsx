import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import i18n from '../../i18n';
import ColorSelector from './ColorSelector';

const Stateful = ({ onSet, showContrast }: { onSet?: (color: string) => void; showContrast?: boolean }) => {
    const [color, setColor] = useState('#a5000a');
    return (
        <ColorSelector
            isLoading={false}
            label="Dunkle Akzentfarbe"
            tenantColor={color}
            field="primaryColor"
            showContrast={showContrast}
            setColorValue={(_field, value) => {
                onSet?.(value);
                setColor(value);
            }}
        />
    );
};

describe('ColorSelector (#1374)', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('de');
    });

    it('always shows the hex code next to the swatch', () => {
        render(<Stateful />);

        expect(screen.getByRole('heading', { name: 'HEX #A5000A' })).toBeInTheDocument();
    });

    it('shows the contrast badge only when asked to', () => {
        const { unmount } = render(<Stateful />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        unmount();

        render(<Stateful showContrast />);
        expect(screen.getByRole('img')).toHaveTextContent(/^AAA · /);
    });

    it('offers a hex text input in the picker that updates the colour', async () => {
        const user = userEvent.setup();
        const onSet = vi.fn();
        render(<Stateful onSet={onSet} />);

        await user.click(screen.getByRole('button', { name: 'Dunkle Akzentfarbe' }));
        const input = screen.getByRole('textbox', { name: 'Dunkle Akzentfarbe als Hex-Code' });
        expect(input).toHaveValue('#a5000a');

        await user.clear(input);
        await user.type(input, '1d4ed8');

        expect(onSet).toHaveBeenLastCalledWith('#1d4ed8');
        expect(screen.getByRole('heading', { name: 'HEX #1D4ED8' })).toBeInTheDocument();
    });

    it('flags an incomplete code, never reports it, and reverts it on blur', async () => {
        const user = userEvent.setup();
        const onSet = vi.fn();
        render(<Stateful onSet={onSet} />);

        await user.click(screen.getByRole('button', { name: 'Dunkle Akzentfarbe' }));
        const input = screen.getByRole('textbox', { name: 'Dunkle Akzentfarbe als Hex-Code' });

        await user.clear(input);
        await user.type(input, '1d4e');

        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByRole('alert')).toHaveTextContent('3 oder 6 Zeichen');
        expect(onSet).not.toHaveBeenCalledWith('#1d4e');

        fireEvent.blur(input);

        expect(input).not.toHaveAttribute('aria-invalid');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('stores shorthand as the canonical 6-digit code on blur', async () => {
        const user = userEvent.setup();
        const onSet = vi.fn();
        render(<Stateful onSet={onSet} />);

        await user.click(screen.getByRole('button', { name: 'Dunkle Akzentfarbe' }));
        const input = screen.getByRole('textbox', { name: 'Dunkle Akzentfarbe als Hex-Code' });

        await user.clear(input);
        await user.type(input, '03f');
        fireEvent.blur(input);

        expect(onSet).toHaveBeenLastCalledWith('#0033ff');
    });
});
