'use client'
export default function Home() {
  return <ScoutingApp />
}

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  POSICOES, TOOLTIPS, GRADES, GRADE_COLORS, GRADE_PCT, calcOverall,
  type Player, type SavedReport, type Grade
} from '@/lib/data'

/* ─── Crest SVG ─────────────────────────────────────────────────── */
const Crest = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 110" fill="none">
    <path d="M50 3 L97 18 L97 60 C97 84 75 103 50 107 C25 103 3 84 3 60 L3 18 Z" fill="#003f8a"/>
    <path d="M50 3 L50 107 C25 103 3 84 3 60 L3 18 Z" fill="#d0021b"/>
    <path d="M50 3 L97 18 L97 60 C97 84 75 103 50 107 Z" fill="#003f8a"/>
    <path d="M18 28 L82 72" stroke="white" strokeWidth="10" strokeLinecap="round"/>
    <text x="32" y="56" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="22" fill="white">A</text>
    <text x="68" y="56" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="22" fill="white">C</text>
    <path d="M50 3 L97 18 L97 60 C97 84 75 103 50 107 C25 103 3 84 3 60 L3 18 Z" fill="none" stroke="#c8a020" strokeWidth="2.5"/>
    <circle cx="50" cy="16" r="2.5" fill="#c8a020"/>
    <circle cx="42" cy="18" r="1.5" fill="#c8a020"/>
    <circle cx="58" cy="18" r="1.5" fill="#c8a020"/>
  </svg>
)

