import { ArrowLeft, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { CptImportResult } from '../api/types'
import { Alert, PageHeader } from '../components/ui'

type Row = Record<string, unknown>

// Lida no navegador como no painel web (valores como texto, linhas em branco
// mantidas para a numeração bater com a planilha); quem entende as colunas é
// o CptsImportService.
async function readSpreadsheet(file: File): Promise<Row[]> {
  const XLSX = await import('xlsx')
  const workbook = file.name.toLowerCase().endsWith('.csv')
    ? XLSX.read(await file.text(), { type: 'string' })
    : XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: null, raw: false, blankrows: true })
}

async function downloadFailures(result: CptImportResult) {
  const XLSX = await import('xlsx')
  const rows = result.not_found.map((f) => ({
    Linha: f.linha, Código: f.codigo_formatado || f.codigo, Descrição: f.descricao, Motivo: f.motivo,
  }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Não importados')
  XLSX.writeFile(book, 'procedimentos-nao-importados.xlsx')
}

export default function ProcedureImport() {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [result, setResult] = useState<CptImportResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const filled = rows?.filter((row) => Object.values(row).some((v) => v !== null && v !== '')) ?? []
  const columns = filled.length ? Object.keys(filled[0]) : []

  async function pick(selected: File | undefined) {
    setResult(null)
    setError('')
    setRows(null)
    setFile(selected ?? null)
    if (!selected) return
    try {
      setRows(await readSpreadsheet(selected))
    } catch {
      setError('Não foi possível ler o arquivo. Use uma planilha .xlsx, .xls ou .csv.')
    }
  }

  async function send() {
    if (!rows?.length) return
    setError('')
    setBusy(true)
    try {
      setResult(await api.post<CptImportResult>('/procedures/import', { dados_json: JSON.stringify(rows) }))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <Link to="/procedimentos" className="btn btn-ghost btn-sm back"><ArrowLeft size={16} /> Procedimentos</Link>
      <PageHeader title="Importar procedimentos" subtitle="Atualize sua tabela de uma vez a partir de uma planilha." />

      <section className="card stack">
        <h2>1. Escolha a planilha</h2>
        <p className="muted">
          Colunas: <strong>Código</strong> (CBHPM, com ou sem pontos, obrigatória), Valor, Descrição e Ativo
          (Sim/Não). Procedimentos que já estão na tabela têm o valor e a situação atualizados. A planilha gerada
          em <em>Exportar</em> pode ser editada e importada de volta.
        </p>
        <button type="button" className="dropzone" onClick={() => input.current?.click()}>
          <FileSpreadsheet size={28} />
          <span>{file ? file.name : 'Clique para escolher um arquivo .xlsx, .xls ou .csv'}</span>
          {filled.length > 0 && <span className="muted">{filled.length} linha{filled.length > 1 ? 's' : ''} com dados</span>}
        </button>
        <input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => pick(e.target.files?.[0])} />

        {filled.length > 0 && (
          <div className="table-scroll">
            <table className="table">
              <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {filled.slice(0, 3).map((row, i) => (
                  <tr key={i}>{columns.map((c) => <td key={c}>{String(row[c] ?? '')}</td>)}</tr>
                ))}
              </tbody>
            </table>
            {filled.length > 3 && <p className="muted table-note">Prévia das 3 primeiras linhas.</p>}
          </div>
        )}
        {rows && filled.length === 0 && <Alert>A planilha está vazia.</Alert>}

        <Alert>{error}</Alert>
        <div className="actions">
          <button className="btn btn-primary" disabled={!filled.length || busy} onClick={send}>
            <Upload size={18} /> {busy ? 'Importando…' : 'Importar'}
          </button>
        </div>
      </section>

      {result && (
        <section className="card stack">
          <h2>2. Resultado</h2>
          <Alert tone={result.status === 'success' ? 'success' : result.status === 'partial' ? 'info' : 'danger'}>
            {result.resumo || result.errors.join(' ')}
          </Alert>
          {result.not_found.length > 0 && (
            <>
              <div className="section-head">
                <h2>Não importados ({result.not_found_count})</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => downloadFailures(result)}>
                  <Download size={16} /> Baixar planilha de conferência
                </button>
              </div>
              <div className="table-scroll">
                <table className="table">
                  <thead><tr><th>Linha</th><th>Código</th><th>Descrição</th><th>Motivo</th></tr></thead>
                  <tbody>
                    {result.not_found.map((f) => (
                      <tr key={`${f.linha}-${f.codigo}`}>
                        <td>{f.linha}</td><td>{f.codigo_formatado || f.codigo}</td><td>{f.descricao}</td><td>{f.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="actions">
            <Link to="/procedimentos" className="btn btn-primary">Ver procedimentos</Link>
          </div>
        </section>
      )}
    </div>
  )
}
