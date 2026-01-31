// tests/SimpleEventDispatcher.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseEvent } from '../src/events';
import type { EventSubscriberInterface } from '../src/contracts';
import { SimpleEventDispatcher } from '../src/implementations';

describe('SimpleEventDispatcher', () => {
    let dispatcher: SimpleEventDispatcher;

    beforeEach(() => {
        dispatcher = new SimpleEventDispatcher();
    });

    describe('addListener', () => {
        it('should add a listener for an event', () => {
            const listener = vi.fn();
            dispatcher.addListener('test.event', listener);

            expect(dispatcher.hasListeners('test.event')).toBe(true);
        });

        it('should add multiple listeners for the same event', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            dispatcher.addListener('test.event', listener1);
            dispatcher.addListener('test.event', listener2);

            const listeners = dispatcher.getListeners('test.event') as Array<Function>;
            expect(listeners).toHaveLength(2);
        });

        it('should support priority when adding listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            const listener3 = vi.fn();

            dispatcher.addListener('test.event', listener1, 0);
            dispatcher.addListener('test.event', listener2, 10);
            dispatcher.addListener('test.event', listener3, 5);

            const listeners = dispatcher.getListeners('test.event') as Array<Function>;
            // Should be sorted: listener2 (10), listener3 (5), listener1 (0)
            expect(listeners[0]).toBe(listener2);
            expect(listeners[1]).toBe(listener3);
            expect(listeners[2]).toBe(listener1);
        });
    });

    describe('dispatch', () => {
        it('should dispatch event to registered listeners', () => {
            const listener = vi.fn();
            dispatcher.addListener('test.event', listener);

            const event = new BaseEvent();
            dispatcher.dispatch(event, 'test.event');

            expect(listener).toHaveBeenCalledWith(event);
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should dispatch to multiple listeners in priority order', () => {
            const callOrder: number[] = [];

            const listener1 = vi.fn(() => callOrder.push(1));
            const listener2 = vi.fn(() => callOrder.push(2));
            const listener3 = vi.fn(() => callOrder.push(3));

            dispatcher.addListener('test.event', listener1, 0);
            dispatcher.addListener('test.event', listener2, 10);
            dispatcher.addListener('test.event', listener3, 5);

            const event = new BaseEvent();
            dispatcher.dispatch(event, 'test.event');

            expect(callOrder).toEqual([2, 3, 1]); // Priority order: 10, 5, 0
        });

        it('should use event constructor name if eventName is not provided', () => {
            class CustomEvent extends BaseEvent { }

            const listener = vi.fn();
            dispatcher.addListener('CustomEvent', listener);

            const event = new CustomEvent();
            dispatcher.dispatch(event);

            expect(listener).toHaveBeenCalledWith(event);
        });

        it('should stop propagation when event.stopPropagation is called', () => {
            const listener1 = vi.fn((event: BaseEvent) => {
                event.stopPropagation();
            });
            const listener2 = vi.fn();

            dispatcher.addListener('test.event', listener1, 10);
            dispatcher.addListener('test.event', listener2, 0);

            const event = new BaseEvent();
            dispatcher.dispatch(event, 'test.event');

            expect(listener1).toHaveBeenCalledTimes(1);
            expect(listener2).not.toHaveBeenCalled();
        });

        it('should return the same event object', () => {
            const listener = vi.fn();
            dispatcher.addListener('test.event', listener);

            const event = new BaseEvent();
            const returnedEvent = dispatcher.dispatch(event, 'test.event');

            expect(returnedEvent).toBe(event);
        });

        it('should not throw if no listeners are registered', () => {
            const event = new BaseEvent();

            expect(() => {
                dispatcher.dispatch(event, 'non.existent.event');
            }).not.toThrow();
        });
    });

    describe('removeListener', () => {
        it('should remove a specific listener', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            dispatcher.addListener('test.event', listener1);
            dispatcher.addListener('test.event', listener2);

            dispatcher.removeListener('test.event', listener1);

            const event = new BaseEvent();
            dispatcher.dispatch(event, 'test.event');

            expect(listener1).not.toHaveBeenCalled();
            expect(listener2).toHaveBeenCalledTimes(1);
        });

        it('should not throw if listener does not exist', () => {
            const listener = vi.fn();

            expect(() => {
                dispatcher.removeListener('test.event', listener);
            }).not.toThrow();
        });

        it('should remove event name from listeners map when last listener is removed', () => {
            const listener = vi.fn();

            dispatcher.addListener('test.event', listener);
            expect(dispatcher.hasListeners('test.event')).toBe(true);

            dispatcher.removeListener('test.event', listener);
            expect(dispatcher.hasListeners('test.event')).toBe(false);
        });
    });

    describe('getListeners', () => {
        it('should return empty array for non-existent event', () => {
            const listeners = dispatcher.getListeners('non.existent');
            expect(listeners).toEqual([]);
        });

        it('should return all listeners for a specific event', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            dispatcher.addListener('test.event', listener1);
            dispatcher.addListener('test.event', listener2);

            const listeners = dispatcher.getListeners('test.event') as Array<Function>;
            expect(listeners).toHaveLength(2);
            expect(listeners).toContain(listener1);
            expect(listeners).toContain(listener2);
        });

        it('should return Map of all listeners when no event name provided', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            dispatcher.addListener('event1', listener1);
            dispatcher.addListener('event2', listener2);

            const allListeners = dispatcher.getListeners() as Map<string, Array<Function>>;

            expect(allListeners).toBeInstanceOf(Map);
            expect(allListeners.has('event1')).toBe(true);
            expect(allListeners.has('event2')).toBe(true);
        });
    });

    describe('getListenerPriority', () => {
        it('should return the priority of a listener', () => {
            const listener = vi.fn();
            dispatcher.addListener('test.event', listener, 10);

            const priority = dispatcher.getListenerPriority('test.event', listener);
            expect(priority).toBe(10);
        });

        it('should return null for non-existent listener', () => {
            const listener = vi.fn();
            const priority = dispatcher.getListenerPriority('test.event', listener);

            expect(priority).toBeNull();
        });

        it('should return null for non-existent event', () => {
            const listener = vi.fn();
            dispatcher.addListener('event1', listener);

            const priority = dispatcher.getListenerPriority('event2', listener);
            expect(priority).toBeNull();
        });

        it('should return 0 for listener added without priority', () => {
            const listener = vi.fn();
            dispatcher.addListener('test.event', listener);

            const priority = dispatcher.getListenerPriority('test.event', listener);
            expect(priority).toBe(0);
        });
    });

    describe('hasListeners', () => {
        it('should return false when no listeners are registered', () => {
            expect(dispatcher.hasListeners()).toBe(false);
        });

        it('should return true when listeners are registered', () => {
            const listener = vi.fn();
            dispatcher.addListener('test.event', listener);

            expect(dispatcher.hasListeners()).toBe(true);
        });

        it('should return false for specific event with no listeners', () => {
            expect(dispatcher.hasListeners('test.event')).toBe(false);
        });

        it('should return true for specific event with listeners', () => {
            const listener = vi.fn();
            dispatcher.addListener('test.event', listener);

            expect(dispatcher.hasListeners('test.event')).toBe(true);
        });

        it('should return false after all listeners are removed', () => {
            const listener = vi.fn();
            dispatcher.addListener('test.event', listener);
            dispatcher.removeListener('test.event', listener);

            expect(dispatcher.hasListeners('test.event')).toBe(false);
        });
    });

    describe('addSubscriber', () => {
        class TestSubscriber implements EventSubscriberInterface {
            public onEvent1Called = false;
            public onEvent2Called = false;

            getSubscribedEvents() {
                return {
                    'event1': 'onEvent1',
                    'event2': { listener: 'onEvent2', priority: 10 },
                };
            }

            onEvent1(event: BaseEvent) {
                this.onEvent1Called = true;
            }

            onEvent2(event: BaseEvent) {
                this.onEvent2Called = true;
            }
        }

        it('should add subscriber listeners', () => {
            const subscriber = new TestSubscriber();
            dispatcher.addSubscriber(subscriber);

            expect(dispatcher.hasListeners('event1')).toBe(true);
            expect(dispatcher.hasListeners('event2')).toBe(true);
        });

        it('should call subscriber methods when events are dispatched', () => {
            const subscriber = new TestSubscriber();
            dispatcher.addSubscriber(subscriber);

            dispatcher.dispatch(new BaseEvent(), 'event1');
            dispatcher.dispatch(new BaseEvent(), 'event2');

            expect(subscriber.onEvent1Called).toBe(true);
            expect(subscriber.onEvent2Called).toBe(true);
        });

        it('should respect priority from subscriber configuration', () => {
            const callOrder: string[] = [];

            class PrioritySubscriber implements EventSubscriberInterface {
                getSubscribedEvents() {
                    return {
                        'test.event': { listener: 'onTest', priority: 10 },
                    };
                }

                onTest() {
                    callOrder.push('subscriber');
                }
            }

            const regularListener = vi.fn(() => callOrder.push('regular'));

            dispatcher.addListener('test.event', regularListener, 0);
            dispatcher.addSubscriber(new PrioritySubscriber());

            dispatcher.dispatch(new BaseEvent(), 'test.event');

            expect(callOrder).toEqual(['subscriber', 'regular']);
        });
    });

    describe('removeSubscriber', () => {
        class TestSubscriber implements EventSubscriberInterface {
            getSubscribedEvents() {
                return {
                    'event1': 'onEvent1',
                    'event2': 'onEvent2',
                };
            }

            onEvent1(event: BaseEvent) { }
            onEvent2(event: BaseEvent) { }
        }

        it('should remove all subscriber listeners', () => {
            const subscriber = new TestSubscriber();

            dispatcher.addSubscriber(subscriber);
            expect(dispatcher.hasListeners('event1')).toBe(true);
            expect(dispatcher.hasListeners('event2')).toBe(true);

            dispatcher.removeSubscriber(subscriber);
            expect(dispatcher.hasListeners('event1')).toBe(false);
            expect(dispatcher.hasListeners('event2')).toBe(false);
        });

        it('should not affect other listeners when removing subscriber', () => {
            const subscriber = new TestSubscriber();
            const otherListener = vi.fn();

            dispatcher.addListener('event1', otherListener);
            dispatcher.addSubscriber(subscriber);

            dispatcher.removeSubscriber(subscriber);

            const listeners = dispatcher.getListeners('event1') as Array<Function>;
            expect(listeners).toHaveLength(1);
            expect(listeners[0]).toBe(otherListener);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle async listeners', async () => {
            const asyncListener = vi.fn(async (event: BaseEvent) => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });

            dispatcher.addListener('async.event', asyncListener);

            const event = new BaseEvent();
            dispatcher.dispatch(event, 'async.event');

            expect(asyncListener).toHaveBeenCalledWith(event);
        });

        it('should handle custom event data', () => {
            class UserEvent extends BaseEvent {
                constructor(public userId: string, public email: string) {
                    super();
                }
            }

            const listener = vi.fn();
            dispatcher.addListener('user.created', listener);

            const event = new UserEvent('123', 'test@example.com');
            dispatcher.dispatch(event, 'user.created');

            expect(listener).toHaveBeenCalledWith(event);
            expect(listener.mock.calls[0][0].userId).toBe('123');
            expect(listener.mock.calls[0][0].email).toBe('test@example.com');
        });

        it('should maintain listener order across multiple dispatches', () => {
            const callOrder: number[] = [];

            dispatcher.addListener('test', () => callOrder.push(1), 10);
            dispatcher.addListener('test', () => callOrder.push(2), 5);
            dispatcher.addListener('test', () => callOrder.push(3), 0);

            dispatcher.dispatch(new BaseEvent(), 'test');
            expect(callOrder).toEqual([1, 2, 3]);

            callOrder.length = 0;
            dispatcher.dispatch(new BaseEvent(), 'test');
            expect(callOrder).toEqual([1, 2, 3]);
        });
    });
});

