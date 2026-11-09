import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './hooks/useAuth'
import { ROLE_META } from './lib/constants'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Providers from './pages/Providers'
import Eligibility from './pages/Eligibility'
import SubmitAuth from './pages/SubmitAuth'
import Authorizations from './pages/Authorizations'
import AuthReview from './pages/AuthReview'
import SubmitClaim from './pages/SubmitClaim'
import Claims from './pages/Claims'
import ClaimVet from './pages/ClaimVet'
import Users from './pages/Users'
import Reports from './pages/Reports'

function Home() {
  const { profile } = useAuth()
  const to = ROLE_META[profile?.role]?.defaultRoute || '/dashboard'
  return <Navigate to={to} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/my-provider" element={<Providers />} />
        <Route path="/eligibility" element={<Eligibility />} />
        <Route path="/submit-auth" element={<SubmitAuth />} />
        <Route path="/authorizations" element={<Authorizations />} />
        <Route path="/my-authorizations" element={<Authorizations />} />
        <Route path="/authorizations/:id" element={<AuthReview />} />
        <Route path="/submit-claim" element={<SubmitClaim />} />
        <Route path="/claims" element={<Claims />} />
        <Route path="/my-claims" element={<Claims />} />
        <Route path="/claims/:id" element={<ClaimVet />} />
        <Route path="/users" element={<Users />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
    </Routes>
  )
}
