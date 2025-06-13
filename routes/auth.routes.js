// routes/auth.routes.js

const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/google', controller.googleLogin); 

// PASTIKAN BARIS INI ADA DI PALING BAWAH
module.exports = router;