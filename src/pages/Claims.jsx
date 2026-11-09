import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getClaims } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { PageHeader, DataTable, Badge, PlanPill, fmtN, fmtD } from '../components/UI'

export default function Claims() {
  const { user, profile } = useAuth()
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const isProvider = profile?.role === 'provider'

  useEffect(() => {
    setLoading(true)
    getClaims({ status, pageSize: 100 }).then(({ data }) => setRows(isProvider ? data.filter((c) => c.submitted_by === user.id) : data)).finally(() => setLoading(false))
  }, [status])

  return (
    <div>
      <PageHeader title={isProvider ? 'My Claims' : 'Claims Vetting Queue'} subtitle={isProvider ? 'Submitted claims and payment status' : 'Open a claim to vet it line by line'} />
      <div className="filter-bar">
        {['', 'Pending', 'Approved', 'Partially Approved', 'Rejected', 'Paid'].map((s) => (
          <button key={s} className={`filter-btn${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>{s || 'All'}</button>
        ))}
      </div>
      <DataTable loading={loading} columns={['Claim', 'Member', 'Diagnosis', 'Hospital', 'Submitted', 'Approved', 'Flags', 'Status', '']} empty="No claims">
        {rows.length > 0 && rows.map((c) => {
          const flags = [...c.claim_service_lines, ...c.claim_medication_lines].filter((l) => l.vet_status === 'Flagged' || (c.status === 'Pending' && l.variance > 0)).length
          return (
            <tr key={c.id}>
              <td><span className="font-mono text-xs">{c.claim_no}</span><br /><span className="text-xs text-muted">{c.batch_ref || fmtD(c.submitted_at)}</span></td>
              <td><strong>{c.member?.surname} {c.member?.first_name}</strong><br /><PlanPill plan={c.member?.plan} /></td>
              <td className="text-sm">{c.icd_code}<br /><span className="text-muted">{c.icd_description}</span></td>
              <td className="text-sm">{c.provider?.name}</td>
              <td>{fmtN(c.submitted_amount)}</td>
              <td style={{ color: '#16A085', fontWeight: 600 }}>{c.approved_amount != null ? fmtN(c.approved_amount) : '--'}</td>
              <td>{flags > 0 ? <span style={{ color: '#D97706', fontWeight: 700, fontSize: 11 }}>{flags} flagged</span> : <span className="text-xs text-muted">Clean</span>}</td>
              <td><Badge status={c.status} /></td>
              <td><Link className="btn btn-ghost btn-sm" to={`/claims/${c.id}`}>{isProvider || c.status !== 'Pending' ? 'View' : 'Vet'}</Link></td>
            </tr>
          )
        })}
      </DataTable>
    </div>
  )
}
