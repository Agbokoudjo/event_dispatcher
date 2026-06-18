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

import type {
    EventDispatcherInterface
} from '../contracts';

import type { EventListener } from '../types';
import { AbstractEventDispatcher } from "./AbstractEventDispatcher";

export interface CustomEventOptions {
    bubbles?: boolean;
    cancelable?: boolean;
    composed?: boolean;
}

/**
 * Browser-optimized EventDispatcher.
 *
 * Philosophy:
 * ─────────────────────────────────────────────────────────────
 * dispatch() is the single entry point. It does two things in order:
 *
 *   1. Iterates the internal Map → calls subscribers/listeners registered
 *      via addListener() / addSubscriber(), in priority order.
 *
 *   2. Fires a CustomEvent on the native EventTarget (dispatchNative) →
 *      any code that used window.addEventListener(), document.addEventListener(),
 *      or target.addEventListener() DIRECTLY (without going through this dispatcher)
 *      will also receive the event automatically.
 *
 * This means the developer never needs to call dispatchNative() manually —
 * a single dispatcher.dispatch() notifies both worlds.
 *
 * No double-call: addListener() stores listeners in the Map only, NOT on
 * the native EventTarget. The native target is reserved for external listeners.
 *
 * @author AGBOKOUDJO Franck <internationaleswebservices@gmail.com>
 */
export class BrowserEventDispatcher extends AbstractEventDispatcher  implements EventDispatcherInterface {
    private readonly listeners: Map<string, Array<{
        listener: EventListener;
        priority: number;
        wrappedListener: EventListenerOrEventListenerObject;
    }>> ;
    private readonly sorted: Map<string, boolean> ;
    private readonly listenerMap: WeakMap<EventListener, EventListenerOrEventListenerObject> ;

    constructor(
        private readonly eventTarget = new EventTarget(),
        private readonly options?: CustomEventOptions) {
        super();
        this.sorted = new Map();
        this.listenerMap = new WeakMap();
        this.listeners = new Map();
    }

    /**
     * Dispatches an event synchronously.
     *
     * Step 1 — Internal Map loop (priority order):
     *   Calls all listeners registered via addListener() / addSubscriber().
     *   stopPropagation() is honoured between each listener.
     *   Async listeners are fire-and-forget (errors logged, not thrown).
     *   Use dispatchAsync() if you need to await async listeners.
     *
     * Step 2 — Native EventTarget (dispatchNative):
     *   Fires a CustomEvent so that any external listener attached via
     *   window.addEventListener() / document.addEventListener() on the same
     *   target also receives the event — without ever registering through
     *   this dispatcher.
     *
     * Note: stopPropagation() on YOUR event object does NOT prevent Step 2.
     * The CustomEvent dispatched natively is independent and can be cancelled
     * via nativeEvent.stopPropagation() on the browser side.
     */
    public override dispatch<T extends object>(event: T, eventName?: string | null, _customOptions?: CustomEventOptions): T {
        // Step 1 — internal Map (inherited loop from AbstractEventDispatcher)
        super.dispatch(event, eventName);

        // Step 2 — native EventTarget (external window/document listeners)
        this.dispatchNative(event, eventName, _customOptions);

        return event;
    }

    /**
     * Dispatches an event and awaits all listeners sequentially (priority order).
     *
     * Step 1 — awaits each async listener in the internal Map.
     * Step 2 — fires the native CustomEvent (fire-and-forget, not awaited —
     *           native EventTarget listeners are synchronous by design).
     *
     * Use this when subscribers perform async work (HTTP, file I/O…) and
     * you need to read results from the event object after dispatch.
     *
     * @example
     * const event = new InitializingUploadEvent(options);
     * await dispatcher.dispatchAsync(event, HttpFileUploaderEvents.INITIALIZE_UPLOAD);
     * const mediaId = event.mediaId; // safely populated by the subscriber
     */
    public override async dispatchAsync<T extends object>(
        event: T,
        eventName?: string | null,
        _customOptions?: CustomEventOptions
    ): Promise<T> {
        // Step 1 — await internal Map listeners
        await super.dispatchAsync(event, eventName);

        // Step 2 — native EventTarget (always sync on the browser side)
        this.dispatchNative(event, eventName,_customOptions);

        return event;
    }

