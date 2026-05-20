// database.js – sql.js (pure-JS SQLite, brez native build)
const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');
const bcrypt    = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'baza.db');
let db;

async function initDB() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        db = new SQL.Database(fs.readFileSync(DB_PATH));
        console.log('Baza naložena.');
    } else {
        db = new SQL.Database();
        ustvariTabele();
        await vnesiZacetniPodatki();
        shraniNaDisk();
        console.log('Nova baza ustvarjena.');
    }
    return db;
}

function shraniNaDisk() {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function ustvariTabele() {
    db.run(`CREATE TABLE IF NOT EXISTS uporabniki (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        geslo    TEXT NOT NULL,
        ime      TEXT,
        priimek  TEXT,
        email    TEXT,
        vloga    TEXT DEFAULT 'uporabnik'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS izdelki (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        naziv       TEXT NOT NULL,
        opis        TEXT,
        opisDolgi   TEXT,
        cena        REAL NOT NULL,
        popust      INTEGER DEFAULT 0,
        ocena       TEXT,
        steviloOcen INTEGER DEFAULT 0,
        kategorija  TEXT,
        src         TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS nakupi (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        uporabnikId  INTEGER NOT NULL,
        skupajZnesek REAL NOT NULL,
        datumNakupa  TEXT NOT NULL,
        FOREIGN KEY (uporabnikId) REFERENCES uporabniki(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS nakupIzdelki (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        nakupId   INTEGER NOT NULL,
        izdelekId INTEGER NOT NULL,
        naziv     TEXT NOT NULL,
        cena      REAL NOT NULL,
        kolicina  INTEGER NOT NULL,
        FOREIGN KEY (nakupId) REFERENCES nakupi(id)
    )`);
}

async function vnesiZacetniPodatki() {
    const users = [
        ['janez',     'geslo123',     'Janez', 'Novak',  'janez@primer.si',     'uporabnik'],
        ['admin',     'admin123',     'Ana',   'Kovač',  'admin@makehappen.si', 'admin'],
        ['podjetnik', 'podjetnik123', 'Marko', 'Horvat', 'marko@podjetje.si',   'podjetnik'],
        ['maja',      'maja2026',     'Maja',  'Zupan',  'maja@gmail.com',      'uporabnik'],
    ];

    for (const [usr, pwd, ime, priimek, email, vloga] of users) {
        const hash = await bcrypt.hash(pwd, 10);
        db.run('INSERT INTO uporabniki (username,geslo,ime,priimek,email,vloga) VALUES (?,?,?,?,?,?)',
               [usr, hash, ime, priimek, email, vloga]);
    }

    const izdelki = [
        ['Vstopnica – Rock Koncert', 'Siddharta live @ Maribor, 31.3.2026',
         'Siddharta je ena najprepoznavnejših slovenskih rock skupin. Koncert pomeni večer intenzivnih čustev, vrhunske izvedbe in nepozabnega vzdušja.',
         20, 25, '★★★★★', 128, 'Glasba',
         'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=250&fit=crop'],
        ['Rooster Cafe – Bon', 'Darilni bon za dve osebi, vključno s kosilom',
         'Idealno darilo za prijatelje ali partnerja. Bon vključuje kosilo za dve osebi v priljubljenem Rooster Cafe.',
         30, 20, '★★★★☆', 43, 'Kulinarika',
         'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=250&fit=crop'],
        ['Umetnostna Galerija – Vstop', 'Vstopnica za razstavo + vodeni ogled',
         'Odkrijte svet umetnosti v Umetnostni Galeriji Maribor. Vstopnica vključuje vodeni ogled z izkušenim vodičem.',
         8, 0, '★★★★★', 87, 'Kultura',
         'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=400&h=250&fit=crop'],
        ['KinoBox – Filmska Vstopnica', 'Vstopnica za katerikoli film v maju 2026',
         'Z vstopnico KinoBox si izberete katerikoli film v maju 2026. Udobni sedeži, odlična slika in zvok.',
         7, 0, '★★★★☆', 211, 'Film',
         'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=250&fit=crop'],
        ['Fitness Pass – Mesečni', 'Neomejeni obiski fitnes centra za 30 dni',
         'Mesečni pass omogoča neomejene obiske fitnes centra. Dostop do opreme, garderob in savn.',
         45, 13, '★★★★★', 64, 'Šport',
         'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=250&fit=crop'],
        ['Gurmansko Večerjo – 2 osebi', 'Ekskluzivna večerja v restavraciji v Mariboru',
         'Večerja za dve osebi vključuje predjed, glavno jed in sladico z izborom vin.',
         80, 15, '★★★★★', 19, 'Kulinarika',
         'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop'],
    ];

    for (const i of izdelki) {
        db.run('INSERT INTO izdelki (naziv,opis,opisDolgi,cena,popust,ocena,steviloOcen,kategorija,src) VALUES (?,?,?,?,?,?,?,?,?)', i);
    }
}

// Vrne vse vrstice kot polje objektov
function vrniVse(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

// Vrne eno vrstico ali null
function vrniEno(sql, params = []) {
    return vrniVse(sql, params)[0] || null;
}

// INSERT/UPDATE/DELETE – vrne lastInsertRowid
function izvedi(sql, params = []) {
    db.run(sql, params);
    const res = db.exec('SELECT last_insert_rowid() as id');
    shraniNaDisk();
    return res.length ? res[0].values[0][0] : null;
}

module.exports = { initDB, vrniVse, vrniEno, izvedi };
