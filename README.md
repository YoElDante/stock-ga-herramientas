# 📦 Control de Stock

Sistema web básico para la gestión y control de inventario con soporte para archivos Excel.

## 📋 Descripción

Esta aplicación permite administrar el stock de productos a través de una interfaz web intuitiva. Los datos se almacenan en archivos Excel (.xlsx), facilitando la importación y exportación de información.

## ✨ Características

### Gestión de Productos
- ➕ Agregar nuevos productos
- ✏️ Editar productos existentes
- 🗑️ Eliminar productos
- 🔍 Búsqueda en tiempo real

### Importación y Exportación
- 📥 **Importar** archivos Excel (.xlsx, .xls) y CSV
- 💾 **Exportar** el stock actual a Excel con formato de moneda argentina
- Los archivos se guardan con timestamp: `stock_DDMMAAHHMMSS.xlsx`

### Visualización
- 📊 Tabla ordenable por cualquier columna (código, descripción, ubicación, cantidad, precio, importe)
- 🗂️ **Agrupación por código**: Consolida productos con el mismo código sumando cantidades
- 💰 Cálculo automático del importe (cantidad × precio)
- 📈 Resumen con total de productos y valor total del inventario

### Formato de Datos
Cada producto contiene:
| Campo       | Descripción                          |
|-------------|--------------------------------------|
| Código      | Identificador del producto           |
| Descripción | Nombre o detalle del producto        |
| Ubicación   | Lugar físico donde se almacena       |
| Cantidad    | Unidades en stock                    |
| Precio      | Precio unitario                      |
| Importe     | Calculado automáticamente (Cantidad × Precio) |

## 🛠️ Tecnologías

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5, CSS3 (SCSS), JavaScript vanilla
- **Template Engine**: EJS
- **Manejo de Excel**: SheetJS (xlsx)
- **Subida de archivos**: Multer

## 📁 Estructura del Proyecto

```
Generador de Stock/
├── server.js              # Punto de entrada del servidor
├── package.json           # Dependencias y scripts
├── data/                  # Archivos Excel de stock guardados
├── docs/                  # Documentación
│   └── stock/
├── public/                # Archivos estáticos
│   ├── css/
│   │   ├── style.css      # Estilos compilados
│   │   └── style.scss     # Estilos fuente (SCSS)
│   └── js/
│       └── app.js         # Lógica del cliente
├── src/
│   ├── routes/
│   │   └── stock.js       # Rutas y controladores
│   └── services/
│       └── excelService.js # Servicio para manejo de Excel
└── views/
    ├── index.ejs          # Vista principal
    └── layout.ejs         # Layout base
```

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd "Generador de Stock"
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar el servidor**
   ```bash
   # Modo producción
   npm start

   # Modo desarrollo (con recarga automática)
   npm run dev
   ```

4. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 📜 Scripts Disponibles

| Script       | Comando              | Descripción                              |
|--------------|----------------------|------------------------------------------|
| `start`      | `npm start`          | Inicia el servidor en modo producción   |
| `dev`        | `npm run dev`        | Inicia con nodemon (recarga automática) |
| `scss`       | `npm run scss`       | Compila SCSS a CSS en modo watch        |

## 🔌 API REST

### Endpoints

| Método | Ruta                 | Descripción                    |
|--------|----------------------|--------------------------------|
| GET    | `/`                  | Página principal               |
| GET    | `/api/productos`     | Obtener todos los productos    |
| GET    | `/api/productos/:id` | Obtener producto por ID        |
| POST   | `/api/productos`     | Agregar nuevo producto         |
| PUT    | `/api/productos/:id` | Actualizar producto existente  |
| DELETE | `/api/productos/:id` | Eliminar producto              |
| POST   | `/importar`          | Importar archivo Excel/CSV     |
| GET    | `/guardar`           | Guardar y descargar Excel      |

## 💡 Uso

1. **Importar stock existente**: Haz clic en "📥 Importar" y selecciona un archivo Excel o CSV con tus productos.

2. **Agregar productos manualmente**: Usa el botón "+ Nuevo Producto" para agregar items uno por uno.

3. **Editar/Eliminar**: Cada fila tiene botones de acción para modificar o eliminar el producto.

4. **Ordenar**: Haz clic en cualquier encabezado de columna para ordenar ascendente/descendente.

5. **Agrupar**: El botón "🗂️ Agrupar" consolida productos con el mismo código, sumando sus cantidades.

6. **Guardar**: El botón "💾 Guardar Excel" genera y descarga un archivo Excel con el stock actual.

## 📝 Notas

- Los archivos de stock se guardan en la carpeta `/data` con formato `stock_DDMMAAHHMMSS.xlsx`
- Al iniciar, la aplicación carga automáticamente el archivo de stock más reciente
- Los precios e importes se formatean en moneda argentina (ARS)
- El sistema filtra automáticamente registros vacíos al importar

## 📄 Licencia

ISC
