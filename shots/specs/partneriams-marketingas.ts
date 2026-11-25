import type { Shot } from '../types.ts'

const card = 'div.shadow-card'
const P = (id: string, url: string, ready: string, alt: string, marks: Shot['marks'], more: Partial<Shot> = {}): Shot => ({ id, app: 'portal', url: `/lt${url}`, ready, alt, marks, ...more })
// A long list: the head of the page and the first rows.
const head = { clip: 'main h1', clipTo: 'table tbody tr:nth-child(6)', pad: 30 }

const shots: Shot[] = [
  P('push-kampanijos', '/push/campaigns', 'text=Advento dovanos', 'Push kampanijų sąrašas: skaičiai, filtrai ir trys kampanijos su gavėjais bei pristatymu.', [
    { n: 1, target: 'main >> text=Sukurti kampaniją', label: 'Sukurti kampaniją', text: 'naujas pranešimas.' },
    { n: 2, target: 'table thead th:nth-child(3)', to: 'table thead th:nth-child(5)', label: 'Rezultatai', text: 'gavėjai, išsiųsta, pristatymo rodiklis.' },
    { n: 3, target: 'button[aria-label="Peržiūrėti"]', nth: 1, label: 'Peržiūrėti', text: 'kampanijos puslapis.' },
  ]),
  P('push-nauja', '/push/campaigns/add', 'text=Siųsti kampaniją', 'Push kampanijos forma: pavadinimas, antraštė, tekstas, paveikslėlis, nuoroda, auditorija; dešinėje gavėjų skaičius.', [
    { n: 1, target: '[id=name]', label: 'Kampanijos pavadinimas', text: 'klientai jo nemato.' },
    { n: 2, target: '[id=title]', to: '[id=body]', label: 'Antraštė ir tekstas', text: 'ką klientas mato telefone.' },
    { n: 3, target: '[id=action_url]', label: 'Nuoroda paspaudus', text: 'kur klientas pateks.' },
    { n: 4, target: 'text=Tikslinė auditorija', closest: card, label: 'Tikslinė auditorija', text: 'kam siųsti.' },
    { n: 5, target: 'text=Gavėjų skaičius', closest: card, label: 'Gavėjų skaičius', text: 'kiek gaus ir kiek liko plane.' },
    { n: 6, target: 'text=Siųsti kampaniją', to: 'text=Išsaugoti juodraštį', label: 'Siųsti ar išsaugoti', text: 'išsiųsto atšaukti negalima.' },
  ]),
  P('push-viena', '/push/campaigns/1', 'text=Statistika', 'Išsiųstos push kampanijos puslapis: pranešimo peržiūra, informacija ir statistika.', [
    { n: 1, target: 'text=Pranešimo peržiūra', closest: card, label: 'Pranešimo peržiūra', text: 'ką gavo klientas.' },
    { n: 2, target: 'text=Statistika', closest: card, label: 'Statistika', text: 'gavėjai, sėkmingi ir nesėkmingi siuntimai.' },
  ]),
  P('push-taisykles', '/push/automations', 'text=Seniai nesilankė', 'Push automatizavimo taisyklės: gimtadienio sveikinimas ir priminimas seniai nesilankiusiems.', [
    { n: 1, target: 'main >> text=Pridėti taisyklę', label: 'Pridėti taisyklę', text: 'nauja taisyklė.' },
    { n: 2, target: 'table thead th:nth-child(2)', label: 'Tipas', text: 'kada siunčiama.' },
    { n: 3, target: 'table thead th:nth-child(5)', label: 'Išsiųsta', text: 'kiek pranešimų išėjo.' },
    { n: 4, target: 'table tbody tr:first-child td:last-child', label: 'Veiksmai', text: 'redaguoti, sustabdyti, ištrinti.' },
  ]),
  P('push-taisykle', '/push/automations/add', 'text=Išsaugoti taisyklę', 'Push taisyklės forma: pavadinimas, kintamieji, AI, antraštė, tekstas, kada ir kaip dažnai siųsti.', [
    { n: 1, target: '[id=name]', label: 'Pavadinimas', text: 'matote tik jūs.' },
    { n: 2, target: 'starts=Galimi kintamieji', closest: 'div.border', label: 'Galimi kintamieji', text: 'įterpia kliento vardą, taškus ir kita.' },
    { n: 3, target: 'text=Generuoti su AI', closest: 'div.border', label: 'Generuoti su AI', text: 'pasiūlo tekstą.' },
    { n: 4, target: '[id=title]', to: '[id=body]', label: 'Pranešimas', text: 'ką klientas gaus.' },
    { n: 5, target: 'text=Paleidimo konfigūracija', closest: card, label: 'Paleidimo konfigūracija', text: 'kada, kokiu laiku ir kaip dažnai.' },
    { n: 6, target: 'text=Išsaugoti taisyklę', label: 'Išsaugoti taisyklę', text: 'įjungta veikia iš karto.' },
  ]),
  P('sms-kampanijos', '/sms/campaigns', 'text=Rudens akcija', 'SMS kampanijų sąrašas: juodraštis, suplanuota ir išsiųsta kampanija.', [
    { n: 1, target: 'main >> text=Sukurti kampaniją', label: 'Sukurti kampaniją', text: 'nauja kampanija.' },
    { n: 2, target: 'table thead th:nth-child(2)', to: 'table thead th:nth-child(3)', label: 'Statusas ir patvirtinimas', text: 'išsiunčiama tik patvirtinta.' },
    { n: 3, target: 'button[title="Dubliuoti"]', nth: 1, label: 'Dubliuoti', text: 'kopija naujai kampanijai.' },
    { n: 4, target: 'button[title="Atšaukti kampaniją"]', label: 'Atšaukti kampaniją', text: 'kol dar neišsiųsta.' },
  ]),
  P('sms-nauja', '/sms/campaigns/add', 'text=Pateikti patvirtinimui', 'SMS kampanijos forma: pavadinimas, siuntėjas, šablonas, tekstas, gavėjai, planavimas; dešinėje kaina ir peržiūra.', [
    { n: 1, target: 'label=Siuntėjo vardas *', label: 'Siuntėjo vardas', text: 'ką klientas mato vietoj numerio.' },
    { n: 2, target: 'text=Generuoti su AI', closest: 'div.border', label: 'Generuoti su AI', text: 'pasiūlo tekstą.' },
    { n: 3, target: 'text=Žinutės turinys *', closest: 'div.space-y-2', label: 'Žinutės turinys', text: 'po juo – ženklai ir dalys.' },
    { n: 4, target: 'starts=Iš sutikimų', label: 'Iš sutikimų', text: 'tie, kurie sutiko.' },
    { n: 5, target: 'text=Planavimas', closest: card, label: 'Planavimas', text: 'siųsti vėliau.' },
    { n: 6, target: 'text=Numatoma kaina', closest: card, label: 'Numatoma kaina', text: 'kiek kainuos.' },
    { n: 7, target: 'text=Pateikti patvirtinimui', label: 'Pateikti patvirtinimui', text: 'Loyalty.lt peržiūri prieš siunčiant.' },
  ]),
  P('sms-viena', '/sms/campaigns/1', 'text=Žinutės turinys', 'Išsiųstos SMS kampanijos puslapis: išsiųsta, pristatyta, nepavyko, kaina, tekstas ir laikai.', [
    { n: 1, target: 'text=Pristatyta', nth: 1, closest: 'div.grid', label: 'Rezultatai', text: 'pristatyta, nepavyko, kaina.' },
    { n: 2, target: 'main [role=tab]:nth-child(2)', label: 'Gavėjai', text: 'kiekvienas numeris.' },
    { n: 3, target: 'text=Dubliuoti', label: 'Dubliuoti', text: 'siųsti panašią.' },
  ]),
  P('sms-vardai', '/sms/sender-names', 'text=DemoSpa', 'Siuntėjo vardų sąrašas: patvirtintas numatytasis ir laukiantis patvirtinimo.', [
    { n: 1, target: 'text=Pridėti siuntėjo vardą', label: 'Pridėti siuntėjo vardą', text: 'naujas vardas.' },
    { n: 2, target: 'table thead th:nth-child(3)', label: 'Patvirtinimas', text: 'naudoti galima tik patvirtintą.' },
    { n: 3, target: 'text=Numatytasis', nth: 1, label: 'Numatytasis', text: 'parenkamas pats.' },
  ]),
  P('sms-sablonai', '/sms/templates', 'text=Vizito priminimas', 'SMS šablonų sąrašas: pavadinimas, turinys, kategorija ir panaudojimų skaičius.', [
    { n: 1, target: 'main >> text=Sukurti šabloną', label: 'Sukurti šabloną', text: 'naujas tekstas.' },
    { n: 2, target: 'table', label: 'Šablonai', text: 'tekstas, kategorija, kiek kartų panaudotas.' },
  ]),
  P('sms-sablonas', '/sms/templates/add', '[id=template-content]', 'SMS šablono forma: pavadinimas, aprašymas, kategorija ir žinutės tekstas.', [
    { n: 1, target: '[id=template-name]', label: 'Šablono pavadinimas', text: 'matote tik jūs.' },
    { n: 2, target: '[id=template-category]', label: 'Kategorija', text: 'reklama, priminimas ar automatinė.' },
    { n: 3, target: '[id=template-content]', label: 'Žinutės tekstas', text: 'ką gaus klientas.' },
    { n: 4, target: 'text=Peržiūra', nth: 1, label: 'Peržiūra', text: 'kaip atrodys telefone.' },
  ]),
  P('sms-taisykles', '/sms/automation', 'text=Gimtadienio SMS', 'SMS automatizavimo taisyklės: pavadinimas, trigeris, vėlinimas, būsena, kiek suveikė.', [
    { n: 1, target: 'main >> text=Sukurti taisyklę', label: 'Sukurti taisyklę', text: 'nauja taisyklė.' },
    { n: 2, target: 'table thead th:nth-child(2)', label: 'Trigerio tipas', text: 'kada siunčiama.' },
    { n: 3, target: 'table tbody tr:first-child td:last-child', label: 'Veiksmai', text: 'redaguoti, išjungti, ištrinti.' },
  ]),
  P('sms-taisykle', '/sms/automation/add', 'text=Išsaugoti taisyklę', 'SMS taisyklės forma: pavadinimas, siuntėjas, šablonas, tekstas, trigeris, valandos ir dienos.', [
    { n: 1, target: '[id=sender-name]', label: 'Siuntėjo vardas', text: 'patvirtintas vardas.' },
    { n: 2, target: '[id=automation-content]', label: 'Tekstas', text: 'iš šablono arba savas.' },
    { n: 3, target: 'label=Pasirinkite trigerį *', label: 'Trigeris', text: 'kada siųsti.' },
    { n: 4, target: 'label=Nuo valandos', to: 'label=Iki valandos', label: 'Valandos', text: 'kada siųsti galima.' },
    { n: 5, target: 'text=Išsaugoti taisyklę', label: 'Išsaugoti taisyklę', text: 'įjungta siunčia pati.' },
  ]),
  P('sms-sutikimai', '/sms/consents', 'text=Sutikimų sąrašas', 'SMS sutikimų puslapis: skaičiai, filtrai ir numeriai su šaltiniu bei data.', [
    { n: 1, target: 'text=Pridėti sutikimą', label: 'Pridėti sutikimą', text: 'vienas numeris.' },
    { n: 2, target: 'text=Masinis importas', label: 'Masinis importas', text: 'daug numerių.' },
    { n: 3, target: 'table thead th:nth-child(3)', label: 'Šaltinis', text: 'iš kur gautas sutikimas.' },
    { n: 4, target: 'button[title="Atšaukti"]', nth: 1, label: 'Atšaukti', text: 'nebesiųsti šiam numeriui.' },
  ], head),
  P('sms-zinutes', '/sms/messages', 'table tbody tr', 'SMS žinučių sąrašas: data, gavėjas, siuntėjas, turinys, būsena ir kaina.', [
    { n: 1, target: 'input[placeholder^="Ieškoti pagal numerį"]', label: 'Paieška', text: 'numeris, tekstas ar ID.' },
    { n: 2, target: 'table thead th:last-child', label: 'Kaina', text: 'kiek kainavo žinutė.' },
  ], head),
  P('sms-analitika', '/sms/analytics', 'main [role=tablist]', 'SMS analitika: skirtukai, laikotarpis ir rodikliai.', [
    { n: 1, target: 'main [role=tablist]', label: 'Skirtukai', text: 'efektyvumas, automatizacija, įžvalgos.' },
  ]),
  P('pastas-kampanijos', '/email/campaigns', 'text=Rudens naujienos', 'El. pašto kampanijų sąrašas: juodraštis, suplanuota ir išsiųsta.', [
    { n: 1, target: 'main >> text=Sukurti kampaniją', label: 'Sukurti kampaniją', text: 'naujas laiškas.' },
    { n: 2, target: 'table', label: 'Kampanijų sąrašas', text: 'būsena, gavėjai ir rezultatai.' },
  ]),
  P('pastas-nauja', '/email/campaigns/add', 'text=Sekimas', 'Naujos el. pašto kampanijos žingsniai: pavadinimas, kam, nuo, tema, siuntimo laikas, turinys, sekimas.', [
    { n: 1, target: 'text=Kam', label: 'Kam', text: 'gavėjai ir jų skaičius.' },
    { n: 2, target: 'text=Tema', label: 'Tema', text: 'ką klientas mato pašto dėžutėje.' },
    { n: 3, target: 'text=Turinys', label: 'Turinys', text: 'laiško dizainas.' },
    { n: 4, target: 'text=Baigti vėliau', label: 'Baigti vėliau', text: 'išsaugo juodraštį.' },
    { n: 5, target: 'text=Siųsti dabar', label: 'Siųsti dabar', text: 'neatšaukiama.' },
  ]),
  P('pastas-viena', '/email/campaigns/1', 'text=Laiško turinys', 'Išsiųstos el. pašto kampanijos puslapis: gavėjai, atidaryta, paspausta, atmesta ir laiško turinys.', [
    { n: 1, target: 'text=Gavėjai', nth: 1, closest: 'div.grid', label: 'Rezultatai', text: 'atidaryta, paspausta, atmesta, atsisakė.' },
    { n: 2, target: 'main [role=tab]:nth-child(2)', label: 'Nuorodos', text: 'ką žmonės paspaudė.' },
    { n: 3, target: 'text=Siųsti neatidariusiems', label: 'Siųsti neatidariusiems', text: 'pakartotinis laiškas.' },
  ]),
  P('pastas-sablonai', '/email/templates', 'text=Padėka už apsilankymą', 'El. pašto šablonų sąrašas.', [
    { n: 1, target: 'main >> text=Sukurti šabloną', label: 'Sukurti šabloną', text: 'atidaro redaktorių.' },
    { n: 2, target: 'table tbody tr:first-child td:last-child', label: 'Veiksmai', text: 'redaguoti, ištrinti.' },
  ]),
  P('pastas-auditorijos', '/email/segments', 'text=Nesilankė 60 dienų', 'El. pašto auditorijų sąrašas su gavėjų skaičiumi.', [
    { n: 1, target: 'main >> text=Sukurti auditoriją', label: 'Sukurti auditoriją', text: 'naujas išsaugotas filtras.' },
    { n: 2, target: 'table thead th:nth-child(3)', label: 'Gavėjai', text: 'kiek žmonių atitinka dabar.' },
  ]),
  P('pastas-taisykles', '/email/automations', 'text=Pasveikinimas po registracijos', 'El. pašto automatizavimo taisyklės su jungikliais.', [
    { n: 1, target: 'main >> text=Sukurti taisyklę', label: 'Sukurti taisyklę', text: 'nauja taisyklė.' },
    { n: 2, target: 'table button[role=switch]', nth: 1, label: 'Statusas', text: 'įjungti ar išjungti.' },
    { n: 3, target: 'table tbody tr:first-child td:last-child', label: 'Veiksmai', text: 'kas gautų, redaguoti, paleisti dabar, ištrinti.' },
  ]),
  P('pastas-domenai', '/email/domains', 'text=example.com', 'Siuntėjo domenų sąrašas: patvirtintas domenas ir veiksmai.', [
    { n: 1, target: 'text=Pridėti domeną', label: 'Pridėti domeną', text: 'naujas domenas.' },
    { n: 2, target: 'table thead th:nth-child(3)', label: 'Būsena', text: 'patvirtintas ar dar ne.' },
    { n: 3, target: 'table tbody tr:first-child td:last-child', label: 'Veiksmai', text: 'DNS įrašai, patikrinti, ištrinti.' },
  ]),
  P('pastas-sutikimai', '/email/consents', 'text=Kam siunčiame', 'El. pašto sutikimų puslapis: kam siunčiame ir sutikimų sąrašas.', [
    { n: 1, target: 'text=Kam siunčiame', closest: card, label: 'Kam siunčiame', text: 'tik sutikusiems ar visiems neatsisakiusiems.' },
    { n: 2, target: 'text=Pridėti sutikimą', label: 'Pridėti sutikimą', text: 'vienas adresas.' },
    { n: 3, target: 'text=Masinis importas', label: 'Masinis importas', text: 'atsisakiusieji praleidžiami.' },
  ], head),
  P('pastas-laiskai', '/email/messages', 'text=El. laiškų sąrašas', 'Išsiųstų laiškų sąrašas: gavėjas, tema, būsena ir laikas.', [
    { n: 1, target: 'table thead th:nth-child(3)', label: 'Būsena', text: 'išsiųsta, atidaryta, paspausta.' },
  ], head),
]
export default shots
