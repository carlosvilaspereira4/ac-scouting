import { POSICOES, GRADE_COLORS, GRADE_PCT, GRADE_RGB, calcOverall, type SavedReport } from './data'

type PDFReport = SavedReport & { photo?: string | null }

export async function buildPDF(p: PDFReport, doc: any) {
  const pos = POSICOES[p.posicao]
  const ov = calcOverall(p.ratings, p.posicao)
  const ini = p.nome ? p.nome.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '?'
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 17
  let y = 0

  const chk = (n: number) => { if (y + n > H - 16) { doc.addPage(); y = 18 } }

  doc.setFillColor(208, 2, 27); doc.rect(0, 0, W / 2, 20, 'F')
  doc.setFillColor(0, 63, 138); doc.rect(W / 2, 0, W / 2, 20, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  doc.text('Atlético Cabeceirense', M, 12)
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 200, 200)
  doc.text('RELATÓRIO DE OBSERVAÇÃO', W - M, 12, { align: 'right' })
  doc.setFillColor(200, 160, 32); doc.rect(0, 20, W, 1, 'F')
  y = 27

  const pw = 22, ph = 22
  if (p.photo) {
    try {
      const fmt = p.photo.includes('png') ? 'PNG' : 'JPEG'
      doc.addImage(p.photo, fmt, M, y, pw, ph)
      doc.setDrawColor(208, 2, 27); doc.setLineWidth(0.6); doc.rect(M, y, pw, ph)
    } catch { drawPH(doc, M, y, pw, ph, ini) }
  } else { drawPH(doc, M, y, pw, ph, ini) }

  const ix = M + pw + 6
  doc.setTextColor(5, 8, 18); doc.setFontSize(17); doc.setFont('helvetica', 'bold')
  doc.text(p.nome || 'Nome do Jogador', ix, y + 8)
  if (pos) {
    doc.setFillColor(0, 63, 138)
    const lw = doc.getTextWidth(pos.label) + 10
    doc.roundedRect(ix, y + 10, lw, 6, 1.5, 1.5, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
    doc.text(pos.label.toUpperCase(), ix + 5, y + 14.5)
  }
  const ms: [string, string][] = []
  if (p.idade) ms.push(['Idade', p.idade])
  if (p.nacionalidade) ms.push(['Nac.', p.nacionalidade])
  if (p.clube) ms.push(['Clube', p.clube])
  if (p.pe) ms.push(['Pé', p.pe])
  if (p.numero) ms.push(['Nº', p.numero])
  let mx = ix
  ms.forEach(([l, v]) => {
    doc.setTextColor(130, 140, 160); doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.text(l.toUpperCase(), mx, y + 22)
    doc.setTextColor(10, 16, 32); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.text(String(v), mx, y + 27)
    mx += 26
  })
  y += ph + 8
  if (p.jogo) { doc.setTextColor(120, 130, 150); doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.text('Jogo: ' + p.jogo, M, y); y += 6 }

  for (let i = 0; i < Math.ceil(W - M * 2); i++) {
    const rat = i / (W - M * 2)
    doc.setDrawColor(Math.round(208 * (1 - rat)), 0, Math.round(138 * rat + 27 * (1 - rat)))
    doc.setLineWidth(0.7); doc.line(M + i, y, M + i + 1, y)
  }
  y += 6

  if (ov) {
    const [r, g, b] = GRADE_RGB[ov]
    doc.setFillColor(8, 14, 28); doc.roundedRect(M, y, W - M * 2, 14, 2, 2, 'F')
    doc.setFillColor(208, 2, 27); doc.rect(M, y, 2.5, 14, 'F')
    doc.setTextColor(80, 100, 130); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text('CLASSIFICAÇÃO GERAL', M + 6, y + 6)
    const rc = pos ? pos.competencias.filter(c => p.ratings[c]?.grade).length : 0
    const tc = pos ? pos.competencias.length : 0
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 100, 130)
    doc.text(`${rc}/${tc} competências avaliadas`, M + 6, y + 11)
    doc.setTextColor(r, g, b); doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text(ov, W - M - 4, y + 11, { align: 'right' })
    y += 18
  }

  if (pos) {
    doc.setTextColor(0, 63, 138); doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.text('AVALIAÇÃO POR COMPETÊNCIA', M, y)
    doc.setDrawColor(200, 215, 240); doc.setLineWidth(0.3); doc.line(M, y + 2, W - M, y + 2); y += 8
    pos.competencias.forEach(c => {
      const rat = p.ratings[c] || { grade: null, obs: '' }
      const g = rat.grade; const rgb = g ? GRADE_RGB[g] : [200, 210, 230] as [number,number,number]; const pct = g ? GRADE_PCT[g] : 0
      const ol = (rat.obs && rat.obs.trim()) ? doc.splitTextToSize(rat.obs.trim(), W - M * 2 - 4) : []
      const bh = 9 + (ol.length ? ol.length * 4 + 5 : 0); chk(bh)
      doc.setTextColor(10, 16, 32); doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(c, M, y)
      if (g) { doc.setTextColor(...rgb); doc.setFont('helvetica', 'bold'); doc.text(g, W - M, y, { align: 'right' }) }
      const by = y + 2; doc.setFillColor(220, 230, 245); doc.roundedRect(M, by, W - M * 2, 2.5, 1, 1, 'F')
      if (pct > 0) { doc.setFillColor(...rgb); doc.roundedRect(M, by, (W - M * 2) * (pct / 100), 2.5, 1, 1, 'F') }
      y += 7
      if (ol.length) {
        doc.setFillColor(245, 248, 255); doc.setDrawColor(195, 210, 235); doc.setLineWidth(0.25)
        doc.roundedRect(M, y, W - M * 2, ol.length * 4 + 5, 1.5, 1.5, 'FD')
        doc.setTextColor(60, 75, 100); doc.setFontSize(7.5); doc.setFont('helvetica', 'italic')
        ol.forEach((ln: string, i: number) => doc.text(ln, M + 3, y + 4 + i * 4))
        y += ol.length * 4 + 7
      } else y += 2
    }); y += 3
  }

  if (p.resumo) {
    chk(20); doc.setTextColor(208, 2, 27); doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.text('OBSERVAÇÕES GERAIS', M, y)
    doc.setDrawColor(230, 210, 215); doc.setLineWidth(0.3); doc.line(M, y + 2, W - M, y + 2); y += 8
    const sl = doc.splitTextToSize(p.resumo, W - M * 2 - 6); const bh = sl.length * 5 + 8; chk(bh + 4)
    doc.setFillColor(255, 248, 249); doc.setDrawColor(208, 2, 27); doc.setLineWidth(0.5)
    doc.roundedRect(M, y, W - M * 2, bh, 2, 2, 'F'); doc.line(M, y, M, y + bh)
    doc.setTextColor(30, 40, 60); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    sl.forEach((ln: string, i: number) => doc.text(ln, M + 4, y + 6 + i * 5)); y += bh + 6
  }

  const fy = H - 8
  doc.setFillColor(245, 247, 252); doc.rect(0, fy - 3, W, 12, 'F')
  doc.setDrawColor(200, 215, 235); doc.setLineWidth(0.3); doc.line(0, fy - 3, W, fy - 3)
  doc.setTextColor(140, 155, 180); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  doc.text('Atlético Cabeceirense FC — Relatório Confidencial', M, fy + 4)
  doc.text('Data: ' + p.data, W - M, fy + 4, { align: 'right' })
}

function drawPH(doc: any, x: number, y: number, w: number, h: number, ini: string) {
  doc.setFillColor(210, 220, 240); doc.roundedRect(x, y, w, h, 2, 2, 'F')
  doc.setTextColor(130, 140, 160); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
  doc.text(ini, x + w / 2, y + h / 2 + 3, { align: 'center' })
}
