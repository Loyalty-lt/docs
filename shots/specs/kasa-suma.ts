import type { Shot } from '../types.ts'

const pad = { target: 'text=7', to: 'text=Taškais' }

const shots: Shot[] = [
  {
    id: 'kasa-langas',
    app: 'till',
    url: '/',
    alt: 'Kasos langas kompiuteryje: kairėje suma, nuolaidos ir klaviatūra, viduryje greiti mygtukai, dešinėje klientas ir krepšelis.',
    marks: [
      { n: 1, target: 'label=Suma', to: 'label=€0.00', toNth: 1, label: 'Suma', text: 'kiek renkate šiuo metu.' },
      { n: 2, target: 'starts=Nuolaida (F6)', to: 'starts=Vadovo sprendimu', label: 'Nuolaida (F6)', text: 'nuolaidos, kurias leido vadovas.' },
      { n: 3, ...pad, label: 'Klaviatūra', text: 'sumai rinkti pele ar pirštu. Veikia ir kompiuterio klavišai.' },
      { n: 4, target: 'starts=Masažas 60 min', to: 'starts=Dovanų kuponas', label: 'Greiti mygtukai', text: 'dažniausios sumos vienu paspaudimu.' },
      { n: 5, target: 'text=QR', to: 'text=Naujas', label: 'Nuskenuokite kliento kortelę', text: 'trys būdai rasti ar užregistruoti klientą.' },
      { n: 6, target: 'starts=Mokėti (F12)', label: 'Mokėti (F12)', text: 'užbaigia pirkimą.' },
      { n: 7, target: 'text=Keisti darbuotoją', label: 'Keisti darbuotoją', text: 'kitas darbuotojas prisijungia savo PIN.' },
    ],
  },
  {
    id: 'kasa-suma-surinkta',
    app: 'till',
    url: '/',
    alt: 'Surinkta 100 eurų suma ir mygtukas OK.',
    setup: [{ keys: '10000' }],
    clip: 'text=Suma',
    clipTo: 'text=Taškais',
    marks: [
      { n: 1, target: 'label=€100.00', nth: 1, label: 'Suma', text: 'skaičiai renkami nuo centų: 10000 yra €100.00.' },
      { n: 2, target: 'text=OK', label: 'OK', text: 'patvirtina sumą; kompiuteryje – klavišas Enter.' },
      { n: 3, target: 'text=Išvalyti', label: 'Išvalyti', text: 'ištrina surinktą sumą; kompiuteryje – Delete.' },
    ],
  },
  {
    id: 'kasa-suma-nuolaida',
    app: 'till',
    url: '/',
    alt: 'Pritaikyta 20 procentų nuolaida: vietoj 100 eurų rodoma 80.',
    setup: [{ keys: '10000' }, { click: 'text=Nuolaida 20 %' }],
    clip: 'text=Suma',
    clipTo: 'text=Taškais',
    marks: [
      { n: 1, target: 'text=Nuolaida 20 %', label: 'Nuolaida 20 %', text: 'juodas mygtukas – nuolaida pritaikyta; dar kartą paspaudus nuimama.' },
      { n: 2, target: 'label=€100.00 −20 %', label: '€100.00 −20 %', text: 'suma be nuolaidos ir nuolaidos dydis.' },
      { n: 3, target: 'label=€80.00', nth: 1, label: '€80.00', text: 'kiek klientas mokės.' },
    ],
  },
  {
    id: 'kasa-suma-uz-ka',
    app: 'till',
    url: '/',
    alt: 'Langas „Už ką ši suma?“ su pirkimo dalimis ir suma po nuolaidos prie kiekvienos.',
    setup: [{ keys: '10000' }, { click: 'text=Nuolaida 20 %' }, { click: 'text=OK' }, { wait: 'starts=Kosmetika', nth: 1 }],
    clip: 'starts=Kosmetika',
    clipTo: 'starts=Dovanų kuponas',
    pad: 140,
    marks: [
      { n: 1, target: 'starts=Kosmetika', label: 'Kosmetika', text: 'šiai daliai nuolaida netaikoma, todėl suma liktų visa.' },
      { n: 2, target: 'starts=Procedūros', label: 'Procedūros', text: 'pažymėta iš anksto; čia matote sumą su nuolaida.' },
      { n: 3, target: 'starts=Akcijos, abonementai', to: 'starts=Dovanų kuponas', label: 'Akcijos, abonementai ir Dovanų kuponas', text: 'dalys be taškų.' },
    ],
  },
  {
    id: 'kasa-suma-krepselis',
    app: 'till',
    url: '/',
    alt: 'Krepšelis su dviem sumomis: procedūros su nuolaida ir kosmetika.',
    setup: [{ keys: '10000' }, { click: 'text=Nuolaida 20 %' }, { click: 'text=OK' }, { wait: 'starts=Kosmetika', nth: 1 }, { press: '2' }, { keys: '2490' }, { click: 'text=OK' }, { wait: 'starts=Kosmetika', nth: 1 }, { press: '1' }],
    marks: [
      { n: 1, target: 'starts=Procedūros', nth: 1, label: 'Procedūros', text: 'suma su nuolaida; po pavadinimu – nuolaida ir suma be jos.' },
      { n: 2, target: 'starts=Kosmetika', nth: 1, label: 'Kosmetika', text: 'antra suma tame pačiame pirkime.' },
      { n: 3, target: 'text=Pašalinti sumą', nth: 1, label: '×', text: 'pašalina sumą iš krepšelio.' },
      { n: 4, target: 'label=Kasos nuolaida', to: 'label=-€20.00', toNth: 1, label: 'Kasos nuolaida', text: 'kiek nuolaidos pritaikyta visam pirkimui.' },
      { n: 5, target: 'starts=Mokėti (F12)', label: 'Mokėti (F12)', text: 'galutinė suma.' },
    ],
  },
  {
    id: 'kasa-suma-priezastis',
    app: 'till',
    url: '/',
    alt: 'Langas, kuriame kasininkas įrašo nuolaidos priežastį.',
    setup: [{ keys: '10000' }, { click: 'starts=Studentams' }, { wait: 'text=Pritaikyti nuolaidą' }, { type: ['', 'Studento pažymėjimas'] }],
    clip: 'text=Pritaikyti nuolaidą',
    pad: 190,
    marks: [
      { n: 1, target: 'text=Pritaikyti nuolaidą', label: 'Pritaikyti nuolaidą', text: 'nuolaida pritaikoma tik įrašius priežastį.' },
    ],
  },
  {
    id: 'kasa-suma-telefonas',
    app: 'till',
    url: '/',
    viewport: [390, 844],
    alt: 'Kasa telefone: suma, nuolaidos, klaviatūra ir apatinė juosta.',
    ready: 'text=POS sistema',
    marks: [
      { n: 1, target: 'starts=Nuolaida 20 %', to: 'starts=Vadovo sprendimu', label: 'Nuolaida', text: 'tie patys nuolaidų mygtukai.' },
      { n: 2, target: 'text=OK', label: 'OK', text: 'patvirtina sumą.' },
    ],
  },
]
export default shots
