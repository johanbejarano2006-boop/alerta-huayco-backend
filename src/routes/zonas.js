const router = require('express').Router();
const db = require('../db');
const { autenticar, soloOperador } = require('../middleware/auth');
const { crearAlerta } = require('../services/alertas');
const { distanciaKm } = require('../services/geo');

const NIVELES = ['verde', 'amarillo', 'naranja', 'rojo'];

// Regla de negocio: el nivel de la zona es el más alto entre lluvia y río
function calcularNivel(z, lluvia, rio) {
  const nivel = (v, a, n, r) => (v >= r ? 3 : v >= n ? 2 : v >= a ? 1 : 0);
  return Math.max(
    nivel(lluvia, +z.lluvia_amarillo, +z.lluvia_naranja, +z.lluvia_rojo),
    nivel(rio, +z.rio_amarillo, +z.rio_naranja, +z.rio_rojo));
}

router.get('/', autenticar, async (req, res) => {
  const [rows] = await db.query(
    `SELECT z.id, z.nombre, z.distrito, z.lat, z.lng, z.nivel_actual,
       (SELECT lluvia_mm_h FROM lecturas l WHERE l.zona_id=z.id ORDER BY l.id DESC LIMIT 1) AS lluvia_mm_h,
       (SELECT nivel_rio_cm FROM lecturas l WHERE l.zona_id=z.id ORDER BY l.id DESC LIMIT 1) AS nivel_rio_cm,
       EXISTS(SELECT 1 FROM suscripciones s WHERE s.zona_id=z.id AND s.usuario_id=?) AS suscrito
     FROM zonas z ORDER BY z.nivel_actual DESC, z.nombre`, [req.usuario.id]);
  res.json(rows);
});

// Zonas ordenadas por cercanía a un punto (cálculo de proximidad)
router.get('/cercanas', autenticar, async (req, res) => {
  const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'Envía lat y lng' });
  const [zonas] = await db.query('SELECT id, nombre, lat, lng, nivel_actual FROM zonas');
  res.json(zonas.map(z => ({ ...z, distancia_km: +distanciaKm(lat, lng, +z.lat, +z.lng).toFixed(2) }))
    .sort((a, b) => a.distancia_km - b.distancia_km));
});

router.post('/:id/lecturas', autenticar, soloOperador, async (req, res) => {
  const lluvia = parseFloat(req.body.lluvia_mm_h), rio = parseFloat(req.body.nivel_rio_cm);
  if (isNaN(lluvia) || isNaN(rio) || lluvia < 0 || rio < 0) return res.status(400).json({ error: 'Ingresa valores numéricos válidos' });
  const [[z]] = await db.query('SELECT * FROM zonas WHERE id=?', [req.params.id]);
  if (!z) return res.status(404).json({ error: 'Zona no encontrada' });
  await db.query('INSERT INTO lecturas (zona_id, lluvia_mm_h, nivel_rio_cm, operador_id) VALUES (?,?,?,?)', [z.id, lluvia, rio, req.usuario.id]);
  const nuevo = calcularNivel(z, lluvia, rio);
  let alerta = null;
  if (nuevo > z.nivel_actual && nuevo >= 1) {
    const msg = `Alerta ${NIVELES[nuevo]} en ${z.nombre}: lluvia ${lluvia} mm/h, río ${rio} cm.`;
    alerta = { mensaje: msg, ...(await crearAlerta(z, nuevo, msg, 'automatica')) };
  } else {
    await db.query('UPDATE zonas SET nivel_actual=? WHERE id=?', [nuevo, z.id]);
  }
  res.status(201).json({ nivel: NIVELES[nuevo], alerta });
});

module.exports = router;
