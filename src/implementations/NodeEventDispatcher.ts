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

import { EventEmitter } from 'events';
import type {
    EventDispatcherInterface
} from '../contracts';

import type { EventListener } from '../types';
import { AbstractEventDispatcher } from "./AbstractEventDispatcher";

/**
 * Node.js-optimized EventDispatcher using native EventEmitter.
 * 
 * This implementation leverages Node.js's EventEmitter for better
 * performance and integration with the Node.js ecosystem.
 * 
 * Features:
 * - Uses Node.js EventEmitter for native integration
 * - Support for async listeners
 * - Memory leak warnings (default Node.js behavior)
 * - Process-level event handling capability
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

    public dispatch<T extends object>(event: T, eventName?: string | null): T {
        const name = eventName ?? event.constructor.name;

        // Also emit on native EventEmitter for compatibility
        this.emitter.emit(name, event);

        if (!this.hasListeners(name)) {
            return event;
        }

        // Get sorted listeners
        const sortedListeners = this.getListeners(name) as EventListener[];

        // Check if event is stoppable
        const isStoppable = this.isStoppableEvent(event);

        // Execute listeners in priority order
        for (const listener of sortedListeners) {
            // Check propagation before each listener
            if (isStoppable && event.isPropagationStopped()) {
                break;
            }

            try {
                const result = listener(event);

                // Handle async listeners
                if (result instanceof Promise) {
                    result.catch(error => {
                        console.error(`Async error in event listener for "${name}":`, error);
                    });
                }
            } catch (error) {
                console.error(`Error in event listener for "${name}":`, error);
                // Continue to next listener even if one fails
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

        this.listeners.get(eventName)!.push({ listener, priority });
        this.sorted.set(eventName, false);
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
            eventListeners.splice(index, 1);
        }

        if (eventListeners.length === 0) {
            this.listeners.delete(eventName);
            this.sorted.delete(eventName);

            // Remove all listeners from native EventEmitter
            this.emitter.removeAllListeners(eventName);
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
     * Get the underlying EventEmitter.
     * Useful for integration with Node.js native APIs.
     */
    public getEmitter(): EventEmitter { return this.emitter;}

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
}