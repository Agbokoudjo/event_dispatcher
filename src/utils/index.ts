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


import type { EventDispatcherInterface, EventEmitterInterface } from '../contracts';
import { SimpleEventDispatcher, CustomEventOptions } from '../implementations';

import { EventEmitter } from 'events';

/**
 * Automatically creates the most appropriate EventDispatcher for the current environment.
 * 
 * - In browsers: Returns BrowserEventDispatcher
 * - In Node.js: Returns NodeEventDispatcher
 * - Fallback: Returns SimpleEventDispatcher
 * 
 * @returns An optimized EventDispatcher instance
 * 
 * @example
 * ```typescript
 * import { createEventDispatcher } from '@your-org/safe-fetch';
 * 
 * const dispatcher = createEventDispatcher();
 * ```
 */
export function createEventDispatcher(): EventDispatcherInterface {
    // Check if running in Node.js
    if (typeof process !== 'undefined' &&
        process.versions != null &&
        process.versions.node != null) {

        // Lazy load Node implementation
        const { NodeEventDispatcher } = require('../implementations/NodeEventDispatcher');
        return new NodeEventDispatcher();
    }

    // Check if running in browser
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        // Lazy load Browser implementation
        const { BrowserEventDispatcher } = require('../implementations/BrowserEventDispatcher');
        return new BrowserEventDispatcher();
    }

    // Fallback to simple implementation (Workers, Deno, etc.)
    return new SimpleEventDispatcher();
}


/**
 * Universal event emitter that works in both browser and Node.js
 */
export class UniversalEventEmitter implements EventEmitterInterface {
    private target: Window | Document | EventEmitter;
    private isNodeEnvironment: boolean;

    constructor(target?: Window | Document | EventEmitter) {
        this.isNodeEnvironment = typeof window === 'undefined';

        if (this.isNodeEnvironment) {
            this.target = target instanceof EventEmitter
                ? target
                : new EventEmitter();
        } else {
            this.target = target || (typeof document !== 'undefined' ? document : window);
        }
    }

    emit(
        eventName: string,
        data: any,
        options?: CustomEventOptions
    ): void {
        if (this.isNodeEnvironment) {
            (this.target as EventEmitter).emit(eventName, data);
        } else {
            const event = new CustomEvent(eventName, {
                detail: data,
                bubbles: options?.bubbles ?? false,
                cancelable: options?.cancelable ?? true,
                composed: options?.composed ?? true
            });
            (this.target as Window | Document).dispatchEvent(event);
        }
    }


    on(eventName: string, handler: (data: any) => void): void {
        if (this.isNodeEnvironment) {
            (this.target as EventEmitter).on(eventName, handler);
        } else {
            (this.target as Window | Document).addEventListener(
                eventName,
                ((event: CustomEvent) => handler(event.detail)) as EventListener
            );
        }
    }

    once(eventName: string, handler: (data: any) => void): void {
        if (this.isNodeEnvironment) {
            (this.target as EventEmitter).once(eventName, handler);
        } else {
            (this.target as Window | Document).addEventListener(
                eventName,
                ((event: CustomEvent) => handler(event.detail)) as EventListener,
                { once: true }
            );
        }
    }

    off(eventName: string, handler: (data: any) => void): void {
        if (this.isNodeEnvironment) {
            (this.target as EventEmitter).off(eventName, handler);
        } else {
            (this.target as Window | Document).removeEventListener(
                eventName,
                handler as EventListener
            );
        }
    }


    removeAllListeners(eventName?: string): void {
        if (this.isNodeEnvironment) {
            (this.target as EventEmitter).removeAllListeners(eventName);
        } else {
            // Navigateur n'a pas de méthode native pour ça
            console.warn('removeAllListeners not fully supported in browser');
        }
    }
}