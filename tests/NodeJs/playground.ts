import express from 'express';
import { NodeEventDispatcher } from '../../src/implementations/NodeEventDispatcher';
import { BaseEvent } from '../../src/events'; 

const app = express();
const dispatcher = new NodeEventDispatcher();

class UserAccessEvent extends BaseEvent {
    constructor(public path: string, public timestamp: number) {
        super();
    }
}

dispatcher.addListener('UserAccessEvent', (event: UserAccessEvent) => {
    console.log(`[Dispatcher - Priorité Haute] Accès à ${event.path} enregistré.`);
}, 100);

dispatcher.getEmitter().on('UserAccessEvent', (event: UserAccessEvent) => {
    console.log(`[Native Node] Signal reçu par l'émetteur système pour ${event.path}`);
});

app.get('/test', (req, res) => {
    const event = new UserAccessEvent(req.path, Date.now());

    // On déclenche l'événement
    dispatcher.dispatch(event);

    res.json({
        message: "Événement envoyé au dispatcher",
        path: event.path,
        propagationStopped: event.isPropagationStopped()
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Serveur de test prêt sur http://localhost:${PORT}/test`);
    console.log(`👀 Surveille cette console pour voir les logs d'événements...\n`);
});