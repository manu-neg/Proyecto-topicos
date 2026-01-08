import { Request, Response } from 'express';
import sharp, {Sharp} from 'sharp';
import { ILogger } from '../types';
import { Timestamp } from '../logging/concreteLogger';



interface IImageOperation {
    execute(): Promise<Sharp>;
    run(): Promise<Sharp>;
    getSignature(): string;
}

class ImageOperation implements IImageOperation {
    constructor(
        protected readonly decoratee: IImageOperation | null,
        protected readonly inputBuffer: Buffer | null,
        protected readonly parameters: Record<string, any>,
        protected readonly logger?: Logger
    ) {
        if (!this.decoratee && !this.inputBuffer) {
            throw new Error('Either decoratee or inputBuffer must be provided.');
        }
    }

    getSignature(): string {
        return `${this.constructor.name}`;
    }

    protected log(message: string): void {
        if (this.logger) {
            this.logger.log(`[ ${this.getSignature()} ]:\t${message}`);
        }
    }

    async run(): Promise<Sharp> {
        this.log(`Starting operation with parameters ${JSON.stringify(this.parameters)}`);
        const result = await this.execute();
        this.log('Finished operation');
        return result;
    }

    async execute(): Promise<Sharp> { throw new Error('Method not implemented.'); }

    private validateInputs(): asserts this is { inputBuffer: Buffer } {
        if (!this.inputBuffer) throw new Error('Input buffer is required for the first operation.');
    }

    async getInput(): Promise<Sharp> {
        if (this.decoratee) {
            this.log('Calling inner function to obtain input');
            return await this.decoratee!.run();
        }
        this.validateInputs(); // Validate 
        return sharp(this.inputBuffer);
    }
}

class ResizeOperation extends ImageOperation {
    async execute(): Promise<Sharp> {
        let image = await this.getInput();
        try {
            return image
                .resize(
                    this.parameters.width || null,
                    this.parameters.height || null,
                    { fit: 'cover' }
                );
        } catch (error) {
            this.log(`Error: ${error}`);
            return image;
        }   
    }
}

class CropOperation extends ImageOperation {
    async execute(): Promise<Sharp> {
        let image = await this.getInput();
        let position;
        try {
            if (!this.parameters.position) {
                position = 'center';
            } else {
                position = this.parameters.position;
            }
            return image
                .resize(
                    this.parameters.width || null,
                    this.parameters.height || null,
                    { fit: 'cover', position: position}
                );        
        } catch (error) {
            this.log(`Error: ${error}`);
            return image;
        }      
    }
}


class FormatOperation extends ImageOperation {
    async execute(): Promise<Sharp> {
        let image = await this.getInput();
        try {
            return image
                .toFormat(this.parameters.format || 'png');
        } catch (error) {
            this.log(`Error: ${error}`);
            return image;
        }
    }
}


class RotateOperation extends ImageOperation {
    async execute(): Promise<Sharp> {
        let image = await this.getInput();
        try {
            return image
                .rotate(this.parameters.angle || 0);
        } catch (error) {
            this.log(`Error: ${error}`);
            return image;
        }
    }
}

class FilterOperation extends ImageOperation {
    async execute(): Promise<Sharp> {
        let image = await this.getInput();
        try {
            switch (this.parameters.filterType) {
                case 'grayscale':
                    return image.grayscale();
                case 'blur':
                    return image.blur();
                case 'sharpen':
                    return image.sharpen();
                default:
                    return image;

            }
        } catch (error) {
            this.log(`Error: ${error}`);
            return image;
        }
    }
}


type IOperationConstructorMethod = new (
    decoratee: IImageOperation | null,
    inputBuffer: Buffer | null,
    parameters: Record<string, any>,
    logger?: Logger
) => ImageOperation;

const SUPPORTED_OPERATIONS: Map<string, IOperationConstructorMethod> = new Map([
    ['resize', ResizeOperation],
    ['crop', CropOperation],
    ['format', FormatOperation],
    ['rotate', RotateOperation],
    ['filter', FilterOperation],
]);


