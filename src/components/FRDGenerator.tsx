import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, FileText, MessageSquare, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import heroImage from '@/assets/hero-image.jpg';

interface Question {
  id: string;
  question: string;
  field: string;
  type: 'text' | 'textarea' | 'array';
  placeholder: string;
}

const questions: Question[] = [
  {
    id: '1',
    question: 'What is the name of your product?',
    field: 'product_name',
    type: 'text',
    placeholder: 'e.g., TaskMaster Pro'
  },
  {
    id: '2',
    question: 'Describe your product in one sentence.',
    field: 'product_description',
    type: 'textarea',
    placeholder: 'e.g., A comprehensive task management platform that helps teams collaborate and track project progress in real-time.'
  },
  {
    id: '3',
    question: 'Who are your target users?',
    field: 'target_users',
    type: 'textarea',
    placeholder: 'e.g., Project managers, team leads, and individual contributors in tech companies and startups.'
  },
  {
    id: '4',
    question: 'What problem does your product solve?',
    field: 'problem_solved',
    type: 'textarea',
    placeholder: 'e.g., Teams struggle with scattered communication, missed deadlines, and lack of visibility into project progress.'
  },
  {
    id: '5',
    question: 'What are the top 3 goals for this product?',
    field: 'product_goals',
    type: 'array',
    placeholder: 'Enter each goal on a new line'
  },
  {
    id: '6',
    question: 'List the key features you want to include.',
    field: 'key_features',
    type: 'array',
    placeholder: 'Enter each feature on a new line'
  },
  {
    id: '7',
    question: 'Describe a typical user journey or flow.',
    field: 'user_journey',
    type: 'textarea',
    placeholder: 'e.g., User logs in → Creates a project → Adds team members → Creates tasks → Tracks progress → Reviews completion'
  },
  {
    id: '8',
    question: 'Do you have a preferred tech stack?',
    field: 'tech_stack',
    type: 'textarea',
    placeholder: 'e.g., React, Node.js, PostgreSQL, AWS'
  },
  {
    id: '9',
    question: 'Any known constraints or dependencies?',
    field: 'constraints',
    type: 'textarea',
    placeholder: 'e.g., Must integrate with existing CRM system, Budget constraints, Timeline limitations'
  },
  {
    id: '10',
    question: 'How will you measure success (KPIs, metrics)?',
    field: 'success_metrics',
    type: 'textarea',
    placeholder: 'e.g., User adoption rate, Task completion time, Team productivity increase'
  }
];

export default function FRDGenerator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFRD, setGeneratedFRD] = useState<string>('');
  const [conversationId, setConversationId] = useState<string>('');
  const { toast } = useToast();

  const isWelcome = currentStep === -1;
  const isIntroduction = currentStep === 0 && !questions[0];
  const currentQuestion = questions[currentStep];
  const isComplete = currentStep >= questions.length;
  const progress = (currentStep / questions.length) * 100;

  const handleStart = () => {
    setCurrentStep(0);
  };

  const handleInputChange = (value: string) => {
    if (!currentQuestion) return;
    
    if (currentQuestion.type === 'array') {
      const arrayValue = value.split('\n').filter(item => item.trim() !== '');
      setResponses(prev => ({
        ...prev,
        [currentQuestion.field]: arrayValue
      }));
    } else {
      setResponses(prev => ({
        ...prev,
        [currentQuestion.field]: value
      }));
    }
  };

  const handleNext = async () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      await saveAndGenerate();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const saveAndGenerate = async () => {
    setIsGenerating(true);
    try {
      // Save conversation to database
      const { data, error } = await supabase
        .from('frd_conversations')
        .insert([responses])
        .select()
        .single();

      if (error) throw error;

      setConversationId(data.id);

      // Generate FRD using edge function
      const response = await supabase.functions.invoke('generate-frd', {
        body: { conversationId: data.id }
      });

      if (response.error) throw response.error;

      if (response.data?.success) {
        setGeneratedFRD(response.data.frd);
        setCurrentStep(questions.length);
        toast({
          title: 'FRD Generated Successfully!',
          description: 'Your Functional Requirements Document is ready.',
        });
      } else {
        throw new Error(response.data?.error || 'Failed to generate FRD');
      }
    } catch (error) {
      console.error('Error generating FRD:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate FRD. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getCurrentValue = () => {
    if (!currentQuestion) return '';
    const value = responses[currentQuestion.field];
    return currentQuestion.type === 'array' ? (value || []).join('\n') : (value || '');
  };

  if (isWelcome || currentStep === -1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <img 
                src={heroImage} 
                alt="FRD Generator" 
                className="w-full h-64 object-cover rounded-xl shadow-lg"
              />
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">
              Get Your <span className="text-primary">FRD</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Guide your product through a conversational flow to generate a complete, 
              professional Functional Requirements Document. Perfect for product analysts and managers.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                <FileText className="w-4 h-4 mr-2" />
                Professional FRDs
              </Badge>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                <MessageSquare className="w-4 h-4 mr-2" />
                Conversational Flow
              </Badge>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered
              </Badge>
            </div>
            <Button 
              size="lg" 
              onClick={handleStart}
              className="bg-primary hover:bg-primary-hover text-primary-foreground px-8 py-3 text-lg"
            >
              Start Creating Your FRD
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isComplete && generatedFRD) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-4">
                <CheckCircle className="w-8 h-8 text-success inline-block mr-3" />
                Your FRD is Ready!
              </h1>
              <p className="text-muted-foreground">
                You can copy it, export it, or refine it further.
              </p>
            </div>
            
            <Card className="shadow-large">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Functional Requirements Document</span>
                  <Button
                    onClick={() => navigator.clipboard.writeText(generatedFRD)}
                    variant="outline"
                  >
                    Copy to Clipboard
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                    {generatedFRD}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <div className="text-center mt-8">
              <Button 
                onClick={() => {
                  setCurrentStep(-1);
                  setResponses({});
                  setGeneratedFRD('');
                  setConversationId('');
                }}
                variant="outline"
              >
                Create Another FRD
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-foreground">Get Your FRD</h1>
              <Badge variant="outline">
                Question {currentStep + 1} of {questions.length}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          {currentQuestion && (
            <Card className="shadow-medium mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-3 text-sm font-bold">
                    {currentStep + 1}
                  </div>
                  {currentQuestion.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentQuestion.type === 'textarea' ? (
                  <Textarea
                    placeholder={currentQuestion.placeholder}
                    value={getCurrentValue()}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="min-h-24"
                  />
                ) : (
                  <Input
                    placeholder={currentQuestion.placeholder}
                    value={getCurrentValue()}
                    onChange={(e) => handleInputChange(e.target.value)}
                  />
                )}
                {currentQuestion.type === 'array' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Enter each item on a new line
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={isGenerating || (currentQuestion && !getCurrentValue().trim())}
              className="bg-primary hover:bg-primary-hover"
            >
              {isGenerating ? (
                'Generating FRD...'
              ) : currentStep === questions.length - 1 ? (
                'Generate FRD'
              ) : (
                'Next'
              )}
            </Button>
          </div>

          {/* Question List */}
          <Card className="mt-8 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {questions.map((q, index) => (
                  <div key={q.id} className="flex items-center space-x-3">
                    {index < currentStep ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : index === currentStep ? (
                      <Circle className="w-5 h-5 text-primary" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className={`text-sm ${
                      index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {q.question}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}