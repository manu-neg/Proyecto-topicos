import { Request, Response } from 'express';
import { ILogger } from '../types';
import { AuthLogger } from './AuthController';

type defaultEndpointHandler = (logger: ILogger) => (req: Request, res: Response) => Promise<void>;

type validationFunction = (req: Request, res: Response, next: (x: any) => void) => boolean;

export default class AuthEndpointValidator {
    static bind (
        handler: defaultEndpointHandler,
        validationFn: validationFunction,
        logger: ILogger
    ) : (req: Request, res: Response) => Promise<void> {
        const authLogger: AuthLogger = AuthLogger.getInstance(logger);


        return async (req: Request, res: Response): Promise<void> => {
            if (!validationFn(req, res, () => {})) {
                authLogger.log('Unauthorized access attempt detected.');
                res.status(401).json({ message: 'Invalid token' });
                return;
            } else {
                authLogger.log('Authorized access granted.');
                await handler(logger)(req, res);
            }
        };
    }
}