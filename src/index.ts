import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/database';
import { AuthController } from './controllers/AuthController';
import { ImageController } from './services/ImageService';
import AuthEndpointValidator from './controllers/AuthEndpointValidator';

// Configuración
dotenv.config();
const app = express();
app.use(express.json()); // Para leer JSON bodies
app.use(cors());

// Conectar Base de Datos
connectDB();

// TODO: reemplazar esta funcion con la validacion de tokens real
const validationFn = (req: express.Request): boolean => {
  let va: boolean = true;
  console.log("validation: ", va);
  return va;
};

// Rutas (Definirlas aquí directo para ir rápido por ahora)
const router = express.Router();
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/images/resize', AuthEndpointValidator.bind(ImageController.processResize, validationFn));
router.post('/images/crop', AuthEndpointValidator.bind(ImageController.processCrop, validationFn));
router.post('/images/rotate', AuthEndpointValidator.bind(ImageController.processRotate, validationFn));
router.post('/images/filter', AuthEndpointValidator.bind(ImageController.processFilter, validationFn));
router.post('/images/pipeline', AuthEndpointValidator.bind(ImageController.processRequestPipeline, validationFn));
app.use('/api', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});