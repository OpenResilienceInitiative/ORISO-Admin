import { useId } from 'react';
import { Alert, ConfigProvider, Form, Radio } from 'antd';
import AnimationOutlinedIcon from '@mui/icons-material/AnimationOutlined';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../CardEditable';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';
import { usePublicTenantData } from '../../../../../hooks/usePublicTenantData.hook';
import { useAppConfigContext } from '../../../../../context/useAppConfig';
import { isReadOnlySetting } from '../../../../../utils/serverSettingsMeta';
import {
    CLOSING_ANIMATIONS,
    ClosingAnimation as Design,
    DEFAULT_CLOSING_ANIMATION,
    isClosingAnimation,
} from '../../../../../utils/closingAnimation';
import styles from './styles.module.scss';

const DEVICES = ['desktop', 'mobile'] as const;
type Device = (typeof DEVICES)[number];
const FIELD = { desktop: 'closingAnimationDesktop', mobile: 'closingAnimationMobile' } as const;
/** The form value of "Platform default"; antd radios cannot hold null, so it is stored as null on save. */
const INHERIT = '';
type Choice = Design | typeof INHERIT;

const toChoice = (stored: unknown): Choice => (isClosingAnimation(stored) ? stored : INHERIT);

/** A static, CSS-only still of the moment the red surface covers the screen. Decorative: the words carry the meaning. */
const Preview = ({ design }: { design?: Design }) => (
    <span className={styles.preview} data-design={design ?? 'none'} aria-hidden="true">
        <span className={styles.previewStage}>
            <span className={styles.previewField} />
            <span className={styles.layerA} />
            <span className={styles.layerB} />
        </span>
    </span>
);

const Tile = ({
    value,
    title,
    description,
    design,
}: {
    value: Choice;
    title: string;
    description: React.ReactNode;
    design?: Design;
}) => {
    const titleId = useId();
    const descriptionId = useId();
    return (
        <Radio value={value} className={styles.tile} aria-labelledby={titleId} aria-describedby={descriptionId}>
            <span className={styles.tileBody}>
                <Preview design={design} />
                <span className={styles.tileText}>
                    <span id={titleId} className={styles.tileTitle}>
                        {title}
                    </span>
                    <span id={descriptionId} className={styles.tileDescription}>
                        {description}
                    </span>
                </span>
            </span>
        </Radio>
    );
};

const Choices = ({
    device,
    platformDesign,
    value,
    onChange,
    disabled,
}: {
    device: Device;
    /** The design the platform tenant's value resolves to; undefined while it is not known. */
    platformDesign?: Design;
    value?: Choice;
    onChange?: (value: Choice) => void;
    disabled?: boolean;
}) => {
    const { t } = useTranslation();
    const { componentDisabled } = ConfigProvider.useConfig();
    return (
        // antd's Radio.Group types leave out `role`; the wrapper carries the group semantics.
        <div role="radiogroup" aria-label={t(`settings.closingAnimation.${device}`)} className={styles.group}>
            <Radio.Group
                value={value ?? INHERIT}
                onChange={(event) => onChange?.(event.target.value)}
                disabled={disabled || componentDisabled}
                className={styles.tiles}
            >
                <Tile
                    value={INHERIT}
                    title={t('settings.closingAnimation.inherit')}
                    design={platformDesign}
                    description={
                        <>
                            {t('settings.closingAnimation.inherit.description')}
                            {platformDesign && (
                                <>
                                    {' '}
                                    {t('settings.closingAnimation.inherit.current')}{' '}
                                    <strong>{t(`settings.closingAnimation.design.${platformDesign}`)}</strong>
                                </>
                            )}
                        </>
                    }
                />
                {CLOSING_ANIMATIONS.map((design) => (
                    <Tile
                        key={design}
                        value={design}
                        design={design}
                        title={t(`settings.closingAnimation.design.${design}`)}
                        description={t(`settings.closingAnimation.design.${design}.description`)}
                    />
                ))}
            </Radio.Group>
        </div>
    );
};

export const ClosingAnimation = ({ tenantId, readOnly = false }: { tenantId: string; readOnly?: boolean }) => {
    const { t } = useTranslation();
    const { data, isLoading, isError, mutate } = useTenantAppearanceFormData(tenantId, { ownOverrides: true });
    const { data: effective, isFetching: effectiveReadPending } = usePublicTenantData(tenantId);
    const effectiveTheming =
        !effectiveReadPending && Number(tenantId) > 0 && String(effective?.id) === tenantId
            ? effective?.theming
            : undefined;
    const { settings } = useAppConfigContext();
    const locked =
        readOnly ||
        isError ||
        !data ||
        isReadOnlySetting(settings.serverSettingsMeta, [
            'theming.closingAnimationDesktop',
            'theming.closingAnimationMobile',
            'appearance',
        ]);
    const own = DEVICES.reduce(
        (all, device) => ({ ...all, [device]: toChoice(data?.theming?.[FIELD[device]]) }),
        {} as Record<Device, Choice>,
    );
    // The effective read already holds the tenant's own choice, so it is the PLATFORM's only where the
    // tenant stored nothing. An unrecognised stored value (a newer Admin may know more designs) names nothing.
    const platformDesign = (device: Device): Design | undefined => {
        const stored = data?.theming?.[FIELD[device]];
        const hasOwnChoice = stored !== undefined && stored !== null && (stored as string) !== INHERIT;
        if (!effectiveTheming || hasOwnChoice) return undefined;
        const resolved = effectiveTheming[FIELD[device]];
        return isClosingAnimation(resolved) ? resolved : DEFAULT_CLOSING_ANIMATION;
    };
    const initialValues = {
        theming: { [FIELD.desktop]: own.desktop, [FIELD.mobile]: own.mobile },
    };
    return (
        <CardEditable
            key={`closing-animation-${tenantId}-${own.desktop}-${own.mobile}-${locked}`}
            titleKey="settings.closingAnimation.title"
            subTitle={t('settings.closingAnimation.description')}
            initialValues={initialValues}
            isLoading={isLoading}
            allowEdit={!locked}
            onSave={(submitted, options) => {
                const values = (submitted as { theming?: Partial<Record<string, Choice>> }).theming ?? {};
                const theming: Partial<Record<(typeof FIELD)[Device], Design | null>> = {};
                DEVICES.forEach((device) => {
                    const next = values[FIELD[device]] ?? INHERIT;
                    if (next !== own[device]) theming[FIELD[device]] = isClosingAnimation(next) ? next : null;
                });
                // Nothing changed: no PUT, because every tenant write replaces all tenant fields.
                if (Object.keys(theming).length === 0) return;
                mutate({ theming }, options);
            }}
            variant="dialog"
            editButtonPlacement="footer"
            headerIcon={<AnimationOutlinedIcon />}
        >
            {isError && <Alert type="error" message={t('settings.closingAnimation.loadError')} showIcon />}
            <>
                {DEVICES.map((device) => (
                    <Form.Item
                        key={device}
                        name={['theming', FIELD[device]]}
                        label={t(`settings.closingAnimation.${device}`)}
                    >
                        <Choices device={device} platformDesign={platformDesign(device)} disabled={locked} />
                    </Form.Item>
                ))}
            </>
        </CardEditable>
    );
};
