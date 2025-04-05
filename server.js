import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import fs from 'fs';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import missionRoutes from './routes/missionRouters.js';
import { connectDB } from './config/database.js';
import robotRoutes from './routes/robotRoutes.js';
import mapRoutes from './routes/mapRoutes.js';
import moveRoutes from './routes/moveRoutes.js';
import userRoutes from './routes/userRoutes.js';
import slamRoutes from './routes/slamRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import { setupMQTTHandlers } from './Handlers/mqttHandler.js';
import { updateRobotStatus } from './controllers/robotController.js';
import { convertMapToPGMMission, convertPGMtoPNGMission } from './utils/mapUtils.js';

// Configuration des paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = 'uploads';

// Variables globales pour l'état du système
let currentMapData = null;
let currentRobotPosition = { x: 0, y: 0 };
let currentTrajectory = [];
let activeMissions = new Map();

// Création du dossier uploads s'il n'existe pas
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Initialisation d'Express
const app = express();
const port = 3001;
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Configuration du serveur
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Base de données connectée');

    // Middlewares
    app.use(express.json({ limit: '50mb' }));
    app.use(cors({
      origin: ['http://localhost:8100', 'http://localhost:3001', 'ws://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    }));
    app.use(bodyParser.json());
    app.use(express.static(join(__dirname)));

    // Initialisation MQTT avec WebSocket
    console.log('🚀 Configuration des handlers MQTT');
    setupMQTTHandlers(wss);

    // Gestion des connexions WebSocket
    wss.on('connection', (ws) => {
      console.log('✅ Nouveau client WebSocket connecté');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'trajectory_update') {
            console.log('📩 Trajectoire reçue:', data.trajectory);
            currentTrajectory = data.trajectory;
            
            // Mettre à jour la carte avec la nouvelle trajectoire
            if (currentMapData) {
              await updateMapWithTrajectory(currentMapData, currentRobotPosition, currentTrajectory);
              
              // Envoyer la mise à jour à tous les clients
              broadcastMapUpdate();
            }
          }
          
          // Autres types de messages WebSocket...
          if (data.type === 'request_map_update') {
            broadcastMapUpdate();
          }
          
        } catch (error) {
          console.error('❌ Erreur traitement message WebSocket:', error);
        }
      });

      ws.on('close', () => {
        console.log('ℹ️ Client WebSocket déconnecté');
      });
    });

    // Routes
    app.use('/api/user', userRoutes);
    app.use('/api/robot', robotRoutes);
    app.use('/api/map', mapRoutes);
    app.use('/api', moveRoutes);
    app.use('/api', slamRoutes);
    app.use('', imageRoutes);
    app.use('/api/robot', missionRoutes);
    app.use('/uploads', express.static(uploadDir));

    // Endpoints pour les cartes
    app.get('/map_live.png', (req, res) => {
      const filePath = join(__dirname, 'map_live.png');
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        res.status(404).json({ message: 'Fichier non trouvé' });
      }
    });

    app.get('/mission_map.png', (req, res) => {
      const filePath = join(__dirname, 'mission_map.png');
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        res.status(404).json({ message: 'Carte de mission non trouvée' });
      }
    });

    // API pour récupérer l'état courant
    app.get('/api/current_state', (req, res) => {
      res.json({
        robotPosition: currentRobotPosition,
        trajectory: currentTrajectory,
        activeMissions: Array.from(activeMissions.entries())
      });
    });

    // Tâche périodique
    setInterval(() => {
      console.log('🔄 Mise à jour du statut des robots');
      updateRobotStatus();
    }, 3000);

    // Gestion des erreurs
    app.use((err, req, res, next) => {
      console.error('❌ Erreur serveur:', err.stack);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    });

    // Démarrage du serveur
    server.listen(port, () => {
      console.log(`✅ Serveur HTTP sur http://localhost:${port}`);
      console.log(`✅ Serveur WebSocket sur ws://localhost:${port}`);
    });
  } catch (err) {
    console.error('❌ Échec du démarrage du serveur:', err);
    process.exit(1);
  }
};

// Fonctions utilitaires
async function updateMapWithTrajectory(mapData, robotPosition, trajectory) {
  try {
    await convertMapToPGMMission(mapData, 'mission_map.pgm', robotPosition, trajectory);
    await convertPGMtoPNGMission('mission_map.pgm', 'mission_map.png');
    console.log('🗺️ Carte mise à jour avec la trajectoire');
  } catch (error) {
    console.error('❌ Erreur mise à jour carte:', error);
  }
}

function broadcastMapUpdate() {
  const updateMessage = JSON.stringify({
    type: 'map_update',
    data: { 
      url: '/mission_map.png',
      timestamp: Date.now(),
      trajectory: currentTrajectory
    }
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(updateMessage);
    }
  });
}

startServer();