import type { Shot } from '../types.ts'

const shots: Shot[] = [
  {
    id: 'darbuotojas-prisijungimai',
    app: 'portal',
    url: '/lt/staff/3',
    ready: 'text=Prisijungimų istorija',
    alt: 'Darbuotojo prisijungimų istorija: laikas, būdas, įrenginys, parduotuvė ir IP adresas.',
    setup: [{ click: 'text=Prisijungimų istorija' }, { wait: 'text=Neteisingas PIN' }],
    marks: [],
  },
]
export default shots
