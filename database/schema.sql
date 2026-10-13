-- OJO: esto borra y recrea la base (útil en desarrollo)
DROP DATABASE IF EXISTS alerta_huayco;
CREATE DATABASE alerta_huayco CHARACTER SET utf8mb4;
USE alerta_huayco;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dni CHAR(8) NOT NULL UNIQUE,
  nombres VARCHAR(80) NOT NULL,
  apellidos VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  telefono VARCHAR(15),
  password_hash VARCHAR(100) NOT NULL,
  rol ENUM('ciudadano','operador') NOT NULL DEFAULT 'ciudadano',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Zona de riesgo con ubicación. nivel_actual: 0 verde, 1 amarillo, 2 naranja, 3 rojo
CREATE TABLE zonas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  distrito VARCHAR(80) NOT NULL,
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  lluvia_amarillo DECIMAL(6,1) NOT NULL DEFAULT 10,
  lluvia_naranja DECIMAL(6,1) NOT NULL DEFAULT 25,
  lluvia_rojo DECIMAL(6,1) NOT NULL DEFAULT 40,
  rio_amarillo DECIMAL(6,1) NOT NULL DEFAULT 80,
  rio_naranja DECIMAL(6,1) NOT NULL DEFAULT 120,
  rio_rojo DECIMAL(6,1) NOT NULL DEFAULT 160,
  nivel_actual TINYINT NOT NULL DEFAULT 0
);

CREATE TABLE lecturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zona_id INT NOT NULL,
  lluvia_mm_h DECIMAL(6,1) NOT NULL,
  nivel_rio_cm DECIMAL(6,1) NOT NULL,
  operador_id INT NOT NULL,
  registrada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zona_id) REFERENCES zonas(id),
  FOREIGN KEY (operador_id) REFERENCES usuarios(id)
);

CREATE TABLE alertas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zona_id INT NOT NULL,
  nivel TINYINT NOT NULL,
  mensaje VARCHAR(255) NOT NULL,
  origen ENUM('automatica','manual') NOT NULL DEFAULT 'automatica',
  emitida_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zona_id) REFERENCES zonas(id)
);

CREATE TABLE suscripciones (
  usuario_id INT NOT NULL,
  zona_id INT NOT NULL,
  PRIMARY KEY (usuario_id, zona_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (zona_id) REFERENCES zonas(id)
);

-- Una fila por usuario notificado cuando se emite una alerta
CREATE TABLE notificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  alerta_id INT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (alerta_id) REFERENCES alertas(id)
);

CREATE TABLE reportes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  zona_id INT NOT NULL,
  tipo ENUM('aumento de caudal','deslizamiento','rio con lodo','vía bloqueada','otro') NOT NULL,
  descripcion VARCHAR(255),
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  estado ENUM('pendiente','verificado','descartado') NOT NULL DEFAULT 'pendiente',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (zona_id) REFERENCES zonas(id)
);

-- Coordenadas APROXIMADAS de ejemplo (Chosica); ajústalas a las de tu informe
INSERT INTO zonas (nombre, distrito, lat, lng) VALUES
 ('Quebrada Carossio','Lurigancho-Chosica',-11.930000,-76.692000),
 ('Quebrada Quirio','Lurigancho-Chosica',-11.937000,-76.701000),
 ('Quebrada Pedregal','Lurigancho-Chosica',-11.942000,-76.685000),
 ('Quebrada Corrales','Lurigancho-Chosica',-11.946000,-76.676000),
 ('Quebrada Cashahuacra','Lurigancho-Chosica',-11.925000,-76.670000);
