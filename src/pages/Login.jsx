import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp } from '../lib/api'
import { ROLE_META } from '../lib/constants'
import { Alert, Btn, Input, Select } from '../components/UI'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ email: '', password: '', fullName: '', role: 'provider', cohort: '' })
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setInfo(''); setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(f)
        navigate('/')
      } else {
        if (!f.fullName.trim()) throw new Error('Full name is required')
        if (f.password.length < 6) throw new Error('Password must be at least 6 characters')
        const res = await signUp(f)
        if (res.session) navigate('/')
        else { setInfo('Account created. Check your email to confirm, then sign in.'); setMode('login') }
      }
    } catch (ex) {
      setErr(ex.message || 'Something went wrong')
    } finally { setBusy(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-sidebar">
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', color: '#F5C518' }}>FIND NURSES NG ACADEMY</p>
          <h1 style={{ color: 'white', fontSize: 26, fontWeight: 500, margin: '8px 0 12px' }}>MedFirst HMO Operations Portal</h1>
          <p style={{ color: '#BFDBFE', fontSize: 13, lineHeight: 1.7 }}>
            A live practice environment for Nigerian HMO operations. Enrol members, register hospitals,
            raise and approve authorizations, submit and vet claims, with every action recorded.
          </p>
        </div>
        <div>
          {Object.entries(ROLE_META).map(([k, r]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <p style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>{r.label}</p>
              <p style={{ color: '#93C5FD', fontSize: 11 }}>{r.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0D2B6E', marginBottom: 4 }}>
            {mode === 'login' ? 'Sign in' : 'Create your account'}
          </h2>
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 18 }}>
            {mode === 'login' ? 'Continue to your training workspace.' : 'Pick the role you are practising today. You can ask your trainer to change it later.'}
          </p>
          {err && <Alert type="error">{err}</Alert>}
          {info && <Alert type="success">{info}</Alert>}
          {mode === 'register' && (
            <>
              <Input label="Full name" required value={f.fullName} onChange={set('fullName')} />
              <Select label="Role" required value={f.role} onChange={set('role')}>
                {Object.entries(ROLE_META).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
              </Select>
              <Input label="Cohort" value={f.cohort} onChange={set('cohort')} placeholder="e.g. August 2026 Cohort" />
            </>
          )}
          <Input label="Email" type="email" required value={f.email} onChange={set('email')} />
          <Input label="Password" type="password" required value={f.password} onChange={set('password')} />
          <Btn full loading={busy} type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</Btn>
          <p style={{ fontSize: 12, textAlign: 'center', marginTop: 14, color: '#6B7280' }}>
            {mode === 'login' ? 'New to the programme? ' : 'Already registered? '}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr('') }}
              style={{ background: 'none', border: 'none', color: '#0D2B6E', fontWeight: 600, cursor: 'pointer' }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
