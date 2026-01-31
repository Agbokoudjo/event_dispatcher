import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeEventDispatcher } from '../src/implementations';
import { BaseEvent } from '../src/events';
import { EventEmitter } from 'events';
import type { EventSubscriberInterface } from '../src/contracts';

describe('NodeEventDispatcher', () => {
  let dispatcher: NodeEventDispatcher;

  beforeEach(() => {
    dispatcher = new NodeEventDispatcher();
  });

  describe('constructor', () => {
    it('should create with default EventEmitter', () => {
      const dispatcher = new NodeEventDispatcher();
      expect(dispatcher.getEmitter()).toBeInstanceOf(EventEmitter);
    });

    it('should accept custom EventEmitter', () => {
      const customEmitter = new EventEmitter();
      const dispatcher = new NodeEventDispatcher(customEmitter);
      
      expect(dispatcher.getEmitter()).toBe(customEmitter);
    });

    it('should set max listeners to 100 by default', () => {
      const dispatcher = new NodeEventDispatcher();
      expect(dispatcher.getMaxListeners()).toBe(100);
    });
  });

  describe('addListener', () => {
    it('should add a listener for an event', () => {
      const listener = vi.fn();
      dispatcher.addListener('test.event', listener);
      
      expect(dispatcher.hasListeners('test.event')).toBe(true);
    });

    it('should add multiple listeners with different priorities', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();
      
      dispatcher.addListener('test.event', listener1, 0);
      dispatcher.addListener('test.event', listener2, 10);
      dispatcher.addListener('test.event', listener3, 5);
      
      const listeners = dispatcher.getListeners('test.event') as Array<Function>;
      expect(listeners).toHaveLength(3);
      // Should be sorted by priority: 10, 5, 0
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
      
      expect(callOrder).toEqual([2, 3, 1]); // Priority: 10, 5, 0
    });

    it('should use event constructor name if no eventName provided', () => {
      class CustomEvent extends BaseEvent {}
      
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
      expect(event.isPropagationStopped()).toBe(true);
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

    it('should handle errors in listeners gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const listener1 = vi.fn(() => {
        throw new Error('Listener error');
      });
      const listener2 = vi.fn();
      
      dispatcher.addListener('test.event', listener1, 10);
      dispatcher.addListener('test.event', listener2, 0);
      
      const event = new BaseEvent();
      
      expect(() => {
        dispatcher.dispatch(event, 'test.event');
      }).not.toThrow();
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle async listeners', async () => {
      const asyncListener = vi.fn(async (event: BaseEvent) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      });
      
      dispatcher.addListener('async.event', asyncListener);
      
      const event = new BaseEvent();
      dispatcher.dispatch(event, 'async.event');
      
      expect(asyncListener).toHaveBeenCalledWith(event);
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    it('should emit on native EventEmitter', () => {
      const emitter = dispatcher.getEmitter();
      const nativeListener = vi.fn();
      
      emitter.on('test.event', nativeListener);
      
      const event = new BaseEvent();
      dispatcher.dispatch(event, 'test.event');
      
      expect(nativeListener).toHaveBeenCalledWith(event);
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

    it('should remove from native EventEmitter when last listener is removed', () => {
      const listener = vi.fn();
      
      dispatcher.addListener('test.event', listener);
      dispatcher.removeListener('test.event', listener);
      
      const emitter = dispatcher.getEmitter();
      expect(emitter.listenerCount('test.event')).toBe(0);
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
  });

  describe('addSubscriber / removeSubscriber', () => {
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

    it('should remove all subscriber listeners', () => {
      const subscriber = new TestSubscriber();
      
      dispatcher.addSubscriber(subscriber);
      dispatcher.removeSubscriber(subscriber);
      
      expect(dispatcher.hasListeners('event1')).toBe(false);
      expect(dispatcher.hasListeners('event2')).toBe(false);
    });
  });

  describe('Node.js-specific methods', () => {
    describe('getEmitter', () => {
      it('should return the underlying EventEmitter', () => {
        const emitter = dispatcher.getEmitter();
        expect(emitter).toBeInstanceOf(EventEmitter);
      });

      it('should return the same EventEmitter instance', () => {
        const emitter1 = dispatcher.getEmitter();
        const emitter2 = dispatcher.getEmitter();
        
        expect(emitter1).toBe(emitter2);
      });
    });

    describe('setMaxListeners', () => {
      it('should set max listeners', () => {
        dispatcher.setMaxListeners(200);
        expect(dispatcher.getMaxListeners()).toBe(200);
      });

      it('should affect the underlying EventEmitter', () => {
        dispatcher.setMaxListeners(50);
        
        const emitter = dispatcher.getEmitter();
        expect(emitter.getMaxListeners()).toBe(50);
      });
    });

    describe('getMaxListeners', () => {
      it('should return the current max listeners limit', () => {
        expect(dispatcher.getMaxListeners()).toBe(100); // Default
      });

      it('should reflect changes made via setMaxListeners', () => {
        dispatcher.setMaxListeners(150);
        expect(dispatcher.getMaxListeners()).toBe(150);
      });
    });
  });

  describe('Complex scenarios', () => {
    it('should handle async/await in listeners', async () => {
      let result = '';
      
      const asyncListener = async (event: BaseEvent) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        result = 'async complete';
      };
      
      dispatcher.addListener('async', asyncListener);
      dispatcher.dispatch(new BaseEvent(), 'async');
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(result).toBe('async complete');
    });

    it('should handle errors in async listeners', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const asyncListener = async (event: BaseEvent) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async error');
      };
      
      dispatcher.addListener('async', asyncListener);
      
      expect(() => {
        dispatcher.dispatch(new BaseEvent(), 'async');
      }).not.toThrow();
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 20));
      
      consoleErrorSpy.mockRestore();
    });

    it('should work with Node.js process events integration', () => {
      const emitter = dispatcher.getEmitter();
      const processListener = vi.fn();
      
      emitter.on('app.ready', processListener);
      
      dispatcher.dispatch(new BaseEvent(), 'app.ready');
      
      expect(processListener).toHaveBeenCalled();
    });

    it('should handle high volume of events', () => {
      const listener = vi.fn();
      dispatcher.addListener('high.volume', listener);
      
      for (let i = 0; i < 1000; i++) {
        dispatcher.dispatch(new BaseEvent(), 'high.volume');
      }
      
      expect(listener).toHaveBeenCalledTimes(1000);
    });
  });
});



