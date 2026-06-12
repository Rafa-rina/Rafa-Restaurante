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

        res.redirect('/?success=user_created');
    } catch (err) {
        console.error(err);
        res.redirect('/cadastro?error=save_error');
    }
});


app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.redirect('/?error=invalid_login');
        }

        const usuario = rows[0];

        const senhaCorreta = await bcrypt.compare(password, usuario.password);

        console.log("DIGITADO:", password);
        console.log("HASH DB:", usuario.password);
        console.log("RESULTADO:", senhaCorreta);

        if (senhaCorreta) {
            return res.redirect('/dashboard');
        } else {
            return res.redirect('/?error=invalid_login');
        }

    } catch (err) {
        console.error(err);
        return res.redirect('/?error=save_error');
    }
});


app.get('/dashboard', async (req, res) => {
    const [items] = await pool.query('SELECT * FROM items');
    const [orders] = await pool.query('SELECT orders.*, items.name AS item_name FROM orders LEFT JOIN items ON orders.item_id = items.id');
    res.render('dashboard', { items, orders });
});

app.post('/orders', async (req, res) => {
    const { customer_name, item_id, price } = req.body;

    if (!customer_name || customer_name.trim() === "") {
        return res.status(400).send("Nome inválido");
    }

    if (!price || Number(price) <= 0) {
        return res.status(400).send("Preço inválido");
    }

    if (!item_id) {
        return res.status(400).send("Marmita inválida");
    }

    try {
        await pool.query(
            'INSERT INTO orders (customer_name, item_id, price) VALUES (?, ?, ?)',
            [customer_name.trim(), item_id, price]
        );
        res.redirect('/dashboard?success=order_created');
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard?error=db_error');
    }
});

app.post('/orders/:id/advance', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT status FROM orders WHERE id = ?', [id]);
        if (rows.length > 0) {
            let nextStatus = 'Aberto';
            const current = rows[0].status;
            if (current === 'Aberto') nextStatus = 'Cozinha';
            else if (current === 'Cozinha') nextStatus = 'Entrega';
            else if (current === 'Entrega') nextStatus = 'Entregue';
            else nextStatus = 'Entregue';

            await pool.query('UPDATE orders SET status = ? WHERE id = ?', [nextStatus, id]);
            res.redirect('/dashboard?success=order_advanced');
        } else {
            res.redirect('/dashboard?error=not_found');
        }
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard?error=db_error');
    }
});

app.get('/admin/export', async (req, res) => {
    try {
        const [orders] = await pool.query('SELECT orders.id, orders.customer_name, items.name AS item_name, orders.price, orders.status, orders.created_at FROM orders LEFT JOIN items ON orders.item_id = items.id');

        let csv = 'ID,Cliente,Marmita,Preco,Status,Data\n';
        orders.forEach(o => {
            const date = o.created_at ? new Date(o.created_at).toISOString() : '';
            csv += `${o.id},${o.customer_name},${o.item_name || ''},${o.price},${o.status},${date}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.attachment('relatorio_vendas.csv');
        res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao exportar relatório.');
    }
});

connectWithRetry().then(() => {
    app.listen(3000, () => console.log('🚀 MARMITATECH PRO ONLINE NA PORTA 3000'));
});
