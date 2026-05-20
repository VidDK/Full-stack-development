document.addEventListener('DOMContentLoaded', function () {

    // 1. Barvna shema
    const shema = localStorage.getItem('barvnaShema') || 'temna';
    document.body.classList.add(shema);

    document.querySelectorAll('.color-scheme-btn, .scheme-btn').forEach(function (btn) {
        if (btn.dataset.shema === shema) btn.classList.add('active');
        btn.addEventListener('click', function () {
            document.body.classList.remove('svetla', 'temna', 'modra');
            document.body.classList.add(this.dataset.shema);
            localStorage.setItem('barvnaShema', this.dataset.shema);
            document.querySelectorAll('.color-scheme-btn, .scheme-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 2. Datum na naslovnici
    const datumEl = document.getElementById('datum');
    if (datumEl) {
        const d = new Date();
        const dnevi   = ['Nedelja','Ponedeljek','Torek','Sreda','Četrtek','Petek','Sobota'];
        const meseci  = ['januar','februar','marec','april','maj','junij','julij','avgust','september','oktober','november','december'];
        datumEl.textContent = `${dnevi[d.getDay()]}, ${d.getDate()}. ${meseci[d.getMonth()]}`;
    }

    // 3. Odštevalnik akcije
    const timerEl = document.getElementById('countdown-timer');
    if (timerEl) {
        const konec = new Date('2027-03-24T23:59:59');
        function osvezi() {
            const diff = konec - new Date();
            if (diff <= 0) { timerEl.textContent = 'Akcija je potekla.'; return; }
            const dni = Math.floor(diff / 86400000);
            const ure = Math.floor(diff / 3600000) % 24;
            const min = Math.floor(diff / 60000) % 60;
            const sek = Math.floor(diff / 1000) % 60;
            timerEl.textContent = `${dni} dni, ${ure} ur, ${min} minut, ${sek} sekund`;
            timerEl.style.color = diff <= 7 * 86400000 ? '#ff4444' : '';
        }
        osvezi();
        setInterval(osvezi, 1000);
    }

    // 4. Registracija – Bootstrap validacija
    const regForm = document.getElementById('registracija-form');
    if (regForm) {
        const poljaUC = ['reg-ime','reg-priimek','reg-email','reg-naslov','reg-kraj'];
        poljaUC.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('blur', function () { this.value = this.value.toUpperCase(); });
        });

        function ok(id, pogoj, msg) {
            const el = document.getElementById(id);
            if (!el) return true;
            if (!pogoj) {
                el.classList.add('is-invalid'); el.classList.remove('is-valid');
                const fb = el.nextElementSibling;
                if (fb && fb.classList.contains('invalid-feedback')) fb.textContent = msg;
                return false;
            }
            el.classList.remove('is-invalid'); el.classList.add('is-valid');
            return true;
        }

        function preveriFormo() {
            let v = true;
            if (!ok('reg-naziv', document.getElementById('reg-naziv')?.value !== '', 'Izberite naziv.')) v = false;
            if (!ok('reg-ime',    document.getElementById('reg-ime').value.trim() !== '', 'Vnesite ime.')) v = false;
            if (!ok('reg-priimek', document.getElementById('reg-priimek').value.trim() !== '', 'Vnesite priimek.')) v = false;
            const email = document.getElementById('reg-email').value.trim();
            if (!ok('reg-email', email.includes('@') && email.includes('.'), 'Vnesite veljaven e-naslov.')) v = false;
            if (!ok('reg-naslov', document.getElementById('reg-naslov').value.trim() !== '', 'Vnesite naslov.')) v = false;
            const hisna = parseInt(document.getElementById('reg-hisna').value);
            if (!ok('reg-hisna', !isNaN(hisna) && hisna >= 1, 'Vnesite hišno številko.')) v = false;
            const postna = parseInt(document.getElementById('reg-postna').value);
            if (!ok('reg-postna', !isNaN(postna) && postna >= 1000 && postna <= 9999, 'Poštna mora biti 1000–9999.')) v = false;
            if (!ok('reg-kraj', document.getElementById('reg-kraj').value.trim() !== '', 'Vnesite kraj.')) v = false;
            const datumVal = document.getElementById('reg-datum').value;
            if (datumVal) {
                const r = new Date(datumVal), danes = new Date();
                let starost = danes.getFullYear() - r.getFullYear();
                if (danes.getMonth() - r.getMonth() < 0 || (danes.getMonth() === r.getMonth() && danes.getDate() < r.getDate())) starost--;
                if (!ok('reg-datum', starost >= 18, 'Starost mora biti vsaj 18 let.')) v = false;
            } else {
                if (!ok('reg-datum', false, 'Vnesite datum rojstva.')) v = false;
            }
            const pogoji = document.getElementById('reg-pogoji');
            if (pogoji && !ok('reg-pogoji', pogoji.checked, 'Strinjati se morate s pogoji.')) v = false;
            if (v) alert('Registracija uspešna!');
            return v;
        }

        document.getElementById('btn-preveri')?.addEventListener('click', preveriFormo);
        regForm.addEventListener('submit', e => { e.preventDefault(); preveriFormo(); });
        regForm.addEventListener('reset', () => {
            regForm.querySelectorAll('.is-valid,.is-invalid').forEach(el => el.classList.remove('is-valid','is-invalid'));
        });
    }

    // 5. Prijava – pošlje POST, shrani JWT v sessionStorage
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const usr    = document.getElementById('podj-username');
            const pwd    = document.getElementById('podj-pwd');
            const napaka = document.getElementById('login-napaka');
            let ok = true;
            if (!usr.value.trim()) { usr.classList.add('is-invalid'); ok = false; } else usr.classList.remove('is-invalid');
            if (!pwd.value.trim()) { pwd.classList.add('is-invalid'); ok = false; } else pwd.classList.remove('is-invalid');
            if (!ok) return;

            fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usr.value.trim(), geslo: pwd.value.trim() })
            })
            .then(r => r.json())
            .then(data => {
                if (data.napaka) {
                    if (napaka) { napaka.textContent = data.napaka; napaka.style.display = 'block'; }
                    usr.classList.add('is-invalid'); pwd.classList.add('is-invalid');
                    return;
                }
                sessionStorage.setItem('uporabnik', JSON.stringify({ token: data.token, id: data.id, vloga: data.vloga, ime: data.ime }));
                if (napaka) napaka.style.display = 'none';
                window.location.href = data.vloga === 'admin' ? 'admin_dashboard.html' : 'podjetnik_event.html';
            })
            .catch(() => alert('Strežnik ni dosegljiv. Zaženite: node server.js'));
        });
    }

    // 6. Gumbi "Dodaj v košarico" iz statičnega HTML
    document.querySelectorAll('.btn-dodaj-v-kosarico').forEach(function (btn) {
        btn.addEventListener('click', function () {
            dodajVKosarico(this.dataset.id || Date.now().toString(), this.dataset.ime || 'Izdelek', parseFloat(this.dataset.cena) || 0, this.dataset.src || '');
        });
    });

    // 7. Naloži košarico (če smo na kosarica.html)
    osveziBadge();
    naloziKosarico();

    // 8. Naloži produkte iz API (tabela + kartice)
    naloziProdukte();

    // 9. Admin inicializacija
    adminInit();

});


