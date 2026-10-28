import { useTranslation } from 'react-i18next';
import type { CounselorData } from '../../../../types/counselor';

/** Missing projection data must never be presented as proof of a single identity. */
export const otherIdentityFromRow = (
    user: Pick<CounselorData, 'hasOtherIdentity' | 'otherIdentityTypes'>,
): boolean | undefined => {
    if (user.hasOtherIdentity === true || user.otherIdentityTypes?.length) return true;
    return user.hasOtherIdentity === false ? false : undefined;
};

export const IdentityRemovalNotice = ({
    removing,
    hasOtherIdentity,
}: {
    removing: 'consultant' | 'administrator';
    hasOtherIdentity?: boolean;
}) => {
    const { t } = useTranslation();
    if (hasOtherIdentity === false) return null;
    const remaining = removing === 'administrator' ? 'consultant' : 'administrator';
    return <p>{t(`identityRemoval.${hasOtherIdentity === true ? 'remaining' : 'possibleRemaining'}.${remaining}`)}</p>;
};
