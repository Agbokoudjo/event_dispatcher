import { BrowserEventDispatcher } from './src/implementations/BrowserEventDispatcher';
import { BaseEvent } from './src/events';

const dispatcher = new BrowserEventDispatcher(window);
const logElement = document.getElementById('log')!;

const logger = (msg: string) => {
    logElement.innerHTML += `<div>${msg}</div>`;
    console.log(msg);
};

class UserActionEvent extends BaseEvent {
    constructor(public action: string) { super(); }
}

dispatcher.addListener('UserActionEvent', (event: UserActionEvent) => {
    logger(`[Dispatcher] Action reçue : <b>${event.action}</b>`);
}, 10);

dispatcher.getEventTarget().addEventListener('UserActionEvent', (e: Event) => {
    const customEvent = e as CustomEvent;
    console.log(e)
    logger(`[Native DOM] CustomEvent capturé par l'EventTarget.`);
});

document.getElementById('btn-click')?.addEventListener('click', () => {
    const event = new UserActionEvent('CLIC_BOUTON');
    dispatcher.dispatch(event);
});