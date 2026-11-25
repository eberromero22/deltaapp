const assert = require('assert');
const C = require('../core.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('✔', name); };
const base = () => ({ date: '2026-11-24', shift: 'Diurno', driver: 'Juan Pérez', kmStart: '1000', kmEnd: '1085,5', fuel: [], activities: [], incidents: [], notes: '' });

t('distancia', () => assert.strictEqual(C.distance(base()), 85.5));
t('distancia inválida', () => assert.ok(Number.isNaN(C.distance({ kmStart: 5, kmEnd: 2 }))));
t('validate ok', () => assert.deepStrictEqual(C.validate(base()), []));
t('validate chofer vacío', () => assert.ok(C.validate({ ...base(), driver: ' ' }).length === 1));
t('validate km final < inicial', () => assert.ok(C.validate({ ...base(), kmEnd: 10 })[0].includes('menor')));
t('validate km vacío', () => assert.ok(C.validate({ ...base(), kmStart: '', kmEnd: '' }).length === 2));
t('validate litros', () => assert.ok(C.validate({ ...base(), fuel: [{ liters: '0' }] }).length === 1));
t('total combustible', () => assert.strictEqual(C.totalFuel({ fuel: [{ liters: '10,5' }, { liters: 20 }] }), 30.5));
t('addUnique sin duplicados', () => assert.deepStrictEqual(C.addUnique(['Ronda'], ' ronda '), ['Ronda']));
t('addUnique agrega', () => assert.deepStrictEqual(C.addUnique(['A'], 'B'), ['A', 'B']));
t('addUnique vacío', () => assert.deepStrictEqual(C.addUnique(['A'], '  '), ['A']));
t('removeItem', () => assert.deepStrictEqual(C.removeItem(['A', 'B'], 'A'), ['B']));
t('mensaje completo', () => {
  const m = C.buildMessage({ ...base(), fuel: [{ liters: 30, cost: '$40', km: '1050' }], activities: ['Ronda'], incidents: [{ name: 'Luces', severity: 'Leve', note: 'Faro izq.' }], notes: 'Todo bien' }, 'Delta 1');
  ['REPORTE DE TURNO · DELTA 1', '24/11/2026', 'Juan Pérez', 'Recorrido: 85,5 km', 'Total: 30 L', '✔ Ronda', 'Luces (Leve): Faro izq.', 'Todo bien'].forEach((s) => assert.ok(m.includes(s), s));
});
t('mensaje vacío', () => { const m = C.buildMessage(base()); assert.ok(m.includes('Sin recargas') && m.includes('Sin novedades') && m.includes('Sin actividades')); });
t('waLink', () => { const u = C.waLink('hola mundo\n*x*', '+58 412-123'); assert.ok(u.startsWith('https://wa.me/58412123?text=hola%20mundo%0A')); });
t('waLink sin número', () => assert.ok(C.waLink('x', '').startsWith('https://wa.me/?text=')));
t('saveReport reemplaza por id y ordena', () => {
  let h = C.saveReport([], { ...base(), id: 'a', date: '2026-11-01' });
  h = C.saveReport(h, { ...base(), id: 'b', date: '2026-11-05' });
  h = C.saveReport(h, { ...base(), id: 'a', date: '2026-11-01', driver: 'Otro' });
  assert.strictEqual(h.length, 2); assert.strictEqual(h[0].id, 'b'); assert.strictEqual(h[1].driver, 'Otro');
});
t('mergeSettings', () => assert.strictEqual(C.mergeSettings({ unit: 'X' }).activities.length, C.DEFAULT_SETTINGS.activities.length));
console.log('\n' + n + '/' + n + ' pruebas OK');
// --- PDF ---
const { buildPdf, CREDIT } = require('../report.js');
const jpg = (n) => new Uint8Array(n).fill(7);
t('PDF: estructura y xref válidos', () => {
  const pdf = buildPdf([{ w: 10, h: 14, data: jpg(50) }, { w: 10, h: 14, data: jpg(80) }]);
  const txt = Buffer.from(pdf).toString('latin1');
  assert.ok(txt.startsWith('%PDF-1.4') && txt.trimEnd().endsWith('%%EOF'));
  assert.ok(txt.includes('/Count 2'));
  const xpos = +txt.match(/startxref\n(\d+)/)[1]; assert.ok(txt.slice(xpos).startsWith('xref'));
  const offs = [...txt.slice(xpos).matchAll(/(\d{10}) 00000 n/g)].map((m) => +m[1]);
  assert.strictEqual(offs.length, 8);
  offs.forEach((o, i) => assert.ok(txt.slice(o).startsWith((i + 1) + ' 0 obj'), 'obj ' + (i + 1)));
});
t('PDF: longitud de imagen correcta', () => { const txt = Buffer.from(buildPdf([{ w: 1, h: 1, data: jpg(123) }])).toString('latin1'); assert.ok(txt.includes('/Length 123')); });
t('firma de crédito', () => assert.strictEqual(CREDIT, 'Desarrollado por analista de sistemas Eber Romero'));
console.log(n + '/' + n + ' pruebas OK (con PDF)');
