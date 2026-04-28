# Aqua Stock System - Backend API

![Version](https://img.shields.io/badge/version-0.0.1-blue.svg?cacheSeconds=2592000)
![NestJS](https://img.shields.io/badge/NestJS-11.0-e0234e.svg)
![Prisma](https://img.shields.io/badge/Prisma-6.19-2d3748.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-336791.svg)

## 📖 1. Descripción general del proyecto

Este es el sistema backend de la **Distribuidora Mayorista**, denominado **Aqua Stock System**. Es una API REST robusta encargada de gestionar los aspectos medulares del negocio: productos, categorías, marcas, proveedores, clientes, operaciones de compra/venta, flujo de caja (pagos), stock y generación de reportes operativos.

## 🛠 2. Tecnologías utilizadas

* **Framework:** [NestJS](https://nestjs.com/) (v11)
* **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
* **ORM:** [Prisma](https://www.prisma.io/) (v6)
* **Base de Datos:** PostgreSQL
* **Autenticación:** JWT (Passport)
* **Testing:** Jest / Supertest
* **Linter/Formatter:** ESLint / Prettier

## 🚀 3. Instrucciones de instalación y ejecución

### Prerrequisitos

* Node.js (v18 o superior recomendado)
* PostgreSQL en ejecución o Docker
* NPM o Yarn

### Instalación

1. Clona el repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd aquastocksystem---Backend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno (Ver sección Variables de Entorno).

4. Aplica las migraciones de base de datos a través de Prisma:
   ```bash
   npx prisma migrate dev
   # o
   npx prisma db push
   ```

### Ejecución

```bash
# Modo desarrollo (watch mode)
npm run start:dev

# Modo producción
npm run build
npm run start:prod

# Abrir Prisma Studio para ver la base de datos visualmente
npx prisma studio
```

## 📂 4. Estructura del proyecto

La arquitectura del proyecto sigue el esquema modular de NestJS.

```text
src/
├── auth/         # Autenticación y autorización (Login, Token, JWT)
├── categories/   # Gestión de categorías de productos
├── prisma/       # Servicio inyectable para interactuar con Prisma ORM
├── products/     # Gestión del catálogo de productos y precios
├── users/        # Gestión de cuentas de usuario del sistema (empleados/admins)
├── app.module.ts # Módulo principal de la aplicación
└── main.ts       # Punto de entrada y bootstrap
```
> **Nota:** Algunos módulos como ventas, stock, y reportes están en proceso de desarrollo/integración según los TODOs.

## 🔐 5. Autenticación

La API utiliza autenticación basada en tokens JWT estándar. Los tokens deben ser enviados en los headers de cada request protegido:
```http
Authorization: Bearer <tu_token_jwt>
```

**Endpoints de Autenticación (`/auth`):**

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Inicia sesión y devuelve un token JWT. |
| `POST` | `/auth/logout` | Invalida la sesión actual (del lado del cliente). |
| `GET` | `/auth/me` | Devuelve los datos del perfil del usuario logueado. |

## 📡 6. Documentación de Endpoints

### 📦 Productos (`/productos`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/productos` | Lista todos los productos. |
| `GET` | `/productos/{id}` | Obtiene detalle de un producto por ID. |
| `POST` | `/productos` | Crea un nuevo producto. |
| `PUT` | `/productos/{id}` | Actualiza el producto (reemplazo completo o sustancial). |
| `PATCH`| `/productos/{id}` | Actualiza parcialmente un producto. |
| `DELETE`| `/productos/{id}` | Realiza un soft o hard delete del producto. |

### 🏷 Categorías (`/categorias`) y Marcas (`/marcas`)
| Método | Endpoint (Categorías) | Endpoint (Marcas) | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/categorias` | `/marcas` | Lista todos los registros. |
| `GET` | `/categorias/{id}` | `/marcas/{id}` | Obtiene un registro por ID. |
| `POST` | `/categorias` | `/marcas` | Crea un nuevo registro. |
| `PUT` | `/categorias/{id}` | `/marcas/{id}` | Actualiza un registro existente. |
| `DELETE`| `/categorias/{id}`| `/marcas/{id}` | Elimina el registro por ID. |

### 🚚 Proveedores (`/proveedores`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/proveedores` | Lista todos los proveedores. |
| `GET` | `/proveedores/{id}` | Obtiene detalle de un proveedor por ID. |
| `POST` | `/proveedores` | Crea un nuevo proveedor. |
| `PUT` | `/proveedores/{id}` | Actualiza información del proveedor. |
| `DELETE`| `/proveedores/{id}` | Elimina un proveedor. |
| `GET` | `/proveedores/{id}/compras`| Lista el historial de compras realizadas al proveedor. |

### 🤝 Clientes (`/clientes`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/clientes` | Lista todos los clientes. |
| `GET` | `/clientes/{id}` | Obtiene detalle de un cliente por ID. |
| `POST` | `/clientes` | Crea un nuevo cliente. |
| `PUT` | `/clientes/{id}` | Actualiza información del cliente. |
| `DELETE`| `/clientes/{id}` | Elimina un cliente por su ID. |
| `GET` | `/clientes/{id}/ventas` | Historial de compras (ventas) realizadas al cliente. |
| `GET` | `/clientes/{id}/pagos` | Historial de pagos que ha emitido el cliente. |
| `GET` | `/clientes/{id}/cuenta-corriente` | Estado consolidado de la deuda/saldo del cliente. |

### 🛒 Compras (`/compras`) y Ventas (`/ventas`)
| Método | Endpoint (Compras) | Endpoint (Ventas) | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/compras` | `/ventas` | Lista las operaciones. |
| `GET` | `/compras/{id}` | `/ventas/{id}` | Detalle de cabecera de la operación. |
| `POST` | `/compras` | `/ventas` | Crea una nueva operación de compra/venta. |
| `PUT` | `/compras/{id}` | `/ventas/{id}` | Actualiza el estado o info de la operación. |
| `GET` | `/compras/{id}/detalle` | `/ventas/{id}/detalle`| Lista los ítems/líneas de la operación. |
| `POST` | `/compras/{id}/detalle` | `/ventas/{id}/detalle`| Agrega un nuevo ítem a la operación. |

### 💰 Pagos (`/pagos`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/pagos` | Lista todos los movimientos de pago. |
| `GET` | `/pagos/{id}` | Detalle de un pago específico. |
| `POST` | `/pagos` | Registra el ingreso de un nuevo pago. |

### 🏭 Stock (`/stock`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/stock` | Lista consolidada de inventario de todos los productos. |
| `GET` | `/stock/{id_producto}`| Consulta de stock de un solo producto. |
| `GET` | `/stock/movimientos` | Historial de entradas/salidas de inventario general. |
| `GET` | `/stock/movimientos/{id}`| Detalle de un movimiento de stock específico. |

### 👥 Usuarios (`/usuarios`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/usuarios` | Lista de empleados o usuarios del sistema. |
| `GET` | `/usuarios/{id}` | Detalle de un usuario específico. |
| `POST` | `/usuarios` | Alta de un nuevo usuario administrador/empleado. |
| `PUT` | `/usuarios/{id}` | Modifica datos/rol del usuario. |
| `DELETE`| `/usuarios/{id}` | Bloquea (inactiva) o borra un usuario. |

### 📊 Reportes (`/reportes`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/reportes/ventas` | Resumen de ventas (por rango de fechas, cajero, etc.). |
| `GET` | `/reportes/productos-mas-vendidos`| Top N de productos con mayor rotación. |
| `GET` | `/reportes/stock-bajo` | Productos por debajo del punto de pedido / `minStock`. |
| `GET` | `/reportes/deuda-clientes` | Listado consolidado de saldos pendientes de clientes. |

---

## 📝 7. Ejemplos de Request / Response

### Ejemplo 1: Creación de Producto (`POST /productos`)
**Request Header:** `Authorization: Bearer eyJhbG...`
**Request Body (`application/json`):**
```json
{
  "name": "Agua Mineral Villavicencio 2L",
  "description": "Agua mineral natural sin gas",
  "categoryId": 1,
  "brandId": 3,
  "barcode": "7798123456789",
  "purchasePrice": 350.50,
  "sellingPrice": 600.00,
  "minStock": 50
}
```

**Response (`201 Created`):**
```json
{
  "id": 142,
  "name": "Agua Mineral Villavicencio 2L",
  "categoryId": 1,
  "brandId": 3,
  "purchasePrice": "350.50",
  "sellingPrice": "600.00",
  "isActive": true,
  "createdAt": "2026-04-27T14:00:00.000Z",
  "brand": {
      "id": 3,
      "name": "Villavicencio"
  }
}
```

### Ejemplo 2: Registrar una Venta (`POST /ventas`)
**Request Body (`application/json`):**
```json
{
  "customerId": 85,
  "paymentMethod": "CASH",
  "items": [
    {
      "productId": 142,
      "quantity": 2,
      "unitPrice": 600.00
    }
  ]
}
```
*Nota*: El campo total y subtotal es procesado internamente por el backend.

**Response (`201 Created`):**
```json
{
  "id": 5092,
  "customerId": 85,
  "date": "2026-04-27T14:30:15.000Z",
  "total": "1200.00",
  "status": "COMPLETED",
  "paymentMethod": "CASH",
  "saleItems": [
    {
      "id": 19400,
      "productId": 142,
      "quantity": 2,
      "subtotal": "1200.00"
    }
  ]
}
```

## 🚨 8. Manejo de Errores

El sistema utiliza las excepciones HTTP estándar de NestJS, garantizando una misma estructura en caso de fallos. El formato sugerido y usual devuelto por validaciones automáticas (`ValidationPipe`) es:

```json
{
  "message": [
    "categoryId must be an integer number",
    "sellingPrice should not be empty"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Códigos de Estado más utilizados:**
* `200 OK` / `201 Created` - Exitoso.
* `400 Bad Request` - Errores de validación en DTOs o lógica de negocio inválida.
* `401 Unauthorized` - Token inválido o ausente.
* `403 Forbidden` - El usuario no tiene rol suficiente para la acción.
* `404 Not Found` - El recurso (ej: id de producto) no existe.
* `500 Internal Server Error` - Error inesperado en el servidor/BD.

## 🔐 9. Variables de Entorno

Deberás crear un archivo `.env` en la raíz del proyecto para la configuración de despliegue.

```env
# Ejemplo de .env
PORT=3000
NODE_ENV=development

# Configuración de Base de Datos
DATABASE_URL="postgresql://user:password@localhost:5432/aquastock?schema=public"

# Tokens JWT
JWT_SECRET="una_clave_secreta_super_segura"
JWT_EXPIRATION="1d"
```

## 📌 10. Estado del Proyecto / TODOs

**Estado:** En desarrollo activo (Arquitectura Base e Integración de Prisma completados. Endpoints Core de Auth y CRUD básico establecidos).

**Próximos pasos a implementar (TODOs):**
- [ ] Completar Controladores y Servicios de compras/ventas.
- [ ] Implementar trigger o lógica fuerte transaccional para actualizar stock automáticamente post-venta.
- [ ] Diseñar el módulo integral de reportes consolidados (pagos vs deudas).
- [ ] Incorporar Roles y Permisos estrictos con Guards de NestJS en todos los endpoints de manipulación de catálogo y finanzas.
- [ ] Documentación con Swagger/OpenAPI.
