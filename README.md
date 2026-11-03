# MedFirst HMO Operations Portal

Live practice environment for the Find Nurses NG Academy mentorship cohort.
React + Vite front end, Supabase (PostgreSQL + authentication + realtime) back end.

## The workflow candidates practise

1. Admin enrols a member (plan, employer, hospital) and registers hospitals.
2. Provider verifies eligibility, then raises an authorization: ICD-10 diagnosis, vitals, findings, services from the tariff, drugs from the formulary.
3. Medical Operations reviews every service and medication line, approves or declines each with a reason. An authorization code is issued.
4. The approval appears on the provider's screen. The provider selects one or many approved authorizations and submits them as claims (several together become one batch). Provider can alter quantities and rates, and add services outside the authorization, which is how fraud scenarios are created.
5. Claims Officer vets each line against the diagnosis, authorization, tariff and formulary, then records the decision and payment.
6. Reports page shows spend by hospital, approval rate, savings from vetting, and an audit log of who did what.

## One-time setup (about 20 minutes)

### 1. Supabase
1. Create a free project at supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql`, then run `supabase/002_triggers_and_helpers.sql`.
3. Authentication > Providers > Email: switch OFF "Confirm email" so trainees can sign in straight after registering.
4. Project Settings > API: copy the Project URL and the anon public key.

### 2. Run locally
```
cp .env.example .env      # paste the URL and anon key
npm install
npm run dev
```

### 3. Deploy (free)
Push the folder to GitHub, import it at vercel.com, and add the two environment variables
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Deploy. Attach a subdomain such as
`hmo.findnursesng.com` under the Vercel project's Domains tab.

### 4. Make yourself the administrator
Register through the portal, then in Supabase SQL Editor run:
```
update profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR_EMAIL');
```
After that you can change any trainee's role from User Management inside the portal.

## Running a cohort
- Pair trainees: one plays Provider, one MedOps, one Claims Officer, one Admin, then rotate.
- Seed scenarios by creating them yourself first, for example a Bronze member requesting imaging (should be declined), or a claim with a quantity above the authorization.
- Use the Reports > Audit log to mark each trainee's work.

## Known limits (training build)
- Everyone signed in can read all records. This is intentional so pairs can see each other's work. Do not enter real patient data.
- Trainees choose their own role at registration; you can correct it under User Management.
- To clear practice data between cohorts, run in the SQL Editor:
  `truncate claim_service_lines, claim_medication_lines, claims, auth_service_lines, auth_medication_lines, authorizations, audit_log, members, providers cascade;`
- Tariff and formulary are illustrative figures, not the current NHIA schedule. Edit them in the `tariff_items` and `formulary_items` tables.
