/* Reporte en imagen (PNG) y exportación a PDF, sin dependencias externas. */
(function (root) {
  'use strict';
  const CREDIT = 'Desarrollado por analista de sistemas Eber Romero';
  const W = 1080, M = 56, INK = '#12263A', STEEL = '#5B6B7B', LINE = '#D5DCE3', AMBER = '#E8A317', PAPER = '#F3F5F7', OK = '#1F7A4D';
  const SEV = { Leve: '#B58100', Moderada: '#D9731A', 'Crítica': '#B3261E' };
  const A4 = { w: 595.28, h: 841.89 };

  /* ---------- PDF (JPEG embebido, una imagen por página A4) ---------- */
  function buildPdf(pages) {
    const enc = new TextEncoder(), chunks = [], off = [];
    let len = 0;
    const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; };
    const obj = (n, body) => { off[n] = len; push(n + ' 0 obj\n'); body(); push('endobj\n'); };
    const n = pages.length;
    push('%PDF-1.4\n');
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>\n'));
    obj(2, () => push('<< /Type /Pages /Kids [' + pages.map((_, i) => (3 + 3 * i) + ' 0 R').join(' ') + '] /Count ' + n + ' >>\n'));
    pages.forEach((p, i) => {
      const pg = 3 + 3 * i, ct = pg + 1, im = pg + 2, content = 'q ' + A4.w + ' 0 0 ' + A4.h + ' 0 0 cm /Im0 Do Q';
      obj(pg, () => push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + A4.w + ' ' + A4.h + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>\n'));
      obj(ct, () => push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\n'));
      obj(im, () => { push('<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.data.length + ' >>\nstream\n'); push(p.data); push('\nendstream\n'); });
    });
    const total = 3 + 3 * n, xref = len;
    push('xref\n0 ' + total + '\n0000000000 65535 f \n');
    for (let i = 1; i < total; i++) push(String(off[i]).padStart(10, '0') + ' 00000 n \n');
    push('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    const out = new Uint8Array(len); let p = 0;
    chunks.forEach((c) => { out.set(c, p); p += c.length; });
    return out;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { buildPdf, CREDIT }; return; }

  /* ---------- Dibujo del reporte ---------- */
  const C = root.Core;
  const font = (s, w) => (w || '400') + ' ' + s + 'px system-ui,"Segoe UI",Roboto,Arial,sans-serif';
  const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const toBlob = (cv, type, q) => new Promise((ok) => cv.toBlob(ok, type, q));

  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function wrap(ctx, text, maxW) {
    const lines = []; let cur = '';
    String(text).split('\n').forEach((para) => {
      cur = '';
      para.split(' ').forEach((w) => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
      lines.push(cur);
    });
    return lines;
  }
  function check(ctx, x, y, color) {
    ctx.beginPath(); ctx.arc(x + 14, y - 8, 14, 0, 7); ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 7, y - 8); ctx.lineTo(x + 12, y - 3); ctx.lineTo(x + 21, y - 14);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }

  async function renderCanvas(r, s) {
    const logo = s.logo ? await loadImg(s.logo).catch(() => null) : null;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = 9000;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, cv.height);
    // Encabezado
    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, 170); ctx.fillStyle = AMBER; ctx.fillRect(0, 170, W, 8);
    let tx = M;
    if (logo) {
      const k = Math.min(200 / logo.width, 96 / logo.height), lw = logo.width * k, lh = logo.height * k;
      rr(ctx, M, 85 - lh / 2 - 12, lw + 24, lh + 24, 12, '#fff'); ctx.drawImage(logo, M + 12, 85 - lh / 2, lw, lh); tx = M + lw + 24 + 24;
    }
    ctx.fillStyle = '#fff'; ctx.font = font(40, '700'); ctx.fillText(s.unit, tx, 84);
    ctx.fillStyle = '#B8C4D0'; ctx.font = font(24); ctx.fillText('Reporte de turno', tx, 122);
    let y = 178 + 36;

    const section = (t) => { y += 18; ctx.fillStyle = AMBER; ctx.fillRect(M, y, 8, 32); ctx.fillStyle = INK; ctx.font = font(28, '700'); ctx.fillText(t, M + 22, y + 26); y += 56; };
    const label = (t, x, yy) => { ctx.fillStyle = STEEL; ctx.font = font(20); ctx.fillText(t, x, yy); };

    // Datos del turno
    rr(ctx, M, y, W - 2 * M, 176, 12, PAPER, LINE);
    label('Fecha', M + 24, y + 38); label('Turno', M + 360, y + 38); label('Chofer de turno', M + 24, y + 112);
    ctx.fillStyle = INK; ctx.font = font(30, '700');
    ctx.fillText(C.fmtDate(r.date), M + 24, y + 70); ctx.fillText(r.shift || '-', M + 360, y + 70); ctx.fillText(C.clean(r.driver), M + 24, y + 150);
    y += 176 + 14;

    // Kilometraje
    section('Kilometraje');
    const bw = (W - 2 * M - 32) / 3, d = C.distance(r);
    [['Inicial', C.fmt(C.num(r.kmStart)) + ' km'], ['Final', C.fmt(C.num(r.kmEnd)) + ' km'], ['Recorrido', Number.isNaN(d) ? '-' : C.fmt(d) + ' km']].forEach(([l, v], i) => {
      const x = M + i * (bw + 16), dark = i === 2;
      rr(ctx, x, y, bw, 112, 12, dark ? INK : '#fff', dark ? null : LINE);
      ctx.fillStyle = dark ? '#B8C4D0' : STEEL; ctx.font = font(20); ctx.fillText(l, x + 20, y + 36);
      ctx.fillStyle = dark ? '#fff' : INK; ctx.font = font(34, '700'); ctx.fillText(v, x + 20, y + 84);
    });
    y += 112 + 14;

    // Combustible
    section('Combustible');
    if (r.fuel && r.fuel.length) {
      const cols = [M + 20, M + 120, M + 360, M + 640];
      ctx.fillStyle = PAPER; ctx.fillRect(M, y, W - 2 * M, 44); ctx.font = font(20, '700'); ctx.fillStyle = STEEL;
      ['N.º', 'Litros', 'Monto', 'Km'].forEach((h, i) => ctx.fillText(h, cols[i], y + 30)); y += 44;
      r.fuel.forEach((f, i) => {
        ctx.fillStyle = INK; ctx.font = font(26);
        [String(i + 1), C.fmt(C.num(f.liters)) + ' L', C.clean(f.cost) || '-', C.clean(f.km) || '-'].forEach((t, j) => ctx.fillText(t, cols[j], y + 34));
        y += 50; ctx.fillStyle = LINE; ctx.fillRect(M, y - 4, W - 2 * M, 2);
      });
      ctx.fillStyle = INK; ctx.font = font(26, '700'); ctx.fillText('Total: ' + C.fmt(C.totalFuel(r)) + ' L', M + 20, y + 36); y += 56;
    } else { ctx.fillStyle = STEEL; ctx.font = font(26); ctx.fillText('Sin recargas', M + 4, y + 26); y += 44; }

    // Actividades
    section('Actividades realizadas');
    ctx.font = font(27);
    if (r.activities && r.activities.length) r.activities.forEach((a) => {
      const ls = wrap(ctx, a, W - 2 * M - 60); check(ctx, M + 4, y + 26, OK); ctx.fillStyle = INK; ctx.font = font(27);
      ls.forEach((l, i) => ctx.fillText(l, M + 50, y + 26 + i * 34)); y += ls.length * 34 + 16;
    }); else { ctx.fillStyle = STEEL; ctx.fillText('Sin actividades registradas', M + 4, y + 26); y += 44; }

    // Incidencias
    section('Incidencias del vehículo');
    if (r.incidents && r.incidents.length) r.incidents.forEach((inc) => {
      ctx.font = font(22, '700'); const pw = ctx.measureText(inc.severity).width + 30;
      rr(ctx, M + 4, y, pw, 38, 19, SEV[inc.severity] || STEEL); ctx.fillStyle = '#fff'; ctx.fillText(inc.severity, M + 19, y + 27);
      ctx.fillStyle = INK; ctx.font = font(27, '700'); ctx.fillText(inc.name, M + pw + 24, y + 28); y += 52;
      if (C.clean(inc.note)) { ctx.font = font(24); ctx.fillStyle = STEEL; wrap(ctx, C.clean(inc.note), W - 2 * M - 20).forEach((l) => { ctx.fillText(l, M + 20, y + 20); y += 32; }); y += 6; }
      y += 8;
    }); else { check(ctx, M + 4, y + 26, OK); ctx.fillStyle = INK; ctx.font = font(27); ctx.fillText('Sin novedades', M + 50, y + 26); y += 48; }

    // Observaciones
    if (C.clean(r.notes)) {
      section('Observaciones'); ctx.font = font(26); ctx.fillStyle = INK;
      wrap(ctx, r.notes.trim(), W - 2 * M - 8).forEach((l) => { ctx.fillText(l, M + 4, y + 24); y += 34; }); y += 10;
    }

    // Firmas y pie
    y += 70; ctx.fillStyle = INK; ctx.fillRect(M, y, 360, 2); ctx.fillRect(W - M - 360, y, 360, 2);
    ctx.fillStyle = STEEL; ctx.font = font(20); ctx.fillText('Firma del chofer', M, y + 30); ctx.fillText('Supervisor / Revisión', W - M - 360, y + 30);
    y += 80; ctx.fillStyle = LINE; ctx.fillRect(M, y, W - 2 * M, 2);
    const g = new Date(r.savedAt || Date.now()), p2 = (n) => String(n).padStart(2, '0');
    ctx.textAlign = 'center'; ctx.fillStyle = STEEL; ctx.font = font(19);
    ctx.fillText('Generado el ' + p2(g.getDate()) + '/' + p2(g.getMonth() + 1) + '/' + g.getFullYear() + ' ' + p2(g.getHours()) + ':' + p2(g.getMinutes()), W / 2, y + 36);
    ctx.font = font(21, '600'); ctx.fillText(CREDIT, W / 2, y + 68); ctx.textAlign = 'left';
    y += 100;
    const out = document.createElement('canvas'); out.width = W; out.height = y; out.getContext('2d').drawImage(cv, 0, 0);
    return out;
  }

  async function toPng(r, s) { return toBlob(await renderCanvas(r, s), 'image/png'); }
  async function toPdf(r, s) {
    const cv = await renderCanvas(r, s), ph = Math.round(W * A4.h / A4.w), pages = [];
    for (let top = 0; top < cv.height; top += ph) {
      const pc = document.createElement('canvas'); pc.width = W; pc.height = ph; const x = pc.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, W, ph); x.drawImage(cv, 0, top, W, Math.min(ph, cv.height - top), 0, 0, W, Math.min(ph, cv.height - top));
      pages.push({ w: W, h: ph, data: new Uint8Array(await (await toBlob(pc, 'image/jpeg', 0.92)).arrayBuffer()) });
    }
    return new Blob([buildPdf(pages)], { type: 'application/pdf' });
  }
  root.Report = { toPng, toPdf, buildPdf, CREDIT };
})(typeof self !== 'undefined' ? self : this);
