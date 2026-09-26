import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { MuiSelectField, Option } from '../../../components/mui/MuiSelectField';
import {
    centreLabel,
    centreTopicOptions,
    CentreWithTopics,
    findCentre,
    notOfferedAt,
    TopicsByCentre,
} from './topicsByCentre';

interface CentreTopicPickersProps {
    selectedCentres: Option[];
    centres: CentreWithTopics[];
    /** Name of a topic the centre no longer lists. */
    topicName: (id: string) => string | undefined;
    className?: string;
}

const helpKey = (offered: number, notOffered: number) => {
    if (notOffered > 0) {
        return 'counselor.topicsAtAgency.notOfferedNotice';
    }
    return offered === 0 ? 'counselor.topicsAtAgency.none' : undefined;
};

/** One topic picker per selected centre, offering only that centre's topics (#1264). */
export const CentreTopicPickers = ({ selectedCentres, centres, topicName, className }: CentreTopicPickersProps) => {
    const { t } = useTranslation();
    const picked: TopicsByCentre = Form.useWatch('topicsByAgency') ?? {};

    return (
        <>
            {selectedCentres.map(({ value, label }) => {
                const centre = findCentre(centres, value);
                const offered = centreTopicOptions(centre);
                // Stored but no longer offered here: stays visible and removable, never pickable.
                const notOffered = notOfferedAt(centre, picked[String(value)]).map((id) => ({
                    value: id,
                    label: t('counselor.topicsAtAgency.notOfferedChip', { topic: topicName(id) ?? id }),
                    disabled: true,
                }));
                return (
                    <MuiSelectField
                        key={value}
                        name={['topicsByAgency', String(value)]}
                        label="counselor.topicsAtAgency"
                        labelValues={{ agency: centre ? centreLabel(centre) : label }}
                        labelInValue
                        isMulti
                        allowClear
                        placeholder="plsSelect"
                        help={helpKey(offered.length, notOffered.length)}
                        // Disabled, not hidden: the admin sees the centre offers nothing to pick.
                        disabled={(offered.length === 0 && notOffered.length === 0) || undefined}
                        options={[...offered, ...notOffered]}
                        className={className}
                    />
                );
            })}
        </>
    );
};
