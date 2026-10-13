// Crea el operador inicial: operador@alerta.pe / Operador123
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');
(async () => {
  const hash = await bcrypt.hash('Operador123', 10);
  await db.query(
    `INSERT IGNORE INTO usuarios (dni,nombres,apellidos,email,password_hash,rol)
     VALUES ('00000000','Operador','Central','operador@alerta.pe',?, 'operador')`, [hash]);
  console.log('Operador listo: operador@alerta.pe / Operador123');
  process.exit(0);
})();
