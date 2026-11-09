import React, { useState } from 'react'
import { PLAN_COLORS } from '../lib/constants'

// ── Badge ──────────────────────────────────────────────────────
const BADGE_MAP = {
  Active: 'bg', Approved: 'bg', Paid: 'bb',
  'Partially Approved': 'by', Pending: 'by', 'Under Review': 'bo',
  Declined: 'br2', Rejected: 'br2', Suspended: 'br2', Terminated: 'br2',
  Flagged: 'by', Primary: 'bb', Secondary: 'by', Tertiary: 'bo',
}
export function Badge({ status, children }) {
  const cls = BADGE_MAP[status || children] || 'badge-gray'
  return <span className={`badge ${cls}`}>{children || status}</span>
}

// ── Plan Pill ──────────────────────────────────────────────────
export function PlanPill({ plan }) {
  return (
    <span className="plan-pill" style={{ background: PLAN_COLORS[plan] || '#888' }}>
      {plan}
    </span>
  )
}

// ── Modal ──────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6B7280', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Alert ──────────────────────────────────────────────────────
export function Alert({ type = 'info', children, onClose }) {
  const typeMap = { success: 'alert-success', error: 'alert-error', warn: 'alert-warn', info: 'alert-info' }
  return (
    <div className={`alert ${typeMap[type] || 'alert-info'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span>{children}</span>
      {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, marginLeft: 8 }}>×</button>}
    </div>
  )
}

// ── FormField ─────────────────────────────────────────────────
export function FormField({ label, required, error, hint, children }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}{required && <span className="req">*</span>}</label>}
      {children}
      {hint && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

export function Input({ label, required, error, hint, ...props }) {
  return (
    <FormField label={label} required={required} error={error} hint={hint}>
      <input className="form-input" {...props} />
    </FormField>
  )
}

export function Select({ label, required, error, hint, children, ...props }) {
  return (
    <FormField label={label} required={required} error={error} hint={hint}>
      <select className="form-select" {...props}>{children}</select>
    </FormField>
  )
}

export function Textarea({ label, required, error, hint, ...props }) {
  return (
    <FormField label={label} required={required} error={error} hint={hint}>
      <textarea className="form-textarea" {...props} />
    </FormField>
  )
}

// ── Button ─────────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size, full, loading, ...props }) {
  const varMap = { primary: 'btn-primary', teal: 'btn-teal', success: 'btn-success', danger: 'btn-danger', warn: 'btn-warn', ghost: 'btn-ghost' }
  return (
    <button className={`btn ${varMap[variant] || 'btn-primary'}${size === 'sm' ? ' btn-sm' : ''}${full ? ' btn-full' : ''}`} disabled={loading} {...props}>
      {loading && <span className="spinner" style={{ width: 14, height: 14 }} />}
      {children}
    </button>
  )
}

// ── KPI Card ───────────────────────────────────────────────────
export function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="kpi-label">{label}</p>
          <p className="kpi-value" style={color ? { color } : {}}>{value}</p>
          {sub && <p className="kpi-sub">{sub}</p>}
        </div>
        {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
      </div>
    </div>
  )
}

// ── Spinner (page-level) ──────────────────────────────────────
export function Spinner({ full }) {
  if (full) return <div className="loading-full"><div className="spinner spinner-dark" style={{ width: 36, height: 36 }} /></div>
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner spinner-dark" /></div>
}

// ── Empty State ───────────────────────────────────────────────
export function Empty({ message = 'No records found', icon = '📋' }) {
  return (
    <div className="table-empty">
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <p>{message}</p>
    </div>
  )
}

// ── Utilization Bar ───────────────────────────────────────────
export function UtilBar({ used, limit }) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const color = pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : '#16A085'
  return (
    <div>
      <p style={{ fontSize: 11, color: '#6B7280' }}>{fmtN(used)} / {fmtN(limit)}</p>
      <div className="util-bar" style={{ width: 90 }}>
        <div className="util-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Formatters ────────────────────────────────────────────────
export const fmtN = (n) => '₦' + Number(n || 0).toLocaleString('en-NG')
export const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'
export const fmtDT = (d) => d ? new Date(d).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'

// ── Search Bar ────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="search-bar">
      <span style={{ fontSize: 16, color: '#9CA3AF' }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'Search...'} />
      {value && <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16 }}>×</button>}
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

// ── Data table wrapper ────────────────────────────────────────
export function DataTable({ columns, children, loading, empty }) {
  return (
    <div className="table-wrap">
      <table className="dt">
        <thead>
          <tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length}><Spinner /></td></tr>
          ) : children || (
            <tr><td colSpan={columns.length}><Empty message={empty} /></td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────
export function useConfirm() {
  const [state, setState] = useState({ open: false, msg: '', resolve: null })
  const confirm = (msg) => new Promise(resolve => setState({ open: true, msg, resolve }))
  const ConfirmDialog = () => !state.open ? null : (
    <div className="modal-overlay">
      <div className="modal modal-sm">
        <div className="modal-body" style={{ textAlign: 'center', padding: '28px 24px' }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Confirm Action</p>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>{state.msg}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Btn variant="ghost" onClick={() => { state.resolve(false); setState({ open: false, msg: '', resolve: null }) }}>Cancel</Btn>
            <Btn variant="primary" onClick={() => { state.resolve(true); setState({ open: false, msg: '', resolve: null }) }}>Confirm</Btn>
          </div>
        </div>
      </div>
    </div>
  )
  return { confirm, ConfirmDialog }
}
