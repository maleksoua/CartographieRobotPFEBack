import express from 'express';
import { sendMoveCommand } from '../controllers/moveController.js';

const router = express.Router();

router.post('/robot/move', sendMoveCommand);

export default router;