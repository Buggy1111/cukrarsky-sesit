// Testy výpočetní logiky a katalogu surovin. Logika je přímo v index.html mezi značkami LOGIC-START/END,
// katalog mezi `const C = (` a `const SEED_NAMES`. Spuštění: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const logic = html.slice(html.indexOf('// ============================== LOGIC-START'), html.indexOf('// =============================== LOGIC-END'))
const catalogSrc = html.slice(html.indexOf('const C = (name, group'), html.indexOf('const SEED_NAMES'))
const api = new Function(`${logic}\n${catalogSrc}\nreturn { calcRecipe, readiness, formFactor, convertUnit, vatSplit, NUTR, CATALOG, num }`)()
const { calcRecipe, readiness, formFactor, convertUnit, vatSplit, NUTR, CATALOG } = api

const ings = [
  { id: 'm', name: 'mouka', base: 'kg', price: 24, yieldPct: 100, allergens: [1], kcal: 348, fat: 1.2, sat: 0.2, carb: 73, sugar: 0.5, fiber: 3, prot: 10, salt: 0.01 },
  { id: 'v', name: 'vejce', base: 'ks', price: 6, pieceG: 50, yieldPct: 100, allergens: [3], kcal: 143, fat: 9.5, sat: 3.1, carb: 0.7, sugar: 0.7, fiber: 0, prot: 12.5, salt: 0.36 },
  { id: 'j', name: 'jahody', base: 'kg', price: 130, yieldPct: 93, kcal: 33, fat: 0.3, carb: 5.5, prot: 0.7 },
  { id: 'x', name: 'bez ceny', base: 'kg', price: 0, yieldPct: 100 },
]
const recipe = (o = {}) => ({ scale: 1, portions: 10, finishedG: 0, laborMin: 60, hourly: 200, overheadPct: 30, marginPct: 40, vatPct: 12, chosenPrice: 0, steps: '', items: [{ ingId: 'm', qty: 500 }, { ingId: 'v', qty: 5 }, { ingId: 'j', qty: 200 }], ...o })

test('kalkulace: materiál, výtěžnost, práce, režie, marže a DPH', () => {
  const c = calcRecipe(recipe(), ings)
  // 500 g mouky 12 Kč + 5 vajec 30 Kč + 200 g jahod při výtěžnosti 93 % = 215,05 g → 27,96 Kč
  assert.ok(Math.abs(c.material - 69.96) < 0.01)
  assert.equal(c.labor, 200)
  const direct = c.material + c.labor
  assert.ok(Math.abs(c.overhead - direct * 0.3) < 1e-9)
  assert.ok(Math.abs(c.net_price - c.own / 0.6) < 1e-9) // marže 40 % z ceny
  assert.ok(Math.abs(c.gross_price - c.net_price * 1.12) < 1e-9)
  assert.ok(Math.abs(c.pricePerPortion - c.gross_price / 10) < 1e-9)
})

test('násobek dávky škáluje všechno lineárně', () => {
  const a = calcRecipe(recipe(), ings), b = calcRecipe(recipe({ scale: 2 }), ings)
  assert.ok(Math.abs(b.material - 2 * a.material) < 1e-9)
  assert.equal(b.portions, 20)
  assert.ok(Math.abs(b.pricePerPortion - a.pricePerPortion) < 1e-9) // cena za kus se nemění
})

test('zvolená cena dopočítá marži zpětně', () => {
  const c = calcRecipe(recipe({ chosenPrice: 60 }), ings)
  const net = (60 / 1.12) * 10
  assert.ok(Math.abs(c.marginPct - (1 - c.own / net) * 100) < 1e-9)
})

test('alergeny se berou ze surovin s nenulovým množstvím', () => {
  assert.deepEqual(calcRecipe(recipe(), ings).allergens, [1, 3])
  assert.deepEqual(calcRecipe(recipe({ items: [{ ingId: 'j', qty: 100 }] }), ings).allergens, [])
  assert.deepEqual(calcRecipe(recipe({ items: [{ ingId: 'v', qty: 0 }] }), ings).allergens, [])
})

test('výživa na 100 g a na kus odpovídá součtu surovin', () => {
  const c = calcRecipe(recipe({ items: [{ ingId: 'm', qty: 100 }], finishedG: 100, portions: 4 }), ings)
  assert.ok(Math.abs(c.nutri100.kcal - 348) < 1e-9)
  assert.ok(Math.abs(c.nutriPortion.kcal - 87) < 1e-9)
  for (const k of NUTR) assert.ok(Number.isFinite(c.nutri100[k]) && Number.isFinite(c.nutriPortion[k]))
})

test('kontrolní seznam hlídá ceny, výživu, práci a postup', () => {
  const r = recipe({ laborMin: 0, items: [{ ingId: 'x', qty: 10 }, { ingId: '', qty: 0 }] })
  const rd = Object.fromEntries(readiness(r, calcRecipe(r, ings)).map((x) => [x.key, x.ok]))
  assert.deepEqual(rd, { items: true, price: false, nutri: false, labor: false, steps: false })
  const ok = recipe({ steps: 'Mouku prosej a dej do mísy.' })
  assert.ok(readiness(ok, calcRecipe(ok, ings)).every((x) => x.ok))
})

test('pomůcky: forma, jednotky, DPH', () => {
  assert.ok(Math.abs(formFactor('circle', { a: 24 }, { a: 28 }) - (28 / 24) ** 2) < 1e-9)
  assert.equal(formFactor('rect', { a: 20, b: 30 }, { a: 30, b: 40 }), 2)
  assert.deepEqual(convertUnit(250, 'g').map(([u, x]) => [u, x]), [['g', 250], ['dkg', 25], ['kg', 0.25]])
  assert.equal(vatSplit(121, 21, true).net.toFixed(2), '100.00')
  assert.ok(Math.abs(vatSplit(100, 12, false).gross - 112) < 1e-9)
})

test('katalog surovin je vnitřně konzistentní', () => {
  const names = new Set()
  for (const c of CATALOG) {
    assert.ok(!names.has(c.name), `duplicitní název ${c.name}`); names.add(c.name)
    assert.ok(c.sat <= c.fat + 0.01, `${c.name}: nasycené > tuky`)
    assert.ok(c.sugar <= c.carb + 0.01, `${c.name}: cukry > sacharidy`)
    assert.ok(c.fat + c.carb + c.prot + c.fiber <= 100.5, `${c.name}: součet živin přes 100 g`)
    const exempt = ['Rum 40 %', 'Prášek do pečiva', 'Jedlá soda', 'Sůl'].includes(c.name)
    if (!exempt && c.kcal > 0) {
      const calc = 9 * c.fat + 4 * (c.carb + c.prot) + 2 * c.fiber
      assert.ok(Math.abs(calc - c.kcal) / c.kcal <= 0.12, `${c.name}: energie ${c.kcal} vs vypočtená ${calc.toFixed(0)}`)
    }
  }
})
