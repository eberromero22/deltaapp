/* Lógica pura de Delta Móvil: validación, mensaje de WhatsApp, listas e historial. */
(function (root) {
  'use strict';
  const DEFAULT_SETTINGS = {
    unit: 'Delta Móvil',
    phone: '',
    drivers: [],
    activities: ['Traslado de personal', 'Entrega de insumos', 'Mantenimiento preventivo', 'Patrullaje / ronda', 'Traslado de equipos', 'Gestiones administrativas'],
    incidents: ['Falla mecánica', 'Neumático', 'Luces', 'Frenos', 'Golpe / daño de carrocería', 'Fuga de fluidos', 'Check engine']
  };
  const SEVERITY = ['Leve', 'Moderada', 'Crítica'];

  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
  const clean = (s) => String(s == null ? '' : s).trim().replace(/\s+/g, ' ');

  function addUnique(list, item) {
    const v = clean(item);
    if (!v) return list.slice();
    return list.some((x) => x.toLowerCase() === v.toLowerCase()) ? list.slice() : list.concat(v);
  }
  function removeItem(list, item) { return list.filter((x) => x !== item); }

  function distance(r) {
    const a = num(r.kmStart), b = num(r.kmEnd);
    return Number.isFinite(a) && Number.isFinite(b) && b >= a ? Math.round((b - a) * 10) / 10 : NaN;
  }
  function totalFuel(r) {
    return Math.round((r.fuel || []).reduce((s, f) => s + (num(f.liters) || 0), 0) * 100) / 100;
  }

  function validate(r) {
    const e = [];
    if (!clean(r.driver)) e.push('Indica el chofer de turno.');
    const a = num(r.kmStart), b = num(r.kmEnd);
    if (!Number.isFinite(a) || a < 0) e.push('Kilometraje inicial inválido.');
    if (!Number.isFinite(b) || b < 0) e.push('Kilometraje final inválido.');
    else if (Number.isFinite(a) && b < a) e.push('El kilometraje final no puede ser menor al inicial.');
    (r.fuel || []).forEach((f, i) => {
      if (!(num(f.liters) > 0)) e.push('Recarga ' + (i + 1) + ': indica los litros.');
    });
    return e;
  }

  const fmt = (n) => new Intl.NumberFormat('es-VE', { maximumFractionDigits: 1 }).format(n);
  function fmtDate(iso) {
    const [y, m, d] = String(iso).split('-');
    return d + '/' + m + '/' + y;
  }

  function buildMessage(r, unit) {
    const L = [];
    L.push('*REPORTE DE TURNO · ' + (unit || 'Delta Móvil').toUpperCase() + '*');
    L.push('Fecha: ' + fmtDate(r.date) + ' | Turno: ' + (r.shift || '-'));
    L.push('Chofer: ' + clean(r.driver));
    L.push('');
    L.push('*Kilometraje*');
    L.push('Inicial: ' + fmt(num(r.kmStart)) + ' km');
    L.push('Final: ' + fmt(num(r.kmEnd)) + ' km');
    const d = distance(r);
    L.push('Recorrido: ' + (Number.isNaN(d) ? '-' : fmt(d) + ' km'));
    L.push('');
    L.push('*Combustible*');
    if (r.fuel && r.fuel.length) {
      r.fuel.forEach((f, i) => L.push((i + 1) + '. ' + fmt(num(f.liters)) + ' L' + (clean(f.cost) ? ' · ' + clean(f.cost) : '') + (clean(f.km) ? ' · km ' + clean(f.km) : '')));
      L.push('Total: ' + fmt(totalFuel(r)) + ' L');
    } else L.push('Sin recargas');
    L.push('');
    L.push('*Actividades*');
    if (r.activities && r.activities.length) r.activities.forEach((a) => L.push('✔ ' + a));
    else L.push('Sin actividades registradas');
    L.push('');
    L.push('*Incidencias del vehículo*');
    if (r.incidents && r.incidents.length) r.incidents.forEach((i) => L.push('⚠ ' + i.name + ' (' + i.severity + ')' + (clean(i.note) ? ': ' + clean(i.note) : '')));
    else L.push('Sin novedades');
    if (clean(r.notes)) { L.push(''); L.push('*Observaciones*'); L.push(clean(r.notes)); }
    return L.join('\n');
  }

  function waLink(text, phone) {
    const p = String(phone || '').replace(/\D/g, '');
    return 'https://wa.me/' + p + '?text=' + encodeURIComponent(text);
  }

  function newId() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function saveReport(history, r) {
    const rec = Object.assign({}, r, { id: r.id || newId(), savedAt: r.savedAt || new Date().toISOString() });
    const rest = history.filter((h) => h.id !== rec.id);
    return [rec].concat(rest).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.savedAt < b.savedAt ? 1 : -1));
  }
  function mergeSettings(s) { return Object.assign({}, DEFAULT_SETTINGS, s || {}); }

  const api = { fmt, DEFAULT_SETTINGS, SEVERITY, num, clean, addUnique, removeItem, distance, totalFuel, validate, buildMessage, waLink, saveReport, mergeSettings, fmtDate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Core = api;
})(typeof self !== 'undefined' ? self : this);
