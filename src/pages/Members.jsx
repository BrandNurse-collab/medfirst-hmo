import React, { useEffect, useState, useCallback } from 'react'
import { getMembers, createMember, getProviders, updateMemberStatus } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { PLAN_LIMITS } from '../lib/constants'
import { PageHeader, SearchBar, DataTable, Badge, PlanPill, UtilBar, Btn, Modal, Input, Select, Alert, fmtN, fmtD } from '../components/UI'

const blank = { surname: '', first_name: '', gender: '', dob: '', phone: '', email: '', company: '', department: '', plan: '', provider_id: '' }

export default function Members() {
  const { user, profile } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState('')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [f, setF] = useState(blank)
  const [providers, setProviders] = useState([])
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const canEnrol = ['admin'].includes(profile?.role)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows((await getMembers({ search: q, plan })).data) } finally { setLoading(false) }
  }, [q, plan])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])
  useEffect(() => { getProviders({ status: 'Active' }).then(setProviders) }, [])

  const enrol = async () => {
    if (!f.surname || !f.first_name || !f.plan || !f.company) { setMsg({ t: 'error', m: 'Surname, first name, company and plan are required.' }); return }
    setBusy(true)
    try {
      const payload = { ...f, provider_id: f.provider_id || null, dob: f.dob || null }
      const m = await createMember(payload, user.id)
      setMsg({ t: 'success', m: `${m.first_name} ${m.surname} enrolled. Member ID ${m.member_no}, policy ${m.policy_no}.` })
      setOpen(false); setF(blank); load()
    } catch (e) { setMsg({ t: 'error', m: e.message }) } finally { setBusy(false) }
  }

  const toggle = async (m) => {
    await updateMemberStatus(m.id, m.status === 'Active' ? 'Suspended' : 'Active', user.id)
    setDetail(null); load()
  }

  return (
    <div>
      <PageHeader title="Member Management" subtitle="Enrolled members and their benefit utilisation">
        {canEnrol && <Btn onClick={() => { setOpen(true); setMsg(null) }}>Enrol member</Btn>}
      </PageHeader>
      {msg && <Alert type={msg.t} onClose={() => setMsg(null)}>{msg.m}</Alert>}
      <SearchBar value={q} onChange={setQ} placeholder="Search by name, member ID, policy number, company or phone" />
      <div className="filter-bar">
        {['', 'Bronze', 'Silver', 'Gold', 'Executive'].map((p) => (
          <button key={p} className={`filter-btn${plan === p ? ' active' : ''}`} onClick={() => setPlan(p)}>{p || 'All plans'}</button>
        ))}
      </div>
      <DataTable loading={loading} columns={['Member', 'Company', 'Plan', 'Hospital', 'Status', 'Utilisation', '']} empty="No members yet">
        {rows.length > 0 && rows.map((m) => (
          <tr key={m.id}>
            <td><strong>{m.surname}, {m.first_name}</strong><br /><span className="font-mono text-xs text-muted">{m.member_no} · {m.policy_no}</span></td>
            <td>{m.company}<br /><span className="text-xs text-muted">{m.department}</span></td>
            <td><PlanPill plan={m.plan} /></td>
            <td>{m.provider?.name || '--'}</td>
            <td><Badge status={m.status} /></td>
            <td><UtilBar used={m.utilized_amount} limit={m.annual_limit} /></td>
            <td><Btn size="sm" variant="ghost" onClick={() => setDetail(m)}>View</Btn></td>
          </tr>
        ))}
      </DataTable>

      <Modal open={open} onClose={() => setOpen(false)} title="Enrol new member" size="lg">
        <div className="modal-body">
          {msg?.t === 'error' && <Alert type="error">{msg.m}</Alert>}
          <div className="grid-2">
            <Input label="Surname" required value={f.surname} onChange={set('surname')} />
            <Input label="First name" required value={f.first_name} onChange={set('first_name')} />
            <Select label="Gender" value={f.gender} onChange={set('gender')}><option value="">Select</option><option>Male</option><option>Female</option></Select>
            <Input label="Date of birth" type="date" value={f.dob} onChange={set('dob')} />
            <Input label="Phone" value={f.phone} onChange={set('phone')} />
            <Input label="Email" type="email" value={f.email} onChange={set('email')} />
            <Input label="Employer" required value={f.company} onChange={set('company')} />
            <Input label="Department" value={f.department} onChange={set('department')} />
            <Select label="Plan" required value={f.plan} onChange={set('plan')}>
              <option value="">Select</option>
              {Object.keys(PLAN_LIMITS).map((p) => <option key={p}>{p}</option>)}
            </Select>
            <Select label="Primary care hospital" value={f.provider_id} onChange={set('provider_id')}>
              <option value="">Select</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          {f.plan && <div className="alert alert-info">{f.plan} plan: annual benefit limit {fmtN(PLAN_LIMITS[f.plan])}</div>}
        </div>
        <div className="modal-footer">
          <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
          <Btn variant="success" loading={busy} onClick={enrol}>Confirm enrolment</Btn>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.surname}, ${detail.first_name}` : ''}>
        {detail && (
          <>
            <div className="modal-body">
              <div className="grid-2">
                {[['Member ID', detail.member_no], ['Policy', detail.policy_no], ['Employer', detail.company], ['Plan', detail.plan], ['Phone', detail.phone], ['Effective', fmtD(detail.effective_date)], ['Expires', fmtD(detail.expiry_date)], ['Hospital', detail.provider?.name]].map(([l, v]) => (
                  <div key={l} style={{ marginBottom: 10 }}><p className="text-xs text-muted">{l}</p><p style={{ fontSize: 13, fontWeight: 600 }}>{v || '--'}</p></div>
                ))}
              </div>
              <UtilBar used={detail.utilized_amount} limit={detail.annual_limit} />
            </div>
            {canEnrol && <div className="modal-footer">
              <Btn variant={detail.status === 'Active' ? 'danger' : 'success'} onClick={() => toggle(detail)}>
                {detail.status === 'Active' ? 'Suspend coverage' : 'Reinstate coverage'}
              </Btn>
            </div>}
          </>
        )}
      </Modal>
    </div>
  )
}
