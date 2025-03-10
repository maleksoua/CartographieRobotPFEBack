import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join} from 'path';
import fs from 'fs';
import cors from 'cors';
import connectDB from './config/database.js';
import './Handlers/mqttHandler.js';
import robotRoutes from './routes/robotRoutes.js';
import mapRoutes from './routes/mapRoutes.js';
import moveRoutes from './routes/moveRoutes.js';
import userRoutes from './routes/userRoutes.js';
import slamRoutes from './routes/slamRoutes.js';
import imageRoutes from './routes/imageRoutes.js'; 
import { setupMQTTHandlers } from './Handlers/mqttHandler.js';

// Obtenir __dirname dans un module ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = 'uploads';

// Ensure `uploads` directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
// Connexion à la base de données
connectDB();

// Configuration de l'application Express
const app = express();
const port = 3001;

app.use(express.json({ limit: '50mb' }));
// Middleware CORS
app.use(cors({
  origin: ['http://localhost:8100', 'http://localhost:3001'], // Plusieurs origines autorisées
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Méthodes HTTP autorisées
  credentials: true, // Si vous utilisez des cookies ou des sessions
}));
// Configuration MQTT
setupMQTTHandlers();

// Middleware pour parser le corps des requêtes
app.use(bodyParser.json());

// Servir les fichiers statiques
app.use(express.static(join(__dirname)));

// Endpoint pour servir l'image PNG
app.get('/map_live.png', (req, res) => {
  const filePath = join(__dirname, 'map_live.png');
  
  // Vérifier si le fichier existe
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

// Routes de l'API
app.use('/api/user', userRoutes);

app.use('/api/robot', robotRoutes);
app.use('/api/map', mapRoutes);
app.use('/api', moveRoutes);

app.use('/api', slamRoutes);
app.use('', imageRoutes);
app.use('/uploads', express.static(uploadDir));

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Démarrer le serveur
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
