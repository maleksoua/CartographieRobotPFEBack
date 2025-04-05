import express from 'express';
import multer from 'multer';
import {
  saveMap,
  getMapFileById,
  deleteMapFile,
  addMapFile,
  fetchMapList,
  updateMap,
  sendMap,
  getMapsList,
} from '../controllers/mapController.js';
import { getConnection } from '../config/database.js'; // Import getConnection instead of conn
import { saveLiveMapNoRobot } from '../controllers/mapController.js';
const router = express.Router();

// Configuration de Multer pour les fichiers temporaires
const upload = multer({ dest: 'uploads/' }); // Dossier temporaire pour les fichiers

// Routes
router.get('/maps', async (req, res) => {
  try {
    const conn = getConnection(); // Use the getter function to access conn
    const maps = await getMapsList(conn); // Pass conn to getMapsList
    res.status(200).json(maps);
  } catch (err) {
    console.error('❌ Error fetching maps:', err);
    res.status(500).json({ error: 'Failed to fetch maps' });
  }
});

router.post('/envoyer/:idMap', sendMap); // Utilise directement sendMap

router.post('/upload', upload.single('image'), addMapFile); // Utilise addMapFile pour streamer dans GridFS
router.get('/file/:id', getMapFileById); // Récupérer un fichier depuis GridFS
router.delete('/file/:id', deleteMapFile); // Supprimer un fichier depuis GridFS
router.get('/files', fetchMapList); // Lister les fichiers depuis GridFS
router.put('/update/file/:id', upload.single('file'), updateMap); // Mettre à jour un fichier dans GridFS
router.post('/save', saveMap); // Sauvegarder une carte (si nécessaire)
// Route to save live map without robot position
router.post('/save-live-map-no-robot', saveLiveMapNoRobot);
export default router;