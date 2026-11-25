import type { Shot } from '../types.ts'

const one = { app: 'portal' as const, url: '/lt/customers/40', ready: 'text=DS-01175' }
const dialog = '[role=dialog]'

const shots: Shot[] = [
  {
    id: 'klientai-sarasas',
    app: 'portal',
    url: '/lt/customers',
    ready: 'text=puslapis 1 iš 4',
    alt: 'Klientų puslapis: paieška, filtrai, AI paieška žodžiais ir klientų sąrašas su lygiu bei taškais.',
    marks: [
      { n: 1, target: 'input[placeholder^="Ieškoti pagal vardą"]', label: 'Paieška', text: 'vardas, el. paštas ar telefonas.' },
      { n: 2, target: 'text=Rasti klientus žodžiais', closest: 'div.border', label: 'Rasti klientus žodžiais', text: 'AI parenka filtrus pagal jūsų sakinį.' },
      { n: 3, target: 'main [role=combobox]', nth: 1, to: 'text=Prisijungimo datos', label: 'Filtrai', text: 'kortelė, lygis, taškai, data.' },
      { n: 4, target: 'text=Eksportuoti', label: 'Eksportuoti', text: 'sąrašas CSV arba Excel faile.' },
      { n: 5, target: 'table', label: 'Klientų sąrašas', text: 'akis – kliento puslapis, pieštukas – keisti duomenis.' },
      { n: 6, target: 'text=Importuoti korteles', label: 'Importuoti korteles', text: 'įkelti turimą klientų sąrašą.' },
    ],
  },
  {
    id: 'klientai-vienas',
    ...one,
    alt: 'Kliento puslapis: kontaktai, lygis ir taškai, kortelė su QR kodu, sutikimai ir pirkimai.',
    marks: [
      { n: 1, target: 'text=Redaguoti', label: 'Redaguoti', text: 'keisti kliento duomenis.' },
      { n: 2, target: 'text=Priskirti lygį', label: 'Priskirti lygį', text: 'lygis ranka.' },
      { n: 3, target: 'text=Kortelės ID:', closest: 'div.border', label: 'QR kodas', text: 'tas pats, kurį klientas rodo kasoje.' },
      { n: 4, target: 'text=Sutikimai', closest: 'div.shadow-card', label: 'Sutikimai', text: 'SMS ir el. laiškų.' },
      { n: 5, target: 'table', label: 'Transakcijų istorija', text: 'visi pirkimai; akis – pirkimo puslapis.' },
    ],
  },
  {
    id: 'klientai-redaguoti',
    ...one,
    viewport: [1440, 1000],
    setup: [{ click: 'text=Redaguoti' }, { wait: 'text=Kliento duomenys' }, { pause: 500 }],
    clip: dialog,
    alt: 'Kliento duomenų langas: vardas, telefonas, el. paštas, gimimo data, lytis ir adresas.',
    marks: [
      { n: 1, target: '[id=contact-phone]', label: 'Telefonas', text: 'tuo numeriu klientas jungiasi programėlėje.' },
      { n: 2, target: '[role=dialog] >> text=Gimimo data', label: 'Gimimo data', text: 'reikalinga gimtadienio dovanoms.' },
      { n: 3, target: '[role=dialog] >> text=Išsaugoti', label: 'Išsaugoti', text: 'įsigalioja iš karto.' },
    ],
  },
  {
    id: 'klientai-lygis',
    ...one,
    setup: [{ click: 'text=Priskirti lygį' }, { wait: 'text=Priskirti lygį rankiniu būdu' }, { pause: 500 }],
    clip: dialog,
    alt: 'Lygio priskyrimo langas: lygis, galiojimas ir priežastis.',
    marks: [
      { n: 1, target: '[id=tier-choice]', label: 'Lojalumo lygis', text: 'kurį lygį duoti.' },
      { n: 2, target: '[role=dialog] >> text=Galioja iki', label: 'Galioja iki', text: 'tuščia – neribotai.' },
      { n: 3, target: '[id=tier-reason]', label: 'Priežastis', text: 'pastaba jums.' },
    ],
  },
  {
    id: 'klientu-importas-failas',
    app: 'portal',
    url: '/lt/customers/import',
    ready: 'text=Importavimo gairės',
    alt: 'Klientų importo pirmas žingsnis: šablonas, failo įkėlimas ir stulpelių paaiškinimai.',
    marks: [
      { n: 1, target: 'starts=Žingsnis 1', label: 'Žingsniai', text: 'iš viso 4.' },
      { n: 2, target: 'text=Atsisiųsti Excel šabloną', label: 'Atsisiųsti Excel šabloną', text: 'jei savo failo neturite.' },
      { n: 3, target: 'text=Pasirinkti', closest: 'div.border-dashed', label: 'Jūsų failas', text: 'Excel arba CSV.' },
      { n: 4, target: 'text=Toliau', label: 'Toliau', text: 'stulpelių priskyrimas.' },
    ],
  },
  {
    id: 'transakcijos-sarasas',
    app: 'portal',
    url: '/lt/transactions',
    ready: 'text=puslapis 1 iš 12',
    alt: 'Transakcijų sąrašas: filtrai, nuorodos numeris, data, klientas, parduotuvė, darbuotojas, suma, taškai ir būsena.',
    marks: [
      { n: 1, target: 'input[placeholder^="Ieškoti pagal nuorodos"]', label: 'Paieška', text: 'nuorodos numeris arba klientas.' },
      { n: 2, target: 'main [role=combobox]', nth: 1, to: 'text=Datos intervalas', label: 'Filtrai', text: 'parduotuvė, darbuotojas, būsena, data.' },
      { n: 3, target: 'text=DS-R0001', closest: 'tr', label: 'Grąžinimas', text: 'suma su minusu.' },
      { n: 4, target: 'table thead th:nth-child(5)', label: 'Personalas', text: 'kas pardavė.' },
      { n: 5, target: 'table tbody tr:first-child td:last-child', label: 'Veiksmai', text: 'atidaryti pirkimą.' },
    ],
  },
  {
    id: 'transakcijos-viena',
    app: 'portal',
    url: '/lt/transactions/161',
    ready: 'text=Pirkimo išklotinė',
    alt: 'Pirkimo puslapis: sumokėta, taškai, nuolaida, išklotinė pagal dalis, klientas, darbuotojas, kasa ir parduotuvė.',
    marks: [
      { n: 1, target: 'text=Sumokėta', nth: 1, closest: 'div.grid', label: 'Santrauka', text: 'kiek sumokėta, taškų ir nuolaidos.' },
      { n: 2, target: 'text=Pirkimo išklotinė', closest: 'div.shadow-card', label: 'Pirkimo išklotinė', text: 'kiekviena dalis atskirai.' },
      { n: 3, target: 'main >> text=Klientas', closest: 'div.shadow-card', label: 'Klientas', text: 'kas pirko.' },
      { n: 4, target: 'main >> text=Darbuotojas', closest: 'div.shadow-card', label: 'Darbuotojas', text: 'kas pardavė.' },
      { n: 5, target: 'main >> text=Kasa', closest: 'div.shadow-card', label: 'Kasa', text: 'kokiu įrenginiu.' },
    ],
  },
  {
    id: 'mokejimu-surinkimas',
    app: 'portal',
    url: '/lt/payment-collection',
    ready: 'text=Mokesčių skaičiuoklė',
    alt: 'Mokėjimų surinkimo puslapis: kaip veikia, kainos, skaičiuoklė, nustatymai ir Stripe paskyros susiejimas.',
    marks: [
      { n: 1, target: 'text=Kainų struktūra', closest: 'div.shadow-card', label: 'Kainų struktūra', text: 'Stripe ir platformos mokesčiai.' },
      { n: 2, target: 'text=Mokesčių skaičiuoklė', closest: 'div.shadow-card', label: 'Mokesčių skaičiuoklė', text: 'kiek liks nuo sumos.' },
      { n: 3, target: 'text=Prieinami nuolaidų kodai', closest: 'div.shadow-card', label: 'Nuolaidos kodas', text: 'jei jį turite.' },
      { n: 4, target: 'text=Sukurti Stripe paskyrą', label: 'Sukurti Stripe paskyrą', text: 'nuo čia pradedama.' },
    ],
  },
]
export default shots