// ── KOŠARICA ──────────────────────────────────────────────────────────────────

function vrniKosarico() {
    return JSON.parse(sessionStorage.getItem('kosarica') || '[]');
}

function shraniKosarico(k) {
    sessionStorage.setItem('kosarica', JSON.stringify(k));
}

function dodajVKosarico(id, naziv, cena, src) {
    const k = vrniKosarico();
    const obs = k.find(i => i.id == id);
    if (obs) obs.kolicina++;
    else k.push({ id, naziv, cena, src, kolicina: 1 });
    shraniKosarico(k);
    osveziBadge();
    const a = document.getElementById('cart-alert');
    if (a) { a.style.display = 'block'; setTimeout(() => a.style.display = 'none', 3000); }
}

function osveziBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const skupaj = vrniKosarico().reduce((s, i) => s + i.kolicina, 0);
    badge.textContent = skupaj;
    badge.style.display = skupaj > 0 ? 'inline-block' : 'none';
}

function spremenKolicino(id, nova) {
    const k = vrniKosarico();
    const item = k.find(i => i.id == id);
    if (item) item.kolicina = Math.min(99, Math.max(1, parseInt(nova)));
    shraniKosarico(k);
    osveziBadge();
    naloziKosarico();
}

function odstraniIzKosarice(id) {
    shraniKosarico(vrniKosarico().filter(i => i.id != id));
    osveziBadge();
    naloziKosarico();
}

function izprazniKosarico() {
    if (!confirm('Izprazniti košarico?')) return;
    sessionStorage.removeItem('kosarica');
    osveziBadge();
    naloziKosarico();
}

