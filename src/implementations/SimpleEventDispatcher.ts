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

import type {
    EventDispatcherInterface
} from '../contracts';
import { AbstractEventDispatcher } from "./AbstractEventDispatcher";

/**
 * Simple EventDispatcher implementation.
 * 
 * This is a reference implementation that works in any JavaScript environment.
 * Developers can use this as-is or create their own optimized implementations.
 * 
 * @author AGBOKOUDJO Franck <internationaleswebservices@gmail.com>
 */
export class SimpleEventDispatcher extends AbstractEventDispatcher  implements EventDispatcherInterface {
    private readonly listeners: Map<string, Array<{ listener: EventListener; priority: number }>> ;
    private readonly sorted: Map<string, boolean> ;

    constructor() {
        super();
        this.listeners = new Map();
        this.sorted = new Map();
    }

    public dispatch<T extends object>(event: T, eventName?: string | null): T {
        const name = eventName ?? event.constructor.name;

        if (!this.hasListeners(name)) {
            return event;
        }

        this.doDispatch(this.getListeners(name) as EventListener[], name, event);

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

    private doDispatch(listeners: EventListener[], eventName: string, event: object): void {
        for (const listener of listeners) {
            if (this.isStoppableEvent(event) && event.isPropagationStopped()) {
                break;
            }

            listener(event);
        }
        console.log(eventName)
    }

    private sortListeners(eventName: string): void {
        const listeners = this.listeners.get(eventName)!;
        listeners.sort((a, b) => b.priority - a.priority);
        this.sorted.set(eventName, true);
    }
}