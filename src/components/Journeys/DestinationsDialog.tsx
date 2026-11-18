import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Add from '@mui/icons-material/Add';
import AddLink from '@mui/icons-material/AddLink';
import Check from '@mui/icons-material/Check';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import HowToRegOutlined from '@mui/icons-material/HowToRegOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { IconButton } from '../IconButton';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { InputChipPicker } from '../InputChipPicker';
import {
    addLinkForTopic,
    assignRegistrationTopic,
    linkPath,
    allLinksOf,
    setRoutes,
    registrationJourneyOf,
    registrationRoute,
    unassignRegistrationTopic,
    type Journey,
    type JourneyLink,
    type JourneyTopic,
} from './journey';
import { nextId } from './ids';
import { journeyLabel } from './stepText';
import { useDiscardGuard } from './useDiscardGuard';
import styles from './styles.module.scss';

interface DestinationsDialogProps {
    /** Every journey: routing a topic here takes it out of another journey's registration. */
    journeys: Journey[];
    journeyId: string;
    topics: JourneyTopic[];
    onApply: (journeys: Journey[]) => void;
    onClose: () => void;
}

const linkAnchor = (id: string) => `journey-link-${id}`;
/** Focus target after the last link went: the button that makes a new one. */
const NEW_LINK = 'new';

/**
 * Where a journey leads and how people get on it. The routes sit on top as buttons: the
 * registration path and every link. Below, one row per topic with the two actions an editor
 * wants there: put the topic into the registration, or make a link for it.
 */
