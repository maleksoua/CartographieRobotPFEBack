import express from 'express';
import { startSLAM } from '../controllers/slamController.js';

const router = express.Router();

// Route pour démarrer SLAM
router.post('/start-slam', startSLAM);

export default router;