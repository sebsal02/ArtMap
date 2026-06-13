const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Configuracion de Seguridad (DevSecOps)
app.use(helmet({
  contentSecurityPolicy: false // Desactivado para permitir tiles de Leaflet y scripts locales
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 peticiones por IP cada 15 minutos
  message: { success: false, error: 'Demasiadas solicitudes. Intente mas tarde.' }
});

app.use('/api/', apiLimiter);

// Limite reducido para prevenir payloads masivos, ya que las imagenes se comprimen en el cliente
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar base de datos json
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({}));
}

// Helpers de validacion y sanitizacion
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isValidBase64Image(str) {
  if (typeof str !== 'string') return false;
  return str.startsWith('data:image/') && str.length < 5000000;
}

// Crear nuevo mapa
app.post('/api/mapas', (req, res) => {
  try {
    const { author, places, userToken } = req.body;

    if (!userToken || typeof userToken !== 'string') {
      return res.status(401).json({ success: false, error: 'Token de acceso requerido' });
    }
    if (!author || typeof author !== 'string') {
      return res.status(400).json({ success: false, error: 'Autor invalido' });
    }
    if (!Array.isArray(places) || places.length === 0) {
      return res.status(400).json({ success: false, error: 'Se requiere al menos un lugar' });
    }

    const cleanPlaces = [];
    for (let p of places) {
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number') {
        return res.status(400).json({ success: false, error: 'Coordenadas invalidas' });
      }
      if (!isValidBase64Image(p.realImg) || !isValidBase64Image(p.ilusImg)) {
        return res.status(400).json({ success: false, error: 'Imagen invalida o muy pesada' });
      }
      cleanPlaces.push({
        id: sanitizeString(p.id.toString()),
        name: sanitizeString(p.name),
        lat: p.lat,
        lng: p.lng,
        realImg: p.realImg,
        ilusImg: p.ilusImg
      });
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const mapId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    
    data[mapId] = {
      author: sanitizeString(author),
      ownerToken: sanitizeString(userToken),
      places: cleanPlaces,
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(data));
    res.json({ success: true, mapId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Consultar el historial de mapas creados por un token especifico
app.get('/api/mis-mapas/:token', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const token = sanitizeString(req.params.token);
    const userMaps = [];

    for (const [id, mapData] of Object.entries(data)) {
      if (mapData.ownerToken === token) {
        userMaps.push({
          id,
          author: mapData.author,
          createdAt: mapData.createdAt,
          placesCount: mapData.places ? mapData.places.length : 0
        });
      }
    }
    res.json({ success: true, mapas: userMaps });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error interno' });
  }
});

// Obtener un mapa especifico para visualizar
app.get('/api/mapas/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const mapId = sanitizeString(req.params.id);
    const map = data[mapId];
    
    if (map) {
      // Excluir el token del propietario al enviar datos al visor publico
      const safeMap = {
        author: map.author,
        places: map.places,
        createdAt: map.createdAt
      };
      res.json({ success: true, map: safeMap });
    } else {
      res.status(404).json({ success: false, error: 'Mapa no encontrado' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error interno' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado y protegido en puerto ${PORT}`);
});