export const DestinationsDialog = ({ journeys, journeyId, topics, onApply, onClose }: DestinationsDialogProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<Journey[]>(journeys);
    const guard = useDiscardGuard(draft, journeys, onClose);
    const [focusLink, setFocusLink] = useState<string>();
    const journey = draft.find((candidate) => candidate.id === journeyId);

    useEffect(() => {
        if (!focusLink) return;
        const node = document.getElementById(linkAnchor(focusLink));
        node?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
        (node instanceof HTMLButtonElement ? node : node?.querySelector('input'))?.focus();
        setFocusLink(undefined);
    }, [focusLink]);

    if (!journey) return null;

    const type = journey.conversationType;
    const route = registrationRoute(type);
    const canRegister = route?.available === true;
    // One `/l/` namespace for every conversation type.
    const allLinks = allLinksOf(draft);
    /** A link without a name is called by its address, so no control reads "Link  löschen". */
    const nameOf = (link: JourneyLink) => link.name || linkPath(link, allLinks);

    const replace = (next: Journey) =>
        setDraft((current) => current.map((candidate) => (candidate.id === journeyId ? next : candidate)));
    const setLinks = (links: JourneyLink[]) => replace(setRoutes(journey, { ...journey.routes, links }));
    const setLink = (id: string, change: Partial<JourneyLink>) =>
        setLinks(journey.routes.links.map((link) => (link.id === id ? { ...link, ...change } : link)));

    const linkFor = (topic: JourneyTopic) => {
        const id = nextId('link');
        replace(addLinkForTopic(journey, topic, id));
        setFocusLink(id);
    };
    const newLink = () => {
        const id = nextId('link');
        setLinks([...journey.routes.links, { id, name: '', topicIds: [] }]);
        setFocusLink(id);
    };
    const toggleRegistration = (topic: JourneyTopic, on: boolean) =>
        setDraft((current) =>
            on
                ? assignRegistrationTopic(current, journeyId, topic.id)
                : unassignRegistrationTopic(current, journeyId, topic.id),
        );

    return (
        <Modal
            icon={<PlaceOutlined />}
            title={t('journeys.destinations.title', { journey: journeyLabel(journey, t) })}
            descriptionKey="journeys.destinations.description"
            descriptionFullWidth
            width={880}
            zIndex={1100}
            footer={
                <div className={styles.footer}>
                    <M3Button variant="text" onClick={onClose}>
                        {t('journeys.action.cancel')}
                    </M3Button>
                    <M3Button variant="filled" onClick={() => onApply(draft)}>
                        {t('journeys.action.apply')}
                    </M3Button>
                </div>
            }
            onClose={onClose}
            onDismiss={guard.onDismiss}
            wrapperTestId="journey-destinations"
            scrollableBody
        >
            <div className={styles.dialogBody}>
                {guard.confirm}
                <section className={styles.section} aria-labelledby="journey-routes">
                    <h3 className={styles.sectionTitle} id="journey-routes">
                        {t('journeys.route.title')}
                    </h3>
                    <ul className={styles.routes}>
                        {route && (
                            <li>
                                <span
                                    className={classNames(styles.route, { [styles.routeOff]: !route.available })}
                                    data-testid="journey-route-registration"
                                >
                                    <HowToRegOutlined aria-hidden />
                                    <code>{route.path}</code>
                                    <span className={styles.routeCount}>
                                        {route.available
                                            ? t('journeys.destinations.topics', {
                                                  count: journey.routes.registration.length,
                                              })
                                            : t('journeys.route.later')}
                                    </span>
                                </span>
                            </li>
                        )}
                        {journey.routes.links.map((link) => (
                            <li key={link.id}>
                                <button
                                    type="button"
                                    className={styles.route}
                                    onClick={() => setFocusLink(link.id)}
                                    title={t('journeys.route.goToLink', {
                                        name: nameOf(link),
                                    })}
                                >
                                    <LinkOutlined aria-hidden />
                                    <code>{linkPath(link, allLinks)}</code>
                                    <span className={styles.routeCount}>
                                        {t('journeys.destinations.topics', { count: link.topicIds.length })}
                                    </span>
                                </button>
                            </li>
                        ))}
                        <li>
                            <button
                                type="button"
                                id={linkAnchor(NEW_LINK)}
                                className={classNames(styles.route, styles.routeAdd)}
                                onClick={newLink}
                            >
                                <Add aria-hidden />
                                {t('journeys.link.add')}
                            </button>
                        </li>
                    </ul>
                    {!route && <p className={styles.help}>{t('journeys.route.registrationOnlyMail')}</p>}
                </section>

                <section className={styles.section} aria-labelledby="journey-topics">
                    <h3 className={styles.sectionTitle} id="journey-topics">
                        {t('journeys.route.topics')}
                    </h3>
                    <p className={styles.help}>
                        {t(canRegister ? 'journeys.route.topicsHelp' : 'journeys.route.topicsHelpLinks')}
                    </p>
                    <ul className={styles.topics}>
                        {topics.map((topic) => {
                            const inRegistration = journey.routes.registration.includes(topic.id);
                            const holder = registrationJourneyOf(draft, type, topic.id);
                            const elsewhere = holder && holder.id !== journeyId ? holder : undefined;
                            const ownLinks = journey.routes.links.filter((link) => link.topicIds.includes(topic.id));
                            return (
                                <li key={topic.id} className={styles.topic} data-testid={`journey-topic-${topic.id}`}>
                                    <span className={styles.topicName}>{topic.name}</span>
                                    <span className={styles.topicRoutes}>
                                        {canRegister && route && (
                                            <button
                                                type="button"
                                                className={classNames(styles.routeToggle, {
                                                    [styles.routeToggleOn]: inRegistration,
                                                })}
                                                aria-pressed={inRegistration}
                                                aria-label={t('journeys.route.toggle', {
                                                    topic: topic.name,
                                                    path: route.path,
                                                })}
                                                onClick={() => toggleRegistration(topic, !inRegistration)}
                                                data-testid={`journey-topic-${topic.id}-registration`}
                                            >
                                                {inRegistration ? <Check aria-hidden /> : <Add aria-hidden />}
                                                <code>{route.path}</code>
                                            </button>
                                        )}
                                        {ownLinks.map((link) => (
                                            <button
                                                key={link.id}
                                                type="button"
                                                className={classNames(styles.routeToggle, styles.routeToggleOn)}
                                                onClick={() => setFocusLink(link.id)}
                                                title={t('journeys.route.goToLink', {
                                                    name: nameOf(link),
                                                })}
                                            >
                                                <LinkOutlined aria-hidden />
                                                <code>{linkPath(link, allLinks)}</code>
                                            </button>
                                        ))}
                                        {elsewhere && !inRegistration && (
                                            <span className={styles.topicElsewhere}>
                                                {t('journeys.route.elsewhere', {
                                                    path: route?.path,
                                                    journey: t('journeys.journey.number', {
                                                        number: elsewhere.number,
                                                    }),
                                                })}
                                            </span>
                                        )}
                                    </span>
                                    <IconButton
                                        icon={<AddLink />}
                                        ariaLabel={t('journeys.link.addFor', { topic: topic.name })}
                                        title={t('journeys.link.addFor', { topic: topic.name })}
                                        onClick={() => linkFor(topic)}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </section>

                {journey.routes.links.length > 0 && (
                    <section className={styles.section} aria-labelledby="journey-links">
                        <h3 className={styles.sectionTitle} id="journey-links">
                            {t('journeys.route.links')}
                        </h3>
                        <p className={styles.help}>{t('journeys.route.linksHelp')}</p>
                        {journey.routes.links.map((link) => (
                            <div
                                key={link.id}
                                id={linkAnchor(link.id)}
                                className={styles.link}
                                data-testid={`journey-link-${link.id}`}
                            >
                                <div className={styles.linkHeader}>
                                    <FloatingLabelInput
                                        label={t('journeys.link.name')}
                                        supportingText={t('journeys.link.nameHelp')}
                                        value={link.name}
                                        onChange={(event) => setLink(link.id, { name: event.target.value })}
                                    />
                                    <IconButton
                                        icon={<DeleteOutline />}
                                        ariaLabel={t('journeys.link.remove', { name: nameOf(link) })}
                                        onClick={() => {
                                            const index = journey.routes.links.indexOf(link);
                                            const neighbour =
                                                journey.routes.links[index - 1] ?? journey.routes.links[index + 1];
                                            setLinks(journey.routes.links.filter((entry) => entry.id !== link.id));
                                            setFocusLink(neighbour?.id ?? NEW_LINK);
                                        }}
                                    />
                                </div>
                                <p className={styles.linkPath}>
                                    <LinkOutlined aria-hidden />
                                    <code>{linkPath(link, allLinks)}</code>
                                    <span>{t(link.slug ? 'journeys.link.pathFixed' : 'journeys.link.tokenHint')}</span>
                                </p>
                                <InputChipPicker
                                    ariaLabel={t('journeys.link.topics', { name: nameOf(link) })}
                                    options={topics.map((topic) => ({ value: topic.id, label: topic.name }))}
                                    value={link.topicIds}
                                    onChange={(topicIds) => setLink(link.id, { topicIds })}
                                    addLabel={t('journeys.link.addTopic')}
                                    removeLabel={(label) => t('journeys.link.removeTopic', { name: label })}
                                />
                                {link.topicIds.length > 1 && (
                                    <p className={styles.help}>{t('journeys.link.severalTopics')}</p>
                                )}
                                {link.topicIds.length === 0 && (
                                    <p className={styles.help}>{t('journeys.link.noTopic')}</p>
                                )}
                            </div>
                        ))}
                    </section>
                )}
            </div>
        </Modal>
    );
};
