Universidad Católica Andrés Bello
Prof. Italo Visconti
Tópicos Especiales de Programación

# Proyecto: API de Manipulación de Imágenes

## Información General

| Aspecto   | Detalle                               |
| --------- | ------------------------------------- |
| Valor     | 25% de la nota final                  |
| Modalidad | Equipos de 4 estudiantes              |
| Entrega   | Repositorio en GitHub + Documentación |

---

## Descripción del Proyecto

Desarrollar una **API REST** que ofrezca manipulación de imágenes como un servicio (Image Manipulation as a Service). La API permitirá a los usuarios autenticados subir imágenes y aplicar diversas transformaciones sobre ellas.

El proyecto integra conceptos fundamentales vistos durante el curso:
- Programación Orientada a Aspectos (AOP) para Cross-Cutting Concerns
- Inyección de Dependencias para desacoplar componentes
- Programación Genérica para reutilización de código
- Programación Asíncrona para operaciones de I/O
- Patrones de Diseño (Strategy, Decorator, Factory)

---

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Lenguaje | TypeScript (tipado estricto, sin `any`) |
| Framework API | Express.js |
| Procesamiento de Imágenes | Sharp (https://sharp.pixelplumbing.com/) |
| Base de Datos | MongoDB (para usuarios y, opcionalmente, logs) |
| Autenticación | JWT (JSON Web Tokens) |

### ¿Qué es un JWT?

JSON Web Token (JWT) es un estándar abierto (RFC 7519) que define una forma compacta y segura de transmitir información entre partes como un objeto JSON.

**Estructura de un JWT:**
Un token consta de tres partes separadas por puntos (`.`):
1. **Header**: Indica el algoritmo de firma (ej. HS256).
2. **Payload**: Contiene los "claims" o datos de la sesión (ej. `userId`, `email`, `expiración`).
3. **Signature**: Verifica que el token no haya sido modificado.

**Flujo en el Proyecto:**
1. El usuario hace login con email/password.
2. El servidor valida credenciales y genera un token firmado.
3. El cliente guarda el token y lo envía en el header `Authorization: Bearer <token>` en cada petición subsiguiente.
4. El servidor verifica la firma del token para permitir el acceso.

> El payload del JWT está codificado en Base64 pero **no encriptado**. Nunca guarden información sensible (como contraseñas) dentro del token.

---

## Requerimientos Funcionales

### RF1: Autenticación de Usuarios

El sistema debe permitir el registro e inicio de sesión de usuarios.

**Endpoints requeridos:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registrar nuevo usuario |
| POST | `/auth/login` | Iniciar sesión y obtener token JWT |

**Modelo de Usuario:**
```typescript
interface User {
  id: string;
  email: string;
  password: string; // Almacenar hasheado (bcrypt)
  createdAt: Date;
}
```

### RF2: Endpoints de Manipulación de Imágenes

Todos los endpoints de manipulación requieren autenticación mediante token JWT en el header `Authorization: Bearer <token>`.

**Endpoints requeridos (mínimo 4):**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| POST | `/images/resize` | Redimensionar imagen | `width`, `height`, `fit` (opcional) |
| POST | `/images/crop` | Recortar imagen | `left`, `top`, `width`, `height` |
| POST | `/images/format` | Convertir formato | `format` (jpeg, png, webp) |
| POST | `/images/rotate` | Rotar imagen | `angle` (90, 180, 270) |
| POST | `/images/filter` | Aplicar filtro | `filter` (blur, sharpen, grayscale) |

**Formato de Request:**
- Content-Type: `multipart/form-data`
- Campo de imagen: `image`
- Parámetros adicionales según endpoint

**Formato de Response:**
- Éxito: Imagen procesada como archivo descargable
- Error: JSON con mensaje de error y código HTTP apropiado

#### Contrato de API: Especificaciones Técnicas

**Códigos HTTP esperados:**

| Código | Situación |
|--------|----------|
| 200 | Operación exitosa |
| 400 | Parámetros inválidos o faltantes |
| 401 | Token JWT ausente o inválido |
| 413 | Archivo muy grande (excede límite) |
| 415 | Formato de imagen no soportado |
| 500 | Error interno del servidor |

**Formatos de entrada soportados:**
- JPEG/JPG
- PNG
- WebP
- AVIF
- TIFF

**Límite de tamaño:** Máximo 10MB por imagen.

**Response de imagen exitosa:**
- Content-Type: `image/jpeg`, `image/png`, o `image/webp` (según formato de salida)
- Content-Disposition: `attachment; filename="processed-image.ext"` (opcional pero recomendado)
- Body: Archivo binario de la imagen procesada

**Response de error (JSON):**
```json
{
  "error": "Descripción del error",
  "code": "ERROR_CODE",
  "timestamp": "2024-12-27T10:30:00Z"
}
```

### RF3: Operaciones Combinadas (Opcional/Bonus)

Permitir aplicar múltiples transformaciones en una sola petición:

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/images/pipeline` | Aplicar secuencia de transformaciones |

**Ejemplo de body:**
```json
{
  "operations": [
    { "type": "resize", "params": { "width": 800 } },
    { "type": "grayscale" },
    { "type": "format", "params": { "format": "webp" } }
  ]
}
```

---

## Requerimientos No Funcionales (AOP)

Los siguientes aspectos deben implementarse utilizando técnicas de Programación Orientada a Aspectos, específicamente mediante el patrón **Decorator**.

### RNF1: Seguridad (Aspecto de Autenticación)

- Todas las rutas de manipulación de imágenes deben estar protegidas
- Verificar token JWT antes de procesar cualquier petición
- Implementar como un Decorator que envuelva los handlers

**Concepto clave:** El código de verificación de token NO debe estar mezclado con la lógica de negocio.

### RNF2: Logging (Aspecto de Auditoría)

El sistema debe registrar todas las operaciones realizadas.

**Información a registrar:**
- Timestamp
- Nivel de log (`info` para operaciones exitosas, `error` para fallos)
- Usuario (email o ID)
- Endpoint accedido
- Parámetros de la operación
- Tiempo de ejecución
- Resultado (éxito/error)
- Mensaje de error (si aplica)

**Implementación mediante Inyección de Dependencias:**

```typescript
interface ILogger {
  log(entry: LogEntry): Promise<void>;
}

class FileLogger implements ILogger {
  async log(entry: LogEntry): Promise<void> {
    // Escribir en archivo .log
  }
}

class MongoLogger implements ILogger {
  async log(entry: LogEntry): Promise<void> {
    // Guardar en colección de MongoDB
  }
}

class CompositeLogger implements ILogger {
  constructor(private loggers: ILogger[]) {}
  
  async log(entry: LogEntry): Promise<void> {
    await Promise.all(this.loggers.map(l => l.log(entry)));
  }
}
```

El logging debe implementarse como un Decorator que envuelva los handlers de imagen.

**Formato del archivo de log:**
- Ubicación: `logs/app.log` (crear carpeta si no existe)
- Formato: JSON Lines (una línea JSON por evento)
- Ejemplo de entrada:
```json
{"timestamp":"2024-12-27T10:30:00Z","level":"info","user":"user@example.com","endpoint":"/images/resize","params":{"width":800,"height":600},"duration":234,"result":"success"}
{"timestamp":"2024-12-27T10:31:15Z","level":"error","user":"user@example.com","endpoint":"/images/crop","params":{"left":0,"top":0},"duration":12,"result":"error","message":"Missing required parameter: width"}
```

---

## Arquitectura Sugerida

```
src/
├── index.ts                 # Punto de entrada
├── config/
│   └── database.ts          # Configuración MongoDB
├── models/
│   └── User.ts              # Modelo de usuario
├── routes/
│   ├── auth.routes.ts       # Rutas de autenticación
│   └── image.routes.ts      # Rutas de imágenes
├── handlers/
│   └── ImageHandler.ts      # Lógica de procesamiento
├── services/
│   ├── ImageService.ts      # Operaciones con Sharp
│   └── AuthService.ts       # Lógica de autenticación
├── decorators/
│   ├── AuthDecorator.ts     # Aspecto de seguridad
│   └── LoggingDecorator.ts  # Aspecto de logging
├── logging/
│   ├── ILogger.ts           # Interfaz de logging
│   ├── FileLogger.ts        # Implementación archivo
│   └── MongoLogger.ts       # Implementación MongoDB (opcional)
├── middleware/
│   └── upload.ts            # Configuración multer
└── types/
    └── index.ts             # Definiciones de tipos
```

---

## Conceptos del Curso a Aplicar

*Las implementaciones mostradas a continuación son solo ejemplos*
### 1. Programación Orientada a Aspectos

**Cross-Cutting Concerns a implementar:**
- Seguridad (verificación de JWT)
- Logging (registro de operaciones)

**Patrón Decorator para AOP:**
```typescript
interface IImageHandler {
  handle(request: ImageRequest): Promise<ImageResponse>;
}

class ResizeHandler implements IImageHandler {
  async handle(request: ImageRequest): Promise<ImageResponse> {
    // Solo lógica de negocio: redimensionar imagen
  }
}

class AuthDecorator implements IImageHandler {
  constructor(private inner: IImageHandler, private authService: AuthService) {}
  
  async handle(request: ImageRequest): Promise<ImageResponse> {
    await this.authService.verifyToken(request.token);
    return this.inner.handle(request);
  }
}

class LoggingDecorator implements IImageHandler {
  constructor(private inner: IImageHandler, private logger: ILogger) {}
  
  async handle(request: ImageRequest): Promise<ImageResponse> {
    const start = Date.now();
    try {
      const result = await this.inner.handle(request);
      await this.logger.log({ /* éxito */ });
      return result;
    } catch (error) {
      await this.logger.log({ /* error */ });
      throw error;
    }
  }
}

// Composición (en el punto de entrada o factory)
const handler = new LoggingDecorator(
  new AuthDecorator(
    new ResizeHandler(),
    authService
  ),
  logger
);
```

### 2. Inyección de Dependencias

Las dependencias deben inyectarse por constructor, no crearse dentro de las clases:

```typescript
// MAL: Acoplamiento fuerte
class ImageHandler {
  private logger = new FileLogger(); // Dependencia hardcodeada
}

// BIEN: Inyección de dependencias
class ImageHandler {
  constructor(private logger: ILogger) {} // Dependencia inyectada
}
```

Esto permite cambiar fácilmente entre `FileLogger` y `MongoLogger` sin modificar el código de los handlers.

### 3. Programación Genérica

Utilizar tipos genéricos para estructuras reutilizables:

```typescript
// Respuesta genérica de la API
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

// Uso
type ImageApiResponse = ApiResponse<Buffer>;
type AuthApiResponse = ApiResponse<{ token: string }>;
```

### 4. Programación Asíncrona

Todas las operaciones de I/O deben manejarse de forma asíncrona:

```typescript
class ImageService {
  async resize(buffer: Buffer, width: number, height: number): Promise<Buffer> {
    return await sharp(buffer)
      .resize(width, height)
      .toBuffer();
  }
}

class FileLogger implements ILogger {
  async log(entry: LogEntry): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    await fs.promises.appendFile('app.log', line);
  }
}
```

### 5. Patrón Strategy (Patrones/Strategy)

Usar Strategy para las diferentes operaciones de imagen:

```typescript
interface IImageOperation {
  execute(buffer: Buffer, params: OperationParams): Promise<Buffer>;
}

