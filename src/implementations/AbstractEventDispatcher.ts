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
 * Abstract base class for all EventDispatchers.
 *
 * Philosophy (inspired by Symfony EventDispatcher):
 * - The internal Map is the single source of truth for dispatch.
 * - Native primitives (EventTarget, EventEmitter) are synchronized on
 *   addListener/removeListener so that external code using
 *   window.addEventListener() or emitter.on() can also react to events —
 *   but they are NOT used to drive the dispatch loop (avoids double-call).
 * - dispatchAsync() is an extension beyond Symfony for async subscriber support.
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
        return (
            'isPropagationStopped' in event &&
            typeof (event as any).isPropagationStopped === 'function'
        );
    }

    public addSubscriber(subscriber: EventSubscriberInterface): void {
        const events = subscriber.getSubscribedEvents();
        const boundListeners = new Map<string, EventListener>();
        let listenerName: string;    
        let priority: number;       

        for (const [eventName, params] of Object.entries(events)) {
            priority = 0;

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

    abstract addListener<T extends object = any>(
        eventName: string,
        listener: EventListener<T>,
        priority?: number
    ): void;

    abstract removeListener<T extends object = any>(
        eventName: string,
        listener: EventListener<T>
    ): void;

    public abstract hasListeners(eventName?: string | null): boolean;

    public abstract getListeners(
        eventName?: string | null
    ): EventListener[] | Map<string, EventListener[]>;

    /**
     * Dispatches an event synchronously to all registered listeners,
     * in priority order (highest first).
     *
     * Async listeners are fire-and-forget: their Promise errors are caught
     * and logged, but dispatch() does NOT await them.
     * Use dispatchAsync() when you need to await async listeners.
     *
     * This mirrors Symfony's EventDispatcher::dispatch() behaviour.
     */
    public dispatch<T extends object>(event: T, eventName?: string | null): T {
        const name = eventName ?? event.constructor.name;

        if (!this.hasListeners(name)) {
            return event;
        }

        const sortedListeners = this.getListeners(name) as EventListener[];
        const isStoppable = this.isStoppableEvent(event);

        for (const listener of sortedListeners) {
            if (isStoppable && (event as StoppableEventInterface).isPropagationStopped()) {
                break;
            }
            
            try {
                const result = listener(event);
                // Fire-and-forget for async listeners — log but do NOT propagate
                if (result instanceof Promise) {
                    result.catch(error => {
                        console.error(
                            `Unhandled async error in listener for "${name}":`,
                            error
                        );
                    });
                }
            } catch (error) {
                console.error(`Error in listener for "${name}":`, error);
            }
        }

        return event;
    }

    /**
     * Dispatches an event and awaits each listener sequentially,
     * in priority order.
     *
     * Use this when subscribers perform async operations (HTTP, file I/O, DB…)
     * and you need to read results from the event object after dispatch.
     *
     * stopPropagation() is honoured between each awaited listener.
     *
     * @example
     * const event = new InitializingUploadEvent(options);
     * await dispatcher.dispatchAsync(event, HttpFileUploaderEvents.INITIALIZE_UPLOAD);
     * const mediaId = event.mediaId; // safely populated by the subscriber
     */
    public async dispatchAsync<T extends object>(
        event: T,
        eventName?: string | null
    ): Promise<T> {
        const name = eventName ?? event.constructor.name;

        if (!this.hasListeners(name)) {
            return event;
        }

        const sortedListeners = this.getListeners(name) as EventListener[];
        const isStoppable = this.isStoppableEvent(event);

        for (const listener of sortedListeners) {
            if (isStoppable && (event as StoppableEventInterface).isPropagationStopped()) {
                break;
            }
            try {
                const result = listener(event);
                if (result instanceof Promise) {
                    await result;
                }
            } catch (error) {
                // Re-throw so the caller can handle it
                throw error;
            }
        }

        return event;
    }

}