/*
 * This file is part of the project by AGBOKOUDJO Franck.
 *
 * (c) AGBOKOUDJO Franck <internationaleswebservices@gmail.com>
 * Phone: +229 0167 25 18 86
 * LinkedIn: https://www.linkedin.com/in/internationales-web-services-120520193/
 * Github: https://github.com/Agbokoudjo/form_validator
 * Company: INTERNATIONALES WEB APPS & SERVICES
 *
 * For more information, please feel free to contact the author.
 */

import { EventListener } from "../types";
import {
    StoppableEventInterface,
    EventSubscriberInterface
} from "../contracts";

/**
 * Event encapsulation class.
 *
 * Encapsulates events thus decoupling the observer from the subject they encapsulate.
 *
 * @author AGBOKOUDJO Franck <internationaleswebservices@gmail.com>
 */
export abstract class AbstractEventDispatcher {
    // Store bound listeners for subscribers to enable proper removal
    protected subscriberListeners: WeakMap<EventSubscriberInterface, Map<string, EventListener>>;

    constructor() {
        this.subscriberListeners = new WeakMap();
    }

    protected isStoppableEvent(event: object): event is StoppableEventInterface {
        return 'isPropagationStopped' in event && typeof (event as any).isPropagationStopped === 'function';
    }

    abstract addListener<T extends object = any>(
        eventName: string,
        listener: EventListener<T>,
        priority?: number
    ): void;

    public addSubscriber(subscriber: EventSubscriberInterface): void {
        const events = subscriber.getSubscribedEvents();
        const boundListeners = new Map<string, EventListener>();

        for (const [eventName, params] of Object.entries(events)) {
            let listenerName: string;
            let priority = 0;

            if (typeof params === 'string') {
                listenerName = params;
            } else {
                listenerName = params.listener;
                priority = params.priority ?? 0;
            }

            // Bind the listener once and store it
            const boundListener = (subscriber as any)[listenerName].bind(subscriber);
            boundListeners.set(eventName, boundListener);

            this.addListener(eventName, boundListener, priority);
        }

        // Store the mapping for removal
        this.subscriberListeners.set(subscriber, boundListeners);
    }

    public abstract removeListener<T extends object = any>(
        eventName: string,
        listener: EventListener<T>
    ): void;


    public removeSubscriber(subscriber: EventSubscriberInterface): void {
        const boundListeners = this.subscriberListeners.get(subscriber);

        if (!boundListeners) {
            return;
        }

        // Remove each bound listener using the stored references
        for (const [eventName, boundListener] of boundListeners) {
            this.removeListener(eventName, boundListener);
        }

        // Clean up the WeakMap entry
        this.subscriberListeners.delete(subscriber);
    }

}