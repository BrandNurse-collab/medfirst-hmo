import React, { useEffect, useState } from 'react'
import { getDashboardStats, getClaims } from '../lib/api'
import { KpiCard, PageHeader, Spinner, fmtN, Badge } from '../components/UI'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { profile } = useAuth()
  const [s, setS] = useState(null)
  const [flagged, setFlagged] = useState([])
  useEffect(() => {
    getDashboardStats().then(setS)
    getClaims({ pageSize: 50 }).then(({ data }) => setFlagged(
      data.filter((c) => [...c.claim_service_lines, ...c.claim_medication_lines].some((l) => l.vet_status === 'Flagged' || l.variance > 0) && c.status === 'Pending')))
  }, [])
  if (!s) return <Spinner />
  return (
    <div>
      <PageHeader title="Operations Dashboard" subtitle={`Welcome, ${profile?.full_name}`} />
      <div className="grid-4" style={{ marginBottom: 14 }}>
        <KpiCard label="Members" value={s.totalMembers} sub={`${s.activeMembers} active`} color="#0D2B6E" />
        <KpiCard label="Pending authorizations" value={s.pendingAuths} sub="Awaiting review" color="#D97706" />
        <KpiCard label="Pending claims" value={s.pendingClaims} sub="Awaiting vetting" color="#16A085" />
        <KpiCard label="Claims value" value={fmtN(s.totalSubmitted)} sub={`${fmtN(s.totalApproved)} approved`} />
      </div>
      <div className="card">
        <p className="card-title">Claims needing attention</p>
        {flagged.length === 0 ? <p className="text-muted" style={{ fontSize: 12 }}>No pending claims with variances.</p> :
          flagged.map((c) => (
            <div key={c.id} className="flag-box" style={{ marginBottom: 6 }}>
              <strong>{c.claim_no}</strong> · {c.member?.surname} {c.member?.first_name} · {c.provider?.name} · <Badge status={c.status} />
            </div>
          ))}
      </div>
    </div>
  )
}
