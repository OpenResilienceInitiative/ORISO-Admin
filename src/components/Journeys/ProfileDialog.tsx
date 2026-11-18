import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { FilterChip } from '../FilterChip';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { AUDIENCES, emptyProfile, type Audience, type BlockProfile } from './journey';
import { useDiscardGuard } from './useDiscardGuard';
import styles from './styles.module.scss';

/** Which of the two block dialogs: the profile card, or the search terms. */
export type ProfileView = 'card' | 'terms';

export interface BlockDialogProps {
    /** The block's title: the dialog is about this block. */
    title: string;
    /** Where the block sits, e.g. "Frage · Reise #2 · Schulden ausführlich · Check-in · Schritt 2". */
    context?: string;
    profile?: BlockProfile;
    defaultAuthor: string;
    onApply: (profile: BlockProfile) => void;
    onClose: () => void;
}

interface BlockDialogFrameProps {
    icon: ReactNode;
    title: string;
    context?: string;
    testId: string;
    onApply: () => void;
    onClose: () => void;
    /** Escape, X and a click beside: asks first while there are changes (`useDiscardGuard`). */
    onDismiss?: () => void;
    children: ReactNode;
}

/** The frame both block dialogs share: the title names the block, the line below says where it sits. */
export const BlockDialogFrame = ({
    icon,
    title,
    context,
    testId,
    onApply,
    onClose,
    onDismiss,
    children,
}: BlockDialogFrameProps) => {
    const { t } = useTranslation();
    return (
        <Modal
            icon={icon}
            title={title}
            description={context}
            descriptionFullWidth
            width={720}
            zIndex={1300}
            footer={
                <div className={styles.footer}>
                    <M3Button variant="text" onClick={onClose}>
                        {t('journeys.action.cancel')}
                    </M3Button>
                    <M3Button variant="filled" onClick={onApply}>
                        {t('journeys.action.apply')}
                    </M3Button>
                </div>
            }
            onClose={onClose}
            onDismiss={onDismiss}
            wrapperTestId={testId}
            scrollableBody
        >
            <div className={styles.dialogBody}>{children}</div>
        </Modal>
    );
};

/**
 * The profile card of a block: what it is for, its goal, who made it and for whom. For other
 * editors and the block library; advice seekers never see it. Search terms have their own dialog.
 */
export const ProfileDialog = ({ title, context, profile, defaultAuthor, onApply, onClose }: BlockDialogProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<BlockProfile>(profile ?? emptyProfile(defaultAuthor));
    const [initial] = useState(draft);
    const guard = useDiscardGuard(draft, initial, onClose);
    const set = (patch: Partial<BlockProfile>) => setDraft((current) => ({ ...current, ...patch }));

    return (
        <BlockDialogFrame
            icon={<BadgeOutlined />}
            title={t('journeys.profileDialog.title', { name: title })}
            context={context}
            testId="journey-profile-dialog"
            onApply={() => onApply(draft)}
            onClose={onClose}
            onDismiss={guard.onDismiss}
        >
            {guard.confirm}
            <p className={styles.help}>{t('journeys.profileDialog.cardHelp')}</p>
            <FloatingLabelInput
                label={t('journeys.profile.about')}
                value={draft.about}
                onChange={(event) => set({ about: event.target.value })}
            />
            <FloatingLabelInput
                label={t('journeys.profile.goal')}
                value={draft.goal}
                onChange={(event) => set({ goal: event.target.value })}
            />
            <FloatingLabelInput
                label={t('journeys.profile.author')}
                value={draft.author}
                onChange={(event) => set({ author: event.target.value })}
            />
            <span className={styles.chipsLabel} id="profile-audiences">
                {t('journeys.profile.audiences')}
            </span>
            <div className={styles.looks} role="group" aria-labelledby="profile-audiences">
                {AUDIENCES.map((audience: Audience) => (
                    <FilterChip
                        key={audience}
                        label={t(`journeys.audience.${audience}`)}
                        selected={draft.audiences.includes(audience)}
                        onChange={(on) =>
                            set({
                                audiences: on
                                    ? [...draft.audiences, audience]
                                    : draft.audiences.filter((entry) => entry !== audience),
                            })
                        }
                    />
                ))}
            </div>
        </BlockDialogFrame>
    );
};
