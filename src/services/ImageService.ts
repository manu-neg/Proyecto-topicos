import sharp, {Sharp} from 'sharp';

const SUPPORTED_OPERATIONS: string[] = [
    'resize',
    'crop',
    'format',
    'rotate',
    'filter'
];

interface IImageOperation {
    execute(): Promise<Sharp>;
}

class ImageOperation implements IImageOperation {
    constructor(
        protected readonly decoratee: IImageOperation | null,
        protected readonly inputBuffer: Buffer | null,
        protected readonly parameters: Record<string, any>
    ) {
        if (!this.decoratee && !this.inputBuffer) {
            throw new Error('Either decoratee or inputBuffer must be provided.');
        }
    }

    async execute(): Promise<Sharp> { throw new Error('Method not implemented.'); }

    private validateInputs(): asserts this is { inputBuffer: Buffer } {
        if (!this.inputBuffer) throw new Error('Input buffer is required for the first operation.');
    }

    async getInput(): Promise<Sharp> {
        if (this.decoratee) {
            return await this.decoratee!.execute();
        }
        this.validateInputs(); // Validate 
        return sharp(this.inputBuffer);
    }
}

interface TImageHandler<TImageResult> {
    handle(parameterObject: ImageOperation): Promise<TImageResult>;
}

class ResizeOperation extends ImageOperation {
    async execute(): Promise<Sharp> {
        let image = await this.getInput();

        try {
            return image
                .resize(
                    this.parameters.get('width') || null,
                    this.parameters.get('height') || null,
                    { fit: 'cover' }
                );
        } catch (error) {
            return image;
        }   
    }
}

class CropOperation extends ImageOperation {
    async execute(): Promise<Sharp> {
        let image = await this.getInput();
        try {
            return image
                .resize(
                    this.parameters.get('width'),
                    this.parameters.get('height'),
                    { fit: 'cover', position: 'centre' }
                    // TODO: ( left, top ) Reqs?
                );        
        } catch (error) {
            return image;
        }      
    }
}


class FormatOperation extends ImageOperation {
    async execute(): Promise<Sharp> {
        let image = await this.getInput();
        try {
            return image
                .toFormat(this.parameters.get('format'));
        } catch (error) {
            return image;
        }
    }
}


class RotateOperation extends ImageOperation {
    async execute(): Promise<Sharp> {
        let image = await this.getInput();
        try {
            return image
                .rotate(this.parameters.get('angle') || 0);
        } catch (error) {
            return image;
        }
    }
}

class FilterOperation extends ImageOperation {
    async execute(): Promise<Sharp> {
        let image = await this.getInput();
        try {
            switch (this.parameters.get('filterType')) {
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
            return image;
        }
    }
}

class ImageOperationFactory {
    static parseOperationObject(data: Record<string, any>, prev?: ImageOperation, imageBuf?: Buffer): ImageOperation | undefined {
        
        // Parse the operation into a concrete object
        /* Example data (Pipeline with individual operations):
        {
            "operations": [
                { "type": "resize", "params": { "width": 800 } },
                { "type": "grayscale" },
                { "type": "format", "params": { "format": "webp" } }
            ]
        }
        */
       if (Object.prototype.hasOwnProperty.call(data, 'type')) {
            const operationType = data.type.toLowerCase();
            let parameters;   
            if (SUPPORTED_OPERATIONS.includes(operationType) &&
                Object.prototype.hasOwnProperty.call(data, 'params')) {
                    parameters = data.params;
            }
            switch (operationType) {
                case 'resize':
                    return new ResizeOperation(null, null, parameters);
                case 'crop':
                    return new CropOperation(null, null, parameters);
                case 'format':
                    return new FormatOperation(null, null, parameters);
                case 'rotate':
                    return new RotateOperation(null, null, parameters);
                case 'filter':
                    return new FilterOperation(null, null, parameters);
                default:
                    throw new Error(`Unsupported operation type: ${operationType}`);
            }
        }
    }
    static createOperation(data: Record<string, any>, image: Buffer): ImageOperation | undefined {
        // Verificar que la data sea por entrada de pipeline
        var result: ImageOperation | undefined;
        if (Object.prototype.hasOwnProperty.call(data, 'operations') && Array.isArray(data.operations)) {
            const operations: (ImageOperation | undefined)[] = Array.from(data.operations)
                .map((operationData: Record<string, any>, index: number, array: Record<string, any>[]) => {
                    let previousOperation: ImageOperation | undefined;
                    if (index > 0) previousOperation = operations[index - 1];
                    return ImageOperationFactory.parseOperationObject(operationData, previousOperation, image);
                });
            const filtered: ImageOperation[] = operations.filter((op): op is ImageOperation => op !== undefined);
            result = filtered.length > 0 ? filtered[filtered.length - 1] : undefined;
        } else {
            result = ImageOperationFactory.parseOperationObject(data, undefined, image);
        }
        return result;
    }
}

class ImageService implements TImageHandler<Buffer> {
    async handle(parameterObject: ImageOperation): Promise<Buffer> {
        let result: Sharp = await parameterObject.execute();
        return await result.toBuffer();
    }
}

class ImageController {
    // TODO: Tomar un request body y parsearlo para pasarlo a ImageService
}