// Prikaže vsebino košarice v tabeli na kosarica.html
function naloziKosarico() {
    const tbody = document.getElementById('cart-tbody');
    if (!tbody) return;

    const k = vrniKosarico();
    tbody.innerHTML = '';
    let skupaj = 0;

    if (k.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4" style="color:var(--text-primary);">Košarica je prazna.</td></tr>';
    } else {
        k.forEach(item => {
            const vsota = item.cena * item.kolicina;
            skupaj += vsota;
            const tr = document.createElement('tr');
            tr.innerHTML =
                `<td style="color:var(--text-primary);">${item.naziv}</td>` +
                `<td style="color:var(--text-primary);">${parseFloat(item.cena).toFixed(2)} €</td>` +
                `<td style="color:var(--text-primary);">` +
                    `<div class="d-flex align-items-center gap-1">` +
                        `<button class="btn btn-sm btn-secondary py-0 px-2" onclick="spremenKolicino('${item.id}', ${item.kolicina - 1})">−</button>` +
                        `<span style="min-width:24px;text-align:center;">${item.kolicina}</span>` +
                        `<button class="btn btn-sm btn-secondary py-0 px-2" onclick="spremenKolicino('${item.id}', ${item.kolicina + 1})">+</button>` +
                    `</div>` +
                `</td>` +
                `<td style="color:var(--text-primary);">` +
                    `${vsota.toFixed(2)} €` +
                    `<button class="btn btn-sm btn-danger ms-2" onclick="odstraniIzKosarice('${item.id}')">Odstrani</button>` +
                `</td>`;
            tbody.appendChild(tr);
        });
    }

    // Skupna cena v obeh elementih
    const el1 = document.getElementById('cart-skupaj');
    const el2 = document.getElementById('cart-skupaj-total');
    const txt = skupaj.toFixed(2) + ' €';
    if (el1) el1.textContent = txt;
    if (el2) el2.textContent = txt;

    // Gumb izprazni
    const btnIzp = document.getElementById('btn-izprazni');
    if (btnIzp && !btnIzp.dataset.bound) {
        btnIzp.addEventListener('click', izprazniKosarico);
        btnIzp.dataset.bound = '1';
    }
}


// ── NAKUP ─────────────────────────────────────────────────────────────────────

function zakljuciNakup() {
    const uStr = sessionStorage.getItem('uporabnik');
    if (!uStr) { alert('Za nakup se morate prijaviti.'); window.location.href = 'podjetnik_profile.html'; return; }
    const k = vrniKosarico();
    if (!k.length) { alert('Košarica je prazna.'); return; }
    const skupaj = Math.round(k.reduce((s, i) => s + i.cena * i.kolicina, 0) * 100) / 100;

    fetch('/api/nakup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + JSON.parse(uStr).token },
        body: JSON.stringify({ kosarica: k, skupajZnesek: skupaj })
    })
    .then(r => r.json())
    .then(data => {
        if (data.napaka) { alert('Napaka: ' + data.napaka); return; }
        sessionStorage.removeItem('kosarica');
        osveziBadge();
        alert(data.sporocilo);
        naloziKosarico();
    })
    .catch(() => alert('Strežnik ni dosegljiv.'));
}


// ── PRODUKTI (GET /api/products) ─────────────────────────────────────────────

function naloziProdukte() {
    // Zahteva strežnik – pokliče se samo če obstajata vsebnika
    if (!document.getElementById('kartice-produktov') && !document.getElementById('tabela-body')) return;

    fetch('/api/products')
        .then(r => r.json())
        .then(produkti => {
            localStorage.setItem('vsiProdukti', JSON.stringify(produkti));
            ustvariKarticeProduktov(produkti);
            ustvariTabeloProduktov(produkti);
        })
        .catch(() => console.warn('API ni dosegljiv – produkte servira statični HTML.'));
}

function cenaSPopustom(p) {
    return p.popust > 0 ? Math.round((p.cena - p.cena * p.popust / 100) * 100) / 100 : p.cena;
}

function ustvariKarticeProduktov(produkti) {
    const vsebnik = document.getElementById('kartice-produktov');
    if (!vsebnik) return;
    vsebnik.innerHTML = '';

    produkti.forEach(p => {
        const cena = cenaSPopustom(p);
        const col  = document.createElement('div');
        col.className = 'col-12 col-sm-6 col-lg-4';
        col.innerHTML =
            `<div class="card product-card h-100">` +
                `<img src="${p.src}" alt="${p.naziv}">` +
                `<div class="card-body">` +
                    `<h5 class="card-title">${p.naziv}</h5>` +
                    `<p class="card-text">${p.opis}</p>` +
                    `<p class="product-price">${cena} €` +
                        (p.popust > 0 ? ` <small style="text-decoration:line-through;color:var(--bg-tertiary);font-weight:400;">${p.cena} €</small>` : '') +
                    `</p>` +
                    `<div class="d-flex gap-2">` +
                        `<a href="product_detail.html" class="btn btn-secondary btn-sm">Več info</a>` +
                        `<button class="btn btn-primary btn-sm" onclick="dodajVKosarico(${p.id},'${p.naziv.replace(/'/g,"\\'")}',${cena},'${p.src}')">+ Košarica</button>` +
                    `</div>` +
                `</div>` +
            `</div>`;
        vsebnik.appendChild(col);
    });
}

