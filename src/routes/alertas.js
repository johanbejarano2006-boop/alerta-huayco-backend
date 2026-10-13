const router = require('express').Router();
const db = require('../db');
const { autenticar, soloOperador } = require('../middleware/auth');
const { crearAlerta } = require('../services/alertas');

// Zonas en peligro ahora (nivel amarillo o superior), con su último mensaje
router.get('/activas', autenticar, async (_req, res) => {
  const [rows] = await db.query(
    `SELECT z.id AS zona_id, z.nombre AS zona, z.lat, z.lng, z.nivel_actual AS nivel,
       (SELECT mensaje FROM alertas a WHERE a.zona_id=z.id ORDER BY a.id DESC LIMIT 1) AS mensaje
     FROM zonas z WHERE z.nivel_actual >= 1 ORDER BY z.nivel_actual DESC`);
  res.json(rows);
});

router.get('/', autenticar, async (_req, res) => {
  const [rows] = await db.query(
    `SELECT a.id, a.nivel, a.mensaje, a.origen, a.emitida_en, z.nombre AS zona
     FROM alertas a JOIN zonas z ON z.id=a.zona_id ORDER BY a.id DESC LIMIT 30`);
  res.json(rows);
});

router.post('/', autenticar, soloOperador, async (req, res) => {
  const { zona_id, nivel, mensaje } = req.body;
  if (!zona_id || ![0, 1, 2, 3].includes(+nivel) || !mensaje) return res.status(400).json({ error: 'Completa zona, nivel y mensaje' });
  const [[z]] = await db.query('SELECT * FROM zonas WHERE id=?', [zona_id]);
  if (!z) return res.status(404).json({ error: 'Zona no encontrada' });
  const r = await crearAlerta(z, +nivel, mensaje, 'manual');
  res.status(201).json({ mensaje: `Alerta emitida. Usuarios notificados: ${r.notificados}` });
});

module.exports = router;
