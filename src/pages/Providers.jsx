import React, { useEffect, useState } from 'react'
import { getProviders, createProvider, updateProvider } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { NIGERIAN_STATES } from '../lib/constants'
import { PageHeader, SearchBar, DataTable, Badge, Btn, Modal, Input, Select, Alert } from '../components/UI'

const blank = { name: '', license_no: '', tier: 'Secondary', type: 'General Hospital', state: 'Lagos', address: '', phone: '', email: '', specialties: '' }

export default function Providers() {
  const { user, profile } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(blank)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const canCreate = ['admin', 'provider'].includes(profile?.role)
  const isAdmin = profile?.role === 'admin'

  const load = async () => { setLoading(true); try { setRows(await getProviders({ search: q })) } finally { setLoading(false) } }
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [q])

  const save = async () => {
    if (!f.name || !f.license_no || !f.state) { setMsg({ t: 'error', m: 'Name, licence number and state are required.' }); return }
    setBusy(true)
    try {
      await createProvider({ ...f, specialties: f.specialties.split(',').map((s) => s.trim()).filter(Boolean), contract_start: new Date().toISOString().slice(0, 10) }, user.id)
      setMsg({ t: 'success', m: `${f.name} registered on the network.` })
      setOpen(false); setF(blank); load()
    } catch (e) { setMsg({ t: 'error', m: e.message }) } finally { setBusy(false) }
  }

  const toggle = async (p) => { await updateProvider(p.id, { status: p.status === 'Active' ? 'Suspended' : 'Active' }, user.id); load() }

  return (
    <div>
      <PageHeader title="Provider Network" subtitle="Registered panel hospitals">
        {canCreate && <Btn onClick={() => { setOpen(true); setMsg(null) }}>Register hospital</Btn>}
      </PageHeader>
      {msg && <Alert type={msg.t} onClose={() => setMsg(null)}>{msg.m}</Alert>}
      <SearchBar value={q} onChange={setQ} placeholder="Search hospitals by name" />
      <DataTable loading={loading} columns={['Hospital', 'Tier', 'State', 'Specialties', 'Status', '']} empty="No hospitals registered yet">
        {rows.length > 0 && rows.map((p) => (
          <tr key={p.id}>
            <td><strong>{p.name}</strong><br /><span className="font-mono text-xs text-muted">{p.license_no}</span></td>
            <td><Badge status={p.tier} /></td>
            <td>{p.state}</td>
            <td className="text-sm">{(p.specialties || []).join(', ') || '--'}</td>
            <td><Badge status={p.status} /></td>
            <td>{isAdmin && <Btn size="sm" variant="ghost" onClick={() => toggle(p)}>{p.status === 'Active' ? 'Suspend' : 'Reinstate'}</Btn>}</td>
          </tr>
        ))}
      </DataTable>
      <Modal open={open} onClose={() => setOpen(false)} title="Register hospital" size="lg">
        <div className="modal-body">
          {msg?.t === 'error' && <Alert type="error">{msg.m}</Alert>}
          <div className="grid-2">
            <Input label="Hospital name" required value={f.name} onChange={set('name')} />
            <Input label="Licence number" required value={f.license_no} onChange={set('license_no')} />
            <Select label="Care tier" value={f.tier} onChange={set('tier')}><option>Primary</option><option>Secondary</option><option>Tertiary</option></Select>
            <Input label="Facility type" value={f.type} onChange={set('type')} />
            <Select label="State" required value={f.state} onChange={set('state')}>{NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}</Select>
            <Input label="Phone" value={f.phone} onChange={set('phone')} />
            <Input label="Email" value={f.email} onChange={set('email')} />
            <Input label="Address" value={f.address} onChange={set('address')} />
          </div>
          <Input label="Specialties" value={f.specialties} onChange={set('specialties')} hint="Comma separated, e.g. Surgery, Paediatrics, Obstetrics" />
        </div>
        <div className="modal-footer">
          <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
          <Btn variant="success" loading={busy} onClick={save}>Register</Btn>
        </div>
      </Modal>
    </div>
  )
}
