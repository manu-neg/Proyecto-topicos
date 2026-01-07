import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export class AuthController {
  
  // POST /auth/register
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: 'El usuario ya existe' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = new User({ email, passwordHash });
      await newUser.save();

      res.status(201).json({ message: 'Usuario creado exitosamente' });
    } catch (error) {
      res.status(500).json({ message: 'Error en el servidor', error });
    }
  }

  // POST /auth/login
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        res.status(400).json({ message: 'Credenciales inválidas' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ message: 'Credenciales inválidas' });
        return;
      }

      // Generar JWT
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

      res.json({ token });
    } catch (error) {
      res.status(500).json({ message: 'Error en el servidor', error });
    }
  }
}