(function () {
  'use strict';
  const C = window.Core, $ = (id) => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  let settings = C.mergeSettings(store.get('dm.settings')), history = store.get('dm.history', []), R;
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  function blank() {
    const last = history[0] || {};
    return { id: null, date: today(), shift: 'Diurno', driver: last.driver || '', kmStart: last.kmEnd || '', kmEnd: '', fuel: [], activities: [], incidents: [], notes: '' };
  }
  const toast = (m) => { const t = $('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); };
  const saveDraft = () => store.set('dm.draft', R);
  const saveSettings = () => store.set('dm.settings', settings);
  const el = (tag, props, kids) => { const e = Object.assign(document.createElement(tag), props || {}); (kids || []).forEach((k) => e.append(k)); return e; };

  function chips(box, items, isOn, onToggle, onRemove, warn) {
    box.replaceChildren();
    items.forEach((name) => {
      const b = el('button', { type: 'button', className: 'chip' + (warn ? ' warn' : '') + (isOn && isOn(name) ? ' on' : ''), textContent: name });
      if (onToggle) b.onclick = () => onToggle(name);
      if (onRemove) { const x = el('span', { className: 'x', textContent: '✕', title: 'Quitar' }); x.onclick = (e) => { e.stopPropagation(); onRemove(name); }; b.append(x); }
      box.append(b);
    });
  }
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : arr.concat(v));

  function renderForm() {
    $('unitName').textContent = settings.unit;
    ['date', 'shift', 'driver', 'kmStart', 'kmEnd', 'notes'].forEach((k) => { $(k).value = R[k]; });
    $('driverList').replaceChildren(...settings.drivers.map((d) => el('option', { value: d })));
    renderDist(); renderFuel(); renderActs(); renderIncs();
  }
  function renderDist() { const d = C.distance(R); $('dist').textContent = Number.isNaN(d) ? '—' : d + ' km'; }
  function renderFuel() {
    const box = $('fuelList'); box.replaceChildren();
    if (!R.fuel.length) { box.append(el('p', { className: 'muted', textContent: 'Sin recargas. Agrega una solo si aplica.' })); return; }
    R.fuel.forEach((f, i) => {
      const mk = (key, label, ph, mode) => { const inp = el('input', { value: f[key] || '', placeholder: ph, inputMode: mode || 'decimal' }); inp.oninput = () => { f[key] = inp.value; saveDraft(); }; return el('label', { textContent: label }, [inp]); };
      const rm = el('button', { type: 'button', className: 'ghost', textContent: 'Quitar recarga ' + (i + 1) }); rm.onclick = () => { R.fuel.splice(i, 1); saveDraft(); renderFuel(); };
      box.append(el('div', { className: 'fuel' }, [el('div', { className: 'row' }, [mk('liters', 'Litros', '0'), mk('cost', 'Monto', '$', 'text'), mk('km', 'Km', '0')]), rm]));
    });
  }
  function renderActs() {
    const all = settings.activities.concat(R.activities.filter((a) => !settings.activities.includes(a)));
    chips($('actChips'), all, (n) => R.activities.includes(n), (n) => { R.activities = toggle(R.activities, n); saveDraft(); renderActs(); });
  }
  function renderIncs() {
    const all = settings.incidents.concat(R.incidents.map((i) => i.name).filter((n) => !settings.incidents.includes(n)));
    chips($('incChips'), all, (n) => R.incidents.some((i) => i.name === n), (n) => {
      R.incidents = R.incidents.some((i) => i.name === n) ? R.incidents.filter((i) => i.name !== n) : R.incidents.concat({ name: n, severity: 'Leve', note: '' });
      saveDraft(); renderIncs();
    }, null, true);
    const box = $('incDetail'); box.replaceChildren();
    R.incidents.forEach((inc) => {
      const sel = el('select', {}, C.SEVERITY.map((s) => el('option', { value: s, textContent: s, selected: s === inc.severity })));
      sel.onchange = () => { inc.severity = sel.value; saveDraft(); };
      const note = el('input', { value: inc.note, placeholder: 'Detalle (opcional)' }); note.oninput = () => { inc.note = note.value; saveDraft(); };
      box.append(el('div', { className: 'inc' }, [el('b', { textContent: inc.name }), sel, note]));
    });
  }

  function collect() { R.driver = $('driver').value; R.date = $('date').value; R.shift = $('shift').value; R.kmStart = $('kmStart').value; R.kmEnd = $('kmEnd').value; R.notes = $('notes').value; return R; }
  function check() {
    collect(); const errs = C.validate(R), box = $('errors');
    box.hidden = !errs.length; box.replaceChildren(...errs.map((e) => el('p', { textContent: e })));
    if (errs.length) box.scrollIntoView({ block: 'center' });
    return !errs.length;
  }
  function commit() {
    R.driver = C.clean(R.driver);
    settings.drivers = C.addUnique(settings.drivers, R.driver);
    history = C.saveReport(history, R);
    const ok = store.set('dm.history', history) && saveSettings();
    try { localStorage.removeItem('dm.draft'); } catch (e) {}
    return ok;
  }
  function finish(msg) { toast(msg); R = blank(); renderForm(); renderHistory(); renderSettings(); window.scrollTo(0, 0); }
  function openWA(r) {
    const url = C.waLink(C.buildMessage(r, settings.unit), settings.phone);
    const w = window.open(url, '_blank'); if (!w) location.href = url;
  }

  // En el APK (Capacitor) se guarda en caché y se abre el menú nativo de compartir.
  const NP = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor.Plugins : null;
  const b64 = (blob) => new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1]); f.onerror = no; f.readAsDataURL(blob); });
  async function shareNative(blob, name, text) {
    const w = await NP.Filesystem.writeFile({ path: name, data: await b64(blob), directory: 'CACHE' });
    await NP.Share.share({ title: name, text: text || '', files: [w.uri], dialogTitle: 'Enviar reporte' });
  }
  const fname = (r, ext) => 'reporte-' + r.date + '-' + C.clean(r.driver).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '_') + '.' + ext;
  function download(blob, name) {
    if (NP) { shareNative(blob, name).catch(() => {}); return; }
    const a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  async function deliver(r) {
    try {
      const blob = await Report.toPng(r, settings), file = new File([blob], fname(r, 'png'), { type: 'image/png' });
      if (NP) { try { await shareNative(blob, file.name, settings.unit + ' · Reporte de turno'); } catch (e) {} return; }
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text: settings.unit + ' · Reporte de turno' }); return; } catch (e) { if (e.name === 'AbortError') return; }
      }
      download(blob, file.name); openWA(r); toast('Imagen descargada: adjúntala en WhatsApp');
    } catch (e) { openWA(r); }
  }
  const exportAs = async (r, kind) => { try { download(kind === 'pdf' ? await Report.toPdf(r, settings) : await Report.toPng(r, settings), fname(r, kind)); } catch (e) { toast('No se pudo generar el archivo'); } };

  function renderHistory() {
    const box = $('histList'); box.replaceChildren();
    if (!history.length) { box.append(el('div', { className: 'card' }, [el('p', { className: 'muted', textContent: 'Aún no hay reportes. Genera el primero desde Nuevo.' })])); return; }
    history.forEach((h) => {
      const d = C.distance(h), btn = (t, fn, cls) => { const b = el('button', { type: 'button', className: cls || 'ghost', textContent: t }); b.onclick = fn; return b; };
      box.append(el('div', { className: 'card hist' }, [
        el('div', {}, [el('b', { textContent: C.fmtDate(h.date) + ' · ' + h.shift }), el('small', { textContent: h.driver + ' · ' + (Number.isNaN(d) ? '-' : d + ' km') + (h.incidents.length ? ' · ' + h.incidents.length + ' incid.' : '') })]),
        el('div', { className: 'btns' }, [
          btn('Reenviar', () => deliver(h), 'secondary'),
          btn('PNG', () => exportAs(h, 'png')), btn('PDF', () => exportAs(h, 'pdf')),
          btn('Editar', () => { R = JSON.parse(JSON.stringify(h)); renderForm(); show('new'); }),
          btn('Borrar', () => { if (confirm('¿Borrar este reporte?')) { history = history.filter((x) => x.id !== h.id); store.set('dm.history', history); renderHistory(); } })
        ])]));
    });
  }

  function renderSettings() {
    renderLogo(); $('sUnit').value = settings.unit; $('sPhone').value = settings.phone;
    [['sDrivers', 'drivers'], ['sActs', 'activities'], ['sIncs', 'incidents']].forEach(([id, key]) =>
      chips($(id), settings[key], null, null, (n) => { settings[key] = C.removeItem(settings[key], n); saveSettings(); renderSettings(); renderForm(); }));
  }
  function renderLogo() {
    const has = !!settings.logo;
    ['hdrLogo', 'logoPrev'].forEach((id) => { $(id).hidden = !has; if (has) $(id).src = settings.logo; });
    $('logoDel').hidden = !has;
  }
  $('logoFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(f); });
      const k = Math.min(1, 400 / img.width, 200 / img.height), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      settings.logo = c.toDataURL('image/png'); if (!saveSettings()) toast('No se pudo guardar el logo'); else toast('Logo actualizado'); renderLogo();
    } catch (_) { toast('Imagen no válida'); }
    e.target.value = '';
  };
  $('logoDel').onclick = () => { settings.logo = ''; saveSettings(); renderLogo(); toast('Logo eliminado'); };
  [['dAdd', 'dNew', 'drivers'], ['aAdd', 'aNew', 'activities'], ['iAdd', 'iNew', 'incidents']].forEach(([b, i, key]) => {
    $(b).onclick = () => { settings[key] = C.addUnique(settings[key], $(i).value); $(i).value = ''; saveSettings(); renderSettings(); renderForm(); };
  });
  $('sUnit').oninput = () => { settings.unit = C.clean($('sUnit').value) || 'Delta Móvil'; saveSettings(); $('unitName').textContent = settings.unit; };
  $('sPhone').oninput = () => { settings.phone = $('sPhone').value.replace(/[^\d+]/g, ''); saveSettings(); };

  // Agregar sobre la marcha desde el formulario: queda disponible y seleccionada.
  $('actAdd').onclick = () => { const v = C.clean($('actNew').value); if (!v) return; settings.activities = C.addUnique(settings.activities, v); const n = settings.activities.find((x) => x.toLowerCase() === v.toLowerCase()); if (!R.activities.includes(n)) R.activities.push(n); $('actNew').value = ''; saveSettings(); saveDraft(); renderActs(); renderSettings(); };
  $('incAdd').onclick = () => { const v = C.clean($('incNew').value); if (!v) return; settings.incidents = C.addUnique(settings.incidents, v); const n = settings.incidents.find((x) => x.toLowerCase() === v.toLowerCase()); if (!R.incidents.some((i) => i.name === n)) R.incidents.push({ name: n, severity: 'Leve', note: '' }); $('incNew').value = ''; saveSettings(); saveDraft(); renderIncs(); renderSettings(); };
  $('addFuel').onclick = () => { R.fuel.push({ liters: '', cost: '', km: '' }); saveDraft(); renderFuel(); };

  ['date', 'shift', 'driver', 'kmStart', 'kmEnd', 'notes'].forEach((k) => $(k).addEventListener('input', () => { collect(); renderDist(); saveDraft(); }));
  $('send').onclick = () => { if (!check()) return; const r = JSON.parse(JSON.stringify(R)); if (!commit()) toast('No se pudo guardar en el dispositivo'); deliver(r); finish('Reporte guardado'); };
  $('saveOnly').onclick = () => { if (!check()) return; commit(); finish('Reporte guardado'); };
  let prev = null;
  $('preview').onclick = async () => {
    if (!check()) return;
    prev = JSON.parse(JSON.stringify(R));
    try { const blob = await Report.toPng(prev, settings); if ($('prevImg').src) URL.revokeObjectURL($('prevImg').src); $('prevImg').src = URL.createObjectURL(blob); $('dlg').showModal(); } catch (e) { toast('No se pudo generar la vista previa'); }
  };
  $('dlgPng').onclick = () => exportAs(prev, 'png');
  $('dlgPdf').onclick = () => exportAs(prev, 'pdf');
  $('dlgClose').onclick = () => $('dlg').close();
  $('dlgCopy').onclick = () => { const t = C.buildMessage(prev, settings.unit); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copiado'), () => toast('No se pudo copiar')); };

  $('export').onclick = () => {
    const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify({ settings, history }, null, 2)], { type: 'application/json' })), download: 'delta-movil-respaldo-' + today() + '.json' });
    document.body.append(a); a.click(); a.remove(); toast('Respaldo exportado');
  };
  $('import').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then((t) => {
      const d = JSON.parse(t); if (!Array.isArray(d.history)) throw new Error('formato');
      history = d.history.reduce((acc, r) => C.saveReport(acc, r), history); settings = C.mergeSettings(d.settings || settings);
      store.set('dm.history', history); saveSettings(); renderHistory(); renderSettings(); renderForm(); toast('Respaldo importado');
    }).catch(() => toast('Archivo no válido')); e.target.value = '';
  };

  function show(v) {
    document.querySelectorAll('.view').forEach((s) => { s.hidden = s.id !== 'view-' + v; });
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  }
  document.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => show(b.dataset.view); });
  $('form').onsubmit = (e) => e.preventDefault();

  R = Object.assign(blank(), store.get('dm.draft', {}));
  renderForm(); renderHistory(); renderSettings();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
