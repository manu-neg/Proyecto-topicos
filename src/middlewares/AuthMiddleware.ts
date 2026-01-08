import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const verifyToken = (req: Request, res: Response, next: NextFunction): boolean => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        res.status(401).json({ message: 'Acceso denegado. Falta el header Authorization.' });
        return false;
    }
    

    //El formato viene como "Bearer <token>"
    // Usamos .split(' ') para separar por el espacio y tomar la segunda parte (el token)
    const token = authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'Acceso denegado. Formato de token inválido.' });
        return false;
    }

    try {
        const secret = process.env.JWT_SECRET || 'secret';
        const verified = jwt.verify(token, secret);
        
        (req as any).user = verified;
        next(); 
        return true;
    } catch (error) {
        res.status(400).json({ message: 'Token inválido o expirado' });
        return false;
    }
};