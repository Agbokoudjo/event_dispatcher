// tests/BaseEvent.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseEvent } from '../src/events';

describe('BaseEvent', () => {
    let event: BaseEvent;

    beforeEach(() => {
        event = new BaseEvent();
    });

    describe('isPropagationStopped', () => {
        it('should return false by default', () => {
            expect(event.isPropagationStopped()).toBe(false);
        });

        it('should return true after stopPropagation is called', () => {
            event.stopPropagation();
            expect(event.isPropagationStopped()).toBe(true);
        });
    });

    describe('stopPropagation', () => {
        it('should stop propagation', () => {
            expect(event.isPropagationStopped()).toBe(false);
            event.stopPropagation();
            expect(event.isPropagationStopped()).toBe(true);
        });

        it('should remain stopped after multiple calls', () => {
            event.stopPropagation();
            event.stopPropagation();
            event.stopPropagation();
            expect(event.isPropagationStopped()).toBe(true);
        });
    });

    describe('Custom Event Extension', () => {
        class UserCreatedEvent extends BaseEvent {
            constructor(
                public readonly userId: string,
                public readonly email: string
            ) {
                super();
            }
        }

        it('should allow custom events to extend BaseEvent', () => {
            const userEvent = new UserCreatedEvent('123', 'user@example.com');

            expect(userEvent.userId).toBe('123');
            expect(userEvent.email).toBe('user@example.com');
            expect(userEvent.isPropagationStopped()).toBe(false);
        });

        it('should maintain stopPropagation functionality in custom events', () => {
            const userEvent = new UserCreatedEvent('123', 'user@example.com');

            expect(userEvent.isPropagationStopped()).toBe(false);
            userEvent.stopPropagation();
            expect(userEvent.isPropagationStopped()).toBe(true);
        });

        it('should preserve custom event data after stopping propagation', () => {
            const userEvent = new UserCreatedEvent('123', 'user@example.com');
            userEvent.stopPropagation();

            expect(userEvent.userId).toBe('123');
            expect(userEvent.email).toBe('user@example.com');
        });
    });

    describe('Immutability of stopped state', () => {
        it('should not allow propagation to be restarted', () => {
            event.stopPropagation();
            expect(event.isPropagationStopped()).toBe(true);

            // Try to modify (there's no restart method, which is correct)
            // The state should remain stopped
            expect(event.isPropagationStopped()).toBe(true);
        });
    });
});