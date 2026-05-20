// server.js – Express + JWT + sql.js baza
const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const path    = require('path');

const { initDB, vrniVse, vrniEno, izvedi } = require('./database.js');

const app        = express();
const PORT       = 3000;
const JWT_SECRET = 'make-it-happen-tajni-kljuc-2026';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Middleware – preveri JWT v Authorization headerju
function zahtevajToken(req, res, next) {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ napaka: 'Ni žetona.' });
    try {
        req.uporabnik = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(403).json({ napaka: 'Neveljaven žeton.' });
    }
}

// Middleware – samo admin
function zahtevajAdmin(req, res, next) {
    if (req.uporabnik.vloga !== 'admin')
        return res.status(403).json({ napaka: 'Samo za administratorje.' });
    next();
}

// POST /api/login – preveri geslo, vrne JWT
app.post('/api/login', async (req, res) => {
    const { username, geslo } = req.body;
    if (!username || !geslo)
        return res.status(400).json({ napaka: 'Manjka username ali geslo.' });

    const u = vrniEno('SELECT * FROM uporabniki WHERE username = ?', [username]);
    if (!u || !(await bcrypt.compare(geslo, u.geslo)))
        return res.status(401).json({ napaka: 'Napačno uporabniško ime ali geslo.' });

    const token = jwt.sign(
        { id: u.id, username: u.username, vloga: u.vloga },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
    res.json({ token, id: u.id, vloga: u.vloga, ime: u.ime });
});

// GET /api/products – javni seznam izdelkov
app.get('/api/products', (req, res) => {
    res.json(vrniVse('SELECT * FROM izdelki ORDER BY id'));
});

// POST /api/products – dodaj izdelek (samo admin)
app.post('/api/products', zahtevajToken, zahtevajAdmin, (req, res) => {
    const { naziv, opis, opisDolgi, cena, popust, ocena, steviloOcen, kategorija, src } = req.body;
    if (!naziv || !cena)
        return res.status(400).json({ napaka: 'Naziv in cena sta obvezna.' });

    izvedi(
        'INSERT INTO izdelki (naziv,opis,opisDolgi,cena,popust,ocena,steviloOcen,kategorija,src) VALUES (?,?,?,?,?,?,?,?,?)',
        [naziv, opis||'', opisDolgi||'', cena, popust||0, ocena||'★★★★☆', steviloOcen||0, kategorija||'Ostalo', src||'']
    );
    res.json(vrniVse('SELECT * FROM izdelki ORDER BY id'));
});

// DELETE /api/products/:id – briši izdelek (samo admin)
app.delete('/api/products/:id', zahtevajToken, zahtevajAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    if (!vrniEno('SELECT id FROM izdelki WHERE id = ?', [id]))
        return res.status(404).json({ napaka: 'Izdelek ne obstaja.' });

    izvedi('DELETE FROM izdelki WHERE id = ?', [id]);
    res.json(vrniVse('SELECT * FROM izdelki ORDER BY id'));
});

// POST /api/nakup – zaključi nakup, shrani v bazo
app.post('/api/nakup', zahtevajToken, (req, res) => {
    const { kosarica, skupajZnesek } = req.body;
    if (!kosarica || !kosarica.length)
        return res.status(400).json({ napaka: 'Košarica je prazna.' });

    const nakupId = izvedi(
        'INSERT INTO nakupi (uporabnikId,skupajZnesek,datumNakupa) VALUES (?,?,?)',
        [req.uporabnik.id, skupajZnesek, new Date().toISOString()]
    );
    for (const item of kosarica) {
        izvedi(
            'INSERT INTO nakupIzdelki (nakupId,izdelekId,naziv,cena,kolicina) VALUES (?,?,?,?,?)',
            [nakupId, item.id, item.naziv, item.cena, item.kolicina]
        );
    }
    res.json({ nakupId, sporocilo: `Nakup uspešno zaključen! ID: ${nakupId}` });
});

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\n Make it happen! → http://localhost:${PORT}/index.html\n`);
    });
}).catch(err => { console.error('Napaka pri bazi:', err); process.exit(1); });
