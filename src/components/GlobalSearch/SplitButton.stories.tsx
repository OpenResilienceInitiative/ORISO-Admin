import { Fragment, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MenuProps } from 'antd';
import { ReactComponent as MailFilledIcon } from '../../resources/img/svg/oriso/mail_filled_24px.svg';
import { SplitButton, type SplitButtonSize, type SplitButtonVariant } from './SplitButton';

/**
 * M3 split button per the spec sheet Figma 57994-15744: five sizes
 * (XSmall 32px … XLarge 136px), the sheet's colour variants
 * (filled/tonal/outlined/elevated) and the interaction states. `primary` and
 * `secondary` remain as aliases of filled/tonal for existing callers.
 */
const meta = {
    title: 'Molecules/SplitButton',
    component: SplitButton,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof SplitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const SIZES: SplitButtonSize[] = ['xsmall', 'small', 'medium', 'large', 'xlarge'];
const VARIANTS: SplitButtonVariant[] = ['filled', 'tonal', 'outlined', 'elevated'];

const menu: MenuProps = {
    items: [
        { key: 'a', label: 'Erste Option' },
        { key: 'b', label: 'Zweite Option' },
    ],
};

const cellHeader: CSSProperties = {
    color: 'var(--m3-on-surface-variant, #444748)',
    font: '500 12px/16px Roboto, sans-serif',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
};

/**
 * Sizes × variants × states, mirroring the Figma sheet for side-by-side visual
 * review. Hover/focus/pressed are live pseudo-states — hover, tab and press the
 * Enabled column to see the 8%/10% state layers and the pressed shape morph.
 * The Open column pins the controlled open state (chevron up, fully rounded
 * chevron segment, elevated); its dropdown sheets are hidden here so sixty
 * buttons do not stack twenty menus — the OpenMenu story shows the real sheet.
 */
export const M3Matrix: Story = {
    args: { label: 'Label' },
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {/* Story-scoped: the matrix pins `open` for its state column; the
                portal-rendered menus would bury the grid. */}
            <style>{'.ant-dropdown:has(.splitbutton-matrix-menu) { display: none; }'}</style>
            {SIZES.map((size) => (
                <section key={size}>
                    <h3 style={{ margin: '0 0 12px', font: '400 24px/32px Roboto, sans-serif' }}>{size}</h3>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'max-content repeat(3, max-content)',
                            alignItems: 'center',
                            columnGap: 32,
                            rowGap: 16,
                        }}
                    >
                        <span />
                        {['Enabled', 'Disabled', 'Open'].map((state) => (
                            <span key={state} style={cellHeader}>
                                {state}
                            </span>
                        ))}
                        {VARIANTS.map((variant) => (
                            <Fragment key={variant}>
                                <span style={cellHeader}>{variant}</span>
                                <SplitButton
                                    icon={<MailFilledIcon />}
                                    label="Label"
                                    menu={menu}
                                    size={size}
                                    variant={variant}
                                />
                                <SplitButton
                                    disabled
                                    icon={<MailFilledIcon />}
                                    label="Label"
                                    menu={menu}
                                    size={size}
                                    variant={variant}
                                />
                                <SplitButton
                                    icon={<MailFilledIcon />}
                                    label="Label"
                                    menu={{ ...menu, className: 'splitbutton-matrix-menu' }}
                                    open
                                    size={size}
                                    variant={variant}
                                />
                            </Fragment>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    ),
};

/** The real open state with its menu sheet: chevron up, elevated, one surface. */
export const OpenMenu: Story = {
    args: { label: 'Label' },
    render: () => (
        <div style={{ height: 220 }}>
            <SplitButton icon={<MailFilledIcon />} label="Standard-Einladung" menu={menu} open variant="outlined" />
        </div>
    ),
};
