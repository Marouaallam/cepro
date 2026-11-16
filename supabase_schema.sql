-- ============================================================================
-- CEPRO Immobilier — Supabase Database Schema for Leads
-- Run this script in the Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. Create the 'leads' table
CREATE TABLE IF NOT EXISTS public.leads (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    residence TEXT NOT NULL,
    apartment_type TEXT NOT NULL,
    preferred_contact_time TEXT NOT NULL,
    language TEXT DEFAULT 'fr',
    consent BOOLEAN DEFAULT TRUE,
    event_id TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    tracking JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS) to protect customer data
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow anyone (public/anonymous) to submit new leads
-- This allows the contact form to insert rows with the publishable key.
DROP POLICY IF EXISTS "Allow public lead submission" ON public.leads;
CREATE POLICY "Allow public lead submission"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 4. No SELECT policy on purpose: nobody can read leads with the publishable key.
-- The admin panel (/admin) reads them server-side through Vercel functions using
-- the Supabase SECRET key, which bypasses RLS and never reaches the browser.
-- (A previous version allowed any "authenticated" user to read — anyone able to
-- sign up to the project could then list all leads. It is removed here.)
DROP POLICY IF EXISTS "Allow authenticated read only" ON public.leads;

-- Useful index for querying by residence or submission date
CREATE INDEX IF NOT EXISTS idx_leads_submitted_at ON public.leads (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_residence ON public.leads (residence);

