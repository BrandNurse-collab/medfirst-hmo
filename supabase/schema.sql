-- ============================================================
-- MedFirst HMO Operations Portal — Supabase Schema
-- Find Nurses NG Academy
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'provider', 'medops', 'claims');
CREATE TYPE member_status AS ENUM ('Active', 'Suspended', 'Terminated');
CREATE TYPE plan_type AS ENUM ('Bronze', 'Silver', 'Gold', 'Executive');
CREATE TYPE provider_status AS ENUM ('Active', 'Suspended');
CREATE TYPE provider_tier AS ENUM ('Primary', 'Secondary', 'Tertiary');
CREATE TYPE auth_status AS ENUM ('Pending', 'Approved', 'Partially Approved', 'Declined');
CREATE TYPE line_status AS ENUM ('Pending', 'Approved', 'Declined');
CREATE TYPE claim_status AS ENUM ('Pending', 'Under Review', 'Approved', 'Partially Approved', 'Rejected', 'Paid');
CREATE TYPE vet_status AS ENUM ('Pending', 'Approved', 'Flagged', 'Rejected');

-- PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'provider',
  cohort TEXT,
  provider_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROVIDERS
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  license_no TEXT UNIQUE NOT NULL,
  tier provider_tier NOT NULL DEFAULT 'Secondary',
  type TEXT NOT NULL DEFAULT 'General Hospital',
  state TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  specialties TEXT[] DEFAULT '{}',
  status provider_status NOT NULL DEFAULT 'Active',
  rating NUMERIC(3,1) DEFAULT 4.0,
  contract_start DATE,
  contract_end DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEMBERS
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_no TEXT UNIQUE NOT NULL,
  policy_no TEXT UNIQUE NOT NULL,
  surname TEXT NOT NULL,
  first_name TEXT NOT NULL,
  other_names TEXT,
  gender TEXT CHECK (gender IN ('Male','Female')),
  dob DATE,
  phone TEXT,
  email TEXT,
  address TEXT,
  company TEXT NOT NULL,
  department TEXT,
  employee_id TEXT,
  plan plan_type NOT NULL DEFAULT 'Bronze',
  status member_status NOT NULL DEFAULT 'Active',
  provider_id UUID REFERENCES providers(id),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  principal_id UUID REFERENCES members(id),
  dependant_type TEXT,
  annual_limit NUMERIC(12,2) NOT NULL,
  utilized_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TARIFF ITEMS
CREATE TABLE tariff_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL,
  plan_coverage TEXT[] DEFAULT ARRAY['Bronze','Silver','Gold','Executive'],
  requires_auth BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DRUG FORMULARY
CREATE TABLE formulary_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  generic_name TEXT,
  drug_class TEXT NOT NULL,
  unit_cost NUMERIC(10,2) NOT NULL,
  unit TEXT DEFAULT 'tablet',
  covered BOOLEAN DEFAULT TRUE,
  plan_coverage TEXT[] DEFAULT ARRAY['Bronze','Silver','Gold','Executive'],
  requires_auth BOOLEAN DEFAULT FALSE,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUTHORIZATIONS
