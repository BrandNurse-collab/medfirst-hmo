import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { checkEligibility, getMemberById, getProviders, getTariffItems, getFormularyItems, createAuthorization } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { ICD10_CODES } from '../lib/constants'
import { PageHeader, Btn, Alert, Input, Select, Textarea, PlanPill, fmtN } from '../components/UI'

const STEPS = ['Member', 'Clinical', 'Services', 'Review']

export default function SubmitAuth() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [step, setStep] = useState(1)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState(null)
  const [member, setMember] = useState(null)
  const [providers, setProviders] = useState([])
  const [providerId, setProviderId] = useState('')
  const [tariff, setTariff] = useState([])
  const [formulary, setFormulary] = useState([])
  const [icd, setIcd] = useState('')
  const [vit, setVit] = useState({ bp: '', temp: '', spo2: '', weight: '', pulse: '' })
  const [findings, setFindings] = useState('')
  const [notes, setNotes] = useState('')
  const [svcs, setSvcs] = useState([{ code: '', qty: 1 }])
  const [meds, setMeds] = useState([{ name: '', dose: '', route: 'Oral', frequency: '', duration: '', qty: 1 }])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getProviders({ status: 'Active' }).then(setProviders)
    getTariffItems().then(setTariff)
    getFormularyItems().then(setFormulary)
    const id = sp.get('member')
    if (id) getMemberById(id).then((m) => { pick(m) })
  }, [])

  const pick = (m) => { setMember(m); setProviderId(m.provider_id || ''); setHits(null) }
  const search = async (e) => { e.preventDefault(); setHits(await checkEligibility(q.trim())) }

  const covered = (item, list) => !member || (item.plan_coverage || []).includes(member.plan)
  const tMap = Object.fromEntries(tariff.map((t) => [t.code, t]))
  const fMap = Object.fromEntries(formulary.map((f) => [f.name, f]))
  const svcLines = svcs.filter((s) => s.code).map((s, i) => ({ tariff_code: s.code, description: tMap[s.code].description, tariff_rate: tMap[s.code].unit_cost, quantity: +s.qty || 1, requested_amount: tMap[s.code].unit_cost * (+s.qty || 1) }))
  const medLines = meds.filter((m) => m.name).map((m) => ({ drug_name: m.name, dose: m.dose, route: m.route, frequency: m.frequency, duration: m.duration, quantity: +m.qty || 1, is_formulary: !!fMap[m.name], formulary_rate: fMap[m.name]?.unit_cost || 0 }))
  const total = svcLines.reduce((s, l) => s + l.requested_amount, 0) + medLines.reduce((s, l) => s + l.quantity * l.formulary_rate, 0)
  const icdObj = ICD10_CODES.find((c) => c.code === icd)

  const next = () => {
    setErr('')
    if (step === 1 && (!member || !providerId)) return setErr('Select an active member and the treating hospital.')
    if (step === 2 && (!icd || !findings.trim())) return setErr('Diagnosis and clinical findings are required.')
    if (step === 3 && svcLines.length === 0) return setErr('Add at least one service.')
    setStep(step + 1)
  }

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      await createAuthorization({
        authData: { member_id: member.id, provider_id: providerId, icd_code: icd, icd_description: icdObj.description, vitals: vit, clinical_findings: findings, clinical_notes: notes },
        serviceLines: svcLines, medicationLines: medLines, userId: user.id,
      })
      nav('/my-authorizations')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const upd = (setter) => (i, k, v) => setter((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const updSvc = upd(setSvcs), updMed = upd(setMeds)

  return (
    <div>
      <PageHeader title="Submit Authorization Request" subtitle="Clinical pre-authorization for the HMO medical team">
        <div className="steps">{STEPS.map((s, i) => <span key={s} className={`step-item ${step === i + 1 ? 'step-active' : step > i + 1 ? 'step-done' : 'step-pending'}`}>{i + 1}. {s}</span>)}</div>
      </PageHeader>
      {err && <Alert type="error">{err}</Alert>}

      {step === 1 && (
        <div className="card" style={{ maxWidth: 620 }}>
          <p className="card-title">Find the enrolled member</p>
          <form onSubmit={search} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="form-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Member ID, policy number, phone or surname" />
            <Btn type="submit">Search</Btn>
          </form>
          {hits && hits.length === 0 && <Alert type="warn">No member found.</Alert>}
          {hits?.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
              <div><strong>{m.surname}, {m.first_name}</strong> <PlanPill plan={m.plan} /><br /><span className="text-xs text-muted">{m.member_no} · {m.status}</span></div>
              {m.status === 'Active' ? <Btn size="sm" onClick={() => pick(m)}>Select</Btn> : <span style={{ color: '#991B1B', fontSize: 11, fontWeight: 600 }}>Suspended: cannot proceed</span>}
            </div>
          ))}
          {member && (
            <div className="alert alert-success" style={{ marginTop: 12 }}>
              Selected: <strong>{member.surname}, {member.first_name}</strong> ({member.plan}). Remaining benefit {fmtN(member.annual_limit - member.utilized_amount)}.
            </div>
          )}
          <Select label="Treating hospital" required value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            <option value="">Select</option>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
      )}

      {step === 2 && (
        <div className="grid-2">
          <div className="card">
            <p className="card-title">Diagnosis</p>
            <Select label="ICD-10" required value={icd} onChange={(e) => setIcd(e.target.value)}>
              <option value="">Select</option>
              {ICD10_CODES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.description}</option>)}
            </Select>
            <Textarea label="Clinical findings" required rows={6} value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="Presenting complaint, examination, investigations, management so far" />
          </div>
          <div className="card">
            <p className="card-title">Vitals</p>
            <div className="grid-2">
              {[['bp', 'Blood pressure'], ['temp', 'Temperature'], ['spo2', 'SpO2'], ['weight', 'Weight'], ['pulse', 'Pulse']].map(([k, l]) => (
                <Input key={k} label={l} value={vit[k]} onChange={(e) => setVit({ ...vit, [k]: e.target.value })} />
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <>
          <div className="grid-2">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><p className="card-title">Services and procedures</p><Btn size="sm" variant="ghost" onClick={() => setSvcs([...svcs, { code: '', qty: 1 }])}>Add line</Btn></div>
              {svcs.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <select className="form-select" value={s.code} onChange={(e) => updSvc(i, 'code', e.target.value)}>
                    <option value="">Select service</option>
                    {tariff.map((t) => <option key={t.code} value={t.code}>{t.code} · {t.description} ({fmtN(t.unit_cost)}){covered(t) ? '' : ` · not on ${member?.plan}`}</option>)}
                  </select>
                  <input className="form-input" style={{ width: 64 }} type="number" min="1" value={s.qty} onChange={(e) => updSvc(i, 'qty', e.target.value)} />
                  {svcs.length > 1 && <Btn size="sm" variant="ghost" onClick={() => setSvcs(svcs.filter((_, j) => j !== i))}>×</Btn>}
                </div>
              ))}
            </div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><p className="card-title">Medications</p><Btn size="sm" variant="ghost" onClick={() => setMeds([...meds, { name: '', dose: '', route: 'Oral', frequency: '', duration: '', qty: 1 }])}>Add drug</Btn></div>
              {meds.map((m, i) => (
                <div key={i} style={{ background: '#F8FAFC', padding: 8, borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <select className="form-select" value={m.name} onChange={(e) => updMed(i, 'name', e.target.value)}>
                      <option value="">Select drug</option>
                      {formulary.map((f) => <option key={f.id} value={f.name}>{f.name} ({fmtN(f.unit_cost)})</option>)}
                    </select>
                    {meds.length > 1 && <Btn size="sm" variant="ghost" onClick={() => setMeds(meds.filter((_, j) => j !== i))}>×</Btn>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                    <input className="form-input" placeholder="Dose" value={m.dose} onChange={(e) => updMed(i, 'dose', e.target.value)} />
                    <select className="form-select" value={m.route} onChange={(e) => updMed(i, 'route', e.target.value)}>{['Oral', 'IV', 'IM', 'SC'].map((r) => <option key={r}>{r}</option>)}</select>
                    <input className="form-input" placeholder="Frequency" value={m.frequency} onChange={(e) => updMed(i, 'frequency', e.target.value)} />
                    <input className="form-input" placeholder="Duration" value={m.duration} onChange={(e) => updMed(i, 'duration', e.target.value)} />
                    <input className="form-input" type="number" min="1" title="Quantity" value={m.qty} onChange={(e) => updMed(i, 'qty', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card"><Textarea label="Clinical justification" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why these services are necessary: failed prior management, specialist advice, risk if delayed" /></div>
        </>
      )}

      {step === 4 && (
        <div className="grid-2">
          <div className="card">
            <p className="card-title">Summary</p>
            <p><strong>{member.surname}, {member.first_name}</strong> <PlanPill plan={member.plan} /></p>
            <p style={{ fontSize: 12, margin: '6px 0' }}>{icd} · {icdObj?.description}</p>
            <div className="clinical-box"><p className="clinical-box-label">Findings</p><p style={{ fontSize: 12 }}>{findings}</p></div>
            {notes && <div className="clinical-box"><p className="clinical-box-label">Justification</p><p style={{ fontSize: 12 }}>{notes}</p></div>}
          </div>
          <div className="card">
            <p className="card-title">Requested</p>
            {svcLines.map((l, i) => <p key={i} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}><span>{l.description} × {l.quantity}</span><span>{fmtN(l.requested_amount)}</span></p>)}
            {medLines.map((l, i) => <p key={i} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}><span>{l.drug_name} × {l.quantity}</span><span>{fmtN(l.quantity * l.formulary_rate)}</span></p>)}
            <hr style={{ margin: '10px 0', border: 0, borderTop: '1px solid #E5E7EB' }} />
            <p style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}><span>Total</span><span>{fmtN(total)}</span></p>
            {total > member.annual_limit - member.utilized_amount && <Alert type="warn">This request exceeds the member's remaining benefit.</Alert>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <Btn variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</Btn>
        {step < 4 ? <Btn onClick={next}>Continue</Btn> : <Btn variant="success" loading={busy} onClick={submit}>Submit authorization</Btn>}
      </div>
    </div>
  )
}
