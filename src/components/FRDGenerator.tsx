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
  optional?: boolean;
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
  },
  {
    id: '11',
    question: 'What is your product\'s current stage?',
    field: 'product_stage',
    type: 'text',
    placeholder: 'e.g., Idea, MVP, Beta, Live',
    optional: true
  },
  {
    id: '12',
    question: 'Who are your competitors, and how is your product different?',
    field: 'competitors',
    type: 'textarea',
    placeholder: 'e.g., Slack, Trello, Asana - We differentiate with AI-powered task prioritization',
    optional: true
  },
  {
    id: '13',
    question: 'What platforms will your product support?',
    field: 'platforms',
    type: 'textarea',
    placeholder: 'e.g., Web, iOS, Android',
    optional: true
  },
  {
    id: '14',
    question: 'Are there any compliance or regulatory requirements?',
    field: 'compliance',
    type: 'textarea',
    placeholder: 'e.g., GDPR, SOC 2, HIPAA compliance required',
    optional: true
  },
  {
    id: '15',
    question: 'Do you have any timeline or launch goals?',
    field: 'timeline',
    type: 'textarea',
    placeholder: 'e.g., MVP in 3 months, Public beta in 6 months',
    optional: true
  },
  {
    id: '16',
    question: 'Is there anything else you\'d like to share about your product?',
    field: 'additional_info',
    type: 'textarea',
    placeholder: 'Any other important details, special requirements, or context you\'d like to include',
    optional: true
  }
];

