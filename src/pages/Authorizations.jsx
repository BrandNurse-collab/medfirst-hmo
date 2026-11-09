import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthorizations, getClaims } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { PageHeader, DataTable, Badge, PlanPill, fmtN, fmtD } from '../components/UI'

export default function Authorizations() {
  const { user, profile } = useAuth()
  const [rows, setRows] = useState([])
  const [claimed, setClaimed] = useState(new Set())
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const isProvider = profile?.role === 'provider'

  useEffect(() => {
    setLoading(true)
    Promise.all([getAuthorizations({ status, pageSize: 100 }), getClaims({ pageSize: 200 })]).then(([a, c]) => {
      setRows(isProvider ? a.data.filter((x) => x.submitted_by === user.id) : a.data)
      setClaimed(new Set(c.data.map((x) => x.auth_id)))
    }).finally(() => setLoading(false))
  }, [status])

  return (
    <div>
      <PageHeader title={isProvider ? 'My Authorizations' : 'Authorization Queue'} subtitle={isProvider ? 'Track approvals and raise claims' : 'Review clinical requests line by line'} />
      <div className="filter-bar">
        {['', 'Pending', 'Approved', 'Partially Approved', 'Declined'].map((s) => (
          <button key={s} className={`filter-btn${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>{s || 'All'}</button>
        ))}
      </div>
      <DataTable loading={loading} columns={['Reference', 'Member', 'Diagnosis', 'Hospital', 'Requested', 'Status', 'Auth code', '']} empty="No authorizations">
        {rows.length > 0 && rows.map((a) => {
          const canClaim = isProvider && ['Approved', 'Partially Approved'].includes(a.status) && !claimed.has(a.id)
          return (
            <tr key={a.id}>
              <td><span className="font-mono text-xs">{a.auth_no}</span><br /><span className="text-xs text-muted">{fmtD(a.submitted_at)}</span></td>
              <td><strong>{a.member?.surname} {a.member?.first_name}</strong><br /><PlanPill plan={a.member?.plan} /></td>
              <td className="text-sm">{a.icd_code}<br /><span className="text-muted">{a.icd_description}</span></td>
              <td className="text-sm">{a.provider?.name}</td>
              <td>{fmtN(a.total_requested)}</td>
              <td><Badge status={a.status} /></td>
              <td className="font-mono text-xs" style={{ color: '#16A085', fontWeight: 700 }}>{a.auth_code || '--'}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <Link className="btn btn-ghost btn-sm" to={`/authorizations/${a.id}`}>{isProvider || a.status !== 'Pending' ? 'View' : 'Review'}</Link>{' '}
                {canClaim && <Link className="btn btn-success btn-sm" to={`/submit-claim?auth=${a.id}`}>Submit claim</Link>}
              </td>
            </tr>
          )
        })}
      </DataTable>
    </div>
  )
}
