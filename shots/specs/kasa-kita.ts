import type { Shot, Step } from '../types.ts'

// The customer used on the till's pages, scanned by their card.
const card: Step[] = [{ scan: '700004795' }, { wait: 'starts=Ankstesni pirkimai' }, { pause: 800 }]
const goods: Step[] = [...card, { keys: '10000' }, { click: 'text=OK' }, { wait: 'starts=Kosmetika', nth: 1 }, { press: '1' }, { pause: 900 }]
const till = (id: string, alt: string, setup: Step[], marks: Shot['marks'], more: Partial<Shot> = {}): Shot => ({ id, app: 'till', url: '/', alt, setup, marks, ...more })

const shots: Shot[] = [
  {
    id: 'kasa-prisijungti', app: 'till-out', url: '/', ready: 'starts=Prisijung', clip: 'text=Keisti kalbą', clipTo: 'starts=Įrenginys', pad: 60, viewport: [760, 720],
    alt: 'Prisijungimo langas: laukas darbuotojo kodui, klaviatūros ir kameros mygtukai, „Prisijungti“, apačioje įrenginio kodas.',
    marks: [
      { n: 1, target: 'text=Rodyti klaviatūrą', label: 'Klaviatūra', text: 'ekraninė klaviatūra kodui įvesti.' },
      { n: 2, target: 'text=Nuskenuoti QR kodą', label: 'Kamera', text: 'nuskenuoja QR kodą nuo darbuotojo kortelės.' },
      { n: 3, target: 'text=Prisijungti', label: 'Prisijungti', text: 'prisijungia įvestu kodu.' },
      { n: 4, target: 'starts=Įrenginys', label: 'Įrenginys', text: 'šios kasos kodas, programos versija ir serveris.' },
      { n: 5, target: 'text=Keisti kalbą', label: 'Keisti kalbą', text: 'lietuvių arba anglų.' },
    ],
  },
  till('kasa-kas-dirba', 'Langas „Kas dirba?“ su darbuotojų sąrašu.', [{ click: 'text=Keisti darbuotoją' }, { wait: 'text=Kas dirba?' }, { pause: 600 }], [
    { n: 1, target: 'starts=JP Jonas', label: 'Darbuotojas', text: 'pasirinkite save pele ar skaičiumi dešinėje.' },
    { n: 2, target: 'text=Kitas darbuotojas (su kodu)', label: 'Kitas darbuotojas (su kodu)', text: 'kai jūsų sąraše dar nėra.' },
  ], { viewport: [1100, 620], clip: 'text=Kas dirba?', clipTo: 'text=Kitas darbuotojas (su kodu)', pad: 80 }),
  till('kasa-pin', 'PIN įvedimo langas.', [{ click: 'text=Keisti darbuotoją' }, { wait: 'text=Kas dirba?' }, { pause: 600 }, { press: '1' }, { wait: 'text=Įveskite PIN' }, { pause: 500 }], [
    { n: 1, target: 'text=1', to: 'text=9', label: 'PIN', text: '4 skaitmenys. Įvedus ketvirtą, kasa atsirakina pati.' },
    { n: 2, target: 'text=Jungtis kodu', label: 'Jungtis kodu', text: 'pamiršus PIN prisijunkite darbuotojo kodu.' },
  ], { viewport: [1100, 720], clip: 'text=1', clipTo: 'text=Jungtis kodu', pad: 150 }),
  till('kasa-klientas-kortele', 'Klientas kasoje: vardas, lygis, taškai, žaidimai, kuponai ir ankstesni pirkimai.', card, [
    { n: 1, target: 'text=Vytautas Išgalvotas', label: 'Klientas', text: 'vardas ir kortelės numeris.' },
    { n: 2, target: 'starts=Sidabrinis', to: 'starts=Gimtadienis', label: 'Lygis', text: 'paspaudę matote lygio nuolaidą ir kiek liko iki kito lygio. Šalia – gimtadienio ženklas.' },
    { n: 3, target: 'starts=431 Kliento', label: 'Kliento taškai', text: 'kiek taškų turi dabar.' },
    { n: 4, target: 'starts=1 Žaidimai', to: 'starts=2 Kuponai', label: 'Žaidimai ir Kuponai', text: 'kiek jų turi klientas; paspaudę atidarysite.' },
    { n: 5, target: 'text=Ankstesni pirkimai', label: 'Ankstesni pirkimai', text: 'istorija ir grąžinimas.' },
    { n: 6, target: 'text=Atnaujinti', nth: 2, label: 'Atnaujinti', text: 'iš naujo įkelia kliento taškus ir kuponus.' },
    { n: 7, target: 'text=Pašalinti klientą', label: 'Pašalinti klientą', text: 'pirkimas tęsiamas be kliento.' },
  ], { clip: 'text=Vytautas Išgalvotas', clipTo: 'starts=Mokėti (F12)', pad: 60 }),
  till('kasa-taskai-iskeitimas', 'Nuolaidos taškais langas: 200 taškų yra 10 eurų.', [...goods, { press: 'F4' }, { wait: 'starts=Turima' }, { pause: 600 }, { keys: '200' }, { pause: 500 }], [
    { n: 1, target: 'starts=Turima', label: 'Turima', text: 'kiek taškų turi klientas ir kiek jie verti.' },
    { n: 2, target: 'starts=−€10.00', label: '−€10.00', text: 'kiek bus nuimta nuo sumos.' },
    { n: 3, target: 'starts=25%', to: 'starts=72%', label: 'Greitas pasirinkimas', text: 'dažniausi kiekiai vienu paspaudimu.' },
    { n: 4, target: 'text=Pritaikyti nuolaidą', label: 'Pritaikyti nuolaidą', text: 'nuima sumą nuo pirkimo.' },
  ], { clip: 'starts=Turima', clipTo: 'text=Pritaikyti nuolaidą', pad: 70 }),
  till('kasa-kuponai', 'Kliento kuponai: du galiojantys kuponai.', [...card, { click: 'text=Kuponai' }, { wait: 'starts=DEMO-10EUR' }, { pause: 600 }], [
    { n: 1, target: 'text=Kuponai', label: 'Kuponai', text: 'šio kliento kuponai.' },
    { n: 2, target: 'starts=DEMO-10EUR', label: 'Kuponas', text: 'kodas, nuolaida ir būsena. Spauskite, kad atidarytumėte.' },
  ]),
  till('kasa-kuponas', 'Kupono langas: pavadinimas, nuolaida, sąlygos ir mygtukas „Panaudoti kuponą“.', [...card, { click: 'text=Kuponai' }, { wait: 'starts=DEMO-10EUR' }, { click: 'starts=DEMO-10EUR' }, { wait: 'text=Panaudoti kuponą' }, { pause: 600 }], [
    { n: 1, target: 'text=10 € nuolaida procedūrai', label: 'Kuponas', text: 'ką jis duoda ir kokiomis sąlygomis.' },
    { n: 2, target: 'text=Panaudoti kuponą', label: 'Panaudoti kuponą', text: 'kuponas tampa panaudotu.' },
  ], { clip: 'text=DEMO-10EUR', clipTo: 'text=Panaudoti kuponą', pad: 60 }),
  till('kasa-antspaudai', 'Antspaudų kortelės langas: progresas 0 iš 6 ir mygtukas „Pridėti antspaudus“.', [...card, { click: 'text=Žaidimai' }, { wait: 'starts=Kas šeštas' }, { click: 'starts=Kas šeštas' }, { wait: 'text=Pridėti antspaudus' }, { pause: 800 }], [
    { n: 1, target: 'starts=Antspaudų progresas', label: 'Antspaudų progresas', text: 'kiek antspaudų klientas jau turi.' },
    { n: 2, target: 'text=Pasirinkite antspaudų skaičių', label: 'Antspaudų skaičius', text: 'kiek pridėti: − ir +.' },
    { n: 3, target: 'text=Pridėti antspaudus', label: 'Pridėti antspaudus', text: 'prideda. Surinkus visus, klientas gauna prizą.' },
  ], { clip: 'starts=Antspaudų progresas', clipTo: 'text=Pridėti antspaudus', pad: 240 }),
  till('kasa-mokejimas', 'Mokėjimo langas su suma.', [...goods, { press: 'F12' }, { wait: 'text=Mokėti' }, { pause: 800 }], [
    { n: 1, target: 'text=Mokėti', label: 'Mokėti', text: 'įrašo pirkimą. Klientas iškart gauna pranešimą.' },
  ], { clip: 'text=Mokėti', pad: 270 }),
  till('kasa-atideti', 'Atidėtų pirkimų sąrašas.', [{ keys: '4500' }, { click: 'text=OK' }, { wait: 'starts=Procedūros', nth: 1 }, { press: '2' }, { pause: 700 }, { press: 'F8' }, { pause: 1200 }, { press: 'F9' }, { wait: 'starts=Be kliento' }, { pause: 500 }], [
    { n: 1, target: 'starts=Be kliento', nth: 1, label: 'Atidėtas pirkimas', text: 'kliento vardas, suma ir laikas. Spauskite, kad tęstumėte.' },
    { n: 2, target: 'text=Ištrinti atidėtą pirkimą', nth: 1, label: 'Ištrinti', text: 'pašalina atidėtą pirkimą.' },
  ], { clip: 'starts=Be kliento', pad: 130 }),
  till('kasa-istorija', 'Kliento ankstesni pirkimai su mygtukais „Grąžinti“.', [...card, { click: 'text=Ankstesni pirkimai' }, { wait: 'text=Grąžinti', nth: 1 }, { pause: 800 }], [
    { n: 1, target: 'text=Grąžinti', nth: 1, label: 'Grąžinti', text: 'atidaro grąžinimo langą.' },
  ]),
  till('kasa-grazinimas', 'Grąžinimo langas: pirkimo dalys su varnelėmis ir sumomis.', [...card, { click: 'text=Ankstesni pirkimai' }, { wait: 'text=Grąžinti', nth: 1 }, { pause: 600 }, { click: 'text=Grąžinti', nth: 1 }, { wait: 'starts=Grąžinti pirkimą' }, { pause: 800 }], [
    { n: 1, target: 'starts=Grąžinti 1', label: 'Grąžinti', text: 'grąžina pažymėtas dalis.' },
  ], { clip: 'starts=Grąžinti 1', pad: 260 }),
  till('kasa-skydelis', 'Kasos skydelis: klientai, taškai, pajamos ir šios dienos statistika.', [{ click: 'text=Skydelis' }, { wait: 'text=Šiandienos statistika' }, { pause: 1500 }], [
    { n: 1, target: 'text=Šiandienos statistika', label: 'Šiandienos statistika', text: 'šios dienos klientai, taškai, pajamos ir sandoriai.' },
    { n: 2, target: 'text=Mėnesio veikla', label: 'Mėnesio veikla', text: 'kiek taškų duota per pastaruosius mėnesius.' },
    { n: 3, target: 'text=Paskutinė veikla', label: 'Paskutinė veikla', text: 'pirkimai ir taškai.' },
  ], { viewport: [1440, 1250] }),
  till('kasa-nustatymai', 'Kasos nustatymai: išvaizda, kalba, parduotuvė, spausdintuvas, mokėjimo būdas ir kasos išdėstymas.', [{ click: 'text=Nustatymai' }, { wait: 'starts=Krepšelis kairėje' }, { pause: 800 }], [
    { n: 1, target: 'starts=Keisti parduotuvę', label: 'Keisti parduotuvę', text: 'kai dirbate keliose.' },
    { n: 2, target: 'starts=Spausdintuvo nustatymai', label: 'Spausdintuvo nustatymai', text: 'kvitų spausdintuvas.' },
    { n: 3, target: 'starts=Klausti mokėjimo būdo', label: 'Klausti mokėjimo būdo', text: 'prieš mokant pasirinkti grynuosius ar kortelę.' },
    { n: 4, target: 'starts=Kasos valdymas', to: 'starts=Krepšelis kairėje', label: 'Kasos išdėstymas', text: 'valdymas, klaviatūra, mygtukų dydis ir krepšelio pusė.' },
    { n: 5, target: 'starts=Pamiršti mane', label: 'Pamiršti mane šiame įrenginyje', text: 'čia vėl jungsitės kodu.' },
    { n: 6, target: 'starts=Programos versija', label: 'Programos versija', text: 'čia ją matote, kai kreipiatės pagalbos.' },
  ], { viewport: [1200, 1760] }),
  till('kasa-spausdintuvas', 'Spausdintuvo nustatymai be pridėtų spausdintuvų: mygtukai „Pridėti spausdintuvą“ ir „Ieškoti spausdintuvų“.', [{ click: 'text=Nustatymai' }, { wait: 'starts=Spausdintuvo nustatymai' }, { click: 'starts=Spausdintuvo nustatymai' }, { wait: 'starts=Pridėti spausdintuvą' }, { pause: 1200 }], [], { viewport: [1100, 900] }),
  till('kasa-klavisai', 'Klavišų trumpinių sąrašas.', [{ press: 'F1' }, { wait: 'text=Klavišų trumpiniai' }, { pause: 600 }], [], { clip: 'text=Klavišų trumpiniai', clipTo: 'text=Uždaryti', pad: 70 }),
  till('kasa-parduotuve', 'Parduotuvės pasirinkimas: paieška ir dvi parduotuvės.', [{ click: 'text=Nustatymai' }, { wait: 'starts=Keisti parduotuvę' }, { click: 'starts=Keisti parduotuvę' }, { pause: 2500 }], [
    { n: 1, target: 'starts=Demo salonas – Centras', label: 'Parduotuvė', text: 'pasirinkite tą, kurioje dirbate. Kasa ją įsimena.' },
  ], { viewport: [1100, 900] }),
]
export default shots
