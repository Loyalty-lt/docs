import type { Shot } from '../types.ts'

const card = 'div.shadow-card'
const P = (id: string, url: string, ready: string, alt: string, marks: Shot['marks'], more: Partial<Shot> = {}): Shot => ({ id, app: 'portal', url: `/lt${url}`, ready, alt, marks, ...more })
const G = (id: string, url: string, ready: string, alt: string, marks: Shot['marks'], more: Partial<Shot> = {}): Shot => ({ id, app: 'guest', url: `/lt${url}`, ready, alt, marks, clip: 'viewport', ...more })

const shots: Shot[] = [
  G('prisijungimas', '/auth/login', 'input[type=password]', 'Portalo prisijungimo langas: el. paštas, slaptažodis ir mygtukas „Prisijungti“.', [
    { n: 1, target: 'input[type=email]', label: 'El. paštas', text: 'kuriuo gavote kvietimą.' },
    { n: 2, target: 'input[type=password]', label: 'Slaptažodis', text: 'bent 8 simboliai.' },
    { n: 3, target: 'text=Pamiršote slaptažodį?', label: 'Pamiršote slaptažodį?', text: 'atsiųsime nuorodą.' },
  ]),
  G('prisijungimas-slaptazodis', '/auth/forgot-password', 'text=Siųsti atstatymo laišką', 'Slaptažodžio atkūrimo langas su el. pašto lauku.', [
    { n: 1, target: 'input[type=email]', label: 'El. paštas', text: 'kuriuo jungiatės.' },
    { n: 2, target: 'text=Siųsti atstatymo laišką', label: 'Siųsti atstatymo laišką', text: 'laiškas ateina per kelias minutes.' },
  ]),
  G('registracija', '/onboarding', 'h1', 'Partnerio registracijos pradžia: įmonės paieška pagal pavadinimą ir jos duomenys.', [
    { n: 1, target: 'starts=Žingsnis', label: 'Žingsniai', text: 'iš viso 6.' },
    { n: 2, target: 'label=Ieškokite pagal pavadinimą', label: 'Ieškokite pagal pavadinimą', text: 'duomenys užsipildo patys.' },
  ]),
  P('skydelis', '/', 'text=Statistika ir grafikai', 'Portalo pagrindinis puslapis: sąskaitos, pradžios vadovas, AI ataskaita, skaičiai ir grafikai.', [
    { n: 1, target: 'starts=1 neapmokėta', label: 'Sąskaitos', text: 'ar yra neapmokėtų.' },
    { n: 2, target: 'text=Pradžios vadovas', closest: card, label: 'Pradžios vadovas', text: 'ką dar verta padaryti.' },
    { n: 3, target: 'text=Ataskaita žmonių kalba', closest: card, label: 'Ataskaita žmonių kalba', text: 'klausimas savo žodžiais.' },
    { n: 4, target: 'starts=Išduota taškų', closest: 'div.grid', label: 'Skaičiai', text: 'klientai, kortelės, taškai, pirkimai.' },
    { n: 5, target: 'text=Statistika ir grafikai', label: 'Grafikai', text: 'kaip keitėsi per metus.' },
  ]),
  P('skydelis-meniu', '/shops', 'text=Demo salonas – Centras', 'Portalo meniu kairėje: paieška, skiltys, pagalba, kalba ir pranešimai.', [
    { n: 1, target: 'a[aria-label="Pagalba"]', label: 'Pagalba', text: 'vadovo puslapis apie šį ekraną.' },
    { n: 2, target: 'starts=Ieškoti ⌘K', nth: 1, label: 'Ieškoti', text: 'klientai, pirkimai, puslapiai.' },
    { n: 3, target: 'text=Lojalumo programa', label: 'Skiltys', text: 'programa, klientai, marketingas, administravimas.' },
  ], { clip: 'viewport' }),
  P('imone-duomenys', '/business', '[id=legal_name]', 'Įmonės informacijos puslapis: pavadinimai, kodai, adresas, kontaktai.', [
    { n: 1, target: 'main [role=tablist]', label: 'Skirtukai', text: 'duomenys, bankas, prekės ženklas.' },
    { n: 2, target: '[id=name]', label: 'Rodomas pavadinimas', text: 'jį mato klientai.' },
    { n: 3, target: '[id=legal_name]', label: 'Juridinis pavadinimas', text: 'rašomas sąskaitose.' },
    { n: 4, target: '[id=billing_email]', label: 'Sąskaitų el. paštas', text: 'kam siunčiame sąskaitas.' },
  ]),
  P('imone-zenklas', '/business', '[id=legal_name]', 'Prekės ženklo skirtukas: logotipas, spalvos ir peržiūra.', [
    { n: 1, target: 'text=Įkelti logotipą', nth: 1, label: 'Įkelti logotipą', text: 'PNG, JPG ar GIF, iki 2 MB.' },
    { n: 2, target: 'label=Pagrindinė spalva', to: 'label=Papildoma spalva', label: 'Spalvos', text: 'naudojamos programėlėje.' },
    { n: 3, target: 'text=Prekės ženklo peržiūra', label: 'Prekės ženklo peržiūra', text: 'kaip spalvos atrodys.' },
  ], { setup: [{ click: 'main [role=tab]:nth-child(3)' }, { wait: 'text=Prekės ženklo peržiūra' }] }),
  P('darbuotojai-sarasas', '/staff', 'text=Tomas Demas', 'Darbuotojų sąrašas: rolė, pareigos, paskutinis prisijungimas, kasos PIN ir veiksmai.', [
    { n: 1, target: 'main >> text=Pridėti darbuotoją', label: 'Pridėti darbuotoją', text: 'naujas žmogus.' },
    { n: 2, target: 'text=A4 QR lapas', label: 'A4 QR lapas', text: 'pažymėtų darbuotojų kodai spausdinimui.' },
    { n: 3, target: 'text=Kasos PIN', label: 'Kasos PIN', text: 'sukurtas ar dar ne.' },
    { n: 4, target: 'button[title="Generuoti QR kodą"]', nth: 1, to: 'button[title="Ištrinti"]', toNth: 1, label: 'Veiksmai', text: 'QR kodas, peržiūrėti, redaguoti, ištrinti.' },
  ], { viewport: [1700, 900] }),
  P('darbuotojai-naujas', '/staff/add', '[id=position]', 'Naujo darbuotojo forma: vardas, el. paštas, pareigos, skyrius ir rolė.', [
    { n: 1, target: 'label=Vardas *', label: 'Vardas', text: 'vardas ir pavardė.' },
    { n: 2, target: 'label=Rolė *', label: 'Rolė', text: 'darbuotojas ar vadovas.' },
    { n: 3, target: 'text=Reikalinga NFC kortelė', label: 'Reikalinga NFC kortelė', text: 'jei jungsis pridėdamas kortelę.' },
    { n: 4, target: 'main >> text=Sukurti', nth: 1, label: 'Sukurti', text: 'išsaugo darbuotoją.' },
  ]),
  P('darbuotojai-vienas', '/staff/3', 'text=Atstatyti PIN', 'Darbuotojo puslapis: duomenys, kasos PIN, įrenginiai ir mygtukai viršuje.', [
    { n: 1, target: 'main [role=tablist]', label: 'Skirtukai', text: 'apžvalga, teisės, parduotuvės, prisijungimai.' },
    { n: 2, target: 'text=Generuoti kortelę', label: 'Generuoti kortelę', text: 'kortelė su prisijungimo kodu.' },
    { n: 3, target: 'starts=Siųsti pas', label: 'Siųsti laišką', text: 'kodas el. paštu.' },
    { n: 4, target: 'text=Atstatyti PIN', label: 'Atstatyti PIN', text: 'pamirštas ar sužinotas.' },
    { n: 5, target: 'main >> text=Kasos PIN', closest: card, label: 'Kasos PIN', text: 'būsena ir įrenginiai.' },
  ], { viewport: [1700, 900] }),
  P('kasos-irenginiai', '/pos-devices', 'starts=K7M-3QX', 'Kasos įrenginių sąrašas: kodas, programa, parduotuvė ir kas gali jungtis su PIN.', [
    { n: 1, target: 'starts=K7M-3QX', label: 'Kodas', text: 'toks pat kasos kampe.' },
    { n: 2, target: 'input[aria-label^="Pavadinimas"]', nth: 1, label: 'Pavadinimas', text: 'įrašykite, kur įrenginys stovi.' },
    { n: 3, target: 'button[aria-label="Parduotuvė"]', nth: 1, label: 'Parduotuvė', text: 'kuriai priklauso.' },
    { n: 4, target: 'button[aria-label^="Pašalinti iš įrenginio: Ieva"]', label: 'Pašalinti iš įrenginio', text: 'žmogus vėl jungsis kodu.' },
    { n: 5, target: 'button[aria-label="Ištrinti K7M-3QX"]', label: 'Ištrinti', text: 'visi vėl jungsis kodu.' },
  ]),
  P('ataskaitos', '/reports', '[id=reportType]', 'Ataskaitų puslapis: tipas, parduotuvė, datos, formatas ir greitas generavimas.', [
    { n: 1, target: '[id=reportType]', label: 'Ataskaitos tipas', text: 'ko reikia.' },
    { n: 2, target: 'label=Nuo', to: 'label=Iki', label: 'Datos', text: 'laikotarpis.' },
    { n: 3, target: '[id=format]', label: 'Formatas', text: 'PDF ar skaičiuoklė.' },
    { n: 4, target: 'text=Generuoti ataskaitą', nth: 2, label: 'Generuoti ataskaitą', text: 'sukuria failą.' },
    { n: 5, target: 'text=Greitas generavimas', nth: 1, label: 'Greitas generavimas', text: 'vienu paspaudimu.' },
    { n: 6, target: 'text=Ataskaitų istorija', label: 'Ataskaitų istorija', text: 'anksčiau sukurtos.' },
  ]),
  P('uzklausos-sarasas', '/tickets', 'text=TKT-2026-003', 'Užklausų sąrašas: numeris, tema, tipas, prioritetas ir būsena.', [
    { n: 1, target: 'main >> text=Nauja užklausa', label: 'Nauja užklausa', text: 'parašyti mums.' },
    { n: 2, target: 'text=El. pašto nustatymai', label: 'El. pašto nustatymai', text: 'užklausos laiškais.' },
    { n: 3, target: 'table', label: 'Užklausos', text: 'spauskite temą – atsidaro susirašinėjimas.' },
  ]),
  P('uzklausos-nauja', '/tickets/new', 'text=Pateikti užklausą', 'Naujos užklausos forma: tema, aprašymas, priedai, tipas, kategorija ir prioritetas.', [
    { n: 1, target: '[id=subject]', label: 'Tema', text: 'trumpai, kas nutiko.' },
    { n: 2, target: 'text=Pridėti priedą', closest: 'div.border-dashed', label: 'Priedai', text: 'ekrano nuotrauka labai padeda.' },
    { n: 3, target: 'label=Prioritetas *', label: 'Prioritetas', text: 'kaip greitai reikia.' },
    { n: 4, target: 'text=Pateikti užklausą', label: 'Pateikti užklausą', text: 'išsiunčia mums.' },
  ]),
  P('uzklausos-viena', '/tickets/2', 'text=Pridėti komentarą', 'Užklausos puslapis: susirašinėjimas, komentaro laukas ir mygtukai.', [
    { n: 1, target: 'text=Pridėti komentarą', label: 'Pridėti komentarą', text: 'jūsų atsakymas.' },
    { n: 2, target: 'text=Uždaryti užklausą', label: 'Uždaryti užklausą', text: 'kai problema išspręsta.' },
  ]),
  P('pranesimai', '/notifications', 'text=Sąskaita paruošta', 'Pranešimų sąrašas.', []),
  P('nustatymai', '/settings', '[id=current_password]', 'Nustatymų puslapis: skirtukai, asmeniniai duomenys ir slaptažodis.', [
    { n: 1, target: 'main [role=tablist]', label: 'Skirtukai', text: 'visi nustatymai.' },
    { n: 2, target: 'label=Dabartinis slaptažodis', to: 'label=Patvirtinkite slaptažodį', label: 'Slaptažodis', text: 'dabartinis ir naujas.' },
    { n: 3, target: 'text=Atnaujinti slaptažodį', label: 'Atnaujinti slaptažodį', text: 'įsigalioja iš karto.' },
  ]),
  P('api-raktai', '/api-credentials', 'table tbody tr', 'API raktų sąrašas: pavadinimas, raktas, aplinka, būsena ir paskutinis naudojimas.', [
    { n: 1, target: 'main >> text=Naujas API raktas', label: 'Naujas API raktas', text: 'naujai programai.' },
    { n: 2, target: 'table thead th:nth-child(5)', label: 'Paskutinis naudojimas', text: 'ar raktas dar naudojamas.' },
  ]),
  P('api-raktas-naujas', '/api-credentials/add', 'text=Sukurti API raktą', 'Naujo API rakto forma: pavadinimas, aplinka, IP adresai ir pastabos.', [
    { n: 1, target: '[id=name]', label: 'Pavadinimas', text: 'kam raktas skirtas.' },
    { n: 2, target: 'label=Aplinka *', label: 'Aplinka', text: 'tikriems ar bandymo duomenims.' },
    { n: 3, target: '[id=allowed_ips]', label: 'Leistini IP adresai', text: 'raktas veiks tik iš jų.' },
    { n: 4, target: 'text=Sukurti API raktą', label: 'Sukurti API raktą', text: 'slaptas kodas rodomas vieną kartą.' },
  ]),
  P('ai-raktai', '/mcp', 'text=lmcp_demo', 'AI agento raktų puslapis: serverio adresas, prijungimo nurodymai ir jūsų raktai.', [
    { n: 1, target: 'main >> text=Naujas raktas', nth: 1, label: 'Naujas raktas', text: 'naujam asistentui.' },
    { n: 2, target: 'main [role=tablist]', label: 'Asistentas', text: 'kaip prijungti kiekvieną.' },
    { n: 3, target: 'table', label: 'Jūsų raktai', text: 'kada naudoti ir iki kada galioja.' },
  ], { clip: 'main h1', clipTo: 'table', pad: 34 }),
  P('atsiskaitymai-apzvalga', '/billing', 'text=Naujausios sąskaitos', 'Atsiskaitymų apžvalga: numatoma suma, neapmokėtos sąskaitos, naudojimas ir naujausios sąskaitos.', [
    { n: 1, target: 'text=Numatoma suma', nth: 1, closest: card, label: 'Numatoma suma', text: 'kiek kainuos šis mėnuo.' },
    { n: 2, target: 'text=Neapmokėtos sąskaitos', nth: 1, closest: card, label: 'Neapmokėtos sąskaitos', text: 'ką reikia apmokėti.' },
    { n: 3, target: 'main >> text=Dabartinis mėnuo', label: 'Dabartinis mėnuo', text: 'išsamiai.' },
    { n: 4, target: 'main >> text=Sąskaitos', nth: 1, label: 'Sąskaitos', text: 'visos sąskaitos.' },
  ]),
  P('atsiskaitymai-menuo', '/billing/current-month', 'text=Mėnesio viso', 'Dabartinio mėnesio puslapis: plano ribos, naudojimas ir kainodara.', [
    { n: 1, target: 'main [role=combobox]', nth: 1, to: 'main [role=combobox]', toNth: 2, label: 'Mėnuo', text: 'pasirinkite kitą mėnesį.' },
    { n: 2, target: 'main >> text=Mėnesinis planas', closest: card, label: 'Mėnesinis planas', text: 'kiek įeina ir kiek sunaudota.' },
    { n: 3, target: 'text=Naudojimas', nth: 1, closest: card, label: 'Naudojimas', text: 'kiekviena paslauga.' },
    { n: 4, target: 'text=Kainodaros', closest: card, label: 'Kainodaros', text: 'kas bus sąskaitoje.' },
  ]),
  P('planas', '/billing/plan', 'text=Galimi planai', 'Plano puslapis: dabartinis planas, limitų panaudojimas ir kiti planai.', [
    { n: 1, target: 'starts=Limitų panaudojimas', closest: card, label: 'Limitų panaudojimas', text: 'kiek liko.' },
    { n: 2, target: 'text=Dabartinis', nth: 1, label: 'Dabartinis', text: 'jūsų planas.' },
    { n: 3, target: 'text=Pasirinkti', nth: 1, label: 'Pasirinkti', text: 'pakeisti planą.' },
  ]),
  P('paslaugos', '/billing/services', 'text=Priedėliai', 'Paslaugų ir kainų puslapis: priedėliai su kainomis ir mygtukais „Įjungti“.', [
    { n: 1, target: 'text=Įjungti', nth: 1, label: 'Įjungti', text: 'mokestis pridedamas prie sąskaitos.' },
  ]),
  P('saskaitos-sarasas', '/billing/invoices', 'text=LOY-2026-0119', 'Sąskaitų sąrašas: sumos, filtrai, numeris, laikotarpis, būsena ir terminas.', [
    { n: 1, target: 'text=Neapmokėta', nth: 1, closest: 'div.grid', label: 'Sumos', text: 'iš viso, apmokėta, neapmokėta.' },
    { n: 2, target: 'table thead th:nth-child(5)', label: 'Mokėjimo terminas', text: 'iki kada apmokėti.' },
    { n: 3, target: 'table tbody tr:first-child td:last-child', label: 'Veiksmai', text: 'peržiūrėti, atsisiųsti PDF.' },
  ]),
  P('saskaitos-viena', '/billing/invoices/1', 'text=Sąskaitos informacija', 'Sąskaitos puslapis: būsena, suma, terminas, eilutės ir paslaugų ataskaita.', [
    { n: 1, target: 'text=Atsisiųsti', label: 'Atsisiųsti', text: 'PDF failas.' },
    { n: 2, target: 'text=Mokėjimo terminas', label: 'Mokėjimo terminas', text: 'iki kada apmokėti.' },
    { n: 3, target: 'text=Mokėti', nth: 1, label: 'Mokėti', text: 'galutinė suma.' },
  ]),
  P('saskaitos-laukia', '/billing/pending', 'main h1', 'Neapmokėtų sąskaitų puslapis: bendra suma, sąskaitos ir būsimos išlaidos.', []),
]
export default shots
