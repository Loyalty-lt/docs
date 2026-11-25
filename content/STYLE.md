# Kaip rašomas vadovas

Taisyklės kiekvienam `content/manual` puslapiui. `npm test` tikrina tai, ką gali patikrinti programa.

## Kam rašome

- **Partneris** – verslo savininkas ar vadybininkas. Skuba, programos nepažįsta.
- **Kasininkas** – skaito telefone ar kasos kompiuteryje, prie jo laukia klientas.

Žmogus turi padaryti teisingai iš pirmo karto ir nieko neklausti.

## Kalba

- Sakinys – iki 25 žodžių, viena mintis. Kreipiamės „jūs“, liepiamąja nuosaka: „Spauskite“, „Įrašykite“.
- Jokių „tiesiog“, „paprasčiausiai“, „akivaizdu“.
- „Taškai“ – visada pilnu žodžiu. Prekės ženklas – visada „Loyalty.lt“.
- Skaičiai skaitmenimis: 3 parduotuvės.
- Kalbame apie tai, ką žmogus mato ir daro. Ne apie serverius, duomenų bazes ar mūsų sprendimus.

## Ekrano žodžiai

- Mygtukas, skirtukas, laukas – tiksliai kaip ekrane: `<Ui>Pridėti parduotuvę</Ui>`. Niekada iš atminties.
- Kelias meniu: `<Path>Parduotuvės → Visos parduotuvės</Path>`.
- Pranešimas – kabutėse, kaip jį rašo programa.

## Puslapis apie ekraną

1. Vienas du sakiniai, kam jis skirtas.
2. Kaip patekti.
3. Ekranas iš arti: viena nuotrauka, iki 7 numerių.
4. Kiekviena užduotis – atskiras skyrius su žingsniais. Žingsnis – vienas veiksmas.
5. Įspėjimas **prieš** veiksmą, kuris siunčia, kainuoja ar neatšaukiamas (`<Callout>`).
6. „Jei kas nors nepavyko“ – lentelė: ką matote, ką daryti.
7. „Susiję puslapiai“.

`screen:` antraštėje – koks tai ekranas (portalo kelias be kalbos, id vietoje `[id]`; kasos – `kasa:<vardas>`). Pagal jį „Pagalba“ portale atidaro tinkamą puslapį.

## Nuotraukos

- Daro skriptas: `npm run shots -- --only 'parduotuves-*'`. Ranka nieko nekeičiame.
- Duomenys – tik išgalvoti (`shots/seed`). Prieš perfotografuojant viską: `npm run shots:seed`.
- Žyma = skaičius + ekrano žodžiai + ką tai daro (trumpa frazė su tašku).
- Pasikeitė ekranas – perfotografuokite ir peržiūrėkite. Skriptas krenta, jei žymimo dalyko nebėra.