export default function FRDGenerator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFRD, setGeneratedFRD] = useState<string>('');
  const [conversationId, setConversationId] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
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
      setShowPreview(true);
    }
  };

  const handleSkip = () => {
    if (currentQuestion?.optional && currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
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

  const handleEditFromPreview = (questionIndex: number) => {
    setShowPreview(false);
    setCurrentStep(questionIndex);
  };

  const handleGenerateFromPreview = async () => {
    setShowPreview(false);
    await saveAndGenerate();
  };

  const getAnsweredCount = () => {
    return questions.filter(q => {
      const value = responses[q.field];
      return value && (Array.isArray(value) ? value.length > 0 : value.trim() !== '');
    }).length;
  };

  // Preview Mode
  if (showPreview) {
    const answeredCount = getAnsweredCount();
    const requiredQuestions = questions.filter(q => !q.optional);
    const answeredRequired = requiredQuestions.filter(q => {
      const value = responses[q.field];
      return value && (Array.isArray(value) ? value.length > 0 : value.trim() !== '');
    }).length;
    const canGenerate = answeredRequired === requiredQuestions.length;

    return (
      <div className="min-h-screen bg-background py-8 animate-fade-in">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Preview Header */}
            <div className="text-center mb-10 animate-slide-in-left">
              <h1 className="text-4xl font-bold text-foreground mb-3">
                Review Your Answers
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Make sure everything looks good before generating your FRD
              </p>
              <div className="flex justify-center gap-4">
                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
                  {answeredCount} of {questions.length} answered
                </Badge>
                {canGenerate ? (
                  <Badge className="bg-success/10 text-success border-success/20 px-4 py-2">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Ready to generate
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20 px-4 py-2">
                    {requiredQuestions.length - answeredRequired} required questions missing
                  </Badge>
                )}
              </div>
            </div>

            {/* Required Questions */}
            <div className="mb-8 animate-scale-in">
              <h2 className="text-2xl font-bold text-foreground mb-4">Required Questions</h2>
              <div className="space-y-4">
                {requiredQuestions.map((q, index) => {
                  const value = responses[q.field];
                  const hasAnswer = value && (Array.isArray(value) ? value.length > 0 : value.trim() !== '');
                  const actualIndex = questions.findIndex(question => question.id === q.id);
                  
                  return (
                    <Card 
                      key={q.id} 
                      className={`border-2 transition-all hover:shadow-lg cursor-pointer ${
                        hasAnswer ? 'border-primary/20' : 'border-destructive/20'
                      }`}
                      onClick={() => handleEditFromPreview(actualIndex)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            {hasAnswer ? (
                              <CheckCircle className="w-5 h-5 text-success" />
                            ) : (
                              <Circle className="w-5 h-5 text-destructive" />
                            )}
                            {q.question}
                          </span>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      {hasAnswer && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground">
                            {Array.isArray(value) 
                              ? value.join(', ') 
                              : value.length > 150 
                                ? value.substring(0, 150) + '...' 
                                : value}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Optional Questions */}
            {questions.some(q => q.optional) && (
              <div className="mb-10 animate-scale-in" style={{ animationDelay: '0.1s' }}>
                <h2 className="text-2xl font-bold text-foreground mb-4">Optional Questions</h2>
                <div className="space-y-4">
                  {questions.filter(q => q.optional).map(q => {
                    const value = responses[q.field];
                    const hasAnswer = value && (Array.isArray(value) ? value.length > 0 : value.trim() !== '');
                    const actualIndex = questions.findIndex(question => question.id === q.id);
                    
                    return (
                      <Card 
                        key={q.id} 
                        className="border-2 border-muted transition-all hover:shadow-lg cursor-pointer"
                        onClick={() => handleEditFromPreview(actualIndex)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              {hasAnswer ? (
                                <CheckCircle className="w-5 h-5 text-success" />
                              ) : (
                                <Circle className="w-5 h-5 text-muted-foreground" />
                              )}
                              {q.question}
                            </span>
                            <Button variant="ghost" size="sm">
                              {hasAnswer ? 'Edit' : 'Add'}
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        {hasAnswer && (
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">
                              {Array.isArray(value) 
                                ? value.join(', ') 
                                : value.length > 150 
                                  ? value.substring(0, 150) + '...' 
                                  : value}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-10 animate-slide-in-right">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowPreview(false)}
              >
                Back to Questions
              </Button>
              <Button
                size="lg"
                onClick={handleGenerateFromPreview}
                disabled={!canGenerate || isGenerating}
                className="min-w-[200px]"
              >
                {isGenerating ? 'Generating FRD...' : 'Generate FRD'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isWelcome || currentStep === -1) {
    return (
      <div className="min-h-screen animate-fade-in" style={{ background: 'var(--gradient-hero)' }}>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8 relative group">
              <div className="absolute -inset-1 rounded-xl opacity-25 blur-xl transition group-hover:opacity-40" style={{ background: 'var(--gradient-primary)' }} />
              <img 
                src={heroImage} 
                alt="FRD Generator" 
                className="relative w-full h-64 object-cover rounded-xl shadow-2xl"
              />
            </div>
            <h1 className="text-6xl font-bold text-foreground mb-6">
              Get Your <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">FRD</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Guide your product through a conversational flow to generate a complete, 
              professional Functional Requirements Document. Perfect for product analysts and managers.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <Badge className="text-sm px-4 py-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                <FileText className="w-4 h-4 mr-2" />
                Professional FRDs
              </Badge>
              <Badge className="text-sm px-4 py-2 bg-accent/10 text-accent border-accent/20 hover:bg-accent/20">
                <MessageSquare className="w-4 h-4 mr-2" />
                Conversational Flow
              </Badge>
              <Badge className="text-sm px-4 py-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered
              </Badge>
            </div>
            <Button 
              size="lg" 
              onClick={handleStart}
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
      <div className="min-h-screen bg-background py-12 animate-fade-in">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10 animate-bounce-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'var(--gradient-primary)' }}>
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-3">
                Your FRD is Ready!
              </h1>
              <p className="text-lg text-muted-foreground">
                You can copy it, export it, or refine it further.
              </p>
            </div>
            
            <Card className="border-2" style={{ boxShadow: 'var(--shadow-large)' }}>
              <CardHeader className="border-b bg-gradient-to-r from-background to-secondary/30">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="text-foreground font-bold">Functional Requirements Document</span>
                  <Button
                    onClick={() => navigator.clipboard.writeText(generatedFRD)}
                    variant="outline"
                    size="sm"
                  >
                    Copy to Clipboard
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="prose max-w-none">
                  <div 
                    className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: generatedFRD
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                        .replace(/\n/g, '<br>')
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="text-center mt-10">
              <Button 
                onClick={() => {
                  setCurrentStep(-1);
                  setResponses({});
                  setGeneratedFRD('');
                  setConversationId('');
                }}
                variant="outline"
                size="lg"
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
          <div className="mb-10 animate-slide-in-left">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Get Your FRD</h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold">
                Question {currentStep + 1} of {questions.length}
              </Badge>
            </div>
            <Progress value={progress} className="h-3 bg-secondary" />
          </div>

          {/* Question Card */}
          {currentQuestion && (
            <Card className="border-2 mb-8 animate-scale-in" style={{ boxShadow: 'var(--shadow-medium)' }}>
              <CardHeader className="bg-gradient-to-r from-background to-secondary/30">
                <CardTitle className="flex items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4 text-sm font-bold shadow-md" style={{ background: 'var(--gradient-primary)', color: 'white' }}>
                    {currentStep + 1}
                  </div>
                  <div>
                    <span className="text-foreground font-semibold">{currentQuestion.question}</span>
                    {currentQuestion.optional && (
                      <span className="text-sm text-muted-foreground ml-2 font-normal">(Optional - Skip if not applicable)</span>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <label className="sr-only" htmlFor={`question-${currentQuestion.id}`}>
                  {currentQuestion.question}
                </label>
                {currentQuestion.type === 'textarea' ? (
                  <Textarea
                    id={`question-${currentQuestion.id}`}
                    placeholder={currentQuestion.placeholder}
                    value={getCurrentValue()}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="min-h-24 text-foreground transition-all focus:scale-[1.01]"
                  />
                ) : currentQuestion.type === 'array' ? (
                  <Textarea
                    id={`question-${currentQuestion.id}`}
                    placeholder={currentQuestion.placeholder}
                    value={getCurrentValue()}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="min-h-24 text-foreground transition-all focus:scale-[1.01]"
                    aria-describedby={`help-${currentQuestion.id}`}
                  />
                ) : (
                  <Input
                    id={`question-${currentQuestion.id}`}
                    placeholder={currentQuestion.placeholder}
                    value={getCurrentValue()}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="text-foreground transition-all focus:scale-[1.01]"
                  />
                )}
                {currentQuestion.type === 'array' && (
                  <p id={`help-${currentQuestion.id}`} className="text-sm text-muted-foreground mt-2">
                    Enter each item on a new line
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center"
              size="lg"
            >
              Previous
            </Button>
            
            <div className="flex gap-3">
              {currentQuestion?.optional && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isGenerating}
                  size="lg"
                >
                  Skip
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={isGenerating || (currentQuestion && !currentQuestion.optional && !getCurrentValue().trim())}
                size="lg"
                className="transition-all hover:scale-105"
              >
                {isGenerating ? (
                  'Generating FRD...'
                ) : currentStep === questions.length - 1 ? (
                  'Review & Generate'
                ) : (
                  'Next'
                )}
              </Button>
            </div>
          </div>

          {/* Question List */}
          <Card className="mt-10 border-2" style={{ boxShadow: 'var(--shadow-soft)' }}>
            <CardHeader className="bg-gradient-to-r from-background to-secondary/30">
              <CardTitle className="text-lg font-bold text-foreground">Progress Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {questions.map((q, index) => (
                  <div key={q.id} className="flex items-center space-x-3 p-2 rounded-lg transition-colors hover:bg-secondary/50">
                    {index < currentStep ? (
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    ) : index === currentStep ? (
                      <Circle className="w-5 h-5 text-primary flex-shrink-0 fill-primary" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={`text-sm ${
                      index <= currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
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