/**
 * Defines all events that can be handled via PubSub.
 */
export const enum PubSubEvents {
    USER_AUTHORISED,
    AGENCYLIST_UPDATE,
    AGENCY_UPDATE,
    AGENCY_DELETE,
    TOPICLIST_UPDATE,
    TOPIC_UPDATE,
    TOPIC_DELETE,
}

/**
 * Publish/Subscribe pattern implementation class.
 */
class PubSub {
    observers = new Map<PubSubEvents, (value: object) => void>();

    /**
     * Provides the possibility to define a handler function for given event. When event is fired than the handler will be invoked.
     * @param key
     * @param handler
     */
    subscribe(key: PubSubEvents, handler: (value: any) => void) {
        this.observers.set(key, handler);
    }

    /**
     * Triggers handler with given value for given event.
     */
    publishEvent(key: PubSubEvents, value: any) {
        const handler = this.observers.get(key);
        if (handler) {
            handler(value);
        }
    }
}

const pubsub = new PubSub();
export default pubsub;
