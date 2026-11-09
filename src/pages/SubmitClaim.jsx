import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAuthorizations, getClaims, getTariffItems, createClaim } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { PageHeader, Btn, Alert, Badge, Spinner, Textarea, fmtN } from '../components/UI'

const initForm = (a) => ({
  summary: '',
  svc: Object.fromEntries(a.auth_service_lines.filter((l) => l.status === 'Approved').map((l) => [l.id, { qty: l.quantity, rate: l.tariff_rate }])),
  med: Object.fromEntries(a.auth_medication_lines.filter((l) => l.status === 'Approved').map((l) => [l.id, { qty: l.quantity, rate: l.formulary_rate || 0 }])),
  extras: [],
})

export default function SubmitClaim() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [auths, setAuths] = useState(null)
  const [tariff, setTariff] = useState([])
  const [sel, setSel] = useState([])
  const [forms, setForms] = useState({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([getAuthorizations({ pageSize: 200 }), getClaims({ pageSize: 300 }), getTariffItems()]).then(([a, c, t]) => {
      const claimed = new Set(c.data.map((x) => x.auth_id))
      const mine = a.data.filter((x) => ['Approved', 'Partially Approved'].includes(x.status) && !claimed.has(x.id) && (profile?.role !== 'provider' || x.submitted_by === user.id))
      setAuths(mine); setTariff(t)
      const pre = sp.get('auth')
      if (pre && mine.find((x) => x.id === pre)) toggle(mine.find((x) => x.id === pre))
    })
  }, [])

  const toggle = (a) => {
    setSel((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))
    setForms((p) => (p[a.id] ? p : { ...p, [a.id]: initForm(a) }))
  }
  const patch = (aid, fn) => setForms((p) => ({ ...p, [aid]: fn(p[aid]) }))
  const tMap = useMemo(() => Object.fromEntries(tariff.map((t) => [t.code, t])), [tariff])

  const build = (a) => {
    const f = forms[a.id]
    const svcLines = a.auth_service_lines.filter((l) => l.status === 'Approved').map((l, i) => {
      const q = +f.svc[l.id].qty || 0, r = +f.svc[l.id].rate || 0
      const billed = q * r, tariffAmt = l.quantity * l.tariff_rate, variance = Math.max(0, billed - tariffAmt)
      const notes = []
      if (q > l.quantity) notes.push(`Quantity ${q} exceeds authorized ${l.quantity}`)
      if (r > l.tariff_rate) notes.push(`Rate ${fmtN(r)} exceeds tariff ${fmtN(l.tariff_rate)}`)
      return { tariff_code: l.tariff_code, description: l.description, tariff_rate: l.tariff_rate, auth_quantity: l.quantity, billed_quantity: q, billed_rate: r, billed_amount: billed, tariff_amount: tariffAmt, variance, vet_status: variance > 0 ? 'Flagged' : 'Pending', vet_note: notes.join('. ') }
    })
    const extraLines = f.extras.filter((x) => x.code).map((x) => {
      const q = +x.qty || 1, r = +x.rate || tMap[x.code].unit_cost, billed = q * r
      return { tariff_code: x.code, description: tMap[x.code].description, tariff_rate: tMap[x.code].unit_cost, auth_quantity: 0, billed_quantity: q, billed_rate: r, billed_amount: billed, tariff_amount: 0, variance: billed, vet_status: 'Flagged', vet_note: 'Not included in the approved authorization' }
    })
    const medLines = a.auth_medication_lines.filter((l) => l.status === 'Approved').map((l) => {
      const q = +f.med[l.id].qty || 0, r = +f.med[l.id].rate || 0
      const billed = q * r, tariffAmt = l.quantity * (l.formulary_rate || 0), variance = Math.max(0, billed - tariffAmt)
      const notes = []
      if (q > l.quantity) notes.push(`Quantity ${q} exceeds authorized ${l.quantity}`)
      if (r > (l.formulary_rate || 0)) notes.push(`Unit cost ${fmtN(r)} exceeds formulary ${fmtN(l.formulary_rate)}`)
      return { drug_name: l.drug_name, is_formulary: l.is_formulary, formulary_rate: l.formulary_rate || 0, auth_quantity: l.quantity, billed_quantity: q, billed_amount: billed, tariff_amount: tariffAmt, variance, vet_status: variance > 0 ? 'Flagged' : 'Pending', vet_note: notes.join('. ') }
    })
    return { svcLines: [...svcLines, ...extraLines], medLines }
  }
  const totalOf = (a) => { const { svcLines, medLines } = build(a); return [...svcLines, ...medLines].reduce((s, l) => s + l.billed_amount, 0) }

  const submit = async () => {
    setErr('')
    const chosen = auths.filter((a) => sel.includes(a.id))
    if (chosen.length === 0) return setErr('Select at least one approved authorization.')
    if (chosen.some((a) => !forms[a.id].summary.trim())) return setErr('Every claim needs a clinical discharge summary.')
    setBusy(true)
    try {
      const batch = chosen.length > 1 ? `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}` : null
      for (const a of chosen) {
        const { svcLines, medLines } = build(a)
        await createClaim({
          claimData: { auth_id: a.id, member_id: a.member_id, provider_id: a.provider_id, icd_code: a.icd_code, icd_description: a.icd_description, clinical_summary: forms[a.id].summary, batch_ref: batch },
          serviceLines: svcLines, medicationLines: medLines, userId: user.id,
        })
      }
      nav('/my-claims')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  if (!auths) return <Spinner />
  const grand = auths.filter((a) => sel.includes(a.id)).reduce((s, a) => s + totalOf(a), 0)
  const inp = { className: 'form-input', style: { width: 80 }, type: 'number', min: 0 }

  return (
    <div>
      <PageHeader title="Submit Claims" subtitle="Select one or more approved authorizations. Several selected together are submitted as one batch." />
      {err && <Alert type="error">{err}</Alert>}
      {auths.length === 0 && <Alert type="info">No approved authorizations are waiting for a claim.</Alert>}
      <div className="card">
        <p className="card-title">Approved authorizations ready to claim</p>
        {auths.map((a) => (
          <label key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
            <input type="checkbox" checked={sel.includes(a.id)} onChange={() => toggle(a)} />
            <span style={{ fontSize: 12 }}><strong>{a.auth_no}</strong> · {a.member?.surname} {a.member?.first_name} · {a.icd_code} · code <span className="font-mono">{a.auth_code}</span> <Badge status={a.status} /></span>
          </label>
        ))}
      </div>

      {auths.filter((a) => sel.includes(a.id)).map((a) => {
        const f = forms[a.id]
        return (
          <div className="card" key={a.id}>
            <p className="card-title">{a.auth_no} · {a.member?.surname} {a.member?.first_name} · {a.icd_code} {a.icd_description}</p>
            <table className="dt"><thead><tr><th>Service</th><th>Auth qty</th><th>Billed qty</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>
                {a.auth_service_lines.filter((l) => l.status === 'Approved').map((l) => (
                  <tr key={l.id}><td>{l.description}</td><td>{l.quantity}</td>
                    <td><input {...inp} value={f.svc[l.id].qty} onChange={(e) => patch(a.id, (x) => ({ ...x, svc: { ...x.svc, [l.id]: { ...x.svc[l.id], qty: e.target.value } } }))} /></td>
                    <td><input {...inp} value={f.svc[l.id].rate} onChange={(e) => patch(a.id, (x) => ({ ...x, svc: { ...x.svc, [l.id]: { ...x.svc[l.id], rate: e.target.value } } }))} /></td>
                    <td>{fmtN((+f.svc[l.id].qty || 0) * (+f.svc[l.id].rate || 0))}</td></tr>))}
                {f.extras.map((x, i) => (
                  <tr key={'x' + i} style={{ background: '#FFFBEB' }}>
                    <td><select className="form-select" value={x.code} onChange={(e) => patch(a.id, (p) => ({ ...p, extras: p.extras.map((y, j) => (j === i ? { ...y, code: e.target.value, rate: tMap[e.target.value]?.unit_cost || '' } : y)) }))}>
                      <option value="">Additional service (not authorized)</option>{tariff.map((t) => <option key={t.code} value={t.code}>{t.description}</option>)}</select></td>
                    <td>0</td>
                    <td><input {...inp} value={x.qty} onChange={(e) => patch(a.id, (p) => ({ ...p, extras: p.extras.map((y, j) => (j === i ? { ...y, qty: e.target.value } : y)) }))} /></td>
                    <td><input {...inp} value={x.rate} onChange={(e) => patch(a.id, (p) => ({ ...p, extras: p.extras.map((y, j) => (j === i ? { ...y, rate: e.target.value } : y)) }))} /></td>
                    <td>{fmtN((+x.qty || 0) * (+x.rate || 0))}</td></tr>))}
              </tbody></table>
            <Btn size="sm" variant="ghost" onClick={() => patch(a.id, (p) => ({ ...p, extras: [...p.extras, { code: '', qty: 1, rate: '' }] }))}>Add service outside the authorization</Btn>
            <table className="dt" style={{ marginTop: 12 }}><thead><tr><th>Medication</th><th>Auth qty</th><th>Billed qty</th><th>Unit cost</th><th>Amount</th></tr></thead>
              <tbody>{a.auth_medication_lines.filter((l) => l.status === 'Approved').map((l) => (
                <tr key={l.id}><td>{l.drug_name}</td><td>{l.quantity}</td>
                  <td><input {...inp} value={f.med[l.id].qty} onChange={(e) => patch(a.id, (x) => ({ ...x, med: { ...x.med, [l.id]: { ...x.med[l.id], qty: e.target.value } } }))} /></td>
                  <td><input {...inp} value={f.med[l.id].rate} onChange={(e) => patch(a.id, (x) => ({ ...x, med: { ...x.med, [l.id]: { ...x.med[l.id], rate: e.target.value } } }))} /></td>
                  <td>{fmtN((+f.med[l.id].qty || 0) * (+f.med[l.id].rate || 0))}</td></tr>))}</tbody></table>
            <div style={{ marginTop: 12 }}><Textarea label="Clinical discharge summary" required rows={3} value={f.summary} onChange={(e) => patch(a.id, (x) => ({ ...x, summary: e.target.value }))} placeholder="Course in hospital, treatment given, response, condition at discharge" /></div>
            <p style={{ textAlign: 'right', fontWeight: 700 }}>Claim total {fmtN(totalOf(a))}</p>
          </div>
        )
      })}

      {sel.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontWeight: 700 }}>{sel.length} claim{sel.length > 1 ? 's' : ''} · {fmtN(grand)}{sel.length > 1 && ' · will be batched'}</p>
          <Btn variant="success" loading={busy} onClick={submit}>Submit {sel.length > 1 ? 'batch' : 'claim'}</Btn>
        </div>
      )}
    </div>
  )
}
