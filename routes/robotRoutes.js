import express from 'express';
import { getRobotIPs,getLatestPosition,create,deleteRobot,update,fetch,addConnectedRobot} from '../controllers/robotController.js';

const router = express.Router();

router.get('/robot_ips', getRobotIPs);
// Route pour récupérer la dernière position du robot
router.get('/latest', getLatestPosition);
router.put('/addConnectedRobot/:id',addConnectedRobot)
router.post('/create',create);
router.delete('/delete/:id',deleteRobot);
router.put('/update/:id',update);
router.get('/fetch',fetch);

export default router;

