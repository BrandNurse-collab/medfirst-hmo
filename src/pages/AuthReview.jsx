import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAuthorizationById, getTariffItems, reviewAuthorization } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { PageHeader, Btn, Alert, Badge, PlanPill, Spinner, Textarea, fmtN, fmtD } from '../components/UI'

export default function AuthReview() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [a, setA] = useState(null)
  const [tMap, setTMap] = useState({})
  const [svc, setSvc] = useState({})
  const [med, setMed] = useState({})
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([getAuthorizationById(id), getTariffItems()]).then(([auth, tariff]) => {
      setA(auth)
      setTMap(Object.fromEntries(tariff.map((t) => [t.code, t])))
      setSvc(Object.fromEntries(auth.auth_service_lines.map((l) => [l.id, { status: l.status, reviewer_note: l.reviewer_note || '' }])))
      setMed(Object.fromEntries(auth.auth_medication_lines.map((l) => [l.id, { status: l.status, reviewer_note: l.reviewer_note || '' }])))
      setNotes(auth.reviewer_notes || '')
    })
  }, [id])

  if (!a) return <Spinner />
  const canReview = ['admin', 'medops'].includes(profile?.role) && a.status === 'Pending'
  const m = a.member
  const remaining = m.annual_limit - m.utilized_amount
  const sLines = [...a.auth_service_lines].sort((x, y) => x.sort_order - y.sort_order)
  const mLines = [...a.auth_medication_lines].sort((x, y) => x.sort_order - y.sort_order)
  const all = [...Object.values(svc), ...Object.values(med)]
  const pending = all.filter((x) => x.status === 'Pending').length
  const approved = all.filter((x) => x.status === 'Approved').length
  const outcome = approved === 0 ? 'Declined' : approved === all.length ? 'Approved' : 'Partially Approved'

  const set = (setter) => (lineId, patch) => setter((p) => ({ ...p, [lineId]: { ...p[lineId], ...patch } }))
  const setS = set(setSvc), setM = set(setMed)
  const declineAll = () => { setSvc((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, status: 'Declined' }]))); setMed((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, status: 'Declined' }]))) }
  const approveAll = () => { setSvc((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, status: 'Approved' }]))); setMed((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, status: 'Approved' }]))) }

  const submit = async () => {
    setErr('')
    if (pending > 0) return setErr(`${pending} line(s) still undecided. Review every line.`)
    if (outcome !== 'Approved' && !notes.trim()) return setErr('Reviewer notes are required for a partial approval or decline.')
    const declinedNoReason = [...Object.values(svc), ...Object.values(med)].some((x) => x.status === 'Declined' && !x.reviewer_note.trim())
    if (declinedNoReason) return setErr('Give a reason on every declined line.')
    setBusy(true)
    try {
      await reviewAuthorization({ authId: a.id, decision: outcome, reviewerNotes: notes, serviceLineUpdates: svc, medicationLineUpdates: med, reviewerId: user.id })
      nav('/authorizations')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const LineBtns = ({ val, onSet }) => (
    <div style={{ whiteSpace: 'nowrap' }}>
      <button disabled={!canReview} className={`line-ap${val.status === 'Approved' ? ' on' : ''}`} onClick={() => onSet({ status: 'Approved' })}>Approve</button>
      <button disabled={!canReview} className={`line-dc${val.status === 'Declined' ? ' on' : ''}`} onClick={() => onSet({ status: 'Declined' })}>Decline</button>
    </div>
  )
  const NoteBox = ({ val, onSet }) => (
    <input className="form-input" style={{ fontSize: 11 }} disabled={!canReview} placeholder={val.status === 'Declined' ? 'Reason (required)' : 'Note'} value={val.reviewer_note} onChange={(e) => onSet({ reviewer_note: e.target.value })} />
  )

  return (
    <div>
      <PageHeader title={`Authorization ${a.auth_no}`} subtitle={`${m.surname} ${m.first_name} · ${a.provider?.name}`}>
        <Badge status={a.status} />
        <Btn variant="ghost" onClick={() => nav(-1)}>Back</Btn>
      </PageHeader>
      {err && <Alert type="error">{err}</Alert>}
      <div className="grid-2">
        <div className="card">
          <p className="card-title">Clinical picture</p>
          <p style={{ fontSize: 13, fontWeight: 600 }}>{a.icd_code} · {a.icd_description}</p>
          <p className="text-xs text-muted" style={{ marginBottom: 8 }}>Submitted {fmtD(a.submitted_at)}</p>
          {Object.values(a.vitals || {}).some(Boolean) && <div className="clinical-box"><p className="clinical-box-label">Vitals</p><p style={{ fontSize: 12 }}>{Object.entries(a.vitals).filter(([, v]) => v).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' · ')}</p></div>}
          <div className="clinical-box"><p className="clinical-box-label">Findings</p><p style={{ fontSize: 12 }}>{a.clinical_findings}</p></div>
          {a.clinical_notes && <div className="clinical-box"><p className="clinical-box-label">Justification</p><p style={{ fontSize: 12 }}>{a.clinical_notes}</p></div>}
        </div>
        <div className="card">
          <p className="card-title">Coverage check</p>
          <p style={{ fontSize: 12, marginBottom: 6 }}>Plan <PlanPill plan={m.plan} /> · remaining benefit <strong>{fmtN(remaining)}</strong></p>
          <p style={{ fontSize: 12 }}>Requested <strong>{fmtN(a.total_requested)}</strong></p>
          {a.total_requested > remaining && <Alert type="warn">Request exceeds the member's remaining benefit.</Alert>}
          {a.status !== 'Pending' && (
            <div className={`alert ${a.status === 'Declined' ? 'alert-error' : 'alert-success'}`} style={{ marginTop: 10 }}>
              <strong>{a.status}</strong>{a.auth_code && <> · code <span className="font-mono">{a.auth_code}</span></>}
              {a.reviewer_notes && <p style={{ marginTop: 4 }}>{a.reviewer_notes}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <p className="card-title">Services: decide each line</p>
          {canReview && <div style={{ display: 'flex', gap: 6 }}><Btn size="sm" variant="ghost" onClick={approveAll}>Approve all lines</Btn><Btn size="sm" variant="ghost" onClick={declineAll}>Decline all lines</Btn></div>}
        </div>
        <table className="dt"><thead><tr><th>Service</th><th>Qty × rate</th><th>Amount</th><th>Decision</th><th>Note</th></tr></thead>
          <tbody>{sLines.map((l) => {
            const notCovered = tMap[l.tariff_code] && !(tMap[l.tariff_code].plan_coverage || []).includes(m.plan)
            return (
              <tr key={l.id}>
                <td><strong>{l.description}</strong><br /><span className="text-xs text-muted">{l.tariff_code}</span>
                  {notCovered && <div className="flag-box critical">Not covered under the {m.plan} plan benefit package</div>}</td>
                <td>{l.quantity} × {fmtN(l.tariff_rate)}</td><td>{fmtN(l.requested_amount)}</td>
                <td><LineBtns val={svc[l.id]} onSet={(p) => setS(l.id, p)} /></td>
                <td><NoteBox val={svc[l.id]} onSet={(p) => setS(l.id, p)} /></td>
              </tr>)
          })}</tbody></table>
      </div>

      <div className="card">
        <p className="card-title">Medications: decide each line</p>
        <table className="dt"><thead><tr><th>Drug</th><th>Regimen</th><th>Qty / amount</th><th>Decision</th><th>Note</th></tr></thead>
          <tbody>{mLines.length === 0 && <tr><td colSpan="5" className="text-muted">No medications requested</td></tr>}
            {mLines.map((l) => (
              <tr key={l.id}>
                <td><strong>{l.drug_name}</strong>{!l.is_formulary && <div className="flag-box critical">Off-formulary</div>}</td>
                <td className="text-sm">{l.dose} {l.route} {l.frequency}<br />{l.duration}</td>
                <td>{l.quantity} · {fmtN(l.quantity * (l.formulary_rate || 0))}</td>
                <td><LineBtns val={med[l.id]} onSet={(p) => setM(l.id, p)} /></td>
                <td><NoteBox val={med[l.id]} onSet={(p) => setM(l.id, p)} /></td>
              </tr>))}</tbody></table>
      </div>

      {canReview && (
        <div className="card">
          <Textarea label="Reviewer notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Summarise the clinical rationale for your decisions" />
          <p style={{ fontSize: 12, marginBottom: 10 }}>Outcome from your line decisions: <Badge status={outcome} />{pending > 0 && <span className="text-muted"> ({pending} undecided)</span>}</p>
          <Btn variant="success" loading={busy} onClick={submit}>Submit decision</Btn>
        </div>
      )}
    </div>
  )
}
