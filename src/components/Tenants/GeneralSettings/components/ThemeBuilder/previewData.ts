/**
 * Domain fixtures for the AppPreview — fictional counselling content
 * mirroring the real app's building blocks: Beratungsthemen (topic
 * chips), Beratungsarten (Live Chat / 1-1 Beratung / Interna) and a
 * short chat history. Proper nouns stay hardcoded; UI labels are i18n.
 */

export type CounsellingType = 'liveChat' | 'oneOnOne' | 'interna';

export interface PreviewSession {
    /** Beratungsthema chip; group entries carry none. */
    topic?: string;
    /** Chip tone per the Figma design: brand (rosa) or neutral (grey). */
    topicTone?: 'brand' | 'neutral';
    /** Optional case number shown inside the topic chip. */
    caseId?: string;
    name: string;
    lastMessage: string;
    type: CounsellingType;
    avatar: string;
}

export const PREVIEW_SESSIONS: PreviewSession[] = [
    {
        topic: 'Familienberatung',
        topicTone: 'brand',
        caseId: '12345',
        name: 'ruhiges Yak Kim',
        lastMessage: 'Anfrage gesendet',
        type: 'liveChat',
        avatar: '🐃',
    },
    {
        topic: 'Suchtberatung',
        topicTone: 'neutral',
        caseId: '99322',
        name: 'Ratsuchender_R3',
        lastMessage: 'Ja das ist schön, dass Sie das…',
        type: 'oneOnOne',
        avatar: '🐂',
    },
    {
        name: 'Träger Admins',
        lastMessage: 'Mario K: Das ist schon komisch mit…',
        type: 'interna',
        avatar: '🏠',
    },
];

export interface PreviewMessage {
    direction: 'own' | 'client';
    author?: string;
    avatar?: string;
    text: string;
}

export const PREVIEW_MESSAGES: PreviewMessage[] = [
    {
        direction: 'client',
        author: 'ruhiges Yak Kim',
        avatar: '🐃',
        text: 'Guten Tag, ich habe eine Frage zu meinem nächsten Termin.',
    },
    {
        direction: 'own',
        author: 'A. Kräger',
        text: 'Gerne — lassen Sie uns das morgen früh gemeinsam anschauen.',
    },
];

export const PREVIEW_GROUP_NAME = 'Familienberatung 12345';
export const PREVIEW_TOPIC_TAG = 'Suchtprobleme';
