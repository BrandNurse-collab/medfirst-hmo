import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../lib/api'
import { ROLE_META } from '../lib/constants'

const NAV_ITEMS = {
  admin: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/members', label: 'Members' },
    { to: '/providers', label: 'Provider Network' },
    { to: '/authorizations', label: 'Authorizations' },
    { to: '/claims', label: 'Claims' },
    { to: '/reports', label: 'Reports' },
    { to: '/users', label: 'User Management' },
  ],
  provider: [
    { to: '/eligibility', label: 'Verify Eligibility' },
    { to: '/my-provider', label: 'My Hospital' },
    { to: '/submit-auth', label: 'Submit Authorization' },
    { to: '/my-authorizations', label: 'My Authorizations' },
    { to: '/submit-claim', label: 'Submit Claim' },
    { to: '/my-claims', label: 'My Claims' },
  ],
  medops: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/authorizations', label: 'Authorization Queue' },
    { to: '/claims', label: 'Claims' },
    { to: '/providers', label: 'Provider Monitor' },
    { to: '/reports', label: 'Reports' },
  ],
  claims: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/claims', label: 'Claims Queue' },
    { to: '/authorizations', label: 'Authorizations' },
    { to: '/reports', label: 'Reports' },
  ],
}

export default function Sidebar({ pendingAuths = 0, pendingClaims = 0 }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const role = profile?.role || 'provider'
  const meta = ROLE_META[role] || ROLE_META.admin
  const items = NAV_ITEMS[role] || NAV_ITEMS.admin

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-logo">
          <div className="sb-logo-icon">M</div>
          <div className="sb-logo-text">
            <p>MedFirst HMO</p>
            <span>Find Nurses NG Academy</span>
          </div>
        </div>
        <div className="sb-role">
          <div className="rl">Signed in as</div>
          <div className="rv">{meta.label}</div>
          {profile?.cohort && <div style={{ color: '#93C5FD', fontSize: 10, marginTop: 2 }}>{profile.cohort}</div>}
        </div>
      </div>

      <nav className="sb-nav">
        {items.map(({ to, label }) => {
          const badge = (to === '/authorizations' && pendingAuths > 0)
            ? pendingAuths
            : (to === '/claims' && pendingClaims > 0)
            ? pendingClaims
            : 0
          return (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {label}
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className="sb-footer">
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#93C5FD', fontSize: 12, width: '100%' }}>
          Sign out
        </button>
      </div>
    </aside>
  )
}
