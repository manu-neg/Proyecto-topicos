import { Request, Response } from 'express';

type defaultEndpointHandler = (req: Request, res: Response) => Promise<void>;

type validationFunction = (r: Request) => boolean;

export default class AuthEndpointValidator {
    static bind (
        handler: defaultEndpointHandler,
        validationFn: validationFunction
    ) : defaultEndpointHandler {
        
        return async (req: Request, res: Response): Promise<void> => {

            if (!validationFn(req)) {
                res.status(401).json({ message: 'Invalid token' });
                return;
            } else {   
                await handler(req, res);
            }
        };
    }
}