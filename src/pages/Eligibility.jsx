import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { checkEligibility } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { PageHeader, Btn, Badge, PlanPill, UtilBar, fmtN, fmtD } from '../components/UI'

export default function Eligibility() {
  const { profile } = useAuth()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState(null)
  const [busy, setBusy] = useState(false)
  const run = async (e) => {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    try { setHits(await checkEligibility(q.trim())) } finally { setBusy(false) }
  }
  return (
    <div style={{ maxWidth: 640 }}>
      <PageHeader title="Eligibility Verification" subtitle="Confirm coverage before any service is rendered" />
      <form className="card" onSubmit={run} style={{ display: 'flex', gap: 8 }}>
        <input className="form-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Member ID, policy number, phone or surname" />
        <Btn type="submit" loading={busy}>Verify</Btn>
      </form>
      {hits && hits.length === 0 && (
        <div className="elig-none">
          <p style={{ fontWeight: 600, color: '#92400E' }}>No member found</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Do not render services without verified eligibility.</p>
        </div>
      )}
      {hits?.map((m) => {
        const ok = m.status === 'Active'
        return (
          <div key={m.id} className={ok ? 'elig-ok' : 'elig-bad'} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div><p style={{ fontSize: 16, fontWeight: 600 }}>{m.surname}, {m.first_name}</p><p className="font-mono text-xs">{m.member_no} · {m.policy_no}</p></div>
              <Badge status={m.status} />
            </div>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div><p className="text-xs text-muted">Plan</p><PlanPill plan={m.plan} /></div>
              <div><p className="text-xs text-muted">Expires</p><p style={{ fontWeight: 600, fontSize: 12 }}>{fmtD(m.expiry_date)}</p></div>
              <div><p className="text-xs text-muted">Employer</p><p style={{ fontSize: 12 }}>{m.company}</p></div>
              <div><p className="text-xs text-muted">Remaining benefit</p><p style={{ fontWeight: 600, fontSize: 12 }}>{fmtN(m.annual_limit - m.utilized_amount)}</p></div>
            </div>
            <UtilBar used={m.utilized_amount} limit={m.annual_limit} />
            {ok ? (
              ['provider', 'admin'].includes(profile?.role) && <div style={{ marginTop: 12 }}><Link className="btn btn-primary btn-sm" to={`/submit-auth?member=${m.id}`}>Raise authorization</Link></div>
            ) : (
              <p style={{ marginTop: 12, fontWeight: 700, color: '#991B1B', fontSize: 12 }}>Coverage {m.status.toLowerCase()}. Do not render services. Refer the patient to the HMO.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
