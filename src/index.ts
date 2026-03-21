// src/index.ts
export type * from './types';
export type * from './contracts';

export {BaseEvent} from './events';
export { AbstractEventDispatcher } from "./implementations/AbstractEventDispatcher";

//Export du dispatcher Browser (Sûr car il utilise EventTarget natif)
export { BrowserEventDispatcher } from "./implementations/BrowserEventDispatcher";



