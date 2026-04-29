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

import { EventEmitter } from 'node:events';
import type {
    EventDispatcherInterface
} from '../contracts';

import type { EventListener } from '../types';
import { AbstractEventDispatcher } from "./AbstractEventDispatcher";


/**
 * Node.js-optimized EventDispatcher.
 *
 * Philosophy:
 * ─────────────────────────────────────────────────────────────
 * dispatch() is the single entry point. It does two things in order:
 *
 *   1. Iterates the internal Map → calls subscribers/listeners registered
 *      via addListener() / addSubscriber(), in priority order.
 *
 *   2. Fires emitter.emit() on the native EventEmitter (dispatchNative) →
 *      any code that used emitter.on() / emitter.addListener() DIRECTLY
 *      (without going through this dispatcher) will also receive the event
 *      automatically.
 *
 * This means the developer never needs to call dispatchNative() manually —
 * a single dispatcher.dispatch() notifies both worlds.
 *
 * No double-call: addListener() stores listeners in the Map only, NOT on
 * the native EventEmitter. The emitter is reserved for external listeners.
 *
 * Use dispatchAsync() when subscribers perform async work and results must
 * be read from the event object after dispatch.
 *
 * @author AGBOKOUDJO Franck <internationaleswebservices@gmail.com>
 */
export class NodeEventDispatcher extends AbstractEventDispatcher implements EventDispatcherInterface {
    private readonly listeners: Map<string, Array<{
        listener: EventListener;
        priority: number;
    }>> = new Map();
    private readonly sorted: Map<string, boolean> = new Map();

    constructor(private readonly emitter: EventEmitter = new EventEmitter()) {
        super();
        // Increase max listeners to avoid warnings (can be configured)
        this.emitter.setMaxListeners(100); 
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
     * Step 2 — Native EventEmitter (dispatchNative):
     *   Fires emitter.emit() so that any external listener attached via
     *   emitter.on() / getEmitter().on() also receives the event —
     *   without ever registering through this dispatcher.
     */
    public override dispatch<T extends object>(event: T, eventName?: string | null): T {
        // Step 1 — internal Map (inherited loop from AbstractEventDispatcher)
        super.dispatch(event, eventName);

        // Step 2 — native EventEmitter (external emitter.on() listeners)
        this.dispatchNative(event, eventName);

        return event;
    }

    /**
     * Dispatches an event and awaits all listeners sequentially (priority order).
     *
     * Step 1 — awaits each async listener in the internal Map.
     * Step 2 — fires emitter.emit() for external listeners (synchronous Node.js
     *           EventEmitter — not awaited).
     *
     * Use this when subscribers perform async work (HTTP, DB, file I/O…) and
     * you need to read results from the event object after dispatch.
     *
     * @example
     * const event = new InitializingUploadEvent(options);
     * await dispatcher.dispatchAsync(event, HttpFileUploaderEvents.INITIALIZE_UPLOAD);
     * const mediaId = event.mediaId; // safely populated by the subscriber
     */
    public override async dispatchAsync<T extends object>(
        event: T,
        eventName?: string | null
    ): Promise<T> {
        // Step 1 — await internal Map listeners
        await super.dispatchAsync(event, eventName);

        // Step 2 — native EventEmitter (always sync in Node.js EventEmitter)
        this.dispatchNative(event, eventName);

        return event;
    }

    /**
    * Registers a listener in the internal Map only.
    *
    * NOT attached to the native EventEmitter — that emitter is reserved for
    * external listeners (emitter.on(), etc.) to avoid double-call.
    */
    public addListener<T extends object = any>(
        eventName: string,
        listener: EventListener<T>,
        priority: number = 0
    ): void {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        this.listeners.get(eventName)!.push({ listener, priority });
        this.sorted.set(eventName, false);
    }

    /**
     * Removes a listener from the internal Map only.
     * Has no effect on listeners attached directly via emitter.on().
     * Does NOT call removeAllListeners() — external emitter listeners are untouched.
     */
    public removeListener<T extends object = any>(
        eventName: string,
        listener: EventListener<T>
    ): void {
        if (!this.listeners.has(eventName)) return;

        const eventListeners = this.listeners.get(eventName)!;
        const index = eventListeners.findIndex(item => item.listener === listener);

        if (index !== -1) {
            eventListeners.splice(index, 1);
        }

        if (eventListeners.length === 0) {
            this.listeners.delete(eventName);
            this.sorted.delete(eventName);
            // removeAllListeners() is NOT called — external emitter.on()
            // listeners registered outside the dispatcher are never touched
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
     * Returns the underlying EventEmitter.
     *
     * Pass a shared EventEmitter in the constructor to integrate with other
     * modules — any emitter.on() call on that emitter will automatically
     * receive events dispatched via dispatch().
     *
     * @example
     * const sharedEmitter = new EventEmitter();
     * const dispatcher = new NodeEventDispatcher(sharedEmitter);
     *
     * // Somewhere else in your app — no addListener() needed
     * sharedEmitter.on('file.processed', (event) => {
     *   console.log(event.fileName);
     * });
     *
     * // This notifies both your subscribers AND the emitter listener
     * dispatcher.dispatch(new FileProcessedEvent('video.mp4'), 'file.processed');
     */
    public getEmitter(): EventEmitter {
        return this.emitter;
    }


    /**
     * Set the maximum number of listeners before warning.
     * Default is 100.
     */
    public setMaxListeners(n: number): void { this.emitter.setMaxListeners(n); }

    /**
     * Get the current max listeners limit.
     */
    public getMaxListeners(): number { return this.emitter.getMaxListeners(); }

    private sortListeners(eventName: string): void {
        const listeners = this.listeners.get(eventName)!;
        listeners.sort((a, b) => b.priority - a.priority);
        this.sorted.set(eventName, true);
    }

    /**
     * Fires emitter.emit() on the native EventEmitter.
     *
     * Called automatically by dispatch() and dispatchAsync().
     * Can also be called manually if you want to notify native listeners
     * without going through the internal Map.
     *
     * External listeners receive the original typed event object directly.
     *
     * @example
     * // External code — no addListener() needed, works automatically
     * dispatcher.getEmitter().on('file.processed', (event) => {
     *   console.log(event.fileName);
     * });
     *
     * dispatcher.dispatch(new FileProcessedEvent('video.mp4'), 'file.processed');
     * // ↑ emitter listener receives the event automatically via dispatchNative
     */
    protected dispatchNative<T extends object>(event: T, eventName?: string | null): void {
        const name = eventName ?? event.constructor.name;
        this.emitter.emit(name, event);
    }

}