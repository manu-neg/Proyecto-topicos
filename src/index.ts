import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/database';
import { AuthController } from './controllers/AuthController';
import { ImageController } from './services/ImageService';
import AuthEndpointValidator from './controllers/AuthEndpointValidator';
import { ConcreteLogger } from './logging/concreteLogger';
import { verifyToken } from './middlewares/AuthMiddleware';

// Configuración
dotenv.config();
const app = express();
app.use(express.json()); // Para leer JSON bodies
app.use(cors({
  origin: '*',
}));

export interface Logger {
    log(message: string): void;
}

// Conectar Base de Datos
connectDB();

//Instancias
const logger: ConcreteLogger = new ConcreteLogger();

const validationFn = verifyToken;

// Rutas (Definirlas aquí directo para ir rápido por ahora)
const router = express.Router();
// Rutas Publicas (De autenticación)
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);

// Rutas Privadas (Disponibles despues de autenticas)

router.post('/images/resize', AuthEndpointValidator.bind(ImageController.processResize, validationFn, logger));
router.post('/images/crop', AuthEndpointValidator.bind(ImageController.processCrop, validationFn, logger));
router.post('/images/rotate', AuthEndpointValidator.bind(ImageController.processRotate, validationFn, logger));
router.post('/images/filter', AuthEndpointValidator.bind(ImageController.processFilter, validationFn, logger));
router.post('/images/pipeline', AuthEndpointValidator.bind(ImageController.processPipeline, validationFn, logger));

app.use('/api', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});