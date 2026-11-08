import { message } from 'antd';
import type { ArgsProps } from 'antd/es/message/interface';
import { adminMessageConfig } from '../constants/adminMessageConfig';

type MessageKey = NonNullable<ArgsProps['key']>;
interface Notice {
    close: () => void;
}
interface Owner {
    token: symbol;
    active: boolean;
    sequence: number;
    notices: Map<MessageKey, Notice>;
    error: (notice: ArgsProps) => () => void;
}
export type TransportFeedback = (notice: ArgsProps) => void;
const owners = new WeakMap<Document, Owner>();
let sequence = 0;
const ignore: TransportFeedback = () => undefined;

/** Called only after the real App holder commits, never during render. */
export const registerTransportFeedbackOwner = (api: Pick<Owner, 'error'>): (() => void) => {
    if (typeof document === 'undefined') throw new Error('Transport feedback owner requires a document');
    const ownerDocument = document;
    if (owners.has(ownerDocument)) throw new Error('Transport feedback owner already registered for this document');
    sequence += 1;
    const owner: Owner = {
        token: Symbol('transport-feedback-owner'),
        active: true,
        sequence,
        notices: new Map(),
        error: api.error,
    };
    owners.set(ownerDocument, owner);
    return () => {
        if (!owner.active) return;
        owner.active = false;
        if (owners.get(ownerDocument)?.token === owner.token) owners.delete(ownerDocument);
        const notices = [...owner.notices.entries()];
        owner.notices.clear();
        // Antd briefly clears its imperative holder ref during React layout
        // cleanup. Invalidate now, then close these bounded old handles after commit.
        if (notices.length)
            queueMicrotask(() => {
                notices.forEach(([key, notice]) => {
                    const successor = owners.get(ownerDocument);
                    if (successor?.error === owner.error && successor.notices.has(key)) return;
                    notice.close();
                });
            });
    };
};

/** Capture once when a request begins; a late result must never select a new owner. */
export const captureTransportFeedback = (): TransportFeedback => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return ignore;
    const owner = owners.get(document);
    if (!owner) {
        // Explicit compatibility for calls begun before a provider/standalone.
        // Never queue or replay this call into a subsequently mounted owner.
        return (notice) => {
            if (typeof window !== 'undefined' && typeof document !== 'undefined') message.error(notice);
        };
    }
    return (notice) => {
        if (!owner.active) return;
        sequence += 1;
        const key = notice.key ?? `transport-${owner.sequence}-${sequence}`;
        const record: Notice = { close: () => undefined };
        owner.notices.set(key, record);
        record.close = owner.error({
            ...notice,
            key,
            onClose: () => {
                if (owner.notices.get(key) === record) owner.notices.delete(key);
                notice.onClose?.();
            },
        });
        // React can batch many errors before Antd commits its maxCount eviction.
        // Bound our own records too, using the same canonical holder limit.
        while (owner.notices.size > adminMessageConfig.maxCount) {
            const oldest = owner.notices.entries().next().value;
            if (!oldest) break;
            owner.notices.delete(oldest[0]);
            oldest[1].close();
        }
    };
};
