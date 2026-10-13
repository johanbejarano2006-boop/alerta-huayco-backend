const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const firmar = u => jwt.sign({ id: u.id, rol: u.rol, nombre: u.nombres }, process.env.JWT_SECRET, { expiresIn: '8h' });

router.post('/registro', async (req, res) => {
  const { dni, nombres, apellidos, email, telefono, password } = req.body;
  if (!/^\d{8}$/.test(dni || '')) return res.status(400).json({ error: 'El DNI debe tener 8 dígitos' });
  if (!nombres || !apellidos || !email || (password || '').length < 6)
    return res.status(400).json({ error: 'Completa todos los campos (clave de mínimo 6 caracteres)' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query(
      'INSERT INTO usuarios (dni,nombres,apellidos,email,telefono,password_hash) VALUES (?,?,?,?,?,?)',
      [dni, nombres, apellidos, email, telefono || null, hash]);
    const u = { id: r.insertId, rol: 'ciudadano', nombres };
    res.status(201).json({ token: firmar(u), nombre: nombres, rol: 'ciudadano' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El DNI o correo ya está registrado' });
    res.status(500).json({ error: 'Error al registrar' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const [[u]] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
  if (!u || !(await bcrypt.compare(password || '', u.password_hash)))
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  res.json({ token: firmar(u), nombre: u.nombres, rol: u.rol });
});

module.exports = router;
