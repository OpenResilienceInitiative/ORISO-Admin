import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

/**
 * „An“/„Aus“ next to a switch (#1374), so the state does not depend on reading the knob
 * alone. Shared by `M3Switch` and `MuiSwitch`. The word repeats what the switch role
 * already announces, so assistive tech skips it.
 *
 * Its own component so the switches only need translations when the word is shown.
 */
export const SwitchStateLabel = ({ checked, disabled = false }: { checked: boolean; disabled?: boolean }) => {
    const { t } = useTranslation();

    return (
        <span
            className={classNames(styles.stateLabel, { [styles.stateLabelDisabled]: disabled })}
            aria-hidden="true"
            data-switch-state={checked ? 'on' : 'off'}
        >
            {t(checked ? 'switch.state.on' : 'switch.state.off')}
        </span>
    );
};
