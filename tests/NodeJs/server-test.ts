import express from 'express';
import {
    BaseEvent,
    NodeEventDispatcher
} from '../../src';

const app = express();
const port = 3000;

const dispatcher = new NodeEventDispatcher();

class HttpRequestEvent extends BaseEvent {
    constructor(
        public readonly method: string,
        public readonly url: string,
        public readonly ip: string
    ) {
        super();
    }
}

dispatcher.addListener('HttpRequestEvent', (event: HttpRequestEvent) => {
    console.log(`[EVENT LOG] Nouvelle requête détectée sur ${event.url} depuis ${event}`);
}, 10);

dispatcher.getEmitter().on('HttpRequestEvent', (event: HttpRequestEvent) => {
    console.log(`[NATIVE NODE LOG] L'émetteur natif a aussi reçu l'événement pour ${event.url}`);
});

app.get('/test-evenement', (req, res) => {
    
    const event = new HttpRequestEvent(req.method, req.url, req.ip || 'unknown');
    dispatcher.dispatch(event);

    res.send(`Événement dispatché pour l'URL : ${req.url}. Regarde ton terminal !`);
});

app.listen(port, () => {
    console.log(`---`);
    console.log(`Serveur de test lancé sur http://localhost:${port}`);
    console.log(`Appuie sur Ctrl+C pour arrêter`);
    console.log(`---`);
});