// subscribers/ErrorSubscriber.ts
import { EventSubscriberInterface } from '../../../src/contracts';
import { ServerErrorEvent } from '../events';

export class ErrorLoggerSubscriber implements EventSubscriberInterface {
    getSubscribedEvents() {
        return {
            'ServerErrorEvent': { listener: 'onServerError', priority: -100 }
        };
    }

    onServerError(event: ServerErrorEvent) {
        console.error(`--- [AUDIT LOG] ---`);
        console.error(`Erreur sur : ${event.method} ${event.path}`);
        console.error(`Message : ${event.error.message}`);
        console.error(`-------------------`);
    }
}