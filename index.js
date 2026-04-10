const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();

const dbConfig = {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'marmitadb'
};

let pool;

async function connectWithRetry() {
    console.log('🔍 [INFRA] Tentando conectar ao MySQL...');
    for (let i = 1; i <= 10; i++) {
        try {
            pool = mysql.createPool(dbConfig);
            await pool.query('SELECT 1');
            console.log('✅ [DATABASE] Conectado ao MySQL com sucesso!');
            return;
        } catch (err) {
            console.log(`⚠️ [DATABASE] Tentativa ${i}/10 falhou. Aguardando...`);
            await new Promise(res => setTimeout(res, 3000));
        }
    }
    process.exit(1);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => res.render('login'));

app.get('/cadastro', (req, res) => {
    res.render('cadastro');
});

app.post('/cadastro', async (req, res) => {
    const { username, password } = req.body;

    try {
        const senhaHash = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, senhaHash]
        );

        res.send('<h1>Usuário cadastrado com sucesso!</h1><a href="/">Ir para login</a>');
    } catch (err) {
        res.status(500).send('Erro ao cadastrar usuário.');
    }
});


// 🔥 LOGIN CORRIGIDO
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.send('<h1>Login Inválido</h1><a href="/">Voltar</a>');
        }

        const usuario = rows[0];

        const senhaCorreta = await bcrypt.compare(password, usuario.password);

        // 🔍 LOGS PRA DEBUG
        console.log("DIGITADO:", password);
        console.log("HASH DB:", usuario.password);
        console.log("RESULTADO:", senhaCorreta);

        if (senhaCorreta) {
            return res.redirect('/dashboard');
        } else {
            return res.send('<h1>Login Inválido</h1><a href="/">Voltar</a>');
        }

    } catch (err) {
        console.error(err);
        return res.status(500).send('Erro no banco.');
    }
});


app.get('/dashboard', async (req, res) => {
    const [items] = await pool.query('SELECT * FROM items');
    const [orders] = await pool.query('SELECT * FROM orders');
    res.render('dashboard', { items, orders });
});

connectWithRetry().then(() => {
    app.listen(3000, () => console.log('🚀 MARMITATECH PRO ONLINE NA PORTA 3000'));
});