class ImageOperationFactory {
    constructor(
        private readonly logger?: Logger
    ) {}

    protected log(message: string): void {
        this.logger?.log(`[ ${this.getSignature()} ]: ${message}`);
    }

    protected getSignature(): string {
        return `${this.constructor.name}`;
    } 

    parseOperationObject(data: Record<string, any>, prev?: ImageOperation, imageBuf?: Buffer): ImageOperation | undefined {
        
        // Parse the operation into a concrete object

       if (Object.prototype.hasOwnProperty.call(data, 'type')) {
            const operationType = data.type.toLowerCase();
            
            if (SUPPORTED_OPERATIONS.has(operationType) &&
                Object.prototype.hasOwnProperty.call(data, 'params')) {

                const operationConstructor = SUPPORTED_OPERATIONS.get(operationType);
                
                if (operationConstructor) {
                    this.log(`Creating operation of type: ${operationType}`);
                    
                    return new operationConstructor(
                        prev || null,
                        imageBuf || null,
                        data.params,
                        this.logger
                    );
                }
            }
        }
    }

    createOperation(data: Record<string, any>, image: Buffer): ImageOperation | undefined {
        // Verificar que la data sea por entrada de pipeline
        var result: ImageOperation | undefined;

        this.log('Creating operation from data');
        if (Object.prototype.hasOwnProperty.call(data, 'operations') && Array.isArray(data.operations)) {
            const operations: ImageOperation[] | undefined = [];
            let previousOperation: ImageOperation | undefined;
            data.operations
                .forEach((operationData: Record<string, any>, index: number, array: Record<string, any>[]) => {
                    let parsed = this.parseOperationObject(
                        operationData,
                        previousOperation,
                        previousOperation === undefined ? image : undefined
                    );
                    if (parsed) {
                        operations.push(parsed);
                        this.log(`Parsed: ${parsed.getSignature()}`);
                        previousOperation = parsed;
                    }
                });
            if (operations.length > 0) {
                result = operations[operations.length - 1];
            }
        } else {
            result = this.parseOperationObject(data, undefined, image);
        }
        return result;
    }
}

interface TImageService<T> {
    handle(parameterObject: ImageOperation): Promise<T>;
}

    

class ImageService implements TImageService<Buffer> {
    static instance: ImageService;
    private constructor(
        protected readonly operationalElement: ImageOperationFactory,
        protected readonly logger?: Logger,
    ) {}

    static getInstance(operationalElement: ImageOperationFactory, logger?: Logger): ImageService {
        if (!ImageService.instance) {
            ImageService.instance = new ImageService(operationalElement, logger);
        }        
        return ImageService.instance;
    }

    async handle(parameterObject: ImageOperation): Promise<Buffer> {
        this.log(`Starting: ${parameterObject.getSignature()}`);
        let result: Sharp = await parameterObject.run();
        return await result.toBuffer();
    }

    async doOperation(request: Record<string, any>, image: Buffer): Promise<Buffer> {
        const operation = this.operationalElement.createOperation(request, image);
        if (!operation) {
            this.log('No valid operation could be created from the request.');
            throw new Error('No valid operation could be created from the request.');
        } else {
            this.log(`Executing operation: ${operation.getSignature()}`);
            return await this.handle(operation);
        }
    }

    private log(message: string): void {
        this.logger?.log(`[ ${this.getSignature()} ]:\t${message}`);
    }

    private getSignature(): string {
        return `${this.constructor.name}`;
    }
    

}

interface Logger {
    log(message: string): void;
}

class ImageLogger implements Logger {
    static instance: ImageLogger;
    private constructor(protected logger: ILogger) {}
    static getInstance(base: (ILogger)): ImageLogger {
        if (!ImageLogger.instance) {
            ImageLogger.instance = new ImageLogger(base);
        }
        return ImageLogger.instance;
    }

    async log(message: string): Promise<void> {
        await this.logger.log(this.generateLogEntry(message));
    }

    generateLogEntry(message: string): Timestamp {
        return new Timestamp(
            new Date().toISOString(),
            'info',
            'system',
            'image-service',
            {},
            0,
            'success',
            message
        );
    }
}

