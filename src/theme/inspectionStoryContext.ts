import i18n from '../i18n';
import { applyAdminInvertedTheme, applyAdminTheme } from '../utils/applyAdminTheme';
import { computeOrisoPalette } from '../utils/theme/orisoScheme';
import type { InspectionContext } from './appliedTokenInspection';

export const inspectionStoryContext = (args: Record<string, unknown>): InspectionContext => {
    const primaryColor = args.primaryColor ?? '#A5000A';
    const scheme = args.scheme ?? 'light';
    const locale = args.locale ?? (i18n.resolvedLanguage === 'en' ? 'en' : 'de');
    if (
        typeof primaryColor !== 'string' ||
        (scheme !== 'light' && scheme !== 'inverted') ||
        (locale !== 'de' && locale !== 'en')
    )
        throw new Error('Unsupported token reference context');
    return { primaryColor, scheme, locale };
};

/** Story-owned, awaited theme/language lifetime; ordinary contract stories own theirs. */
export const prepareInspectionStory = async (context: InspectionContext) => {
    const root = document.documentElement;
    const names = Object.keys(computeOrisoPalette({ accentDark: context.primaryColor }, context.scheme).tokens).filter(
        (name) => name.startsWith('--m3-') || name.startsWith('--admin-'),
    );
    const previous = names.map((name) => ({
        name,
        value: root.style.getPropertyValue(name),
        priority: root.style.getPropertyPriority(name),
    }));
    const { language } = i18n;
    const documentLanguage = root.getAttribute('lang');
    let applied: typeof previous = [];
    const restore = async () => {
        previous.forEach((prior) => {
            const owned = applied.find(({ name }) => name === prior.name);
            if (
                owned &&
                (root.style.getPropertyValue(prior.name) !== owned.value ||
                    root.style.getPropertyPriority(prior.name) !== owned.priority)
            )
                return;
            if (prior.value) root.style.setProperty(prior.name, prior.value, prior.priority);
            else root.style.removeProperty(prior.name);
        });
        if (i18n.resolvedLanguage === context.locale) {
            await i18n.changeLanguage(language);
            if (documentLanguage === null) root.removeAttribute('lang');
            else root.setAttribute('lang', documentLanguage);
        }
    };
    try {
        await i18n.changeLanguage(context.locale);
        const apply = context.scheme === 'light' ? applyAdminTheme : applyAdminInvertedTheme;
        if (!apply({ primaryColor: context.primaryColor }))
            throw new Error('Token reference theme could not be applied');
        applied = names.map((name) => ({
            name,
            value: root.style.getPropertyValue(name),
            priority: root.style.getPropertyPriority(name),
        }));
        return restore;
    } catch (error) {
        await restore();
        throw error;
    }
};
