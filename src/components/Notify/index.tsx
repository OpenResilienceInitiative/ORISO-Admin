import { QueryClientContext } from '@tanstack/react-query';
import { isValidElement, useContext, useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { HintText } from '../HintText';
import { snackbar, snackbarStore, type SnackbarAction, type SnackbarJump, type SnackbarJumpTarget } from '../Snackbar';

/**
 * Event notifications are pop-ups, never boxes in the page flow (Frank, 2026-11-07).
 *
 * `<Notify>` is the declarative form of `snackbar.notify()`: render it where the event is known
 * (`{error && <Notify severity="error">…</Notify>}`) and the shared snackbar channel shows ONE
 * pop-up above the layout, with a dismiss control. It renders nothing itself, so it can never push
 * content or sit against a card edge. When the condition ends and the element unmounts, the
 * pop-up goes with it.
 *
 * - Errors, warnings and anything with an action stay until dismissed or acted on.
 * - Success and info time out (`persistent` overrides).
 * - At most two actions (a choice such as "use saved draft" / "use browser draft").
 */
export type MessageSeverity = 'error' | 'warning' | 'info' | 'success';

export interface MessageAction {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

export interface NotifyProps {
    severity?: MessageSeverity;
    /** Bold lead line. Shown before the text in the same pop-up. */
    title?: ReactNode;
    children: ReactNode;
    actions?: readonly [MessageAction] | readonly [MessageAction, MessageAction];
    /** Force staying (true) or timing out (false). Default: stays for error, warning and with actions. */
    persistent?: boolean;
    /** One cause, one pop-up: notifications sharing a `causeKey` collapse into the first one. */
    causeKey?: string;
    /**
     * "Ansehen": takes the person to what the event belongs to. Default: the element this `<Notify>` is
     * rendered in (its tile, form or dialog). Pass an element id/selector for a more exact target, or
     * `false` when there is nothing to go to.
     */
    jump?: SnackbarJump | SnackbarJumpTarget | false;
    /**
     * Permanent, quiet text shown in the owning tile while the cause lasts (for example "could not be
     * loaded"). The pop-up is the event; this text is the tile's own empty state and stays.
     */
    quietText?: ReactNode;
    /**
     * "Try again" for a load failure: refetches every mounted query that is in error (one outage, one
     * retry). Ignored when `actions` are given or when there is no query client.
     */
    retry?: boolean;
    /** `data-testid` of the pop-up, for tests. */
    testId?: string;
    /** Called when the person closes the pop-up with its close control. */
    onClose?: () => void;
}

/** Flattens text out of an element tree so the effect only re-runs when the visible text changes. */
const signatureOf = (node: ReactNode): string => {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(signatureOf).join('');
    if (isValidElement<{ children?: ReactNode }>(node)) return signatureOf(node.props.children);
    return '';
};

export const Notify = ({
    severity = 'info',
    title,
    children,
    actions,
    persistent,
    onClose,
    testId,
    causeKey,
    jump,
    quietText,
    retry,
}: NotifyProps) => {
    const { t } = useTranslation();
    const queryClient = useContext(QueryClientContext);
    const retryAction =
        retry && queryClient && !actions?.length
            ? [
                  {
                      label: t('notify.retry'),
                      onClick: () => {
                          queryClient.refetchQueries({
                              predicate: (query) => query.state.status === 'error' && query.getObserversCount() > 0,
                          });
                      },
                  },
              ]
            : undefined;
    const allActions = (actions ?? retryAction) as NotifyProps['actions'];
    const key = `notify:${useId()}`;
    // A hidden marker lets the pop-up find the element it belongs to: its parent in the layout.
    const marker = useRef<HTMLSpanElement>(null);
    const owner = useRef<{ current: HTMLElement | null }>({ current: null });
    const latest = useRef({ title, children, actions: allActions, onClose });
    latest.current = { title, children, actions: allActions, onClose };
    const text = `${signatureOf(title)}|${signatureOf(children)}`;
    const labels = (allActions ?? []).map((action) => action.label).join('|');

    const raise = useRef<(() => void) | undefined>(undefined);
    const disabledSignature = (allActions ?? []).map((action) => (action.disabled ? '1' : '0')).join('');
    const shownDisabled = useRef(disabledSignature);

    useEffect(() => {
        owner.current.current = marker.current?.parentElement ?? null;
        let mounted = true;
        const toAction = (index: number): SnackbarAction | undefined => {
            const choice = latest.current.actions?.[index];
            if (!choice) return undefined;
            return {
                label: choice.label,
                disabled: choice.disabled,
                onClick: () => latest.current.actions?.[index]?.onClick(),
            };
        };
        raise.current = () => {
            shownDisabled.current = (latest.current.actions ?? [])
                .map((action) => (action.disabled ? '1' : '0'))
                .join('');
            const { title: leadLine, children: body, actions: choices } = latest.current;
            const stays = persistent ?? (severity !== 'success' && severity !== 'info' ? true : !!choices?.length);
            snackbar.notify({
                key,
                severity,
                // The title says which thing the pop-up is about; the text under it says what happened.
                title: leadLine ?? body,
                description: leadLine ? body : undefined,
                causeKey,
                jump: jump === false ? undefined : jump ?? owner.current,
                // The first choice is the primary one (right-most); the second sits before it.
                action: toAction(0),
                secondaryAction: toAction(1),
                persistent: stays,
                dismissible: true,
                testId,
                onClose: (reason) => {
                    if (mounted && reason === 'dismiss') latest.current.onClose?.();
                },
            });
        };
        raise.current();
        return () => {
            mounted = false;
            snackbar.dismiss(key);
        };
    }, [key, severity, text, labels, persistent, testId, causeKey]);

    // A choice that is disabled while its operation runs: update the pop-up in place, but never bring
    // back one the person has already closed.
    useEffect(() => {
        if (shownDisabled.current === disabledSignature) return;
        const { visible, queued } = snackbarStore.getState();
        if ([...visible, ...queued].some((item) => item.key === key)) raise.current?.();
    }, [key, disabledSignature]);

    return (
        <>
            <span ref={marker} hidden data-notify-owner="" />
            {quietText ? <HintText>{quietText}</HintText> : null}
        </>
    );
};

export default Notify;
