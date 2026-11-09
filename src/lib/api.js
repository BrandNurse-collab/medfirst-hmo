import { supabase } from './supabase'

// ─── AUTH ────────────────────────────────────────────────────
export const signUp = async ({ email, password, fullName, role, cohort }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role, cohort: cohort || null } },
  })
  if (error) throw error
  return data
}

export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const signOut = () => supabase.auth.signOut()

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── MEMBERS ─────────────────────────────────────────────────
export const getMembers = async ({ search = '', plan = '', status = '', page = 0, pageSize = 20 } = {}) => {
  let q = supabase
    .from('members')
    .select('*, provider:providers(id,name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (search) {
    q = q.or(`surname.ilike.%${search}%,first_name.ilike.%${search}%,member_no.ilike.%${search}%,policy_no.ilike.%${search}%,company.ilike.%${search}%,phone.ilike.%${search}%`)
  }
  if (plan) q = q.eq('plan', plan)
  if (status) q = q.eq('status', status)

  const { data, error, count } = await q
  if (error) throw error
  return { data, count }
}

export const getMemberById = async (id) => {
  const { data, error } = await supabase
    .from('members')
    .select('*, provider:providers(id,name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const checkEligibility = async (query) => {
  const { data, error } = await supabase
    .from('members')
    .select('*, provider:providers(id,name)')
    .or(`member_no.ilike.%${query}%,policy_no.ilike.%${query}%,phone.ilike.%${query}%,surname.ilike.%${query}%,first_name.ilike.%${query}%`)
    .limit(8)
  if (error) throw error
  return data
}

export const createMember = async (memberData, userId) => {
  const { data: seqData } = await supabase.rpc('next_member_no')
  const memberNo = seqData
  const policyNo = memberNo.replace('MED-', 'POL-')
  const planLimits = { Bronze: 150000, Silver: 350000, Gold: 750000, Executive: 2000000 }

  const { data, error } = await supabase
    .from('members')
    .insert({
      ...memberData,
      member_no: memberNo,
      policy_no: policyNo,
      annual_limit: planLimits[memberData.plan],
      utilized_amount: 0,
      created_by: userId,
    })
    .select()
    .single()
  if (error) throw error
  await logAudit(userId, 'ENROL_MEMBER', 'member', data.id, memberNo)
  return data
}

export const updateMemberStatus = async (id, status, userId) => {
  const { data, error } = await supabase
    .from('members')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await logAudit(userId, 'UPDATE_MEMBER_STATUS', 'member', id, status)
  return data
}

// ─── PROVIDERS ───────────────────────────────────────────────
export const getProviders = async ({ search = '', status = '', state = '' } = {}) => {
  let q = supabase
    .from('providers')
    .select('*')
    .order('name')

  if (search) q = q.ilike('name', `%${search}%`)
  if (status) q = q.eq('status', status)
  if (state) q = q.eq('state', state)

  const { data, error } = await q
  if (error) throw error
  return data
}

export const getProviderById = async (id) => {
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createProvider = async (providerData, userId) => {
  const { data, error } = await supabase
    .from('providers')
    .insert({ ...providerData, created_by: userId })
    .select()
    .single()
  if (error) throw error
  await logAudit(userId, 'CREATE_PROVIDER', 'provider', data.id, data.name)
  return data
}

export const updateProvider = async (id, updates, userId) => {
  const { data, error } = await supabase
    .from('providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await logAudit(userId, 'UPDATE_PROVIDER', 'provider', id, updates.status || 'updated')
  return data
}

// ─── TARIFF & FORMULARY ──────────────────────────────────────
export const getTariffItems = async (plan) => {
  let q = supabase.from('tariff_items').select('*').eq('active', true).order('category').order('code')
  if (plan) q = q.contains('plan_coverage', [plan])
  const { data, error } = await q
  if (error) throw error
  return data
}

export const getFormularyItems = async (plan) => {
  let q = supabase.from('formulary_items').select('*').eq('active', true).order('drug_class').order('name')
  if (plan) q = q.contains('plan_coverage', [plan])
  const { data, error } = await q
  if (error) throw error
  return data
}

// ─── AUTHORIZATIONS ──────────────────────────────────────────
export const getAuthorizations = async ({ status = '', providerId = '', memberId = '', page = 0, pageSize = 20 } = {}) => {
  let q = supabase
    .from('authorizations')
    .select(`
      *,
      member:members(id, member_no, policy_no, surname, first_name, plan, status, annual_limit, utilized_amount),
      provider:providers(id, name),
      reviewer:profiles!reviewer_id(full_name),
      auth_service_lines(*),
      auth_medication_lines(*)
    `, { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (status) q = q.eq('status', status)
  if (providerId) q = q.eq('provider_id', providerId)
  if (memberId) q = q.eq('member_id', memberId)

  const { data, error, count } = await q
  if (error) throw error
  return { data, count }
}

export const getAuthorizationById = async (id) => {
  const { data, error } = await supabase
    .from('authorizations')
    .select(`
      *,
      member:members(*, provider:providers(name)),
      provider:providers(*),
      auth_service_lines(*),
      auth_medication_lines(*)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createAuthorization = async ({ authData, serviceLines, medicationLines, userId }) => {
  const { data: authNo } = await supabase.rpc('next_auth_no')
  const totalReq = [
    ...serviceLines.map(l => l.requested_amount),
    ...medicationLines.map(l => (l.quantity || 1) * (l.formulary_rate || 0)),
  ].reduce((s, x) => s + x, 0)

  const { data: auth, error } = await supabase
    .from('authorizations')
    .insert({
      ...authData,
      auth_no: authNo,
      total_requested: totalReq,
      submitted_by: userId,
    })
    .select()
    .single()
  if (error) throw error

  if (serviceLines.length > 0) {
    const { error: slError } = await supabase.from('auth_service_lines').insert(
      serviceLines.map((l, i) => ({ ...l, auth_id: auth.id, sort_order: i }))
    )
    if (slError) throw slError
  }

  if (medicationLines.length > 0) {
    const { error: mlError } = await supabase.from('auth_medication_lines').insert(
      medicationLines.map((l, i) => ({ ...l, auth_id: auth.id, sort_order: i }))
    )
    if (mlError) throw mlError
  }

  await logAudit(userId, 'SUBMIT_AUTH', 'authorization', auth.id, authNo)
  return auth
}

export const reviewAuthorization = async ({ authId, decision, reviewerNotes, serviceLineUpdates, medicationLineUpdates, reviewerId }) => {
  // Update individual lines
  for (const [lineId, updates] of Object.entries(serviceLineUpdates || {})) {
    await supabase.from('auth_service_lines').update(updates).eq('id', lineId)
  }
  for (const [lineId, updates] of Object.entries(medicationLineUpdates || {})) {
    await supabase.from('auth_medication_lines').update(updates).eq('id', lineId)
  }

  // Calculate approved total
  const authFull = await getAuthorizationById(authId)
  const approvedSvcs = authFull.auth_service_lines
    .filter(l => l.status === 'Approved')
    .reduce((s, l) => s + l.requested_amount, 0)
  const approvedMeds = authFull.auth_medication_lines
    .filter(l => l.status === 'Approved')
    .reduce((s, l) => s + (l.quantity || 1) * (l.formulary_rate || 0), 0)

  let authCode = null
  if (decision !== 'Declined') {
    const { data: code } = await supabase.rpc('generate_auth_code')
    authCode = code
  }

  const { data, error } = await supabase
    .from('authorizations')
    .update({
      status: decision,
      reviewer_id: reviewerId,
      reviewer_notes: reviewerNotes,
      reviewed_at: new Date().toISOString(),
      auth_code: authCode,
      total_approved: decision !== 'Declined' ? approvedSvcs + approvedMeds : 0,
    })
    .eq('id', authId)
    .select()
    .single()
  if (error) throw error

  await logAudit(reviewerId, `${decision.toUpperCase().replace(' ','_')}_AUTH`, 'authorization', authId, authFull.auth_no)
  return data
}

// ─── CLAIMS ──────────────────────────────────────────────────
export const getClaims = async ({ status = '', providerId = '', page = 0, pageSize = 20 } = {}) => {
  let q = supabase
    .from('claims')
    .select(`
      *,
      member:members(id, member_no, policy_no, surname, first_name, plan),
      provider:providers(id, name),
      auth:authorizations(auth_no, auth_code),
      claim_service_lines(*),
      claim_medication_lines(*)
    `, { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (status) q = q.eq('status', status)
  if (providerId) q = q.eq('provider_id', providerId)

  const { data, error, count } = await q
  if (error) throw error
  return { data, count }
}

export const getClaimById = async (id) => {
  const { data, error } = await supabase
    .from('claims')
    .select(`
      *,
      member:members(*, provider:providers(name)),
      provider:providers(*),
      auth:authorizations(*, auth_service_lines(*), auth_medication_lines(*)),
      claim_service_lines(*),
      claim_medication_lines(*)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createClaim = async ({ claimData, serviceLines, medicationLines, userId }) => {
  const { data: claimNo } = await supabase.rpc('next_claim_no')
  const submittedAmount = [
    ...serviceLines.map(l => l.billed_amount),
    ...medicationLines.map(l => l.billed_amount),
  ].reduce((s, x) => s + x, 0)

  const { data: claim, error } = await supabase
    .from('claims')
    .insert({
      ...claimData,
      claim_no: claimNo,
      submitted_amount: submittedAmount,
      submitted_by: userId,
    })
    .select()
    .single()
  if (error) throw error

  if (serviceLines.length > 0) {
    const { error: slError } = await supabase.from('claim_service_lines').insert(
      serviceLines.map((l, i) => ({ ...l, claim_id: claim.id, sort_order: i }))
    )
    if (slError) throw slError
  }

  if (medicationLines.length > 0) {
    const { error: mlError } = await supabase.from('claim_medication_lines').insert(
      medicationLines.map((l, i) => ({ ...l, claim_id: claim.id, sort_order: i }))
    )
    if (mlError) throw mlError
  }

  // Update member utilized amount

  await logAudit(userId, 'SUBMIT_CLAIM', 'claim', claim.id, claimNo)
  return claim
}

export const vetClaim = async ({ claimId, decision, vetterNotes, serviceLineUpdates, medicationLineUpdates, vetterId }) => {
  // Update individual vet lines
  for (const [lineId, updates] of Object.entries(serviceLineUpdates || {})) {
    await supabase.from('claim_service_lines').update(updates).eq('id', lineId)
  }
  for (const [lineId, updates] of Object.entries(medicationLineUpdates || {})) {
    await supabase.from('claim_medication_lines').update(updates).eq('id', lineId)
  }

  // Calculate approved amount
  const { data: claimFull } = await supabase.from('claims')
    .select('claim_no, claim_service_lines(*), claim_medication_lines(*)')
    .eq('id', claimId).single()
  const approvedAmt = [
    ...claimFull.claim_service_lines.filter(l => l.vet_status === 'Approved').map(l => l.billed_amount),
    ...claimFull.claim_medication_lines.filter(l => l.vet_status === 'Approved').map(l => l.billed_amount),
  ].reduce((s, x) => s + x, 0)

  const { data, error } = await supabase
    .from('claims')
    .update({
      status: decision,
      vetter_id: vetterId,
      vetter_notes: vetterNotes,
      vetted_at: new Date().toISOString(),
      approved_amount: decision === 'Rejected' ? 0 : approvedAmt,
    })
    .eq('id', claimId)
    .select()
    .single()
  if (error) throw error

  if (decision !== 'Rejected' && approvedAmt > 0) {
    const { data: cl } = await supabase.from('claims').select('member_id').eq('id', claimId).single()
    if (cl) await addUtilization(cl.member_id, approvedAmt)
  }
  await logAudit(vetterId, `${decision.toUpperCase().replace(/ /g,'_')}_CLAIM`, 'claim', claimId, claimFull.claim_no)
  return data
}

// ─── AUDIT LOG ───────────────────────────────────────────────
export const logAudit = async (userId, action, entityType, entityId, entityRef, details = {}) => {
  const { error } = await supabase.from('audit_log').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_ref: String(entityRef),
    details,
  })
  if (error) console.error('audit log failed', error)
}

export const getAuditLog = async ({ entityId, entityType, limit = 50 } = {}) => {
  let q = supabase
    .from('audit_log')
    .select('*, user:profiles(full_name, role)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (entityId) q = q.eq('entity_id', entityId)
  if (entityType) q = q.eq('entity_type', entityType)

  const { data, error } = await q
  if (error) throw error
  return data
}

// ─── ANALYTICS ───────────────────────────────────────────────
export const getDashboardStats = async () => {
  const [members, auths, claims, providers] = await Promise.all([
    supabase.from('members').select('status, plan', { count: 'exact' }),
    supabase.from('authorizations').select('status', { count: 'exact' }),
    supabase.from('claims').select('status, submitted_amount, approved_amount', { count: 'exact' }),
    supabase.from('providers').select('status', { count: 'exact' }),
  ])

  const totalMembers = members.count || 0
  const activeMembers = members.data?.filter(m => m.status === 'Active').length || 0
  const pendingAuths = auths.data?.filter(a => a.status === 'Pending').length || 0
  const pendingClaims = claims.data?.filter(c => c.status === 'Pending').length || 0
  const totalSubmitted = claims.data?.reduce((s, c) => s + (c.submitted_amount || 0), 0) || 0
  const totalApproved = claims.data?.filter(c => c.approved_amount).reduce((s, c) => s + (c.approved_amount || 0), 0) || 0

  return { totalMembers, activeMembers, pendingAuths, pendingClaims, totalSubmitted, totalApproved }
}

// Called when a claim decision is final: moves the member's utilised benefit
export const addUtilization = async (memberId, amount) => {
  const { error } = await supabase.rpc('increment_utilized', { member_uuid: memberId, amount })
  if (error) console.error('utilization update failed', error)
}

export const getProfiles = async () => {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const setUserRole = async (id, role) => {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
  if (error) throw error
}

export const markClaimPaid = async (claimId, amount, userId, claimNo) => {
  const { error } = await supabase.from('claims')
    .update({ status: 'Paid', paid_amount: amount, paid_at: new Date().toISOString() })
    .eq('id', claimId)
  if (error) throw error
  await logAudit(userId, 'PAY_CLAIM', 'claim', claimId, claimNo)
}
