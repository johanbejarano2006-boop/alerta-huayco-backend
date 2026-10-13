const jwt = require('jsonwebtoken');
function autenticar(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.usuario = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Sesión inválida o vencida' }); }
}
const soloOperador = (req, res, next) =>
  req.usuario.rol === 'operador' ? next() : res.status(403).json({ error: 'Acción solo para operadores' });
module.exports = { autenticar, soloOperador };