CREATE TABLE authorizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_no TEXT UNIQUE NOT NULL,
  member_id UUID NOT NULL REFERENCES members(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  submitted_by UUID REFERENCES profiles(id),
  icd_code TEXT NOT NULL,
  icd_description TEXT NOT NULL,
  vitals JSONB DEFAULT '{}',
  clinical_findings TEXT NOT NULL,
  clinical_notes TEXT,
  status auth_status NOT NULL DEFAULT 'Pending',
  auth_code TEXT UNIQUE,
  reviewer_id UUID REFERENCES profiles(id),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  total_requested NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_approved NUMERIC(12,2),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auth_service_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL REFERENCES authorizations(id) ON DELETE CASCADE,
  tariff_code TEXT NOT NULL,
  description TEXT NOT NULL,
  tariff_rate NUMERIC(12,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  requested_amount NUMERIC(12,2) NOT NULL,
  status line_status NOT NULL DEFAULT 'Pending',
  reviewer_note TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE auth_medication_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL REFERENCES authorizations(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  dose TEXT,
  route TEXT DEFAULT 'Oral',
  frequency TEXT,
  duration TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_formulary BOOLEAN DEFAULT TRUE,
  formulary_rate NUMERIC(10,2),
  status line_status NOT NULL DEFAULT 'Pending',
  reviewer_note TEXT,
  sort_order INTEGER DEFAULT 0
);

-- CLAIMS
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_no TEXT UNIQUE NOT NULL,
  auth_id UUID REFERENCES authorizations(id),
  member_id UUID NOT NULL REFERENCES members(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  submitted_by UUID REFERENCES profiles(id),
  icd_code TEXT NOT NULL,
  icd_description TEXT NOT NULL,
  clinical_summary TEXT NOT NULL,
  batch_ref TEXT,
  status claim_status NOT NULL DEFAULT 'Pending',
  vetter_id UUID REFERENCES profiles(id),
  vetter_notes TEXT,
  vetted_at TIMESTAMPTZ,
  submitted_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  approved_amount NUMERIC(12,2),
  paid_amount NUMERIC(12,2),
  paid_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE claim_service_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  tariff_code TEXT,
  description TEXT NOT NULL,
  tariff_rate NUMERIC(12,2) NOT NULL,
  auth_quantity INTEGER DEFAULT 0,
  billed_quantity INTEGER NOT NULL DEFAULT 1,
  billed_rate NUMERIC(12,2) NOT NULL,
  billed_amount NUMERIC(12,2) NOT NULL,
  tariff_amount NUMERIC(12,2) NOT NULL,
  variance NUMERIC(12,2) NOT NULL DEFAULT 0,
  vet_status vet_status NOT NULL DEFAULT 'Pending',
  vet_note TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE claim_medication_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  is_formulary BOOLEAN DEFAULT TRUE,
  formulary_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  auth_quantity INTEGER DEFAULT 0,
  billed_quantity INTEGER NOT NULL DEFAULT 1,
  billed_amount NUMERIC(12,2) NOT NULL,
  tariff_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  variance NUMERIC(12,2) NOT NULL DEFAULT 0,
  vet_status vet_status NOT NULL DEFAULT 'Pending',
  vet_note TEXT,
  sort_order INTEGER DEFAULT 0
);

-- AUDIT LOG
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_ref TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEQUENCES & FUNCTIONS
CREATE SEQUENCE member_seq START 1;
CREATE SEQUENCE provider_seq START 1;
CREATE SEQUENCE auth_seq START 1;
CREATE SEQUENCE claim_seq START 1;

CREATE OR REPLACE FUNCTION next_member_no() RETURNS TEXT LANGUAGE SQL AS $$
  SELECT 'MED-' || TO_CHAR(NOW(),'YYYY') || '-' || LPAD(nextval('member_seq')::TEXT,4,'0');
$$;
CREATE OR REPLACE FUNCTION next_auth_no() RETURNS TEXT LANGUAGE SQL AS $$
  SELECT 'AUTH-' || TO_CHAR(NOW(),'YYYY') || '-' || LPAD(nextval('auth_seq')::TEXT,4,'0');
$$;
CREATE OR REPLACE FUNCTION next_claim_no() RETURNS TEXT LANGUAGE SQL AS $$
  SELECT 'CLM-' || TO_CHAR(NOW(),'YYYY') || '-' || LPAD(nextval('claim_seq')::TEXT,4,'0');
$$;
CREATE OR REPLACE FUNCTION next_policy_no() RETURNS TEXT LANGUAGE SQL AS $$
  SELECT 'POL-' || TO_CHAR(NOW(),'YYYY') || '-' || LPAD(nextval('member_seq')::TEXT,4,'0');
$$;
CREATE OR REPLACE FUNCTION generate_auth_code() RETURNS TEXT LANGUAGE SQL AS $$
  SELECT 'AC-' || TO_CHAR(NOW(),'YYYY') || '-' || LPAD((RANDOM()*89999+10000)::INT::TEXT,5,'0');
$$;

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_providers_upd BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_members_upd BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_auths_upd BEFORE UPDATE ON authorizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_claims_upd BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_service_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_medication_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_service_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_medication_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_users_read_profiles" ON profiles FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE USING (auth.uid()=id);
CREATE POLICY "auth_users_insert_profile" ON profiles FOR INSERT WITH CHECK (auth.uid()=id);
CREATE POLICY "tariff_read" ON tariff_items FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "formulary_read" ON formulary_items FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "members_read" ON members FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "members_insert" ON members FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "members_update" ON members FOR UPDATE USING (auth.role()='authenticated');
CREATE POLICY "providers_read" ON providers FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "providers_insert" ON providers FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "providers_update" ON providers FOR UPDATE USING (auth.role()='authenticated');
CREATE POLICY "auths_read" ON authorizations FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "auths_insert" ON authorizations FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "auths_update" ON authorizations FOR UPDATE USING (auth.role()='authenticated');
CREATE POLICY "auth_svc_all" ON auth_service_lines FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "auth_med_all" ON auth_medication_lines FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "claims_read" ON claims FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "claims_insert" ON claims FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "claims_update" ON claims FOR UPDATE USING (auth.role()='authenticated');
CREATE POLICY "claim_svc_all" ON claim_service_lines FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "claim_med_all" ON claim_medication_lines FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "audit_read" ON audit_log FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "audit_insert" ON audit_log FOR INSERT WITH CHECK (auth.role()='authenticated');

-- SEED TARIFF
INSERT INTO tariff_items (code,description,category,unit_cost,requires_auth,plan_coverage) VALUES
('CON-001','General Consultation','Consultation',3500,false,ARRAY['Bronze','Silver','Gold','Executive']),
('CON-002','Specialist Consultation','Consultation',8000,true,ARRAY['Silver','Gold','Executive']),
('CON-003','Follow-up Consultation','Consultation',2500,false,ARRAY['Bronze','Silver','Gold','Executive']),
('LAB-001','Full Blood Count','Laboratory',4500,false,ARRAY['Bronze','Silver','Gold','Executive']),
('LAB-002','Malaria RDT','Laboratory',2500,false,ARRAY['Bronze','Silver','Gold','Executive']),
('LAB-003','Fasting Blood Sugar','Laboratory',3000,false,ARRAY['Bronze','Silver','Gold','Executive']),
('LAB-004','Urine M/C/S','Laboratory',4000,false,ARRAY['Silver','Gold','Executive']),
('LAB-005','Liver Function Tests','Laboratory',8500,true,ARRAY['Silver','Gold','Executive']),
('LAB-006','Renal Function Tests','Laboratory',8000,true,ARRAY['Silver','Gold','Executive']),
('LAB-007','Serum Electrolytes','Laboratory',6500,true,ARRAY['Silver','Gold','Executive']),
('IMG-001','Chest X-Ray','Imaging',8500,false,ARRAY['Bronze','Silver','Gold','Executive']),
('IMG-002','Abdominal Ultrasound','Imaging',15000,true,ARRAY['Silver','Gold','Executive']),
('IMG-003','Pelvic Ultrasound','Imaging',18000,true,ARRAY['Silver','Gold','Executive']),
('IMG-004','CT Scan Abdomen','Imaging',120000,true,ARRAY['Gold','Executive']),
('IMG-005','MRI Brain','Imaging',85000,true,ARRAY['Gold','Executive']),
('SRG-001','Appendectomy','Surgery',250000,true,ARRAY['Silver','Gold','Executive']),
('SRG-002','Myomectomy','Surgery',350000,true,ARRAY['Gold','Executive']),
('SRG-003','Hernia Repair','Surgery',180000,true,ARRAY['Silver','Gold','Executive']),
('SRG-004','Caesarean Section','Surgery',280000,true,ARRAY['Silver','Gold','Executive']),
('ADM-001','General Ward (per day)','Admission',15000,true,ARRAY['Silver','Gold','Executive']),
('ADM-002','Private Ward (per day)','Admission',35000,true,ARRAY['Gold','Executive']),
('ADM-003','ICU (per day)','Admission',85000,true,ARRAY['Gold','Executive']);

-- SEED FORMULARY
INSERT INTO formulary_items (name,drug_class,unit_cost,unit) VALUES
('Artemether-Lumefantrine 80/480mg','Antimalarial',2800,'course'),
('Artesunate IV 60mg','Antimalarial',3500,'vial'),
('Ceftriaxone 1g IV','Antibiotic',5000,'vial'),
('Amoxicillin-Clavulanic Acid 625mg','Antibiotic',800,'tablet'),
('Ciprofloxacin 500mg','Antibiotic',600,'tablet'),
('Metronidazole 400mg IV','Antiprotozoal',900,'infusion'),
('Azithromycin 500mg','Antibiotic',1200,'tablet'),
('Amlodipine 5mg','Antihypertensive',200,'tablet'),
('Amlodipine 10mg','Antihypertensive',280,'tablet'),
('Lisinopril 10mg','Antihypertensive',250,'tablet'),
('Lisinopril 5mg','Antihypertensive',200,'tablet'),
('Hydrochlorothiazide 25mg','Antihypertensive',150,'tablet'),
('Metformin 500mg','Antidiabetic',180,'tablet'),
('Glibenclamide 5mg','Antidiabetic',200,'tablet'),
('Tramadol 100mg','Analgesic',600,'tablet'),
('Paracetamol 500mg','Analgesic',100,'tablet'),
('Ibuprofen 400mg','NSAID',150,'tablet'),
('Diclofenac 75mg IM','NSAID',450,'ampoule'),
('Omeprazole 20mg','PPI',350,'capsule'),
('Omeprazole 40mg IV','PPI',1200,'vial'),
('Normal Saline 0.9% 1L','IV Fluid',1800,'bag'),
('Ringers Lactate 1L','IV Fluid',2000,'bag'),
('Dextrose 5% 1L','IV Fluid',1500,'bag'),
('ORS Sachets','Electrolyte',200,'sachet'),
('Dexamethasone 4mg IV','Corticosteroid',450,'ampoule'),
('Folic Acid 5mg','Haematinic',80,'tablet'),
('Ferrous Sulphate 200mg','Haematinic',120,'tablet'),
('Atenolol 50mg','Beta-Blocker',180,'tablet');
