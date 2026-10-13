const db = require('../db');
// Capa de servicio: toda alerta (automática o manual) se emite por aquí
async function crearAlerta(zona, nivel, mensaje, origen) {
  const [r] = await db.query('INSERT INTO alertas (zona_id, nivel, mensaje, origen) VALUES (?,?,?,?)', [zona.id, nivel, mensaje, origen]);
  await db.query('UPDATE zonas SET nivel_actual=? WHERE id=?', [nivel, zona.id]);
  // Notificación dentro de la app para quienes siguen la zona
  const [n] = await db.query('INSERT INTO notificaciones (usuario_id, alerta_id) SELECT usuario_id, ? FROM suscripciones WHERE zona_id=?', [r.insertId, zona.id]);
  // Envío SMS/Push SIMULADO (aquí se conectaría un proveedor real)
  const [dest] = await db.query('SELECT u.telefono FROM suscripciones s JOIN usuarios u ON u.id=s.usuario_id WHERE s.zona_id=? AND u.telefono IS NOT NULL', [zona.id]);
  dest.forEach(d => console.log(`[SMS simulado] ${d.telefono}: ${mensaje}`));
  return { id: r.insertId, notificados: n.affectedRows };
}
module.exports = { crearAlerta };
