import express from 'express';

import {saveMap ,getMapFileById,deleteMapFile,addMapFile,fetchMapList,updateMap} from '../controllers/mapController.js';

import multer from 'multer';

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.post('/upload', upload.single('file'), addMapFile);


router.get('/file/:id', getMapFileById);
router.delete('/file/:id', deleteMapFile);
router.get('/files', fetchMapList);
router.put('/update/file/:id', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: 'File upload failed.' });
      }
      next();
    });
  }, updateMap);
router.post('/save', saveMap);

export default router;