class ImageController {

    static processSimpleRequest(type: string, loggingInstance: ILogger): (req: Request, res: Response) => Promise<void> {
        
        const instance: Logger = ImageLogger.getInstance(loggingInstance);
        const log: (message: string) => void = (message: string) => {
            Promise.resolve(instance.log(message));
        };
        log(`Processing simple request of type: ${type}`);
        
        return async (req: Request, res: Response): Promise<void> => {
            log('Processing image request at generated closure');
            let imageDecoded: Buffer = Buffer.from(req.body.image, 'base64');

            if (!imageDecoded || !SUPPORTED_OPERATIONS.has(type) || !req.body.params) {
                log('Invalid request data');
                res.status(400).json({ message: 'Bad Request' });
                return;
            } else {

                log('Creating operation object');
                let object: Request = {
                    body: {
                        type: type,
                        params: req.body.params,
                        image: imageDecoded
                    }
                } as Request;
                await ImageController.processRequestPipeline(object, res, loggingInstance);
                
            }
        }
    }

    static processResize = (loggingInstance: ILogger) => ImageController.processSimpleRequest('resize', loggingInstance);
    static processCrop = (loggingInstance: ILogger) => ImageController.processSimpleRequest('crop', loggingInstance);
    static processRotate = (loggingInstance: ILogger) => ImageController.processSimpleRequest('rotate', loggingInstance);
    static processFilter = (loggingInstance: ILogger) => ImageController.processSimpleRequest('filter', loggingInstance);
    static processPipeline = (loggingInstance: ILogger) => async (req: Request, res: Response): Promise<void> => ImageController.processRequestPipeline(req, res, loggingInstance);

    static parseRequestBody(req: Request, logger: Logger): [Record<string, any>, Buffer] {
        const log = (message: string) => { Promise.resolve(logger.log(message)); };
        log('Parsing request body');
        const body = req.body;

        if (body && body.image) {
            const imageBase64: string = body.image;
            const imageBuffer: Buffer = Buffer.from(imageBase64, 'base64');
            log('Request body parsed successfully');
            return [body, imageBuffer];
        } else {
            log('Invalid request body format');
            throw new Error('Invalid request body format');
        }

    }

    static async processRequestPipeline(req: Request, res: Response, loggingInstance: ILogger): Promise<void> {
        const logger = ImageLogger.getInstance(loggingInstance);
        const log = (message: string) => { Promise.resolve(logger.log(message)); };
        log('Processing image request');



        // let mock_image = await sharp({
        //     create: {
        //         width: 1000,
        //         height: 2000,
        //         channels: 4,
        //         background: { r: 255, g: 0, b: 0, alpha: 0.5 }
        //     }
        //     })
        //     .png()
        //     .toBuffer();

        // log(`Input buffer size: ${mock_image.length} bytes`);

        // Mock operations
        // let operation = { type: 'resize', params: { width: 100, height: 100 } };
        // let operation = {
        //     operations: [
        //         { type: 'resize', params: { width: 500, height: 500 } },
        //         { type: 'rotate', params: { angle: 90 } },
        //         ]
        // };

        let operation: Record<string, any>;
        let image: Buffer;
        try {
            [operation, image] = ImageController.parseRequestBody(req, logger);
        } catch (error) {
            log(`Error parsing request body: ${error}`);
            res.status(400).json({ message: 'Bad Request' });
            return;
        }


        const imageService = ImageService.getInstance(new ImageOperationFactory(logger), logger);
        
        if (!operation || !image) {
            log('No operation provided in request');
            res.status(400).json({ message: 'Bad Request' });
            return;
        }

        try {
            let result = await imageService.doOperation(operation, image);
            log(`Result buffer size: ${result.length} bytes`);
            res.status(200).json({ message: 'Image processed successfully', image: result.toString('base64') });
            return;

        } catch (error: Error | unknown) {
            log(`Error parsing operation: ${error}`);
            res.status(500).json({ message: 'Bad Request' });
            return;
        }
    }

}

export { ImageController };