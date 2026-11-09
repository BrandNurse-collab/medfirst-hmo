import React, { useEffect, useState } from 'react'
import { getProfiles, setUserRole } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { ROLE_META } from '../lib/constants'
import { PageHeader, DataTable, Alert, fmtD } from '../components/UI'

export default function Users() {
  const { user, profile } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const load = () => getProfiles().then(setRows).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  if (profile?.role !== 'admin') return <Alert type="error">Administrators only.</Alert>
  const change = async (id, role) => { try { await setUserRole(id, role); load() } catch (e) { setErr(e.message) } }
  return (
    <div>
      <PageHeader title="User Management" subtitle="Assign the role each trainee practises" />
      {err && <Alert type="error">{err}</Alert>}
      <DataTable loading={loading} columns={['Name', 'Cohort', 'Role', 'Joined']} empty="No users">
        {rows.length > 0 && rows.map((p) => (
          <tr key={p.id}>
            <td><strong>{p.full_name}</strong></td><td>{p.cohort || '--'}</td>
            <td><select className="form-select" style={{ width: 220 }} value={p.role} disabled={p.id === user.id} onChange={(e) => change(p.id, e.target.value)}>
              {Object.entries(ROLE_META).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></td>
            <td>{fmtD(p.created_at)}</td>
          </tr>))}
      </DataTable>
    </div>
  )
}
