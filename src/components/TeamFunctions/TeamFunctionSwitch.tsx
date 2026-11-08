import { useTranslation } from 'react-i18next';
import { MuiSwitchField } from '../mui/MuiSwitchField';
import { TEAM_FUNCTIONS, type TeamFunctionId } from './teamFunctions';

interface TeamFunctionSwitchProps {
    fn: TeamFunctionId;
    className?: string;
    disabled?: boolean;
}

/**
 * The setting row for a team function in a form card: switch, shared name, shared description.
 * Must sit inside an antd `Form`. The provider tile "Other functions" lays out its rows with
 * `FormSwitchField` + `.checkInfo` like its siblings, but reads name, description and field from
 * the same `TEAM_FUNCTIONS` entry, so the wording cannot drift.
 */
export const TeamFunctionSwitch = ({ fn, className, disabled }: TeamFunctionSwitchProps) => {
    const { t } = useTranslation();
    const definition = TEAM_FUNCTIONS[fn];
    return (
        <MuiSwitchField
            name={definition.field}
            label={t(definition.nameKey)}
            helpText={t(definition.descriptionKey)}
            className={className}
            disabled={disabled}
        />
    );
};
