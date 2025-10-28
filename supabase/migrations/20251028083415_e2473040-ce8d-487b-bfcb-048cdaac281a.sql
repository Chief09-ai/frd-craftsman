-- Fix security issue: frd_conversations table has unrestricted public access
-- This migration will secure the table so users can only access their own conversations

-- First, drop the existing overly permissive policy
DROP POLICY IF EXISTS "Allow all access to frd_conversations" ON public.frd_conversations;

-- Make user_id NOT NULL to enforce proper security
-- Update any existing records without user_id to have a placeholder (you should clean these up manually)
UPDATE public.frd_conversations 
SET user_id = '00000000-0000-0000-0000-000000000000'::uuid 
WHERE user_id IS NULL;

ALTER TABLE public.frd_conversations 
ALTER COLUMN user_id SET NOT NULL;

-- Create proper RLS policies that restrict users to only their own data

-- Policy: Users can view only their own conversations
CREATE POLICY "Users can view own conversations" 
ON public.frd_conversations 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own conversations
CREATE POLICY "Users can create own conversations" 
ON public.frd_conversations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own conversations
CREATE POLICY "Users can update own conversations" 
ON public.frd_conversations 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own conversations
CREATE POLICY "Users can delete own conversations" 
ON public.frd_conversations 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);