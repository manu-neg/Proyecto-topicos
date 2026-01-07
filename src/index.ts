import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/database';
import { AuthController } from './controllers/AuthController';
import { ImageController } from './services/ImageService';
import { verifyToken } from './middlewares/AuthMiddleware';

// Configuración
dotenv.config();
const app = express();
app.use(express.json()); // Para leer JSON bodies
app.use(cors({
  origin: '*',
}));

// Conectar Base de Datos
connectDB();

// Rutas (Definirlas aquí directo para ir rápido por ahora)
const router = express.Router();
// Rutas Publicas (De autenticación)
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
// Rutas Privadas (Disponibles despues de autenticas)
router.post('/images/pipeline', verifyToken, ImageController.processRequestPipeline);
router.post('/images/resize', verifyToken, ImageController.processResize);
router.post('/images/crop', verifyToken, ImageController.processCrop);
router.post('/images/rotate', verifyToken, ImageController.processRotate);
router.post('/images/filter', verifyToken, ImageController.processFilter);

app.use('/api', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});