import { Router } from 'express';
import { ImageController } from '../services/ImageService';
import { verifyToken } from '../middlewares/AuthMiddleware';

const router = Router();


router.post('/process', verifyToken, ImageController.processRequestPipeline);

export default router;