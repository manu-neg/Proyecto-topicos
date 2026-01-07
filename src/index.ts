import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/database';
import { AuthController } from './controllers/AuthController';
import { ImageController } from './services/ImageService';
import { verifyToken } from './middlewares/AuthMiddleware';
import { AuthDecorator } from './decorators/AuthDecorator';
import { LoggingDecorator } from './decorators/LoggingDecorator';
import { FileLogger } from './logging/FileLogger';
import { IImageHandler } from './types';


// Configuración
dotenv.config();
const app = express();
app.use(express.json()); // Para leer JSON bodies
app.use(cors({
  origin: '*',
}));

// Conectar Base de Datos
connectDB();

//Instancias
const logger = new FileLogger();

const pipelineHandler: IImageHandler = new LoggingDecorator(
  new AuthDecorator({ handle: ImageController.processRequestPipeline }),
  logger
);

const resizeHandler: IImageHandler = new LoggingDecorator(
  new AuthDecorator({ handle: ImageController.processResize }),
  logger
);

const cropHandler: IImageHandler = new LoggingDecorator(
  new AuthDecorator({ handle: ImageController.processCrop }),
  logger
);

const rotateHandler: IImageHandler = new LoggingDecorator(
  new AuthDecorator({ handle: ImageController.processRotate }),
  logger
);

const filterHandler: IImageHandler = new LoggingDecorator(
  new AuthDecorator({ handle: ImageController.processFilter }),
  logger
);

// TODO: reemplazar esta funcion con la validacion de tokens real
const validationFn = (req: express.Request): boolean => {
  let va: boolean = true;
  console.log("validation: ", va);
  return va;
};

// Rutas (Definirlas aquí directo para ir rápido por ahora)
const router = express.Router();
// Rutas Publicas (De autenticación)
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);

// Rutas Privadas (Disponibles despues de autenticas)

/*
router.post('/images/pipeline', verifyToken, ImageController.processRequestPipeline);
router.post('/images/resize', verifyToken, ImageController.processResize);
router.post('/images/crop', verifyToken, ImageController.processCrop);
router.post('/images/rotate', verifyToken, ImageController.processRotate);
router.post('/images/filter', verifyToken, ImageController.processFilter);
*/

router.post('/images/pipeline', (req, res) => pipelineHandler.handle(req, res));
router.post('/images/resize', (req, res) => resizeHandler.handle(req, res));
router.post('/images/crop', (req, res) => cropHandler.handle(req, res));
router.post('/images/rotate', (req, res) => rotateHandler.handle(req, res));
router.post('/images/filter', (req, res) => filterHandler.handle(req, res));


app.use('/api', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});