const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
const { autenticar, soloAdmin } = require('../middleware/auth');

router.get('/', autenticar, reservaController.getReservas);
router.get('/disponibilidad', reservaController.getDisponibilidad);
router.get('/admin/resumen', autenticar, soloAdmin, reservaController.getResumenAdmin);
router.put('/admin/mesas-activas', autenticar, soloAdmin, reservaController.actualizarMesasActivas);
router.post('/', autenticar, reservaController.createReserva);
router.post('/sync', autenticar, reservaController.syncReservas);
router.put('/:id/estado', autenticar, soloAdmin, reservaController.updateEstado);

module.exports = router;
