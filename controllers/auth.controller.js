const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// Pastikan GOOGLE_CLIENT_ID ada di file .env dan di Variables Railway
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Handler untuk register biasa (jika masih digunakan)
exports.register = async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 8);
        const user = await User.create({ email, password: hashedPassword });
        res.status(201).send({ message: "User registered successfully!", userId: user.id });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// Handler untuk login biasa (jika masih digunakan)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }
        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) {
            return res.status(401).send({ accessToken: null, message: "Invalid Password!" });
        }
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: 86400 });
        res.status(200).send({ id: user.id, email: user.email, accessToken: token });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// --- BAGIAN YANG KEMUNGKINAN HILANG ---
// Handler untuk login dengan Google
exports.googleLogin = async (req, res) => {
    const { token } = req.body; 

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email } = payload;

        const [user] = await User.findOrCreate({
            where: { email: email },
            defaults: {
                password: await bcrypt.hash(Math.random().toString(36), 8),
            }
        });

        const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: 86400 
        });

        res.status(200).send({
            id: user.id,
            email: user.email,
            accessToken: accessToken
        });

    } catch (error) {
        console.error("Google login error:", error);
        res.status(401).send({ message: "Invalid Google Token" });
    }
};