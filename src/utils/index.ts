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


import type { EventDispatcherInterface} from '../contracts';
import {
    SimpleEventDispatcher,
    NodeEventDispatcher,
    BrowserEventDispatcher
} from '../implementations';

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
 * import { createEventDispatcher } from '@wlindabla/event_dispatcher';
 * 
 * const dispatcher = createEventDispatcher();
 * ```
 */
export function createEventDispatcher(): EventDispatcherInterface {
    // Check if running in Node.js
    if (typeof process !== 'undefined' &&
        process.versions != null &&
        process.versions.node != null) {

        return new NodeEventDispatcher();
    }

    // Check if running in browser
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
       
        return new BrowserEventDispatcher();
    }

    // Fallback to simple implementation (Workers, Deno, etc.)
    return new SimpleEventDispatcher();
}