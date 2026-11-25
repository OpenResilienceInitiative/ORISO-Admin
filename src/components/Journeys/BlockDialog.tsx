import type { ComponentProps } from 'react';
import { ProfileDialog, type ProfileView } from './ProfileDialog';
import { SearchTermsDialog } from './SearchTermsDialog';

type BlockDialogProps = ComponentProps<typeof SearchTermsDialog> & { view: ProfileView };

/** The profile card or the search terms of one block: two separate dialogs, opened from separate entries. */
export const BlockDialog = ({ view, translator, suggester, ...props }: BlockDialogProps) =>
    view === 'card' ? (
        <ProfileDialog {...props} />
    ) : (
        <SearchTermsDialog {...props} translator={translator} suggester={suggester} />
    );
