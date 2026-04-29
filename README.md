# @wlindabla/event-dispatcher

A flexible, Symfony-inspired event dispatcher for JavaScript & TypeScript with optimized implementations for Browser and Node.js environments.

Event Dispatcher is a robust and flexible event management library.
Unlike other dispatchers, it seamlessly bridges the gap between server-side and client-side development by leveraging native platform APIs while maintaining a consistent, priority-aware interface.

## ✨ Features

- 🎯 **Symfony-inspired** — Familiar API for PHP/Symfony developers
- 🚀 **Environment-optimized** — Separate implementations for Browser (CustomEvent) and Node.js (EventEmitter)
- ⚡ **Async-ready** — `dispatch()` for sync/fire-and-forget, `dispatchAsync()` for awaitable async listeners
- 🌐 **Native bridge** — Every `dispatch()` automatically notifies native browser/Node.js listeners (no extra setup)
- 💪 **TypeScript-first** — Full type safety with generics
- 🔄 **Priority-based listeners** — Control execution order
- 🛑 **Stoppable events** — Halt propagation when needed
- 📦 **Tree-shakeable** — Only bundle what you use
- 🧪 **Well tested** — 73 tests with 100% coverage
- ⚡ **Zero dependencies** — Lightweight and fast

## 📦 Installation

```bash
# Using yarn
yarn add @wlindabla/event_dispatcher

# Using npm
npm install @wlindabla/event_dispatcher

# Using pnpm
pnpm add @wlindabla/event_dispatcher
```

## 🚀 Quick Start

```typescript
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';
// or: import { NodeEventDispatcher } from '@wlindabla/event_dispatcher/node';
// or: import { SimpleEventDispatcher } from '@wlindabla/event_dispatcher';

// Define a custom event
class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {}
}

// Create dispatcher
const dispatcher = new BrowserEventDispatcher();

// Add a listener
dispatcher.addListener('user.created', (event: UserCreatedEvent) => {
  console.log(`User ${event.email} created with ID ${event.userId}`);
});

// Dispatch the event
const event = new UserCreatedEvent('123', 'user@example.com');
dispatcher.dispatch(event, 'user.created');
```

## 📖 Table of Contents