function ustvariTabeloProduktov(produkti) {
    const tbody = document.getElementById('tabela-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    produkti.forEach(p => {
        const cena = cenaSPopustom(p);
        const tr   = document.createElement('tr');
        tr.innerHTML =
            `<td>${p.id}</td>` +
            `<td><img src="${p.src}" style="width:60px;height:40px;object-fit:cover;border-radius:6px;" alt="${p.naziv}"></td>` +
            `<td>${p.naziv}</td>` +
            `<td>${p.kategorija}</td>` +
            `<td>${cena} €${p.popust > 0 ? ` <small style="text-decoration:line-through;color:var(--bg-tertiary);">${p.cena} €</small>` : ''}</td>` +
            `<td>${p.ocena}</td>` +
            `<td><button class="btn btn-primary btn-sm" onclick="dodajVKosarico(${p.id},'${p.naziv.replace(/'/g,"\\'")}',${cena},'${p.src}')">Kupi</button></td>`;
        tbody.appendChild(tr);
    });
}


// ── ADMIN ─────────────────────────────────────────────────────────────────────

function adminInit() {
    const uStr = sessionStorage.getItem('uporabnik');
    const razd = document.getElementById('admin-razdelek');
    const niAdm = document.getElementById('ni-admin-sporocilo');
    if (!razd && !niAdm) return; // nismo na admin strani

    if (uStr && JSON.parse(uStr).vloga === 'admin') {
        if (razd) razd.style.display = 'block';
        adminNaloziIzdelke();
    } else {
        if (niAdm) niAdm.style.display = 'block';
    }
}

function adminNaloziIzdelke() {
    fetch('/api/products').then(r => r.json()).then(adminPrikaziTabelo);
}

function adminPrikaziTabelo(izdelki) {
    const tbody = document.getElementById('admin-tabela-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    izdelki.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML =
            `<td>${p.id}</td>` +
            `<td><img src="${p.src||''}" style="width:60px;height:40px;object-fit:cover;border-radius:6px;"></td>` +
            `<td style="font-weight:600;">${p.naziv}</td>` +
            `<td>${p.kategorija}</td>` +
            `<td>${p.cena} €</td>` +
            `<td><button class="btn btn-danger btn-sm" onclick="adminBrisiIzdelek(${p.id})">Briši</button></td>`;
        tbody.appendChild(tr);
    });
}

function adminDodajIzdelek() {
    const uStr = sessionStorage.getItem('uporabnik');
    if (!uStr) { alert('Niste prijavljeni.'); return; }
    const token  = JSON.parse(uStr).token;
    const naziv  = document.getElementById('novi-naziv').value.trim();
    const cena   = parseFloat(document.getElementById('nova-cena').value);
    const napEl  = document.getElementById('dodaj-napaka');

    if (!naziv || isNaN(cena) || cena <= 0) {
        if (napEl) { napEl.textContent = 'Naziv in cena sta obvezna.'; napEl.style.display = 'block'; }
        return;
    }
    if (napEl) napEl.style.display = 'none';

    fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
            naziv,
            opis:       document.getElementById('novi-opis')?.value.trim() || '',
            opisDolgi:  document.getElementById('novi-opisDolgi')?.value.trim() || '',
            cena,
            popust:     parseInt(document.getElementById('novi-popust')?.value) || 0,
            kategorija: document.getElementById('nova-kategorija')?.value || 'Ostalo',
            src:        document.getElementById('nova-src')?.value.trim() || '',
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.napaka) { if (napEl) { napEl.textContent = data.napaka; napEl.style.display = 'block'; } return; }
        const modal = bootstrap.Modal.getInstance(document.getElementById('dodajIzdelekModal'));
        if (modal) modal.hide();
        adminPrikaziTabelo(data);
    });
}

function adminBrisiIzdelek(id) {
    if (!confirm('Izbrisati ta izdelek?')) return;
    const token = JSON.parse(sessionStorage.getItem('uporabnik') || '{}').token || '';
    fetch('/api/products/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } })
        .then(r => r.json())
        .then(data => { if (data.napaka) { alert('Napaka: ' + data.napaka); return; } adminPrikaziTabelo(data); });
}
