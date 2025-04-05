import express from 'express';
import { sendPositionToMQTT } from '../controllers/MissionController.js';

const router = express.Router();

// Plus besoin de passer mqttClient comme argument
router.post('/move-to-position', sendPositionToMQTT);

export default router;