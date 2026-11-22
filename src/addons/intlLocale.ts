/** App languages such as `de@informal` are not BCP 47 tags; Intl needs the base tag. */
export const intlLocale = (language: string | undefined): string | undefined => language?.split('@')[0] || undefined;

export const formatDateTime = (value: string | number | Date, language: string | undefined): string =>
    new Date(value).toLocaleString(intlLocale(language));
