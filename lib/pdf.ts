import { POSICOES, GRADE_COLORS, GRADE_PCT, GRADE_RGB, calcOverall, type SavedReport } from './data'

type PDFReport = SavedReport & { photo?: string | null }

export async function buildPDF(p: PDFReport, doc: any) {