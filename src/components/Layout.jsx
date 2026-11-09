import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Sidebar from './Sidebar'
import { supabase } from '../lib/supabase'
import { Spinner } from './UI'

export default function Layout() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [pendingAuths, setPendingAuths] = useState(0)
  const [pendingClaims, setPendingClaims] = useState(0)

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading, navigate])

  useEffect(() => {
    if (!user) return
    loadCounts()
    // Subscribe to real-time updates
    const channel = supabase
      .channel('pending_counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'authorizations' }, loadCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, loadCounts)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  const loadCounts = async () => {
    const [auths, claims] = await Promise.all([
      supabase.from('authorizations').select('id', { count: 'exact' }).eq('status', 'Pending'),
      supabase.from('claims').select('id', { count: 'exact' }).eq('status', 'Pending'),
    ])
    setPendingAuths(auths.count || 0)
    setPendingClaims(claims.count || 0)
  }

  if (loading) return <Spinner full />
  if (!user) return null

  const roleMeta = { admin: 'HMO Administrator', provider: 'Provider', medops: 'Medical Operations', claims: 'Claims Officer' }

  return (
    <div className="app-layout">
      <Sidebar pendingAuths={pendingAuths} pendingClaims={pendingClaims} />
      <div className="main-content">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>MedFirst HMO Portal</span>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>›</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{roleMeta[profile?.role] || 'Portal'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {pendingAuths > 0 && <span className="alert" style={{ margin: 0, padding: '3px 10px', fontSize: 11 }} onClick={() => navigate('/authorizations')}>{pendingAuths} auth pending</span>}
            {pendingClaims > 0 && <span className="alert alert-error" style={{ margin: 0, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }} onClick={() => navigate('/claims')}>{pendingClaims} claims pending</span>}
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0D2B6E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{profile?.full_name}</p>
              <p style={{ fontSize: 10, color: '#9CA3AF' }}>Training Mode</p>
            </div>
          </div>
        </div>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
