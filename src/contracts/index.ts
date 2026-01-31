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

/*
 * This file is part of the project by AGBOKOUDJO Franck.
 *
 * (c) AGBOKOUDJO Franck <internationaleswebservices@gmail.com>
 * For more information, please feel free to contact the author.
 */

import { EventListener } from "../types";

/**
 * An Event whose processing may be interrupted when the event has been handled.
 *
 * A Dispatcher implementation MUST check to determine if an Event
 * is marked as stopped after each listener is called. If it is then it should
 * return immediately without calling any further Listeners.
 */
export interface StoppableEventInterface {
    /**
     * Is propagation stopped?
     *
     * This will typically only be used by the Dispatcher to determine if the
     * previous listener halted propagation.
     *
     * @returns True if the Event is complete and no further listeners should be called.
     *          False to continue calling listeners.
     */
    isPropagationStopped(): boolean;
}

/**
 * Interface for event subscribers.
 * A subscriber can subscribe to multiple events at once.
 */
export interface EventSubscriberInterface {
    /**
     * Returns an object with event names as keys and the listener configuration as values.
     * 
     * @example
     * ```typescript
     * getSubscribedEvents() {
     *   return {
     *     'user.created': 'onUserCreated',
     *     'user.updated': { listener: 'onUserUpdated', priority: 10 }
     *   };
     * }
     * ```
     */
    getSubscribedEvents(): Record<string, string | { listener: string; priority?: number }>;
}

/**
 * Allows providing hooks on domain-specific lifecycles by dispatching events.
 * 
 * Implementations of this interface are responsible for:
 * - Managing event listeners and their priorities
 * - Dispatching events to registered listeners
 * - Respecting event propagation stopping
 * 
 * Developers can implement this interface to create custom dispatchers
 * optimized for their specific environment (Browser, Node.js, Worker, etc.)
 * 
 * @author AGBOKOUDJO Franck <internationaleswebservices@gmail.com>
 */
export interface EventDispatcherInterface {
    /**
     * Dispatches an event to all registered listeners.
     *
     * @template T - The event type
     * @param event - The event to pass to the event handlers/listeners
     * @param eventName - The name of the event to dispatch. If not supplied,
     *                    the class name of the event should be used instead.
     * @returns The passed event MUST be returned
     * 
     * @example
     * ```typescript
     * const event = new UserCreatedEvent(userId);
     * dispatcher.dispatch(event, 'user.created');
     * ```
     */
    dispatch<T extends object>(event: T, eventName?: string | null): T;

    /**
     * Adds an event listener that listens on the specified event.
     *
     * @param eventName - The event to listen on
     * @param listener - The listener callback
     * @param priority - The higher this value, the earlier an event listener
     *                   will be triggered in the chain (defaults to 0)
     * 
     * @example
     * ```typescript
     * dispatcher.addListener('user.created', (event) => {
     *   console.log('User created:', event.userId);
     * }, 10);
     * ```
     */
    addListener<T extends object = any>(
        eventName: string,
        listener: EventListener<T>,
        priority?: number
    ): void;

    /**
     * Adds an event subscriber.
     *
     * The subscriber is asked for all the events it is interested in
     * and added as a listener for these events.
     * 
     * @example
     * ```typescript
     * dispatcher.addSubscriber(new UserSubscriber());
     * ```
     */
    addSubscriber(subscriber: EventSubscriberInterface): void;

    /**
     * Removes an event listener from the specified event.
     *
     * @param eventName - The event name
     * @param listener - The listener to remove
     */
    removeListener<T extends object = any>(
        eventName: string,
        listener: EventListener<T>
    ): void;

    /**
     * Removes an event subscriber.
     */
    removeSubscriber(subscriber: EventSubscriberInterface): void;

    /**
     * Gets the listeners of a specific event or all listeners sorted by descending priority.
     *
     * @param eventName - The name of the event, or null to get all listeners
     * @returns Array of listeners for the event, or a Map of all listeners
     */
    getListeners(eventName?: string | null): EventListener[] | Map<string, EventListener[]>;

    /**
     * Gets the listener priority for a specific event.
     *
     * Returns null if the event or the listener does not exist.
     *
     * @param eventName - The event name
     * @param listener - The listener
     * @returns The priority or null if not found
     */
    getListenerPriority<T extends object = any>(
        eventName: string,
        listener: EventListener<T>
    ): number | null;

    /**
     * Checks whether an event has any registered listeners.
     *
     * @param eventName - The event name, or null to check if any event has listeners
     * @returns True if the specified event has any listeners, false otherwise
     */
    hasListeners(eventName?: string | null): boolean;
}

export interface EventEmitterInterface {

    /**
    * Emit an event (works in both environments)
    */
    emit(eventName: string, data: any, options?: CustomEventInit): void;

    /**
   * Listen to an event (works in both environments)
   */
    on(eventName: string, handler: (data: any) => void): void;

    /**
     * Listen to an event once (works in both environments)
     */
    once(eventName: string, handler: (data: any) => void): void;

    /**
    * Remove event listener (works in both environments)
    */
    off(eventName: string, handler: (data: any) => void): void;

    /**
   * Remove all listeners for an event
   */
    removeAllListeners(eventName?: string): void;
}