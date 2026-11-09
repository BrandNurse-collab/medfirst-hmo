import React, { useEffect, useState } from 'react'
import { getClaims, getAuditLog } from '../lib/api'
import { PageHeader, KpiCard, DataTable, Badge, fmtN, fmtDT } from '../components/UI'

export default function Reports() {
  const [claims, setClaims] = useState([])
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { Promise.all([getClaims({ pageSize: 500 }), getAuditLog({ limit: 100 })]).then(([c, l]) => { setClaims(c.data); setLog(l) }).finally(() => setLoading(false)) }, [])
  const sub = claims.reduce((s, c) => s + Number(c.submitted_amount), 0)
  const app = claims.filter((c) => c.approved_amount != null).reduce((s, c) => s + Number(c.approved_amount), 0)
  const decided = claims.filter((c) => c.status !== 'Pending')
  const rate = decided.length ? Math.round((decided.filter((c) => c.status !== 'Rejected').length / decided.length) * 100) : 0
  const leakage = claims.reduce((s, c) => s + [...c.claim_service_lines, ...c.claim_medication_lines].filter((l) => l.vet_status === 'Rejected').reduce((t, l) => t + Number(l.billed_amount), 0), 0)
  const byProv = Object.values(claims.reduce((m, c) => { const k = c.provider?.name || '--'; m[k] = m[k] || { name: k, n: 0, amt: 0 }; m[k].n++; m[k].amt += Number(c.submitted_amount); return m }, {}))
  return (
    <div>
      <PageHeader title="Reports and Audit Trail" subtitle="Utilisation analytics and a record of every action taken in the portal" />
      <div className="grid-4" style={{ marginBottom: 14 }}>
        <KpiCard label="Claims submitted" value={fmtN(sub)} sub={`${claims.length} claims`} />
        <KpiCard label="Approved" value={fmtN(app)} color="#16A085" />
        <KpiCard label="Approval rate" value={`${rate}%`} sub="Decided claims" />
        <KpiCard label="Rejected at vetting" value={fmtN(leakage)} color="#DC2626" sub="Savings from vetting" />
      </div>
      <p className="card-title">Spend by hospital</p>
      <DataTable loading={loading} columns={['Hospital', 'Claims', 'Submitted']} empty="No claims yet">
        {byProv.length > 0 && byProv.map((p) => <tr key={p.name}><td>{p.name}</td><td>{p.n}</td><td>{fmtN(p.amt)}</td></tr>)}
      </DataTable>
      <p className="card-title" style={{ marginTop: 18 }}>Audit log</p>
      <DataTable loading={loading} columns={['When', 'User', 'Role', 'Action', 'Reference']} empty="No activity yet">
        {log.length > 0 && log.map((l) => <tr key={l.id}><td className="text-sm">{fmtDT(l.created_at)}</td><td>{l.user?.full_name}</td><td><Badge status={l.user?.role}>{l.user?.role}</Badge></td><td className="font-mono text-xs">{l.action}</td><td>{l.entity_ref}</td></tr>)}
      </DataTable>
    </div>
  )
}