- [Core Concepts](#core-concepts)
- [Creating Events](#creating-events)
- [Adding Listeners](#adding-listeners)
- [Event Subscribers](#event-subscribers)
- [Stopping Propagation](#stopping-propagation)
- [Async Listeners](#async-listeners)
- [Native Platform Bridge](#native-platform-bridge)
- [Environment-Specific Usage](#environment-specific-usage)
  - [Node.js Examples](#nodejs-examples)
  - [Browser Examples](#browser-examples)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [Migration Guide](#migration-guide)
- [Architecture](#architecture)
- [FAQ](#faq)

---

## 🎓 Core Concepts

### Event Dispatcher

The Event Dispatcher is the central component that manages listeners and dispatches events. It follows the **Observer pattern** and is inspired by the [Symfony EventDispatcher component](https://symfony.com/doc/current/components/event_dispatcher.html), adapted for JavaScript's async nature and native browser/Node.js ecosystems.

Every dispatcher has two layers working together on each `dispatch()` call:

1. **Internal Map** — the single source of truth. Iterates your registered listeners in priority order. This is the Symfony-inspired core.
2. **Native bridge** — automatically fires the event on the native `EventTarget` (browser) or `EventEmitter` (Node.js) so that external code using `window.addEventListener()` or `emitter.on()` also receives the event without registering through the dispatcher.

### Events

Events are plain objects that carry data about something that happened in your application. They can optionally implement `StoppableEventInterface` to support propagation control.

### Listeners

Listeners are functions that respond to events. They can be synchronous or asynchronous, and are executed in priority order (higher priority first).

### Subscribers

Subscribers are classes that declare which events they listen to and which methods handle them — exactly like Symfony's `EventSubscriberInterface`.

---

## 📝 Creating Events

Events are plain objects or class instances. Extend `BaseEvent` to get `stopPropagation()` support out of the box:

```typescript
import { BaseEvent } from '@wlindabla/event_dispatcher';

// Simple event
class UserCreatedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {
    super();
  }
}

// Event with mutable result (useful with dispatchAsync)
class InitializingUploadEvent extends BaseEvent {
  public mediaId: string | null = null;

  constructor(public readonly options: UploadOptions) {
    super();
  }

  setMediaId(id: string): void {
    this.mediaId = id;
  }
}

// Error event
class ServerErrorEvent extends BaseEvent {
  constructor(
    public readonly error: Error,
    public readonly path: string,
    public readonly method: string,
    public readonly timestamp: Date = new Date()
  ) {
    super();
  }
}
```

**Best practices:**
- Use descriptive names ending with `Event`
- Make properties `readonly` unless the subscriber needs to write back a result
- Include all necessary context data in the constructor

---

## 👂 Adding Listeners

### Basic listener

```typescript
dispatcher.addListener('user.created', (event: UserCreatedEvent) => {
  console.log(`New user: ${event.email}`);
});
```

### Listener with priority

Higher priority listeners execute first (default priority is `0`):

```typescript
dispatcher.addListener('order.placed', handlePayment,      100); // first
dispatcher.addListener('order.placed', sendEmail,           50); // second
dispatcher.addListener('order.placed', updateInventory,      0); // last
```

### Async listeners

Listeners can be asynchronous. Read the [Async Listeners](#async-listeners) section to understand when to use `dispatch()` vs `dispatchAsync()`.

```typescript
dispatcher.addListener('user.created', async (event: UserCreatedEvent) => {
  await sendWelcomeEmail(event.email);
  await createUserProfile(event.userId);
});
```

### Removing a listener

```typescript
const myListener = (event: UserCreatedEvent) => {
  console.log('User created');
};

dispatcher.addListener('user.created', myListener);

// Later
dispatcher.removeListener('user.created', myListener);
```

---

## 📢 Event Subscribers

Subscribers organize multiple event listeners in a single class — exactly like Symfony:

```typescript
import { EventSubscriberInterface } from '@wlindabla/event_dispatcher';

class UserSubscriber implements EventSubscriberInterface {
  getSubscribedEvents() {
    return {
      'user.created': 'onUserCreated',
      'user.updated': { listener: 'onUserUpdated', priority: 10 },
      'user.deleted': { listener: 'onUserDeleted', priority: 5 },
    };
  }

  onUserCreated(event: UserCreatedEvent) {
    console.log(`User ${event.userId} created`);
  }

  onUserUpdated(event: UserUpdatedEvent) {
    console.log(`User ${event.userId} updated`);
  }

  onUserDeleted(event: UserDeletedEvent) {
    console.log(`User ${event.userId} deleted`);
  }
}

dispatcher.addSubscriber(new UserSubscriber());

// Remove all its listeners later
dispatcher.removeSubscriber(subscriber);
```

---

## 🛑 Stopping Propagation

```typescript
class ValidationEvent extends BaseEvent {
  public isValid: boolean = true;
}

dispatcher.addListener('order.validate', (event: ValidationEvent) => {
  if (!event.isValid) {
    event.stopPropagation(); // next listeners won't run
  }
}, 100);

dispatcher.addListener('order.validate', (event: ValidationEvent) => {
  console.log('Processing valid order'); // skipped if propagation stopped
}, 50);

const event = new ValidationEvent();
event.isValid = false;
dispatcher.dispatch(event, 'order.validate');
```

**Use cases:** form validation, authorization checks, circuit breakers, conditional workflows.

---

## ⚡ Async Listeners

This is a JavaScript extension beyond Symfony. Two methods are available depending on your needs:

### `dispatch()` — fire-and-forget for async listeners

Use this when your async listeners run independently and you don't need to read any result from the event object after dispatch.

```typescript
dispatcher.addListener('email.send', async (event: EmailEvent) => {
  await mailer.send(event.to, event.subject); // runs in background
});

dispatcher.dispatch(emailEvent, 'email.send');
// Returns immediately — async listener runs in background
// Errors are caught and logged automatically
```

### `dispatchAsync()` — awaitable, sequential async listeners

Use this when a subscriber performs async work (HTTP, DB, file I/O…) and **you need to read the result from the event object after dispatch**.

`stopPropagation()` is honoured between each awaited listener.

```typescript
dispatcher.addListener('upload.init', async (event: InitializingUploadEvent) => {
  const response = await fetch('/api/upload/init', { method: 'POST' });
  const data = await response.json();
  event.setMediaId(data.mediaId); // write result back to event
});

const event = new InitializingUploadEvent(options);
await dispatcher.dispatchAsync(event, 'upload.init');

console.log(event.mediaId); // ✅ safely populated by the subscriber
```

### Choosing between the two

| Situation | Use |
|---|---|
| Async listeners run independently, no result needed | `dispatch()` |
| You need to read a result from the event after dispatch | `dispatchAsync()` |
| Subscribers do HTTP / DB / file I/O and must complete before you continue | `dispatchAsync()` |
| Simple sync listeners | `dispatch()` |

---

## 🌐 Native Platform Bridge

This is what makes this dispatcher unique compared to a plain Symfony port.

When you call `dispatch()` or `dispatchAsync()`, the dispatcher automatically does two things:

1. Iterates its internal Map of listeners (your subscribers, in priority order)
2. Fires the event on the **native platform primitive** (`EventTarget` in browsers, `EventEmitter` in Node.js)

This means any code using the native API directly — **without ever going through `addListener()`** — automatically receives the event:

```typescript
// Browser
const dispatcher = new BrowserEventDispatcher(window);

window.addEventListener('user.login', (e) => {
  const event = (e as CustomEvent).detail; // your typed event object
  console.log('Received natively:', event.username);
});

// This single call notifies BOTH your subscribers AND the window listener
dispatcher.dispatch(new UserLoginEvent('franck'), 'user.login');
```

```typescript
// Node.js
const sharedEmitter = new EventEmitter();
const dispatcher = new NodeEventDispatcher(sharedEmitter);

sharedEmitter.on('file.processed', (event: FileProcessedEvent) => {
  console.log('Received natively:', event.fileName);
});

// This single call notifies BOTH your subscribers AND the emitter listener
dispatcher.dispatch(new FileProcessedEvent('video.mp4'), 'file.processed');
```

**Important:** listeners registered via `addListener()` are stored in the internal Map only — not on the native primitive. This avoids any double-call. The native primitive is exclusively for external/third-party listeners.

---

## 🌍 Environment-Specific Usage

---

## 🟢 Node.js Examples

### Example 1: Express.js error handling

```typescript
// events/ServerErrorEvent.ts
import { BaseEvent } from '@wlindabla/event_dispatcher';

export class ServerErrorEvent extends BaseEvent {
  constructor(
    public readonly error: Error,
    public readonly path: string,
    public readonly method: string,
    public readonly timestamp: Date = new Date()
  ) {
    super();
  }
}
```

```typescript
// subscribers/ErrorLoggerSubscriber.ts
import { EventSubscriberInterface } from '@wlindabla/event_dispatcher';

export class ErrorLoggerSubscriber implements EventSubscriberInterface {
  getSubscribedEvents() {
    return {
      'ServerErrorEvent': { listener: 'onServerError', priority: -100 }
    };
  }

  onServerError(event: ServerErrorEvent) {
    console.error(`[AUDIT LOG] ${event.method} ${event.path}`);
    console.error(`Message: ${event.error.message}`);
    console.error(`Time: ${event.timestamp.toISOString()}`);
  }
}
```

```typescript
// server.ts
import express from 'express';
import { NodeEventDispatcher } from '@wlindabla/event_dispatcher/node';

const app = express();
const dispatcher = new NodeEventDispatcher();

dispatcher.addSubscriber(new ErrorLoggerSubscriber());

// Async listener — fire-and-forget (dispatch() is enough here)
dispatcher.addListener('ServerErrorEvent', async (event: ServerErrorEvent) => {
  await saveErrorToDatabase(event);
}, -200);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  dispatcher.dispatch(new ServerErrorEvent(err, req.path, req.method));
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(3000);
```

---

### Example 2: Async subscriber that must complete before continuing

```typescript
import { NodeEventDispatcher } from '@wlindabla/event_dispatcher/node';

class MediaUploadInitEvent extends BaseEvent {
  public mediaId: string | null = null;
  setMediaId(id: string) { this.mediaId = id; }
}

const dispatcher = new NodeEventDispatcher();

dispatcher.addListener('upload.init', async (event: MediaUploadInitEvent) => {
  const response = await fetch('https://api.example.com/upload/init', {
    method: 'POST'
  });
  const data = await response.json();
  event.setMediaId(data.mediaId); // write result back
});

// Use dispatchAsync — we need event.mediaId after dispatch
const event = new MediaUploadInitEvent();
await dispatcher.dispatchAsync(event, 'upload.init');

console.log('Media ID:', event.mediaId); // ✅ defined
```

---

### Example 3: Native EventEmitter integration

```typescript
import { NodeEventDispatcher } from '@wlindabla/event_dispatcher/node';
import { EventEmitter } from 'node:events';

const sharedEmitter = new EventEmitter();
const dispatcher = new NodeEventDispatcher(sharedEmitter);

// Registered via dispatcher — uses internal Map
dispatcher.addListener('UserAccessEvent', (event: UserAccessEvent) => {
  console.log('[Dispatcher] Access recorded:', event.path);
}, 100);

// Registered on native emitter directly — no addListener() needed
sharedEmitter.on('UserAccessEvent', (event: UserAccessEvent) => {
  console.log('[Native Node.js] Signal received:', event.path);
});

// One dispatch call — both listeners receive the event
dispatcher.dispatch(new UserAccessEvent('/api/users'), 'UserAccessEvent');

// Output:
// [Dispatcher] Access recorded: /api/users      ← from internal Map (priority 100)
// [Native Node.js] Signal received: /api/users  ← from native emitter bridge
```

---

### Example 4: Microservice event-driven communication

```typescript
const dispatcher = new NodeEventDispatcher();

dispatcher.addListener('order.created', async (event: OrderCreatedEvent) => {
  console.log(`[Payment] Processing ${event.orderId}`);
  // await paymentService.process(event.orderId, event.total);
}, 100);

dispatcher.addListener('order.created', async (event: OrderCreatedEvent) => {
  console.log(`[Inventory] Reserving items for ${event.orderId}`);
  // await inventoryService.reserve(event.orderId);
}, 90);

dispatcher.addListener('order.created', async (event: OrderCreatedEvent) => {
  console.log(`[Notification] Sending confirmation to ${event.userId}`);
  // await notificationService.send(event);
}, 80);

dispatcher.dispatch(new OrderCreatedEvent('ORD-001', 'USER-123', 99.99), 'order.created');
```

---

## 🌐 Browser Examples

### Example 1: Interactive UI

```typescript
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';

const dispatcher = new BrowserEventDispatcher(window);

class UserActionEvent extends BaseEvent {
  constructor(public readonly action: string) { super(); }
}

// Registered via dispatcher
dispatcher.addListener('UserActionEvent', (event: UserActionEvent) => {
  console.log('[High Priority] Action:', event.action);
}, 100);

dispatcher.addListener('UserActionEvent', (event: UserActionEvent) => {
  console.log('[Analytics] Tracking:', event.action);
}, 50);

// Registered on window directly — no addListener() needed
window.addEventListener('UserActionEvent', (e) => {
  const event = (e as CustomEvent).detail;
  console.log('[Native DOM] Captured:', event.action);
});

document.getElementById('btn')?.addEventListener('click', () => {
  // One dispatch — all three listeners receive the event
  dispatcher.dispatch(new UserActionEvent('BUTTON_CLICK'));
});

// Output on click:
// [High Priority] Action: BUTTON_CLICK   ← from internal Map (priority 100)
// [Analytics] Tracking: BUTTON_CLICK     ← from internal Map (priority 50)
// [Native DOM] Captured: BUTTON_CLICK    ← from native EventTarget bridge
```

---

### Example 2: Async upload with dispatchAsync

```typescript
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';

class InitializingUploadEvent extends BaseEvent {
  public mediaId: string | null = null;
  setMediaId(id: string) { this.mediaId = id; }
  constructor(public readonly file: File) { super(); }
}

const dispatcher = new BrowserEventDispatcher();

dispatcher.addListener('upload.init', async (event: InitializingUploadEvent) => {
  const formData = new FormData();
  formData.append('name', event.file.name);

  const response = await fetch('/api/upload/init', {
    method: 'POST',
    body: formData
  });
  const data = await response.json();
  event.setMediaId(data.mediaId);
});

// Use dispatchAsync — we need event.mediaId after dispatch
const file = input.files![0];
const event = new InitializingUploadEvent(file);
await dispatcher.dispatchAsync(event, 'upload.init');

console.log('Media ID ready:', event.mediaId); // ✅ defined
startChunkedUpload(event.mediaId!);
```

---

### Example 3: SPA Navigation

```typescript
const dispatcher = new BrowserEventDispatcher();

class NavigationEvent extends BaseEvent {
  constructor(public readonly from: string, public readonly to: string) { super(); }
}

dispatcher.addListener('navigation', (event: NavigationEvent) => {
  console.log(`Navigating from ${event.from} to ${event.to}`);
}, 100);

dispatcher.addListener('navigation', (event: NavigationEvent) => {
  window.history.pushState({}, '', event.to);
}, 50);

function navigateTo(newPath: string) {
  dispatcher.dispatch(new NavigationEvent(window.location.pathname, newPath), 'navigation');
}
```

---

## 🎯 Advanced Usage

### Event chaining

```typescript
dispatcher.addListener('user.created', (event: UserCreatedEvent) => {
  // Dispatch another event from within a listener
  const profileEvent = new ProfileCreatedEvent(event.userId);
  dispatcher.dispatch(profileEvent, 'profile.created');
});
```

### Conditional dispatching

```typescript
dispatcher.addListener('data.changed', (event: DataChangedEvent) => {
  if (event.source === 'external') {
    refreshUI();
  }
});
```

### Testing

```typescript
import { describe, it, expect, vi } from 'vitest';
import { SimpleEventDispatcher } from '@wlindabla/event_dispatcher';

describe('User Events', () => {
  it('dispatches user.created to all listeners', () => {
    const dispatcher = new SimpleEventDispatcher();
    const listener = vi.fn();

    dispatcher.addListener('user.created', listener);
    dispatcher.dispatch(new UserCreatedEvent('123', 'test@example.com'), 'user.created');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ userId: '123' }));
  });

  it('awaits async listeners with dispatchAsync', async () => {
    const dispatcher = new SimpleEventDispatcher();
    const event = new InitializingUploadEvent(options);

    dispatcher.addListener('upload.init', async (e: InitializingUploadEvent) => {
      await Promise.resolve();
      e.setMediaId('media-123');
    });

    await dispatcher.dispatchAsync(event, 'upload.init');

    expect(event.mediaId).toBe('media-123');
  });
});
```

---

## 📚 API Reference

---

### `AbstractEventDispatcher`

Base class inherited by all dispatcher implementations.

---

#### `dispatch<T>(event: T, eventName?: string | null): T`

Dispatches an event synchronously to all registered listeners in priority order.

Async listeners are **fire-and-forget**: their Promise errors are caught and logged automatically, but `dispatch()` does not await them.

For `BrowserEventDispatcher` and `NodeEventDispatcher`, also automatically fires the event on the native platform primitive after the Map loop.

**Parameters:**
- `event` — the event object to dispatch
- `eventName` *(optional)* — event name. Defaults to `event.constructor.name`

**Returns:** the same event object

```typescript
const event = new UserCreatedEvent('123', 'user@example.com');
dispatcher.dispatch(event, 'user.created');
```

---

#### `dispatchAsync<T>(event: T, eventName?: string | null): Promise<T>`

Dispatches an event and **awaits each listener sequentially**, in priority order.

Use this when subscribers perform async work (HTTP, DB, file I/O…) and you need to read results from the event object after dispatch. `stopPropagation()` is honoured between each awaited listener.

For `BrowserEventDispatcher` and `NodeEventDispatcher`, also fires the event on the native platform primitive after all async listeners have completed.

**Parameters:**
- `event` — the event object to dispatch
- `eventName` *(optional)* — event name. Defaults to `event.constructor.name`

**Returns:** `Promise<T>` — resolves with the same event object once all listeners have completed

**Throws:** re-throws any error thrown by a listener so the caller can handle it

```typescript
const event = new InitializingUploadEvent(options);
await dispatcher.dispatchAsync(event, 'upload.init');
const mediaId = event.mediaId; // ✅ safely populated
```

---

#### `addListener<T>(eventName: string, listener: EventListener<T>, priority?: number): void`

Registers a listener for a specific event in the internal Map.

**Parameters:**
- `eventName` — the event to listen to
- `listener` — callback `(event: T) => void | Promise<void>`
- `priority` *(optional)* — execution priority (default: `0`). Higher = earlier

```typescript
dispatcher.addListener('user.created', (event) => {
  console.log('User created:', event.userId);
}, 100);
```

---

#### `removeListener<T>(eventName: string, listener: EventListener<T>): void`

Removes a specific listener from the internal Map.

---

#### `addSubscriber(subscriber: EventSubscriberInterface): void`

Registers all listeners declared by a subscriber.

---

#### `removeSubscriber(subscriber: EventSubscriberInterface): void`

Removes all listeners registered by a subscriber.

---

#### `hasListeners(eventName?: string | null): boolean`

Returns `true` if at least one listener is registered for the given event (or any event if `eventName` is omitted).

---

#### `getListeners(eventName?: string | null): EventListener[] | Map<string, EventListener[]>`

Returns listeners for a specific event, or a Map of all listeners.

---

#### `getListenerPriority<T>(eventName: string, listener: EventListener<T>): number | null`

Returns the priority of a specific listener, or `null` if not found.

---

### `BaseEvent`

Base class for all events. Implements `StoppableEventInterface`.

#### `stopPropagation(): void`

Stops propagation — subsequent listeners will not be called.

#### `isPropagationStopped(): boolean`

Returns `true` if propagation has been stopped.

---

### Environment-specific methods

#### `BrowserEventDispatcher`

##### `dispatchNative<T>(event: T, eventName?: string | null): void`

Fires a `CustomEvent` on the native `EventTarget` manually.
Called automatically by `dispatch()` and `dispatchAsync()` — you rarely need to call this directly.

External listeners receive the original event object via `(e as CustomEvent).detail`.

##### `getEventTarget(): EventTarget`

Returns the underlying `EventTarget`. Pass `window` or `document` in the constructor to share it with the rest of your application.

```typescript
const dispatcher = new BrowserEventDispatcher(window);
// window.addEventListener('my.event', fn) now works automatically
```

---

#### `NodeEventDispatcher`

##### `dispatchNative<T>(event: T, eventName?: string | null): void`

Fires `emitter.emit()` on the native `EventEmitter` manually.
Called automatically by `dispatch()` and `dispatchAsync()` — you rarely need to call this directly.

##### `getEmitter(): EventEmitter`

Returns the underlying `EventEmitter`. Pass a shared emitter in the constructor to integrate with other modules.

##### `setMaxListeners(n: number): void`

Sets the maximum number of listeners (default: `100`).

##### `getMaxListeners(): number`

Returns the current maximum listeners limit.

---

## 🔄 Migration Guide

### From native EventEmitter (Node.js)

**Before:**
```typescript
import { EventEmitter } from 'events';
const emitter = new EventEmitter();
emitter.on('user.created', handler);
emitter.emit('user.created', data);
```

**After:**
```typescript
import { NodeEventDispatcher } from '@wlindabla/event_dispatcher/node';

class UserCreatedEvent extends BaseEvent {
  constructor(public readonly data: any) { super(); }
}

const dispatcher = new NodeEventDispatcher();
dispatcher.addListener('user.created', (event) => handler(event.data));
dispatcher.dispatch(new UserCreatedEvent(data), 'user.created');
```

---

### From DOM Events (Browser)

**Before:**
```typescript
document.addEventListener('my-event', handler);
document.dispatchEvent(new CustomEvent('my-event', { detail: data }));
```

**After:**
```typescript
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';

class MyEvent extends BaseEvent {
  constructor(public readonly data: any) { super(); }
}

const dispatcher = new BrowserEventDispatcher(document);
dispatcher.addListener('my-event', (event) => handler(event.data));
dispatcher.dispatch(new MyEvent(data), 'my-event');
```

---

## 🏗️ Architecture

```
@wlindabla/event-dispatcher
├── contracts/
│   ├── EventDispatcherInterface
│   ├── StoppableEventInterface
│   └── EventSubscriberInterface
├── events/
│   └── BaseEvent
├── implementations/
│   ├── AbstractEventDispatcher     (dispatch, dispatchAsync, addSubscriber…)
│   ├── SimpleEventDispatcher       (universal — no native primitive)
│   ├── BrowserEventDispatcher      (Map + EventTarget bridge)
│   └── NodeEventDispatcher         (Map + EventEmitter bridge)
├── types/
│   └── EventListener
└── utils/
    └── createEventDispatcher
```

**How dispatch works:**

```
dispatcher.dispatch(event, 'my.event')
         │
         ├─ Step 1: Internal Map loop (priority order)
         │          listener A (priority 100) ✓
         │          listener B (priority 50)  ✓
         │          stopPropagation() honoured
         │
         └─ Step 2: Native bridge (automatic)
                    Browser → eventTarget.dispatchEvent(CustomEvent)
                    Node    → emitter.emit(name, event)
                              ↓
                    window.addEventListener / emitter.on listeners ✓
                    (no addListener() needed on their side)
```

---

## 📊 Performance

| Implementation | Environment | Dispatches/sec | Memory |
|---|---|---|---|
| SimpleEventDispatcher | Universal | ~500K | Low |
| BrowserEventDispatcher | Browser | ~800K | Very Low |
| NodeEventDispatcher | Node.js | ~1M | Low |

*Benchmarks run on Node.js ≥18 and Chrome ≥120*

---

## 🧪 Testing

```bash
yarn test            # run all tests
yarn test:watch      # watch mode
yarn test:coverage   # coverage report
```

---

## ❓ FAQ

**Can I use this in production?**
Yes. The library is fully tested with 73 tests and 100% code coverage.

**Does it work with React / Vue / Angular?**
Yes. It's framework-agnostic.

**Can listeners be async?**
Yes. Use `dispatch()` for fire-and-forget async listeners, and `dispatchAsync()` when you need to await them and read results from the event object.

**What's the difference between `dispatch()` and `dispatchAsync()`?**
`dispatch()` is synchronous — async listeners run in the background and errors are logged. `dispatchAsync()` awaits each listener sequentially so you can safely read results from the event object after it returns.

**Do I need to call `dispatchNative()` manually?**
No. `dispatch()` and `dispatchAsync()` call it automatically. Use `dispatchNative()` only if you want to notify native listeners *without* going through your registered subscribers.

**What's the bundle size?**
~2.5 KB gzipped for the full bundle, ~1.2–1.8 KB for individual implementations.

**How is this different from EventEmitter?**
Type safety, priority support, structured event objects, `stopPropagation()`, async-aware dispatch, and automatic native bridge — all in one consistent API across browser and Node.js.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT © [AGBOKOUDJO Franck](https://github.com/Agbokoudjo)

---

## 👤 Author

**AGBOKOUDJO Franck**

- Email: internationaleswebservices@gmail.com
- LinkedIn: [INTERNATIONALES WEB APPS & SERVICES](https://www.linkedin.com/in/internationales-web-apps-services-120520193/)
- GitHub: [@Agbokoudjo](https://github.com/Agbokoudjo)
- Company: INTERNATIONALES WEB APPS & SERVICES

---

## 🙏 Acknowledgments

Inspired by [Symfony EventDispatcher](https://symfony.com/doc/current/components/event_dispatcher.html) — built with ❤️ for the JavaScript/TypeScript community.

---

**Made with ❤️ by AGBOKOUDJO Franck**