/* ─── Grade button ───────────────────────────────────────────────── */
const GradeBtn = ({ grade, selected, onClick }: { grade: Grade; selected: boolean; onClick: () => void }) => {
  const colors: Record<Grade, string> = {
    A: 'bg-[#00c853] border-[#00c853] text-white shadow-[0_2px_8px_rgba(0,200,83,.4)]',
    B: 'bg-[#69c21a] border-[#69c21a] text-white shadow-[0_2px_8px_rgba(105,194,26,.4)]',
    C: 'bg-[#ffb300] border-[#ffb300] text-black shadow-[0_2px_8px_rgba(255,179,0,.4)]',
    D: 'bg-[#ff6d00] border-[#ff6d00] text-white shadow-[0_2px_8px_rgba(255,109,0,.4)]',
    E: 'bg-[#d32f2f] border-[#d32f2f] text-white shadow-[0_2px_8px_rgba(211,47,47,.4)]',
  }
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 rounded border-[1.5px] font-black text-[13px] transition-all hover:scale-110 cursor-pointer
        ${selected ? colors[grade] : 'border-[var(--border2)] bg-[var(--surface)] text-[var(--text-muted)]'}`}
      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
    >
      {grade}
    </button>
  )
}

/* ─── Main App ──────────────────────────────────────────────────── */
function ScoutingApp() {
  const [page, setPage] = useState<'obs' | 'rel'>('obs')
  const [players, setPlayers] = useState<Player[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [counter, setCounter] = useState(0)
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [fbStatus, setFbStatus] = useState<'connecting' | 'ok' | 'error'>('connecting')
  const [activeFilter, setActiveFilter] = useState('')
  const [search, setSearch] = useState('')
  const [detailGroup, setDetailGroup] = useState<{ nome: string; clube: string; reports: SavedReport[] } | null>(null)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const saving = useRef<Record<string, boolean>>({})

  /* Firebase listener */
  useEffect(() => {
    const col = collection(db, 'relatorios')
    const unsub = onSnapshot(col,
      snap => {
        const docs: SavedReport[] = []
        snap.forEach(d => docs.push({ firestoreId: d.id, ...d.data() } as SavedReport))
        setSavedReports(docs)
        setFbStatus('ok')
      },
      () => setFbStatus('error')
    )
    return unsub
  }, [])

  /* Player helpers */
  const newPlayer = useCallback((id: string): Player => ({
    id, firestoreId: null, nome: '', idade: '', nacionalidade: '', clube: '',
    posicao: '', posicaoEspecifica: '', pe: '', numero: '', jogo: '', resumo: '',
    photo: null, ratings: {}, data: new Date().toLocaleDateString('pt-PT'), savedState: 'unsaved',
  }), [])

  const addPlayer = useCallback(() => {
    const newId = 'p' + (counter + 1)
    setCounter(c => c + 1)
    const p = newPlayer(newId)
    setPlayers(ps => [...ps, p])
    setActiveId(newId)
  }, [counter, newPlayer])

  const removePlayer = useCallback((id: string) => {
    setPlayers(ps => {
      const next = ps.filter(p => p.id !== id)
      setActiveId(prev => prev === id ? (next.length ? next[next.length - 1].id : null) : prev)
      return next
    })
  }, [])

  const active = players.find(p => p.id === activeId) ?? null

  const updateActive = useCallback((field: keyof Player, value: any) => {
    setPlayers(ps => ps.map(p => {
      if (p.id !== activeId) return p
      const next = { ...p, [field]: value, savedState: 'unsaved' as const }
      if (field === 'posicao') next.ratings = {}
      return next
    }))
  }, [activeId])

  const updateGrade = useCallback((comp: string, grade: Grade) => {
    setPlayers(ps => ps.map(p => {
      if (p.id !== activeId) return p
      const prev = p.ratings[comp]?.grade
      return {
        ...p,
        savedState: 'unsaved' as const,
        ratings: {
          ...p.ratings,
          [comp]: { grade: prev === grade ? null : grade, obs: p.ratings[comp]?.obs ?? '' },
        },
      }
    }))
  }, [activeId])

  const updateObs = useCallback((comp: string, obs: string) => {
    setPlayers(ps => ps.map(p => {
      if (p.id !== activeId) return p
      return {
        ...p,
        savedState: 'unsaved' as const,
        ratings: { ...p.ratings, [comp]: { grade: p.ratings[comp]?.grade ?? null, obs } },
      }
    }))
  }, [activeId])

  /* Auto-save */
  useEffect(() => {
    if (!active || active.savedState !== 'unsaved') return
    clearTimeout(saveTimers.current[active.id])
    saveTimers.current[active.id] = setTimeout(() => doSave(active.id), 1800)
  }, [active])

  const doSave = useCallback(async (id: string) => {
    if (saving.current[id]) return
    saving.current[id] = true
    setPlayers(ps => ps.map(p => p.id === id ? { ...p, savedState: 'saving' } : p))
    try {
      const col = collection(db, 'relatorios')
      const player = players.find(p => p.id === id)
      if (!player) return
      const { photo, id: _id, savedState: _s, ...data } = player
      if (player.firestoreId) {
        await updateDoc(doc(db, 'relatorios', player.firestoreId), data)
      } else {
        const ref = await addDoc(col, { ...data, criadoEm: serverTimestamp() })
        setPlayers(ps => ps.map(p => p.id === id ? { ...p, firestoreId: ref.id } : p))
      }
      setPlayers(ps => ps.map(p => p.id === id ? { ...p, savedState: 'saved' } : p))
    } catch {
      setPlayers(ps => ps.map(p => p.id === id ? { ...p, savedState: 'error' } : p))
    } finally {
      saving.current[id] = false
    }
  }, [players])

  const manualSave = useCallback(() => { if (active) doSave(active.id) }, [active, doSave])

  /* Photo */
  const handlePhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => updateActive('photo', ev.target?.result as string)
    reader.readAsDataURL(file)
  }, [updateActive])

  /* PDF */
  const downloadPDF = useCallback(async (reports: SavedReport[], filename: string) => {
    const { jsPDF } = (await import('jspdf')).default ? await import('jspdf') : { jsPDF: (await import('jspdf') as any).jsPDF }
    const { buildPDF } = await import('@/lib/pdf')
    const doc = new (jsPDF as any)({ unit: 'mm', format: 'a4' })
    for (let i = 0; i < reports.length; i++) {
      if (i > 0) doc.addPage()
      await buildPDF(reports[i], doc)
    }
    doc.save(filename)
  }, [])

  const downloadCurrent = useCallback(() => {
    if (!active) return
    const rep: SavedReport = { ...active, firestoreId: active.firestoreId ?? '' }
    downloadPDF([rep], `Observacao_${(active.nome || 'Jogador').replace(/\s+/g, '_')}.pdf`)
  }, [active, downloadPDF])

  const downloadAll = useCallback(() => {
    if (!players.length) return
    const reps = players.map(p => ({ ...p, firestoreId: p.firestoreId ?? '' }))
    downloadPDF(reps, 'Observacoes_Atletico_Cabeceirense.pdf')
  }, [players, downloadPDF])

  /* Edit from reports */
  const editReport = useCallback((r: SavedReport) => {
    const newId = 'p' + (counter + 1)
    setCounter(c => c + 1)
    const p: Player = { ...r, id: newId, photo: null, savedState: 'saved' }
    setPlayers(ps => [...ps, p])
    setActiveId(newId)
    setPage('obs')
    setDetailGroup(null)
  }, [counter])

  const deleteReport = useCallback(async (fid: string) => {
    if (!confirm('Eliminar este relatório definitivamente?')) return
    await deleteDoc(doc(db, 'relatorios', fid))
    if (detailGroup) {
      const next = detailGroup.reports.filter(r => r.firestoreId !== fid)
      if (!next.length) setDetailGroup(null)
      else setDetailGroup({ ...detailGroup, reports: next })
    }
  }, [detailGroup])

  /* ── Render ── */
  const ov = active ? calcOverall(active.ratings, active.posicao) : null
  const pos = active ? POSICOES[active.posicao] : null
  const saveLabels = { unsaved: ['pending', 'Por guardar'], saving: ['pending', 'A guardar…'], saved: ['ok', 'Guardado ✓'], error: ['err', 'Erro'] }
  const [saveCls, saveTxt] = saveLabels[active?.savedState ?? 'unsaved'] ?? ['pending', '…']

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>

      {/* HEADER */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 58, borderBottom: '1px solid var(--border)', background: 'rgba(10,14,24,.97)', flexShrink: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #d0021b 50%, #003f8a 50%)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Crest size={40} />
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: 2, textTransform: 'uppercase' }}>Atlético Cabeceirense</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 9, letterSpacing: 3, color: 'var(--ac-red)', textTransform: 'uppercase', marginTop: 1 }}>Observação de Jogadores</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text-dim)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: fbStatus === 'ok' ? 'var(--grade-a)' : fbStatus === 'error' ? 'var(--grade-e)' : 'var(--grade-c)', boxShadow: fbStatus === 'ok' ? '0 0 6px rgba(0,200,83,.5)' : 'none', flexShrink: 0, transition: 'background .3s' }} />
            {fbStatus === 'ok' ? 'Sincronizado' : fbStatus === 'error' ? 'Erro de ligação' : 'A ligar…'}
          </div>
          <button onClick={downloadAll} style={btnStyle('blue')}>⬇ Exportar Todos</button>
        </div>
      </header>

      {/* NAV */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', background: 'var(--bg2)', padding: '0 24px', flexShrink: 0 }}>
        {(['obs', 'rel'] as const).map(p => (
          <button key={p} onClick={() => setPage(p)} style={{ padding: '10px 20px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: page === p ? 'var(--text)' : 'var(--text-dim)', cursor: 'pointer', border: 'none', background: 'transparent', borderBottom: page === p ? '2px solid var(--ac-red)' : '2px solid transparent', marginBottom: -2, transition: 'all .18s', display: 'flex', alignItems: 'center', gap: 7 }}>
            {p === 'obs' ? '📝 Nova Observação' : '📂 Relatórios'}
            {p === 'rel' && <span style={{ background: 'var(--ac-red)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 8 }}>{savedReports.length}</span>}
          </button>
        ))}
      </div>

      {/* PAGE: OBSERVAÇÃO */}
      {page === 'obs' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Player tabs */}
          <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: '0 24px', gap: 3, overflowX: 'auto', minHeight: 44 }}>
            {players.map(p => {
              const pp = POSICOES[p.posicao]
              const isActive = p.id === activeId
              return (
                <div key={p.id} onClick={() => setActiveId(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: '5px 5px 0 0', cursor: 'pointer', fontSize: 12.5, fontWeight: 500, color: isActive ? 'var(--text)' : 'var(--text-dim)', border: '1px solid', borderColor: isActive ? 'var(--border)' : 'transparent', borderBottom: isActive ? '1px solid var(--bg)' : '1px solid transparent', background: isActive ? 'var(--bg)' : 'transparent', position: 'relative', bottom: -1, whiteSpace: 'nowrap', minWidth: 110, justifyContent: 'space-between', transition: 'all .15s' }}>
                  {isActive && <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--ac-red), var(--ac-blue))' }} />}
                  <div style={{ position: 'absolute', top: 6, right: 22, width: 6, height: 6, borderRadius: '50%', background: p.savedState === 'saved' ? 'var(--grade-a)' : 'var(--grade-c)' }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome || 'Novo Jogador'}</span>
                  {pp && <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(0,63,138,.3)', color: '#6fa8dc', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif" }}>{pp.abbr}</span>}
                  <button onClick={e => { e.stopPropagation(); removePlayer(p.id) }} style={{ width: 15, height: 15, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
                </div>
              )
            })}
            <div onClick={addPlayer} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: 'var(--ac-red)', background: 'rgba(208,2,27,.08)', border: '1px dashed rgba(208,2,27,.35)', margin: '0 0 4px 4px', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: .5, transition: 'all .15s' }}>
              + Novo Jogador
            </div>
          </div>

          {/* Form + Preview */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 420px', overflow: 'hidden' }}>
            {/* FORM */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', borderRight: '1px solid var(--border)' }}>
              {!active ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-dim)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12, opacity: .3 }}>⚽</div>
                  <div>Clique em <strong>+ Novo Jogador</strong> para iniciar</div>
                </div>
              ) : (
                <>
                  {/* Save bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 13px', background: 'var(--surface2)', borderRadius: 7, border: '1px solid var(--border2)', marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-dim)' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: saveCls === 'ok' ? 'var(--grade-a)' : saveCls === 'err' ? 'var(--grade-e)' : 'var(--grade-c)', animation: saveCls === 'pending' ? 'pulse 1s infinite' : 'none' }} />
                      {saveTxt}
                    </div>
                    <button onClick={manualSave} style={btnStyle('green')}>💾 Guardar agora</button>
                  </div>

                  <Section label="Foto do Jogador">
                    <label style={{ border: '1.5px dashed var(--border2)', borderRadius: 7, padding: '12px 14px', cursor: 'pointer', background: 'var(--surface)', position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="file" accept="image/*" onChange={handlePhoto} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
                      {active.photo
                        ? <img src={active.photo} style={{ width: 54, height: 54, borderRadius: 5, objectFit: 'cover', border: '2px solid var(--ac-red)', flexShrink: 0 }} alt="" />
                        : <div style={{ width: 54, height: 54, borderRadius: 5, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, border: '1.5px solid var(--border2)' }}>📷</div>
                      }
                      <div>
                        <strong style={{ display: 'block', fontSize: 12.5, color: 'var(--text)', marginBottom: 2 }}>{active.photo ? 'Alterar foto' : 'Carregar foto'}</strong>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>JPG ou PNG — guardada localmente</span>
                      </div>
                    </label>
                  </Section>

                  <Section label="Informações do Jogador">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                      <Field label="Nome Completo" full><input value={active.nome} onChange={e => updateActive('nome', e.target.value)} placeholder="ex: João Silva" style={inputStyle} /></Field>
                      <Field label="Idade"><input type="number" value={active.idade} onChange={e => updateActive('idade', e.target.value)} placeholder="22" style={inputStyle} /></Field>
                      <Field label="Nacionalidade"><input value={active.nacionalidade} onChange={e => updateActive('nacionalidade', e.target.value)} placeholder="ex: Portugal" style={inputStyle} /></Field>
                      <Field label="Clube Atual"><input value={active.clube} onChange={e => updateActive('clube', e.target.value)} placeholder="ex: SC Braga" style={inputStyle} /></Field>
                      <Field label="Pé Dominante">
                        <select value={active.pe} onChange={e => updateActive('pe', e.target.value)} style={inputStyle}>
                          <option value="">–</option>
                          <option>Direito</option><option>Esquerdo</option><option>Ambos</option>
                        </select>
                      </Field>
                      <Field label="Número de Camisola"><input value={active.numero} onChange={e => updateActive('numero', e.target.value)} placeholder="ex: 10" style={inputStyle} /></Field>
                      <Field label="Posição Específica em Campo" full><input value={active.posicaoEspecifica} onChange={e => updateActive('posicaoEspecifica', e.target.value)} placeholder="ex: LD – Lateral Direito, EE – Extremo Esquerdo, DCE – Defesa Central Esquerdo" style={inputStyle} /></Field>
                      <Field label="Jogo Observado" full><input value={active.jogo} onChange={e => updateActive('jogo', e.target.value)} placeholder="ex: AC Cabeceirense vs SC Braga – 18/02/2026" style={inputStyle} /></Field>
                    </div>
                  </Section>

                  <Section label="Posição em Campo">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
                      {Object.entries(POSICOES).map(([k, p]) => (
                        <div key={k} onClick={() => updateActive('posicao', k)} style={{ padding: '8px 5px', borderRadius: 6, border: '1px solid', borderColor: active.posicao === k ? 'var(--ac-blue-light)' : 'var(--border)', background: active.posicao === k ? 'rgba(0,63,138,.22)' : 'var(--surface)', color: active.posicao === k ? '#6fa8dc' : 'var(--text-dim)', cursor: 'pointer', textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", transition: 'all .18s' }}>
                          <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 2 }}>{p.abbr}</div>
                          <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: .3 }}>{p.label}</div>
                        </div>
                      ))}
                    </div>
                  </Section>

                  {/* Competencies */}
                  {pos ? (
                    <Section label="Avaliação por Competência">
                      {ov && (
                        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderLeft: '3px solid var(--ac-red)', borderRadius: 6, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Classificação Geral</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{pos.competencias.filter(c => active.ratings[c]?.grade).length}/{pos.competencias.length} avaliadas</div>
                          </div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 44, lineHeight: 1, color: GRADE_COLORS[ov] }}>{ov}</div>
                        </div>
                      )}
                      {pos.competencias.map(comp => {
                        const r = active.ratings[comp] ?? { grade: null, obs: '' }
                        const tip = TOOLTIPS[comp]
                        return (
                          <div key={comp} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 11px', gap: 9, background: 'var(--surface2)', borderBottom: '1px solid var(--border)', borderRadius: '7px 7px 0 0' }}>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{comp}</span>
                                {tip && (
                                  <div style={{ position: 'relative', display: 'inline-flex' }} className="group">
                                    <button style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, cursor: 'help', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif" }}>i</button>
                                    <div style={{ display: 'none', position: 'fixed', zIndex: 9999 }} className="group-hover:block tooltip-content">
                                      <div style={{ background: '#0d1626', border: '1px solid #3a5070', borderRadius: 7, padding: '10px 13px', width: 270, fontSize: 11.5, lineHeight: 1.65, color: '#c8d8ee', boxShadow: '0 12px 40px rgba(0,0,0,.75)', fontWeight: 400 }}>{tip}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 3 }}>
                                {GRADES.map(g => (
                                  <GradeBtn key={g} grade={g} selected={r.grade === g} onClick={() => updateGrade(comp, g)} />
                                ))}
                              </div>
                            </div>
                            <div style={{ padding: '8px 11px' }}>
                              <textarea
                                value={r.obs}
                                onChange={e => updateObs(comp, e.target.value)}
                                placeholder={`Observações sobre ${comp.toLowerCase()}…`}
                                style={{ ...inputStyle, minHeight: 48, fontSize: 12.5, borderColor: 'transparent', background: 'var(--surface2)', fontStyle: 'normal', resize: 'vertical' }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </Section>
                  ) : (
                    <Section label="Avaliação por Competência">
                      <div style={{ background: 'var(--surface)', border: '1px dashed var(--border2)', borderRadius: 7, padding: 18, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>Seleciona uma posição para ver os critérios de avaliação</div>
                    </Section>
                  )}

                  <Section label="Resumo e Recomendação">
                    <Field label="Observações Gerais">
                      <textarea rows={5} value={active.resumo} onChange={e => updateActive('resumo', e.target.value)} placeholder="Avaliação geral, pontos fortes, fracos, recomendação…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
                    </Field>
                  </Section>
                </>
              )}
            </div>

            {/* PREVIEW */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg2)' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2.5, color: 'var(--text-dim)', textTransform: 'uppercase' }}>📄 Pré-visualização</div>
                {active && <button onClick={downloadCurrent} style={btnStyle('red')}>⬇ PDF</button>}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {active ? <PdfPreview player={active} /> : (
                  <div style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 28, marginBottom: 8, opacity: .3 }}>📋</div>
                    <div style={{ fontSize: 12 }}>A pré-visualização aparece aqui</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE: RELATÓRIOS */}
      {page === 'rel' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {!detailGroup ? (
            <>
              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 380 }}>
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none' }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por nome ou clube…" style={{ ...inputStyle, paddingLeft: 33 }} />
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Posição:</span>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {['', ...Object.keys(POSICOES)].map(k => {
                    const used = new Set(savedReports.map(r => r.posicao))
                    if (k !== '' && !used.has(k)) return null
                    return (
                      <button key={k} onClick={() => setActiveFilter(k)} style={{ padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: activeFilter === k ? 'var(--ac-blue-light)' : 'var(--border2)', background: activeFilter === k ? 'var(--ac-blue)' : 'var(--surface)', color: activeFilter === k ? '#fff' : 'var(--text-dim)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: .5, transition: 'all .15s' }}>
                        {k === '' ? 'Todas' : POSICOES[k].label}
                      </button>
                    )
                  })}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {savedReports.length} relatório{savedReports.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Grid */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <ReportsList reports={savedReports} filter={activeFilter} search={search} onOpenPlayer={setDetailGroup} />
              </div>
            </>
          ) : (
            /* Player Detail */
            <PlayerDetail group={detailGroup} onBack={() => setDetailGroup(null)} onEdit={editReport} onDelete={deleteReport} onExport={reports => downloadPDF(reports, `Relatorios_${(detailGroup.nome || 'Jogador').replace(/\s+/g, '_')}.pdf`)} />
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Reports List ─────────────────────────────────────────────── */
function ReportsList({ reports, filter, search, onOpenPlayer }: {
  reports: SavedReport[]
  filter: string
  search: string
  onOpenPlayer: (g: { nome: string; clube: string; reports: SavedReport[] }) => void
}) {
  const q = search.toLowerCase().trim()
  const filtered = reports.filter(r => {
    const mp = !filter || r.posicao === filter
    const mq = !q || (r.nome || '').toLowerCase().includes(q) || (r.clube || '').toLowerCase().includes(q)
    return mp && mq
  })
  const byPlayer: Record<string, { nome: string; clube: string; reports: SavedReport[] }> = {}
  filtered.forEach(r => {
    const key = (r.nome || '').trim().toLowerCase() || r.firestoreId
    if (!byPlayer[key]) byPlayer[key] = { nome: r.nome || '—', clube: r.clube || '', reports: [] }
    byPlayer[key].reports.push(r)
  })
  Object.values(byPlayer).forEach(p => p.reports.sort((a, b) => (b.criadoEm?.seconds ?? 0) - (a.criadoEm?.seconds ?? 0)))
  const list = Object.values(byPlayer).sort((a, b) => a.nome.localeCompare(b.nome))

  if (!list.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--text-muted)', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, opacity: .2 }}>{reports.length ? '🔍' : '📂'}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>{reports.length ? 'Nenhum resultado para esta pesquisa.' : 'Ainda sem relatórios guardados.\nPreenche uma observação e guarda-a.'}</div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, alignContent: 'start' }}>
      {list.map(group => {
        const latest = group.reports[0]
        const ov = calcOverall(latest.ratings, latest.posicao)
        const ini = (group.nome || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
        const positions = [...new Set(group.reports.map(r => POSICOES[r.posicao]?.label).filter(Boolean))]
        return (
          <div key={group.nome} onClick={() => onOpenPlayer(group)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'all .18s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(0,0,0,.4)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
          >
            <div style={{ height: 3, background: 'linear-gradient(90deg, var(--ac-red) 50%, var(--ac-blue) 50%)' }} />
            <div style={{ padding: 13 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 9 }}>
                <div style={{ width: 44, height: 44, borderRadius: 6, flexShrink: 0, background: 'var(--surface2)', border: '2px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: 'var(--text-dim)' }}>{ini}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{group.clube || 'Clube desconhecido'}</div>
                </div>
                {ov && <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, lineHeight: 1, color: GRADE_COLORS[ov] }}>{ov}</div>}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {positions.map((p, i) => <Tag key={i} type="pos">{p as string}</Tag>)}
                <Tag type="date">{group.reports.length} observaç{group.reports.length === 1 ? 'ão' : 'ões'}</Tag>
                {latest.data && <Tag type="date">📅 {latest.data}</Tag>}
              </div>
            </div>
            <div style={{ padding: '8px 13px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{latest.idade ? latest.idade + ' anos' : ''}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Clica para ver detalhes →</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Player Detail ─────────────────────────────────────────────── */
function PlayerDetail({ group, onBack, onEdit, onDelete, onExport }: {
  group: { nome: string; clube: string; reports: SavedReport[] }
  onBack: () => void
  onEdit: (r: SavedReport) => void
  onDelete: (fid: string) => void
  onExport: (reports: SavedReport[]) => void
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text-dim)', padding: '6px 14px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>← Voltar</button>
        <div style={{ flex: 1, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20 }}>{group.nome}</div>
        <button onClick={() => onExport(group.reports)} style={btnStyle('red')}>⬇ Exportar relatórios</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 860, margin: '0 auto' }}>
          {group.reports.map(r => (
            <ReportDetailCard key={r.firestoreId} report={r} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Report Detail Card ────────────────────────────────────────── */
function ReportDetailCard({ report: r, onEdit, onDelete }: {
  report: SavedReport
  onEdit: (r: SavedReport) => void
  onDelete: (fid: string) => void
}) {
  const pos = POSICOES[r.posicao]
  const ov = calcOverall(r.ratings, r.posicao)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {pos && <Tag type="pos">{pos.label}</Tag>}
          {r.posicaoEspecifica && <Tag type="pos" style={{ background: 'rgba(0,63,138,.12)', color: '#8ab4e0', borderColor: 'rgba(0,63,138,.25)' }}>{r.posicaoEspecifica}</Tag>}
          {r.data && <Tag type="date">📅 {r.data}</Tag>}
          {r.jogo && <Tag type="jogo">⚽ {r.jogo}</Tag>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onEdit(r)} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(0,63,138,.2)', color: '#6fa8dc' }}>✏️ Editar</button>
          <button onClick={() => onDelete(r.firestoreId)} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(255,255,255,.04)', color: 'var(--text-muted)' }}>🗑 Eliminar</button>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Overall */}
        {ov && pos && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', border: '1px solid var(--border2)', borderLeft: '3px solid var(--ac-red)', borderRadius: 6, padding: '10px 14px', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Classificação Geral</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{pos.competencias.filter(c => r.ratings[c]?.grade).length}/{pos.competencias.length} competências avaliadas</div>
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 42, lineHeight: 1, color: GRADE_COLORS[ov] }}>{ov}</div>
          </div>
        )}

        {/* Competencies */}
        {pos && (
          <>
            <SectionTitle>Avaliação por Competência</SectionTitle>
            {pos.competencias.map(c => {
              const rat = r.ratings?.[c] ?? { grade: null, obs: '' }
              const g = rat.grade
              return (
                <div key={c}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 120px', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{c}</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, textAlign: 'center', color: g ? GRADE_COLORS[g] : 'var(--text-muted)' }}>{g || '–'}</div>
                    <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: g ? GRADE_PCT[g] + '%' : '0%', background: g ? GRADE_COLORS[g] : 'transparent', borderRadius: 2 }} />
                    </div>
                  </div>
                  {rat.obs && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '3px 10px', background: 'var(--surface2)', borderLeft: '2px solid var(--border2)', borderRadius: '0 3px 3px 0', marginBottom: 3 }}>{rat.obs}</div>}
                </div>
              )
            })}
          </>
        )}

        {/* Summary */}
        {r.resumo && (
          <>
            <SectionTitle style={{ marginTop: 14 }}>Observações Gerais</SectionTitle>
            <div style={{ background: 'rgba(208,2,27,.06)', borderLeft: '3px solid var(--ac-red)', padding: '10px 13px', borderRadius: '0 6px 6px 0', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.65 }}>{r.resumo}</div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── PDF Preview ───────────────────────────────────────────────── */
function PdfPreview({ player: p }: { player: Player }) {
  const pos = POSICOES[p.posicao]
  const ov = calcOverall(p.ratings, p.posicao)
  const ini = p.nome ? p.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'

  return (
    <div style={{ background: '#fff', borderRadius: 3, overflow: 'hidden', boxShadow: '0 10px 50px rgba(0,0,0,.55)', color: '#111', fontFamily: "'Barlow', Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg, #d0021b 50%, #003f8a 50%)', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32 }}><Crest size={32} /></div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 14, color: '#fff', letterSpacing: 1.5, textTransform: 'uppercase' }}>Atlético Cabeceirense</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,.6)', letterSpacing: 2.5, fontWeight: 600, textTransform: 'uppercase' }}>Futebol Clube</div>
          </div>
        </div>
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,.5)', letterSpacing: 2, fontWeight: 600, textTransform: 'uppercase' }}>Relatório de Observação</div>
      </div>
      {/* Player band */}
      <div style={{ background: '#f5f7fc', borderBottom: '4px solid', borderImage: 'linear-gradient(90deg, #d0021b 50%, #003f8a 50%) 1', padding: '13px 18px', display: 'flex', gap: 13 }}>
        <div style={{ width: 58, height: 58, borderRadius: 5, overflow: 'hidden', flexShrink: 0, border: '2.5px solid #d0021b', background: '#dde4f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: '#8899bb' }}>
          {p.photo ? <img src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : ini}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: '#080e1c', lineHeight: 1, marginBottom: 4 }}>{p.nome || 'Nome do Jogador'}</div>
          {pos && <div style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 10, background: '#003f8a', color: '#fff', fontSize: 7.5, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{pos.label}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {[['Idade', p.idade], ['Clube', p.clube], ['Pé', p.pe], ['Nº', p.numero]].filter(([, v]) => v).map(([l, v]) => (
              <div key={l}><div style={{ fontSize: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#99a8c0' }}>{l}</div><div style={{ fontSize: 10, fontWeight: 600, color: '#0a1020' }}>{v}</div></div>
            ))}
          </div>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: '13px 18px' }}>
        {ov && pos && (
          <div style={{ background: 'linear-gradient(135deg, #080e1c, #0d1830)', borderRadius: 5, padding: '9px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, borderLeft: '3px solid #d0021b' }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: '#5a7090' }}>Classificação Geral</div>
              <div style={{ fontSize: 8, color: '#6a7a90', marginTop: 1 }}>{pos.competencias.filter(c => p.ratings[c]?.grade).length}/{pos.competencias.length} competências</div>
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 30, lineHeight: 1, color: GRADE_COLORS[ov] }}>{ov}</div>
          </div>
        )}
        {pos && pos.competencias.map(c => {
          const r = p.ratings[c] ?? { grade: null, obs: '' }
          const g = r.grade
          return (
            <div key={c} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#0a1020' }}>{c}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 12, color: g ? GRADE_COLORS[g] : '#bbb' }}>{g || '–'}</span>
              </div>
              <div style={{ height: 3, background: '#e4ecf8', borderRadius: 2, overflow: 'hidden', marginBottom: 3 }}>
                <div style={{ height: '100%', width: g ? GRADE_PCT[g] + '%' : '0%', background: g ? GRADE_COLORS[g] : 'transparent', borderRadius: 2 }} />
              </div>
              {r.obs && <div style={{ fontSize: 9, color: '#445060', lineHeight: 1.55, background: '#f5f8ff', borderLeft: '2px solid #c5d5ea', padding: '3px 7px', borderRadius: '0 3px 3px 0', fontStyle: 'italic' }}>{r.obs}</div>}
            </div>
          )
        })}
        {p.resumo && (
          <>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: '#003f8a', marginBottom: 7, paddingBottom: 4, borderBottom: '1.5px solid #d8e4f5', marginTop: 10 }}>Observações Gerais</div>
            <div style={{ background: '#fff5f6', borderLeft: '3px solid #d0021b', padding: '8px 11px', borderRadius: '0 4px 4px 0', fontSize: 10, color: '#2a3040', lineHeight: 1.65 }}>{p.resumo}</div>
          </>
        )}
      </div>
      <div style={{ background: 'linear-gradient(90deg, rgba(208,2,27,.05), rgba(0,63,138,.05))', borderTop: '1px solid #dde6f5', padding: '7px 18px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 7, color: '#99a8c0' }}>Atlético Cabeceirense FC — Relatório Confidencial</span>
        <span style={{ fontSize: 7, color: '#99a8c0' }}>Data: {p.data}</span>
      </div>
    </div>
  )
}

/* ─── Small helpers ─────────────────────────────────────────────── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--ac-red)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        {label}
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--border2), transparent)' }} />
      </div>
      {children}
    </div>
  )
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--ac-red)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      {children}
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--border2), transparent)' }} />
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: full ? '1 / -1' : undefined }}>
      <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-dim)' }}>{label}</label>
      {children}
    </div>
  )
}

function Tag({ type, children, style }: { type: 'pos' | 'date' | 'jogo'; children: React.ReactNode; style?: React.CSSProperties }) {
  const base: React.CSSProperties = { padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: .5, textTransform: 'uppercase', display: 'inline-flex' }
  const types: Record<string, React.CSSProperties> = {
    pos:  { background: 'rgba(0,63,138,.25)', color: '#6fa8dc', border: '1px solid rgba(0,63,138,.4)' },
    date: { background: 'rgba(255,255,255,.05)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: 9.5, fontFamily: "'Barlow', sans-serif", textTransform: 'none', letterSpacing: 0 },
    jogo: { background: 'rgba(208,2,27,.12)', color: '#e87080', border: '1px solid rgba(208,2,27,.25)', fontSize: 9.5, fontFamily: "'Barlow', sans-serif", textTransform: 'none', letterSpacing: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  }
  return <span style={{ ...base, ...types[type], ...style }}>{children}</span>
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5,
  padding: '8px 10px', color: 'var(--text)', fontFamily: "'Barlow', sans-serif",
  fontSize: 13, outline: 'none', width: '100%',
}

function btnStyle(variant: 'red' | 'blue' | 'green'): React.CSSProperties {
  const variants = {
    red:   { background: '#d0021b', color: '#fff' },
    blue:  { background: '#003f8a', color: '#fff', border: '1px solid #1a5cb0' },
    green: { background: '#00501a', color: '#6dffaa', border: '1px solid #00c853' },
  }
  return { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 5, fontFamily: "'Barlow', sans-serif", fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .18s', ...variants[variant] }
}
