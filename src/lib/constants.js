export const PLAN_LIMITS = {
  Bronze: 150000,
  Silver: 350000,
  Gold: 750000,
  Executive: 2000000,
}

export const PLAN_COLORS = {
  Bronze: '#B45309',
  Silver: '#64748B',
  Gold: '#D97706',
  Executive: '#6D28D9',
}

export const ROLE_META = {
  admin: {
    label: 'HMO Administrator',
    icon: '🏢',
    color: '#0D2B6E',
    description: 'Full access: enrollment, authorizations, claims, analytics, user management',
    defaultRoute: '/dashboard',
  },
  provider: {
    label: 'Provider / Hospital',
    icon: '🏥',
    color: '#16A085',
    description: 'Verify eligibility, register hospital, submit authorizations and claims',
    defaultRoute: '/eligibility',
  },
  medops: {
    label: 'Medical Operations Officer',
    icon: '🩺',
    color: '#7C3AED',
    description: 'Review authorizations line-by-line, manage utilization',
    defaultRoute: '/authorizations',
  },
  claims: {
    label: 'Claims Officer',
    icon: '📋',
    color: '#B45309',
    description: 'Vet claims line-by-line: diagnosis, procedures, medications',
    defaultRoute: '/claims',
  },
}

export const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
  'Yobe','Zamfara',
]

export const ICD10_CODES = [
  { code: 'B54', description: 'Malaria, unspecified' },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism' },
  { code: 'I10', description: 'Essential hypertension' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus' },
  { code: 'A01.0', description: 'Typhoid fever' },
  { code: 'K37', description: 'Unspecified appendicitis' },
  { code: 'D25.9', description: 'Uterine fibroid, unspecified' },
  { code: 'N39.0', description: 'Urinary tract infection' },
  { code: 'G43.9', description: 'Migraine, unspecified' },
  { code: 'R10.9', description: 'Abdominal pain, unspecified' },
  { code: 'A09', description: 'Acute gastroenteritis' },
  { code: 'J06.9', description: 'Acute upper respiratory infection' },
  { code: 'K25.9', description: 'Peptic ulcer, unspecified' },
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'R51', description: 'Headache' },
  { code: 'K40.9', description: 'Inguinal hernia' },
  { code: 'I50.9', description: 'Heart failure, unspecified' },
  { code: 'N18.3', description: 'Chronic kidney disease, stage 3' },
  { code: 'C50.9', description: 'Malignant neoplasm of breast' },
  { code: 'O80', description: 'Normal delivery' },
]

export const NAVY = '#0D2B6E'
export const TEAL = '#16A085'
export const GOLD = '#F5C518'
