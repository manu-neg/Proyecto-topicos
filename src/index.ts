import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/database';
import { AuthController } from './controllers/AuthController';
import { ImageController } from './services/ImageService';

// Configuración
dotenv.config();
const app = express();
app.use(express.json()); // Para leer JSON bodies
app.use(cors());

// Conectar Base de Datos
connectDB();

// Rutas (Definirlas aquí directo para ir rápido por ahora)
const router = express.Router();
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/images/', ImageController.processRequest);

app.use('/api', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});