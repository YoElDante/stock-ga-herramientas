const express = require('express');
const router = express.Router();
const multer = require('multer');
const excelService = require('../services/excelService');

// Configurar multer para subida de archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv',
      'application/csv'
    ];
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV (.csv)'));
    }
  }
});

// Variable en memoria para el stock actual
let stockActual = [];

// Cargar stock inicial
stockActual = excelService.loadStock();

/**
 * Página principal - Lista de productos
 */
router.get('/', (req, res) => {
  res.render('index', {
    productos: stockActual,
    mensaje: null
  });
});

/**
 * API: Obtener todos los productos
 */
router.get('/api/productos', (req, res) => {
  res.json(stockActual);
});

/**
 * API: Obtener un producto por ID
 */
router.get('/api/productos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const producto = stockActual.find(p => p.id === id);

  if (!producto) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  res.json(producto);
});

/**
 * API: Agregar nuevo producto
 */
router.post('/api/productos', (req, res) => {
  const { codigo, descripcion, ubicacion, cantidad, precio } = req.body;

  // Generar nuevo ID
  const maxId = stockActual.length > 0
    ? Math.max(...stockActual.map(p => p.id))
    : 0;

  const nuevoProducto = {
    id: maxId + 1,
    codigo: codigo || '',
    descripcion: descripcion || '',
    ubicacion: ubicacion || '',
    cantidad: parseFloat(cantidad) || 0,
    precio: parseFloat(precio) || 0,
    importe: (parseFloat(cantidad) || 0) * (parseFloat(precio) || 0)
  };

  stockActual.push(nuevoProducto);

  res.json({ success: true, producto: nuevoProducto });
});

/**
 * API: Actualizar producto existente
 */
router.put('/api/productos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = stockActual.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  const { codigo, descripcion, ubicacion, cantidad, precio } = req.body;

  stockActual[index] = {
    ...stockActual[index],
    codigo: codigo !== undefined ? codigo : stockActual[index].codigo,
    descripcion: descripcion !== undefined ? descripcion : stockActual[index].descripcion,
    ubicacion: ubicacion !== undefined ? ubicacion : stockActual[index].ubicacion,
    cantidad: cantidad !== undefined ? parseFloat(cantidad) : stockActual[index].cantidad,
    precio: precio !== undefined ? parseFloat(precio) : stockActual[index].precio
  };

  // Recalcular importe
  stockActual[index].importe = stockActual[index].cantidad * stockActual[index].precio;

  res.json({ success: true, producto: stockActual[index] });
});

/**
 * API: Eliminar producto
 */
router.delete('/api/productos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = stockActual.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  const eliminado = stockActual.splice(index, 1)[0];

  res.json({ success: true, producto: eliminado });
});

/**
 * API: Guardar stock a Excel (devuelve JSON con info)
 */
router.post('/api/guardar', (req, res) => {
  try {
    const resultado = excelService.saveStock(stockActual);
    res.json({
      success: true,
      mensaje: `Stock guardado en ${resultado.fileName}`,
      archivo: resultado.fileName
    });
  } catch (error) {
    console.error('Error al guardar:', error);
    res.status(500).json({ error: 'Error al guardar el archivo' });
  }
});

/**
 * API: Guardar y descargar stock como Excel
 */
router.get('/api/descargar', (req, res) => {
  try {
    const resultado = excelService.saveStock(stockActual);

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.fileName}"`);

    // Enviar el buffer del archivo
    res.send(resultado.buffer);
  } catch (error) {
    console.error('Error al descargar:', error);
    res.status(500).json({ error: 'Error al generar el archivo' });
  }
});

/**
 * API: Recargar stock desde Excel
 */
router.post('/api/recargar', (req, res) => {
  try {
    stockActual = excelService.loadStock();
    res.json({
      success: true,
      mensaje: 'Stock recargado desde archivo',
      cantidad: stockActual.length
    });
  } catch (error) {
    console.error('Error al recargar:', error);
    res.status(500).json({ error: 'Error al recargar el archivo' });
  }
});

/**
 * API: Listar archivos de stock guardados
 */
router.get('/api/archivos', (req, res) => {
  const archivos = excelService.listStockFiles();
  res.json(archivos);
});

/**
 * API: Importar archivo Excel o CSV
 */
router.post('/api/importar', upload.single('archivo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    const resultado = excelService.processImportedFile(
      req.file.buffer,
      req.file.originalname
    );

    const { productos: productosImportados, estadisticas } = resultado;

    if (productosImportados.length === 0) {
      return res.status(400).json({
        error: 'El archivo no tiene registros válidos',
        estadisticas: estadisticas
      });
    }

    // Obtener el ID máximo actual
    const maxId = stockActual.length > 0
      ? Math.max(...stockActual.map(p => p.id))
      : 0;

    // Asignar nuevos IDs a los productos importados
    const productosConIds = productosImportados.map((p, index) => ({
      ...p,
      id: maxId + index + 1
    }));

    // Agregar al stock actual
    stockActual.push(...productosConIds);

    res.json({
      success: true,
      mensaje: `Se importaron ${productosConIds.length} productos`,
      cantidad: productosConIds.length,
      estadisticas: estadisticas
    });
  } catch (error) {
    console.error('Error al importar:', error);
    res.status(500).json({ error: error.message || 'Error al procesar el archivo' });
  }
});

/**
 * API: Reemplazar stock completo con archivo importado
 */
router.post('/api/importar-reemplazar', upload.single('archivo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    const resultado = excelService.processImportedFile(
      req.file.buffer,
      req.file.originalname
    );

    const { productos: productosImportados, estadisticas } = resultado;

    if (productosImportados.length === 0) {
      return res.status(400).json({
        error: 'El archivo no tiene registros válidos',
        estadisticas: estadisticas
      });
    }

    // Reemplazar el stock completo
    stockActual = productosImportados;

    res.json({
      success: true,
      mensaje: `Stock reemplazado con ${productosImportados.length} productos`,
      cantidad: productosImportados.length,
      estadisticas: estadisticas
    });
  } catch (error) {
    console.error('Error al importar:', error);
    res.status(500).json({ error: error.message || 'Error al procesar el archivo' });
  }
});

module.exports = router;
