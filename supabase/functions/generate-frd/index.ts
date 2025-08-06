import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId } = await req.json();
    
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = 'https://lavphfdwptcywfldfwvv.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch conversation data
    const { data: conversation, error: fetchError } = await supabase
      .from('frd_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (fetchError || !conversation) {
      throw new Error('Conversation not found');
    }

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Prepare the prompt for Gemini
    const prompt = `Generate a comprehensive Functional Requirements Document (FRD) based on the following product information:

Product Name: ${conversation.product_name || 'Not specified'}
Product Description: ${conversation.product_description || 'Not specified'}
Target Users: ${conversation.target_users || 'Not specified'}
Problem Solved: ${conversation.problem_solved || 'Not specified'}
Product Goals: ${conversation.product_goals?.join(', ') || 'Not specified'}
Key Features: ${conversation.key_features?.join(', ') || 'Not specified'}
User Journey: ${conversation.user_journey || 'Not specified'}
Tech Stack: ${conversation.tech_stack || 'Not specified'}
Constraints: ${conversation.constraints || 'Not specified'}
Success Metrics: ${conversation.success_metrics || 'Not specified'}

Please generate a complete, professional FRD following this exact structure:

**Functional Requirements Document**

**1. Overview**  
Summarize the product's purpose, scope, and background.

**2. Stakeholders**  
List key roles involved in the product and their responsibilities.

**3. Functional Requirements**  
Break down each feature with use cases and expected behavior.

**4. User Flows and User Personas**  
Describe the user personas and how user personas interact with the product.

**5. Non-Functional Requirements**  
Include performance, scalability, security, compliance, etc.

**6. Constraints & Assumptions**  
Mention any limitations, dependencies, or external factors.

**7. Acceptance Criteria**  
Define conditions under which each feature is considered complete.

**8. Appendix**  
Include glossary, references, or additional notes.

Make it professional, detailed, and tailored for product managers. Use bullet points, clear headings, and industry best practices. If any information is missing, intelligently infer based on common industry practices.`;

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedFrd = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedFrd) {
      throw new Error('Failed to generate FRD content');
    }

    // Update conversation with generated FRD
    const { error: updateError } = await supabase
      .from('frd_conversations')
      .update({
        generated_frd: generatedFrd,
        status: 'completed'
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating conversation:', updateError);
      // Continue anyway, we have the FRD
    }

    return new Response(JSON.stringify({ 
      success: true,
      frd: generatedFrd 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-frd function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});