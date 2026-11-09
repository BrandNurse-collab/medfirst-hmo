import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getClaimById, vetClaim, markClaimPaid } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { PageHeader, Btn, Alert, Badge, PlanPill, Spinner, Textarea, KpiCard, fmtN } from '../components/UI'

export default function ClaimVet() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [c, setC] = useState(null)
  const [svc, setSvc] = useState({})
  const [med, setMed] = useState({})
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => getClaimById(id).then((cl) => {
    setC(cl)
    setSvc(Object.fromEntries(cl.claim_service_lines.map((l) => [l.id, { vet_status: l.vet_status, vet_note: l.vet_note || '' }])))
    setMed(Object.fromEntries(cl.claim_medication_lines.map((l) => [l.id, { vet_status: l.vet_status, vet_note: l.vet_note || '' }])))
    setNotes(cl.vetter_notes || '')
  })
  useEffect(() => { load() }, [id])

  if (!c) return <Spinner />
  const canVet = ['admin', 'claims'].includes(profile?.role) && c.status === 'Pending'
  const canPay = ['admin', 'claims'].includes(profile?.role) && ['Approved', 'Partially Approved'].includes(c.status)
  const sL = [...c.claim_service_lines].sort((a, b) => a.sort_order - b.sort_order)
  const mL = [...c.claim_medication_lines].sort((a, b) => a.sort_order - b.sort_order)
  const sum = (lines, map, st) => lines.filter((l) => map[l.id].vet_status === st).reduce((s, l) => s + Number(l.billed_amount), 0)
  const approved = sum(sL, svc, 'Approved') + sum(mL, med, 'Approved')
  const rejected = sum(sL, svc, 'Rejected') + sum(mL, med, 'Rejected')
  const pending = [...Object.values(svc), ...Object.values(med)].filter((x) => x.vet_status === 'Pending').length
  const outcome = approved === 0 ? 'Rejected' : approved >= Number(c.submitted_amount) ? 'Approved' : 'Partially Approved'
  const setS = (lid, p) => setSvc((x) => ({ ...x, [lid]: { ...x[lid], ...p } }))
  const setM = (lid, p) => setMed((x) => ({ ...x, [lid]: { ...x[lid], ...p } }))

  const submit = async () => {
    setErr('')
    if (pending > 0) return setErr(`${pending} line(s) have not been reviewed.`)
    const bad = [...Object.values(svc), ...Object.values(med)].some((x) => ['Flagged', 'Rejected'].includes(x.vet_status) && !x.vet_note.trim())
    if (bad) return setErr('Every flagged or rejected line needs a reason.')
    if (outcome !== 'Approved' && !notes.trim()) return setErr('Vetting notes are required unless the claim is paid in full.')
    setBusy(true)
    try {
      await vetClaim({ claimId: c.id, decision: outcome, vetterNotes: notes, serviceLineUpdates: svc, medicationLineUpdates: med, vetterId: user.id })
      nav('/claims')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const pay = async () => { await markClaimPaid(c.id, c.approved_amount, user.id, c.claim_no); load() }

  const Dec = ({ v, onSet }) => (
    <div style={{ minWidth: 150 }}>
      <div>{[['Approved', 'A', 'vet-A'], ['Flagged', 'F', 'vet-F'], ['Rejected', 'R', 'vet-R']].map(([s, l, cls]) => (
        <button key={s} disabled={!canVet} title={s} className={`vet-btn ${cls}${v.vet_status === s ? ' on' : ''}`} onClick={() => onSet({ vet_status: s })}>{l}</button>))}</div>
      {(v.vet_status === 'Flagged' || v.vet_status === 'Rejected' || v.vet_note) && (
        <input className="form-input" style={{ fontSize: 11, marginTop: 4 }} disabled={!canVet} placeholder="Reason" value={v.vet_note} onChange={(e) => onSet({ vet_note: e.target.value })} />)}
    </div>
  )
  const rowBg = (s) => (s === 'Approved' ? '#F0FDF4' : s === 'Rejected' ? '#FEF2F2' : s === 'Flagged' ? '#FFFBEB' : '')

  return (
    <div>
      <PageHeader title={`Claim ${c.claim_no}`} subtitle={`${c.member.surname} ${c.member.first_name} · ${c.provider?.name}${c.batch_ref ? ' · ' + c.batch_ref : ''}`}>
        <Badge status={c.status} />
        <Btn variant="ghost" onClick={() => nav(-1)}>Back</Btn>
      </PageHeader>
      {err && <Alert type="error">{err}</Alert>}

      <div className="grid-2">
        <div className="card">
          <p className="card-title">Diagnosis and clinical course</p>
          <p style={{ fontSize: 13, fontWeight: 600 }}>{c.icd_code} · {c.icd_description}</p>
          <p style={{ fontSize: 12, margin: '4px 0 8px' }}>Plan <PlanPill plan={c.member.plan} /></p>
          <div className="clinical-box"><p className="clinical-box-label">Discharge summary (provider)</p><p style={{ fontSize: 12 }}>{c.clinical_summary}</p></div>
        </div>
        <div className="card">
          <p className="card-title">What was authorized</p>
          {c.auth ? (<>
            <p style={{ fontSize: 12 }}><span className="font-mono">{c.auth.auth_no}</span> · code <span className="font-mono">{c.auth.auth_code}</span></p>
            <div className="clinical-box" style={{ marginTop: 8 }}><p className="clinical-box-label">Findings at authorization</p><p style={{ fontSize: 12 }}>{c.auth.clinical_findings}</p></div>
          </>) : <Alert type="warn">No authorization is linked to this claim.</Alert>}
        </div>
      </div>

      <div className="card">
        <p className="card-title">Services and procedures: does each match the diagnosis and the authorization?</p>
        <table className="dt"><thead><tr><th>Service</th><th>Tariff</th><th>Auth qty</th><th>Billed qty</th><th>Billed</th><th>Variance</th><th>Decision</th></tr></thead>
          <tbody>{sL.map((l) => (
            <tr key={l.id} style={{ background: rowBg(svc[l.id].vet_status) }}>
              <td><strong>{l.description}</strong><br /><span className="text-xs text-muted">{l.tariff_code}</span>
                {l.auth_quantity === 0 && <div className="flag-box critical">Not in the authorization</div>}
                {l.billed_quantity > l.auth_quantity && l.auth_quantity > 0 && <div className="flag-box">Quantity above authorized</div>}
                {Number(l.billed_rate) > Number(l.tariff_rate) && <div className="flag-box">Rate above tariff</div>}</td>
              <td>{fmtN(l.tariff_rate)}</td><td>{l.auth_quantity}</td><td>{l.billed_quantity}</td><td>{fmtN(l.billed_amount)}</td>
              <td style={{ color: l.variance > 0 ? '#DC2626' : '#059669', fontWeight: 600 }}>{l.variance > 0 ? '+' + fmtN(l.variance) : '--'}</td>
              <td><Dec v={svc[l.id]} onSet={(p) => setS(l.id, p)} /></td>
            </tr>))}</tbody></table>
      </div>

      <div className="card">
        <p className="card-title">Medications: formulary, dose, quantity and unit cost</p>
        <table className="dt"><thead><tr><th>Drug</th><th>Formulary rate</th><th>Auth qty</th><th>Billed qty</th><th>Billed</th><th>Variance</th><th>Decision</th></tr></thead>
          <tbody>{mL.length === 0 && <tr><td colSpan="7" className="text-muted">No medications billed</td></tr>}
            {mL.map((l) => (
              <tr key={l.id} style={{ background: rowBg(med[l.id].vet_status) }}>
                <td><strong>{l.drug_name}</strong>{!l.is_formulary && <div className="flag-box critical">Off-formulary</div>}
                  {l.billed_quantity > l.auth_quantity && <div className="flag-box">Quantity above authorized</div>}</td>
                <td>{fmtN(l.formulary_rate)}</td><td>{l.auth_quantity}</td><td>{l.billed_quantity}</td><td>{fmtN(l.billed_amount)}</td>
                <td style={{ color: l.variance > 0 ? '#DC2626' : '#059669', fontWeight: 600 }}>{l.variance > 0 ? '+' + fmtN(l.variance) : '--'}</td>
                <td><Dec v={med[l.id]} onSet={(p) => setM(l.id, p)} /></td>
              </tr>))}</tbody></table>
      </div>

      <div className="grid-4" style={{ marginBottom: 12 }}>
        <KpiCard label="Submitted" value={fmtN(c.submitted_amount)} />
        <KpiCard label="Approved" value={fmtN(c.status === 'Pending' ? approved : c.approved_amount)} color="#16A085" />
        <KpiCard label="Rejected" value={fmtN(rejected)} color="#DC2626" />
        <KpiCard label="Lines not reviewed" value={pending} color="#D97706" />
      </div>

      {canVet && (
        <div className="card">
          <Textarea label="Vetting notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Findings, rejected lines and the clinical or contractual reason" />
          <p style={{ fontSize: 12, marginBottom: 10 }}>Outcome from your line decisions: <Badge status={outcome} /></p>
          <Btn variant="success" loading={busy} onClick={submit}>Submit vetting decision</Btn>
        </div>
      )}
      {c.status !== 'Pending' && c.vetter_notes && <div className="alert alert-info"><strong>Vetting notes:</strong> {c.vetter_notes}</div>}
      {canPay && <Btn variant="primary" onClick={pay}>Record payment of {fmtN(c.approved_amount)}</Btn>}
    </div>
  )
}