class ResizeOperation implements IImageOperation {
  async execute(buffer: Buffer, params: ResizeParams): Promise<Buffer> {
    return sharp(buffer).resize(params.width, params.height).toBuffer();
  }
}

class GrayscaleOperation implements IImageOperation {
  async execute(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer).grayscale().toBuffer();
  }
}

// Factory para obtener la operación correcta
class OperationFactory {
  private operations: Map<string, IImageOperation>;
  
  getOperation(type: string): IImageOperation {
    const op = this.operations.get(type);
    if (!op) throw new Error(`Unknown operation: ${type}`);
    return op;
  }
}
```

---

## Criterios de Evaluación

| Criterio | Peso | Descripción |
|----------|------|-------------|
| Funcionalidad | 30% | Los endpoints funcionan correctamente |
| Aplicación de AOP | 25% | Uso correcto de Decorators para aspectos |
| Inyección de Dependencias | 15% | Desacoplamiento mediante interfaces |
| Calidad del Código | 15% | Tipado estricto, organización, legibilidad |
| Documentación | 10% | README con instrucciones claras |
| Extras/Creatividad | 5% | Funcionalidades adicionales, manejo de errores robusto |

---

## Pruebas de la API

Para verificar el funcionamiento de los endpoints, se pueden utilizar diversas herramientas de prueba de APIs. Se recomienda el uso de:
- **Insomnia**
- **Postman**
- **Bruno** (FOSS)
- **curl** (cli)

---

## Entregables y Documentación

Es obligatorio documentar el proyecto adecuadamente para facilitar su revisión.

1. **Repositorio GitHub** con:
   - Código fuente completo y organizado
   - `.gitignore` apropiado
   - Archivo `.env.example` con las variables requeridas

2. **README.md (Obligatorio)** que incluya:
   - Descripción general del proyecto
   - Instrucciones detalladas de instalación y ejecución
   - Listado de variables de entorno necesarias
   - Documentación de todos los endpoints (método, ruta, parámetros, ejemplos)
   - Ejemplos de uso con `curl`, Postman, Insomnia o Bruno

3. **Colección de Pruebas** (opcional):
   - Exportación de la colección de Postman, Insomnia o Bruno en la raíz del proyecto.

---

## Recursos de Apoyo

### Documentación Sharp
- Guía oficial: https://sharp.pixelplumbing.com/
- Resize: https://sharp.pixelplumbing.com/api-resize
- Operations: https://sharp.pixelplumbing.com/api-operation

### Librerías Sugeridas

Preferiblemente usar las versiones más recientes compatibles con TypeScript.

#### Dependencias de Producción

| Librería | Descripción |
|----------|------------|
| `express` | Framework web minimalista para construir la API REST |
| `sharp` | Librería de alto rendimiento para procesamiento de imágenes |
| `mongoose` | ODM (Object Data Mapper) para MongoDB, facilita operaciones con la BD |
| `jsonwebtoken` | Generación y verificación de tokens JWT para autenticación |
| `bcryptjs` | Hashing seguro de contraseñas con algoritmo bcrypt |
| `multer` | Middleware para manejo de uploads de archivos (multipart/form-data) |
| `dotenv` | Carga de variables de entorno desde archivo `.env` |

#### Dependencias de Desarrollo

| Librería | Descripción |
|----------|------------|
| `typescript` | Lenguaje principal del proyecto, tipado estricto |
| `@types/express` | Definiciones de tipos TypeScript para Express |
| `@types/jsonwebtoken` | Definiciones de tipos TypeScript para jsonwebtoken |
| `@types/bcryptjs` | Definiciones de tipos TypeScript para bcryptjs |
| `@types/multer` | Definiciones de tipos TypeScript para multer |
| `@types/node` | Definiciones de tipos TypeScript para Node.js (APIs nativas) |
| `ts-node-dev` | Ejecutor de TypeScript con hot-reload para desarrollo |

---

## Preguntas Frecuentes

**P: ¿Puedo usar otra librería de procesamiento de imágenes?**
R: No. El proyecto requiere específicamente Sharp debido a su rendimiento y soporte nativo de TypeScript.

**P: ¿Es obligatorio implementar ambos tipos de logger (archivo y MongoDB)?**
R: El FileLogger es obligatorio. El MongoLogger es opcional pero demuestra mejor comprensión de la inyección de dependencias.

**P: ¿Cuántos endpoints de imagen debo implementar?**
R: Mínimo 4 de los listados. Pueden agregar más para puntos extra.

**P: ¿Puedo usar decoradores nativos de TypeScript (@decorator)?**
R: Pueden explorarlos, pero el enfoque principal debe ser el patrón Decorator a nivel de clases (como se vio en clases).

**P: ¿Cómo almaceno las imágenes procesadas?**
R: No es necesario almacenarlas. El flujo es: recibir imagen -> procesar -> devolver resultado. Si desean agregar almacenamiento como feature extra, pueden hacerlo.