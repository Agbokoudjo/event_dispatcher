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
 * Browser-optimized EventDispatcher using native CustomEvent API.
 * 
 * This implementation leverages the browser's native event system for better
 * performance and integration with the DOM event model.
 * 
 * Features:
 * - Uses CustomEvent for native browser integration
 * - Automatic event target management
 * - Memory-efficient using WeakMap
 * - Compatible with browser DevTools
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

    public dispatch<T extends object>(event: T, eventName?: string | null): T {
        const name = eventName ?? event.constructor.name;

        // Create CustomEvent with the original event as detail
        const customEvent = new CustomEvent(name, {
            detail: event,
            bubbles: this.options?.bubbles ?? false,
            cancelable: this.options?.cancelable ?? true,
            composed: this.options?.composed ?? true
        });

        this.eventTarget.dispatchEvent(customEvent);
        
        if (!this.hasListeners(name)) {
            return event;
        }
        
        // Check if event is stoppable
        const isStoppable = this.isStoppableEvent(event);

        // Get sorted listeners
        const sortedListeners = this.getListeners(name) as EventListener[];

        // Dispatch to each listener
        for (const listener of sortedListeners) {
            // Check propagation before each listener
            if (isStoppable && event.isPropagationStopped()) {
                break;
            }

            // Execute listener with original event (not CustomEvent)
            try {
                listener(event);
            } catch (error) {
                console.error(`Error in event listener for "${name}":`, error);
                // Continue to next  listener even if one fails
            }
        }

        return event;
    }

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
            if (item) { // On vérifie explicitement que l'item existe
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
     * Get the underlying EventTarget.
     * Useful for integration with native browser APIs.
     */
    public getEventTarget(): EventTarget {
        return this.eventTarget;
    }

    private sortListeners(eventName: string): void {
        const listeners = this.listeners.get(eventName)!;
        listeners.sort((a, b) => b.priority - a.priority);
        this.sorted.set(eventName, true);
    }
}