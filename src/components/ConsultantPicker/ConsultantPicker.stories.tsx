import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../theme/antdM3Theme';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { ReactComponent as PersonIcon } from '../../resources/img/svg/person.svg';
import { ConsultantPicker } from './index';

const meta = {
    title: 'Molecules/ConsultantPicker',
    component: ConsultantPicker,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ConsultantPicker>;

export default meta;

const CONSULTANTS = [
    { id: '1', name: 'Anna Berger' },
    { id: '2', name: 'Jonas Keller' },
    { id: '3', name: 'Miriam Schuster' },
    { id: '4', name: 'David Roth' },
    { id: '5', name: 'Leonie Brandt' },
    { id: '6', name: 'Tobias Winkler' },
    { id: '7', name: 'Sofia Neumann' },
    { id: '8', name: 'Karim El-Sayed' },
    { id: '9', name: 'Franziska Vogel' },
];

const OnCard = ({ children }: { children: React.ReactNode }) => (
    <ConfigProvider theme={buildAdminAntdTheme()}>
        <div style={{ minHeight: '100vh', padding: 32, background: 'var(--m3-surface-container-high, #eae7e8)' }}>
            <div style={{ maxWidth: 520 }}>{children}</div>
        </div>
    </ConfigProvider>
);

const PickerExample = () => {
    const [selected, setSelected] = useState<string[]>(['2', '7']);
    return (
        <OnCard>
            <ConsultantPicker
                consultants={CONSULTANTS}
                selectedIds={selected}
                onChange={setSelected}
                searchLabel="Berater suchen"
                createLabel="Neuen Berater anlegen"
                onCreateNew={() => undefined}
            />
        </OnCard>
    );
};

/** Search narrows candidates; selected people stay pinned in front as dark chips. */
export const Default: StoryObj = { render: () => <PickerExample /> };

const DialogExample = () => {
    const [selected, setSelected] = useState<string[]>(['2', '7']);
    return (
        <ConfigProvider theme={buildAdminAntdTheme()}>
            <div style={{ minHeight: '100vh', background: 'var(--admin-workspace-background, #e4e2e2)' }}>
                <Modal
                    title="Berater zuweisen"
                    icon={<PersonIcon />}
                    onClose={() => undefined}
                    width={560}
                    footer={
                        <>
                            <M3Button>Abbrechen</M3Button>
                            <M3Button>Zuweisen</M3Button>
                        </>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
                        <span>
                            Wähle bestehende Berater für diese Beratungsstelle aus oder lege eine neue Person an.
                        </span>
                        <ConsultantPicker
                            consultants={CONSULTANTS}
                            selectedIds={selected}
                            onChange={setSelected}
                            searchLabel="Berater suchen"
                            createLabel="Neuen Berater anlegen"
                            onCreateNew={() => undefined}
                        />
                    </div>
                </Modal>
            </div>
        </ConfigProvider>
    );
};

/**
 * The full plus-button flow as an organism: the shared M3 dialog (hero icon,
 * headline, divider, text-button footer) hosting search + chip multi-select +
 * the create-new action — assign existing people AND branch into creating a
 * new consultant from one place.
 */
export const AssignDialog: StoryObj = { render: () => <DialogExample /> };