    /**
     * Registers a listener in the internal Map only.
     *
     * NOT attached to the native EventTarget — that target is reserved for
     * external listeners (window.addEventListener, etc.) to avoid double-call.
     */
    public addListener<T extends object = any>(
        eventName: string,
        listener: EventListener<T>,
        priority: number = 0
    ): void {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        // Create wrapped listener for native EventTarget
        const wrappedListener = ((nativeEvent: Event) => {
            const customEvent = nativeEvent as CustomEvent;
            listener(customEvent.detail);
        }) as EventListenerOrEventListenerObject;

        this.listeners.get(eventName)!.push({
            listener,
            priority,
            wrappedListener
        });

        this.sorted.set(eventName, false);

        // Store mapping for removal
        this.listenerMap.set(listener, wrappedListener);
    }

    /**
     * Removes a listener from the internal Map only.
     * Has no effect on listeners attached directly via addEventListener().
     */
    public removeListener<T extends object = any>(
        eventName: string,
        listener: EventListener<T>
    ): void {
        if (!this.listeners.has(eventName)) {
            return;
        }

        const eventListeners = this.listeners.get(eventName)!;
        const index = eventListeners.findIndex(item => item.listener === listener);

        if (index !== -1) {
            const item = eventListeners[index];
            if (item) { 
                const { wrappedListener } = item;
                this.eventTarget.removeEventListener(eventName, wrappedListener);   // Remove from native EventTarget
                eventListeners.splice(index, 1);  // Remove from our map
                this.listenerMap.delete(listener);
            }
        }

        if (eventListeners.length === 0) {
            this.listeners.delete(eventName);
            this.sorted.delete(eventName);
        }
    }

    public getListeners(eventName?: string | null): EventListener[] | Map<string, EventListener[]> {
        if (eventName) {
            if (!this.listeners.has(eventName)) {
                return [];
            }

            if (!this.sorted.get(eventName)) {
                this.sortListeners(eventName);
            }

            return this.listeners.get(eventName)!.map(item => item.listener);
        }

        const allListeners = new Map<string, EventListener[]>();

        for (const [name] of this.listeners) {
            allListeners.set(name, this.getListeners(name) as EventListener[]);
        }

        return allListeners;
    }

    public getListenerPriority<T extends object = any>(
        eventName: string,
        listener: EventListener<T>
    ): number | null {
        if (!this.listeners.has(eventName)) {
            return null;
        }

        const found = this.listeners
            .get(eventName)!
            .find(item => item.listener === listener);

        return found ? found.priority : null;
    }

    public hasListeners(eventName?: string | null): boolean {
        if (eventName) {
            return this.listeners.has(eventName) && this.listeners.get(eventName)!.length > 0;
        }

        return this.listeners.size > 0; 
    }

    /**
     * Returns the underlying EventTarget.
     *
     * Pass window or document in the constructor to share the same target
     * with the rest of your application — any addEventListener() call on
     * that target will automatically receive events dispatched via dispatch().
     *
     * @example
     * const dispatcher = new BrowserEventDispatcher(window);
     *
     * // Somewhere else in your app — no addListener() needed
     * window.addEventListener('user.login', (e) => {
     *   console.log((e as CustomEvent).detail);
     * });
     *
     * // This notifies both your subscribers AND the window listener
     * dispatcher.dispatch(new UserLoginEvent('franck'), 'user.login');
     */
    public getEventTarget(): EventTarget {
        return this.eventTarget;
    }


    private sortListeners(eventName: string): void {
        const listeners = this.listeners.get(eventName)!;
        listeners.sort((a, b) => b.priority - a.priority);
        this.sorted.set(eventName, true);
    }

    /**
     * Fires a CustomEvent on the native EventTarget.
     *
     * Called automatically by dispatch() and dispatchAsync().
     * Can also be called manually if you want to notify native listeners
     * without going through the internal Map.
     *
     * External listeners receive the original event object via
     * `(e as CustomEvent).detail`.
     *
     * @example
     * // External code — no addListener() needed, works automatically
     * window.addEventListener('user.login', (e) => {
     *   const event = (e as CustomEvent).detail;
     *   console.log(event.username);
     * });
     *
     * dispatcher.dispatch(new UserLoginEvent('franck'), 'user.login');
     * // ↑ window listener receives the event automatically via dispatchNative
     */
    private dispatchNative<T extends object>(event: T, eventName?: string | null, _customOptions?: CustomEventOptions): void {
        const name = eventName ?? event.constructor.name;
        const customEvent = new CustomEvent(name, {
            detail: event,
            bubbles: _customOptions?.bubbles || this.options?.bubbles || true,
            cancelable: _customOptions?.cancelable || this.options?.cancelable || true,
            composed: _customOptions?.composed || this.options?.composed || true,
        });
        this.eventTarget.dispatchEvent(customEvent);
    }

}
