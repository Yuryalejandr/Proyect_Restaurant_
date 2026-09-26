const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = 'clave_secreta_restaurante';

exports.register = (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (typeof nombre !== 'string' || !nombre.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
  }

  const userRol = 'cliente';
  const hashedPassword = bcrypt.hashSync(password, 8);

  const query = `INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)`;
  db.run(query, [nombre.trim(), email.trim().toLowerCase(), hashedPassword, userRol], function (err) {
    if (err) return res.status(400).json({ error: 'El correo ya está registrado.' });
    const userId = this.lastID;
    db.get('SELECT id, nombre, email, rol, foto_uri FROM usuarios WHERE id = ?', [userId], (selectError, user) => {
      if (selectError || !user) return res.status(500).json({ error: 'La cuenta se creó, pero no se pudo iniciar sesión.' });
      const token = jwt.sign({ id: user.id, rol: user.rol }, SECRET, { expiresIn: '24h' });
      res.status(201).json({ message: 'Usuario registrado con éxito', token, user });
    });
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  const query = `SELECT * FROM usuarios WHERE email = ?`;

  db.get(query, [email], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user.id, rol: user.rol }, SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, foto_uri: user.foto_uri || '' } });
  });
};

exports.getProfile = (req, res) => {
  db.get('SELECT id, nombre, email, rol, foto_uri FROM usuarios WHERE id = ?', [req.usuario.id], (err, user) => {
    if (err) return res.status(500).json({ mensaje: err.message });
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    res.json(user);
  });
};

exports.updateProfile = (req, res) => {
  const { nombre, email, foto_uri = '' } = req.body;
  if (!nombre?.trim() || !email?.trim()) {
    return res.status(400).json({ mensaje: 'El nombre y el correo son obligatorios.' });
  }

  db.run('UPDATE usuarios SET nombre = ?, email = ?, foto_uri = ? WHERE id = ?', [nombre.trim(), email.trim().toLowerCase(), foto_uri, req.usuario.id], function (err) {
    if (err) return res.status(400).json({ mensaje: 'Ese correo ya está registrado.' });
    if (!this.changes) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    db.get('SELECT id, nombre, email, rol, foto_uri FROM usuarios WHERE id = ?', [req.usuario.id], (selectError, user) => {
      if (selectError) return res.status(500).json({ mensaje: selectError.message });
      res.json(user);
    });
  });
};
