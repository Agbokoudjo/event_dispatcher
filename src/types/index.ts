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

/**
 * Type definition for event listeners.
 * An event listener is a callable that receives an event object.
 * 
 * Listeners can be synchronous or asynchronous.
 */
export type EventListener<T extends object = any> = (event: T) => void | Promise<void>;