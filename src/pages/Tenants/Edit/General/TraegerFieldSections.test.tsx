import { Form } from 'antd';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { TRAEGER_SECTION_ORDER, TraegerFieldSections, type TraegerSectionKey } from './TraegerFieldSections';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../../utils/getDomain', () => ({ getDomain: () => 'example.org' }));

const requiredRule = { required: true, message: 'required' };

const renderSections = ({
    sections = TRAEGER_SECTION_ORDER,
    subdomain = { visible: true, editable: true },
    onFinish = vi.fn(),
}: {
    sections?: readonly TraegerSectionKey[];
    subdomain?: { visible: boolean; editable: boolean };
    onFinish?: (values: unknown) => void;
} = {}) => {
    const Harness = () => {
        const [form] = Form.useForm();
        return (
            <Form form={form} onFinish={onFinish} initialValues={{ licensing: { allowedNumberOfUsers: 5 } }}>
                <TraegerFieldSections subdomain={subdomain} requiredRule={requiredRule} sections={sections} />
                <button type="submit">save</button>
            </Form>
        );
    };
    render(<Harness />);
    return onFinish;
};

const panelNames = () => screen.getAllByRole('group').map((panel) => panel.getAttribute('aria-labelledby'));

/** ORISO-Admin#1314: the Träger tile and the create dialog share these white panels. */
describe('TraegerFieldSections', () => {
    it('shows the edit tile in the order of the list: general, then the short parts, then the data protection officer', () => {
        renderSections({ sections: ['general', 'sender', 'description', 'dpo'] });

        expect(panelNames()).toEqual([
            'tile-section-traeger-general',
            'tile-section-traeger-sender',
            'tile-section-traeger-description',
            'tile-section-traeger-dpo',
        ]);
    });

    it('shows the topic in the create dialog and leaves out the data protection officer', () => {
        renderSections({ sections: ['general', 'sender', 'description', 'topic'] });

        expect(panelNames()).toContain('tile-section-traeger-topic');
        expect(panelNames()).not.toContain('tile-section-traeger-dpo');
    });

    it('keeps the short parts in one column, between the general panel and the data protection officer', () => {
        renderSections();

        const names = panelNames();
        expect(names.indexOf('tile-section-traeger-general')).toBe(0);
        expect(names.indexOf('tile-section-traeger-dpo')).toBe(names.length - 1);
        expect(names.slice(1, -1)).toEqual([
            'tile-section-traeger-sender',
            'tile-section-traeger-description',
            'tile-section-traeger-topic',
        ]);
    });

    it('hides the subdomain on a single-domain platform', () => {
        renderSections({ sections: ['general'], subdomain: { visible: false, editable: false } });

        expect(screen.queryByLabelText(/tenants.add.form.subdomain.placeholder/)).not.toBeInTheDocument();
    });

    it('shows the subdomain read-only once the Träger exists', () => {
        renderSections({ sections: ['general'], subdomain: { visible: true, editable: false } });

        expect(screen.getByLabelText(/tenants.add.form.subdomain.placeholder/)).toBeDisabled();
    });

    it('submits the name typed into the general panel', async () => {
        const onFinish = renderSections({ sections: ['general'], subdomain: { visible: true, editable: false } });
        const general = screen.getByRole('group', { name: 'tenants.form.section.general' });

        await userEvent.type(within(general).getByLabelText(/tenants.add.form.name.placeholder/), 'Caritas Süd');
        await userEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() => expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ name: 'Caritas Süd' })));
    });
});
