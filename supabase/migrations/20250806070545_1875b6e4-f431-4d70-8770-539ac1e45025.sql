-- Create table for storing FRD conversations
CREATE TABLE public.frd_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  product_name TEXT,
  product_description TEXT,
  target_users TEXT,
  problem_solved TEXT,
  product_goals TEXT[],
  key_features TEXT[],
  user_journey TEXT,
  tech_stack TEXT,
  constraints TEXT,
  success_metrics TEXT,
  generated_frd TEXT,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.frd_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth is required)
CREATE POLICY "Allow all access to frd_conversations" 
ON public.frd_conversations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_frd_conversations_updated_at
BEFORE UPDATE ON public.frd_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();