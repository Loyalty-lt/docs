import type { Shot } from '../types.ts'

const shots: Shot[] = [
  {
    id: 'kasa-klientas-paieska',
    app: 'till',
    url: '/',
    alt: 'Kliento paieška telefonu: perjungiklis, numerio laukas, klaviatūra ir mygtukas „Rasti arba užregistruoti“.',
    setup: [{ click: 'text=Rankiniu būdu' }, { wait: 'starts=Telefonas' }, { click: 'starts=Telefonas' }, { pause: 600 }, { keys: '61199002' }],
    marks: [
      { n: 1, target: 'starts=Kortelė', label: 'Kortelė', text: 'ieškoti pagal 9 skaitmenų kortelės numerį.' },
      { n: 2, target: 'starts=Telefonas', label: 'Telefonas', text: 'ieškoti pagal telefono numerį. Kasa įsimena, ką naudojote paskutinį kartą.' },
      { n: 3, target: 'text=Rasti arba užregistruoti', label: 'Rasti arba užregistruoti', text: 'esamas klientas atsidaro iškart, naujam – registracijos langas.' },
    ],
  },
  {
    id: 'kasa-klientas-naujas',
    app: 'till',
    url: '/',
    alt: 'Naujo kliento registracija: telefonas, vardas, pavardė, el. paštas, dvi sutikimų varnelės, kortelės numeris ir SMS kalba.',
    setup: [{ click: 'text=Naujas' }, { wait: 'text=Registruoti' }, { keys: '61199001' }, { wait: 'starts=Klientas sutinka gauti naujienas SMS' }],
    marks: [
      { n: 1, target: 'starts=Klientas sutinka gauti naujienas SMS', label: 'Klientas sutinka gauti naujienas SMS žinutėmis', text: 'pažymėkite tik klientui sutikus.' },
      { n: 2, target: 'starts=Klientas sutinka gauti naujienas el. paštu', label: 'Klientas sutinka gauti naujienas el. paštu', text: 'klientas gaus laišką ir jame patvirtins.' },
      { n: 3, target: 'text=Registruoti', label: 'Registruoti', text: 'sukuria klientą ir atidaro jį kasoje.' },
    ],
  },
]
export default shots
