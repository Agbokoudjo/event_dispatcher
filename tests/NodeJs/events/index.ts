// events/ServerErrorEvent.ts
import { BaseEvent } from '../../../src/events';

export class ServerErrorEvent extends BaseEvent {
    constructor(
        public readonly error: Error,
        public readonly path: string,
        public readonly method: string
    ) {
        super();
    }
}