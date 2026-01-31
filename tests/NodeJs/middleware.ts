import express from 'express';
import { NodeEventDispatcher } from '../../src/implementations/NodeEventDispatcher';
import { ServerErrorEvent } from './events';
import { ErrorLoggerSubscriber } from './subscribers';

const app = express();
const dispatcher = new NodeEventDispatcher();

// Enregistrement du subscriber
dispatcher.addSubscriber(new ErrorLoggerSubscriber());

// Route qui simule un bug
app.get('/bug', (req, res) => {
    console.log(res)
    throw new Error("Oups ! Quelque chose a cassé ici.");
});

// Simulation d'une sauvegarde en base de données (ex: MongoDB ou LogFile)
const saveErrorToDB = async (event: ServerErrorEvent) => {
    console.log(`[DB] Tentative de sauvegarde de l'erreur...`);

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log(`[DB] Erreur "${event.error.message}" sauvegardée avec succès.`);
};

// On l'ajoute au dispatcher
dispatcher.addListener('ServerErrorEvent', saveErrorToDB, -200);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // On dispatche l'événement d'erreur
    const event = new ServerErrorEvent(err, req.path, req.method);
    dispatcher.dispatch(event);

    res.status(500).json({ error: "Erreur interne du serveur", event: event });
});

app.listen(3000, () => {
    console.log(`Serveur en ligne sur http://localhost:3000`);
    console.log(`Testez l'erreur sur http://localhost:3000/bug`);
});