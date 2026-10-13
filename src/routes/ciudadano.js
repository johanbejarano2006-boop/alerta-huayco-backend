const router = require('express').Router();
const db = require('../db');
const { autenticar, soloOperador } = require('../middleware/auth');
const { distanciaKm } = require('../services/geo');

router.post('/suscripciones/:zona_id', autenticar, async (req, res) => {
  await db.query('INSERT IGNORE INTO suscripciones (usuario_id, zona_id) VALUES (?,?)', [req.usuario.id, req.params.zona_id]);
  res.status(201).json({ mensaje: 'Ahora sigues esta zona' });
});
router.delete('/suscripciones/:zona_id', autenticar, async (req, res) => {
  await db.query('DELETE FROM suscripciones WHERE usuario_id=? AND zona_id=?', [req.usuario.id, req.params.zona_id]);
  res.json({ mensaje: 'Dejaste de seguir esta zona' });
});

router.get('/notificaciones', autenticar, async (req, res) => {
  const [rows] = await db.query(
    `SELECT n.id, n.leida, n.creada_en, a.nivel, a.mensaje, z.nombre AS zona
     FROM notificaciones n JOIN alertas a ON a.id=n.alerta_id JOIN zonas z ON z.id=a.zona_id
     WHERE n.usuario_id=? ORDER BY n.id DESC LIMIT 20`, [req.usuario.id]);
  res.json(rows);
});
router.patch('/notificaciones/leer', autenticar, async (req, res) => {
  await db.query('UPDATE notificaciones SET leida=TRUE WHERE usuario_id=?', [req.usuario.id]);
  res.json({ mensaje: 'Notificaciones marcadas como leídas' });
});

// Reporte ciudadano: con zona elegida o detectando la zona más cercana a su ubicación
router.post('/reportes', autenticar, async (req, res) => {
  const { tipo, descripcion } = req.body;
  let { zona_id } = req.body;
  const lat = req.body.lat == null ? null : parseFloat(req.body.lat);
  const lng = req.body.lng == null ? null : parseFloat(req.body.lng);
  if (!tipo) return res.status(400).json({ error: 'Elige qué estás viendo' });
  const tieneUbic = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);
  let cercana = null;
  if (!zona_id) {
    if (!tieneUbic) return res.status(400).json({ error: 'Marca tu ubicación en el mapa o elige una zona' });
    const [zonas] = await db.query('SELECT id, nombre, lat, lng FROM zonas');
    cercana = zonas.map(z => ({ ...z, d: distanciaKm(lat, lng, +z.lat, +z.lng) })).sort((a, b) => a.d - b.d)[0];
    zona_id = cercana.id;
  }
  try {
    await db.query('INSERT INTO reportes (usuario_id, zona_id, tipo, descripcion, lat, lng) VALUES (?,?,?,?,?,?)',
      [req.usuario.id, zona_id, tipo, descripcion || null, tieneUbic ? lat : null, tieneUbic ? lng : null]);
    res.status(201).json({ mensaje: 'Reporte enviado' + (cercana ? ` (zona detectada: ${cercana.nombre}, a ${cercana.d.toFixed(2)} km)` : '') + '. Un operador lo verificará.' });
  } catch { res.status(400).json({ error: 'Datos de reporte no válidos' }); }
});
router.get('/reportes', autenticar, async (req, res) => {
  const op = req.usuario.rol === 'operador';
  const [rows] = await db.query(
    `SELECT r.id, r.tipo, r.descripcion, r.estado, r.creado_en, z.nombre AS zona, CONCAT(u.nombres,' ',u.apellidos) AS ciudadano
     FROM reportes r JOIN zonas z ON z.id=r.zona_id JOIN usuarios u ON u.id=r.usuario_id
     ${op ? '' : 'WHERE r.usuario_id=?'} ORDER BY r.id DESC LIMIT 50`, op ? [] : [req.usuario.id]);
  res.json(rows);
});
router.patch('/reportes/:id', autenticar, soloOperador, async (req, res) => {
  if (!['verificado', 'descartado'].includes(req.body.estado)) return res.status(400).json({ error: 'Estado inválido' });
  await db.query('UPDATE reportes SET estado=? WHERE id=?', [req.body.estado, req.params.id]);
  res.json({ mensaje: 'Reporte actualizado' });
});

module.exports = router;
