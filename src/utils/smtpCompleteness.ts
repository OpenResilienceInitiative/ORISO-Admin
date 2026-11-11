/** The stored SMTP block of a tenant, as the tenant services return it. Every field may be missing. */
export interface StoredSmtpSettings {
    host?: string | null;
    port?: number | string | null;
    from?: string | null;
    username?: string | null;
    password?: string | null;
    passwordSet?: boolean | null;
}

const hasValue = (value?: string | number | null) =>
    value !== undefined && value !== null && String(value).trim() !== '';

/**
 * `passwordSet` comes from the write-only API (#730); older backends still return the
 * stored password itself, which counts as set without ever being displayed.
 */
export const isSmtpPasswordStored = (smtp?: StoredSmtpSettings | null): boolean =>
    Boolean(smtp?.passwordSet ?? hasValue(smtp?.password));

/**
 * One rule for "the own mail server is set up", shared by the SMTP editor (whether a test
 * mail can be sent) and Home (the checklist step and its status chip): host, sender,
 * username, a port from 1 to 65535 and a stored password.
 */
export const isOwnSmtpServerComplete = (smtp?: StoredSmtpSettings | null): boolean => {
    const port = Number(smtp?.port);
    return (
        hasValue(smtp?.host) &&
        hasValue(smtp?.from) &&
        hasValue(smtp?.username) &&
        Number.isInteger(port) &&
        port >= 1 &&
        port <= 65535 &&
        isSmtpPasswordStored(smtp)
    );
};
