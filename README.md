# Cukrářský sešit

Aplikace pro žáky a pracovníky cukráren, která nahrazuje školní tabulky v Excelu:

- **Receptury** se složením, násobkem dávky a přepočtem podle velikosti formy
- **Kalkulace ceny**: materiál se ztrátami (výtěžnost), práce, režie, marže, DPH, cena za kus
- **Alergeny** (všech 14) a **výživové hodnoty** podle EU (energie, tuky, nasycené, sacharidy, cukry, vláknina, bílkoviny, sůl)
- **Ceník surovin** a **katalog 46 běžných surovin** s cenami, alergeny a výživou
- **Kalkulační list** (náhled), kopírování do Excelu a textu
- Nápověda: tooltipy, slovníček, průvodce na ukázkové receptuře, rychlé hledání `Ctrl+K`, zkratky `?`

Určeno hlavně pro počítač (funguje i na tabletu a mobilu). Žádný server, žádné přihlášení.

## Spuštění

Je to jediná stránka bez závislostí.

```bash
npm start        # http://localhost:5173
npm test         # testy výpočtů a konzistence katalogu
```

nebo prostě otevři `index.html` v prohlížeči. Nasazení na Vercel/GitHub Pages: stačí publikovat repozitář jako statický web.

## Kde jsou data

Jen v prohlížeči (localStorage) na daném počítači. Zálohování a obnovení je v záložce **Záloha**. Pro sdílení ve třídě je potřeba server s databází (viz plán níže).

## Důležité o datech

Ceny a výživové hodnoty v katalogu jsou **typické a orientační**. Před použitím je ověř podle obalu konkrétního výrobku, k tomu slouží zaškrtávátko „ověřeno". Další zdroj: [Česká databáze složení potravin](https://www.nutridatabaze.cz).

## Plán

- [ ] Přizpůsobit pojmy a sloupce vzoru od učitelky (až bude k dispozici)
- [ ] Verze s databází pro celou třídu: žáci, třídy, sdílený katalog surovin, učitelský pohled
- [ ] Tisk kalkulačního listu do PDF
- [ ] Ověřit katalog podle oficiální databáze složení potravin

## Struktura

```
index.html          celá aplikace (HTML + CSS + JS)
tests/logic.test.mjs  testy výpočtů (načítají logiku přímo z index.html)
```

Výpočetní logika je v `index.html` mezi značkami `LOGIC-START` a `LOGIC-END`, katalog surovin mezi `const C = (` a `const SEED_NAMES`.
