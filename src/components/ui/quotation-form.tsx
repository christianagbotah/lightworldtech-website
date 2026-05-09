'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, CheckCircle2, User, Briefcase, FileText,
  Phone, Mail, Building2, DollarSign, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';

interface QuotationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedService?: string;
}

interface ServiceOption {
  id: string;
  title: string;
}

const budgetRanges = [
  { value: '$500-$1,000', label: '$500 - $1,000' },
  { value: '$1,000-$5,000', label: '$1,000 - $5,000' },
  { value: '$5,000-$10,000', label: '$5,000 - $10,000' },
  { value: '$10,000+', label: '$10,000+' },
];

const personalInfoSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional().default(''),
  company: z.string().optional().default(''),
});

const projectDetailsSchema = z.object({
  serviceType: z.string().min(1, 'Please select a service type'),
  budgetRange: z.string().min(1, 'Please select a budget range'),
  description: z.string().min(10, 'Please provide at least 10 characters of description'),
});

type PersonalInfo = z.infer<typeof personalInfoSchema>;
type ProjectDetails = z.infer<typeof projectDetailsSchema>;

const steps = [
  { id: 1, title: 'Your Info', icon: User },
  { id: 2, title: 'Project Details', icon: Briefcase },
  { id: 3, title: 'Confirm', icon: CheckCircle2 },
];

export default function QuotationForm({ open, onOpenChange, preselectedService }: QuotationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({ name: '', email: '', phone: '', company: '' });
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({ serviceType: '', budgetRange: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const fetcher = (url: string) => fetch(url).then(r => r.json());

  useEffect(() => {
    fetcher('/api/services')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setServices(data.map((s: ServiceOption) => ({ id: s.id, title: s.title })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (preselectedService && open) {
      setProjectDetails(prev => ({ ...prev, serviceType: preselectedService }));
    }
  }, [preselectedService, open]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setCurrentStep(1);
      setPersonalInfo({ name: '', email: '', phone: '', company: '' });
      setProjectDetails({ serviceType: preselectedService || '', budgetRange: '', description: '' });
      setErrors({});
      setSubmitted(false);
    }, 300);
  }, [onOpenChange, preselectedService]);

  const validateStep1 = (): boolean => {
    const result = personalInfoSchema.safeParse(personalInfo);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep2 = (): boolean => {
    const result = projectDetailsSchema.safeParse(projectDetails);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
    else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
  };

  const handleBack = () => {
    setErrors({});
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const serviceName = services.find(s => s.id === projectDetails.serviceType)?.title || projectDetails.serviceType;
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personalInfo.name,
          email: personalInfo.email,
          phone: personalInfo.phone,
          subject: `Quotation Request: ${serviceName}`,
          message: `Service: ${serviceName}\nBudget: ${projectDetails.budgetRange}\n\n${projectDetails.description}${personalInfo.company ? `\n\nCompany: ${personalInfo.company}` : ''}`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        toast.success('Quotation request submitted! We\'ll get back to you within 24 hours.');
        setTimeout(() => handleClose(), 3000);
      } else {
        toast.error('Failed to submit request. Please try again.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden max-h-[90vh]">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.6, delay: 0.2 }}
                className="size-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
              >
                <CheckCircle2 className="size-10 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Request Submitted!</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
                Thank you for your quotation request. Our team will review your project details and get back to you within 24 hours.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={`step-${currentStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-500 dark:to-amber-800 p-6">
                <DialogHeader>
                  <DialogTitle className="text-xl text-white flex items-center gap-2">
                    <FileText className="size-5" />
                    Request a Quote
                  </DialogTitle>
                  <DialogDescription className="text-amber-100 text-sm">
                    Fill in the details below and we&apos;ll provide a customized quote for your project.
                  </DialogDescription>
                </DialogHeader>

                {/* Progress Steps */}
                <div className="flex items-center gap-2 mt-5">
                  {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    return (
                      <div key={step.id} className="flex items-center flex-1">
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className={`size-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                              isActive
                                ? 'bg-white text-emerald-600 shadow-md'
                                : isCompleted
                                  ? 'bg-amber-400 text-white'
                                  : 'bg-emerald-600/30 text-amber-200'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="size-4" />
                            ) : (
                              <StepIcon className="size-4" />
                            )}
                          </div>
                          <span
                            className={`text-xs font-medium hidden sm:block transition-colors duration-300 ${
                              isActive ? 'text-white' : isCompleted ? 'text-amber-200' : 'text-amber-300/60'
                            }`}
                          >
                            {step.title}
                          </span>
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`h-px flex-1 mx-2 transition-colors duration-300 ${isCompleted ? 'bg-amber-400' : 'bg-emerald-600/30'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step Content */}
              <div className="p-6 space-y-4 max-h-[calc(90vh-14rem)] overflow-y-auto">
                {/* Step 1: Personal Info */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="quote-name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          id="quote-name"
                          placeholder="John Doe"
                          value={personalInfo.name}
                          onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
                          onBlur={() => { if (personalInfoSchema.shape.name.safeParse(personalInfo.name).success) setErrors(prev => ({ ...prev, name: '' })); else setErrors(prev => ({ ...prev, name: 'Name must be at least 2 characters' })); }}
                          className={`pl-10 ${errors.name ? 'border-red-400 dark:border-red-500' : ''}`}
                        />
                      </div>
                      {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quote-email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          id="quote-email"
                          type="email"
                          placeholder="john@example.com"
                          value={personalInfo.email}
                          onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                          onBlur={() => { if (personalInfoSchema.shape.email.safeParse(personalInfo.email).success) setErrors(prev => ({ ...prev, email: '' })); else setErrors(prev => ({ ...prev, email: 'Please enter a valid email' })); }}
                          className={`pl-10 ${errors.email ? 'border-red-400 dark:border-red-500' : ''}`}
                        />
                      </div>
                      {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quote-phone" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          Phone Number
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <Input
                            id="quote-phone"
                            placeholder="+233 XX XXX XXXX"
                            value={personalInfo.phone}
                            onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quote-company" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          Company
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <Input
                            id="quote-company"
                            placeholder="Your Company"
                            value={personalInfo.company}
                            onChange={(e) => setPersonalInfo(prev => ({ ...prev, company: e.target.value }))}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Project Details */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Service Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={projectDetails.serviceType}
                        onValueChange={(value) => {
                          setProjectDetails(prev => ({ ...prev, serviceType: value }));
                          if (errors.serviceType) setErrors(prev => ({ ...prev, serviceType: '' }));
                        }}
                      >
                        <SelectTrigger className={errors.serviceType ? 'border-red-400 dark:border-red-500' : ''}>
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.serviceType && <p className="text-xs text-red-500">{errors.serviceType}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Budget Range <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={projectDetails.budgetRange}
                        onValueChange={(value) => {
                          setProjectDetails(prev => ({ ...prev, budgetRange: value }));
                          if (errors.budgetRange) setErrors(prev => ({ ...prev, budgetRange: '' }));
                        }}
                      >
                        <SelectTrigger className={errors.budgetRange ? 'border-red-400 dark:border-red-500' : ''}>
                          <DollarSign className="size-4 text-slate-400 mr-2" />
                          <SelectValue placeholder="Select budget range" />
                        </SelectTrigger>
                        <SelectContent>
                          {budgetRanges.map((range) => (
                            <SelectItem key={range.value} value={range.value}>
                              {range.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.budgetRange && <p className="text-xs text-red-500">{errors.budgetRange}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quote-description" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Project Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="quote-description"
                        placeholder="Tell us about your project requirements, goals, and timeline..."
                        value={projectDetails.description}
                        onChange={(e) => {
                          setProjectDetails(prev => ({ ...prev, description: e.target.value }));
                          if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                        }}
                        onBlur={() => { if (projectDetailsSchema.shape.description.safeParse(projectDetails.description).success) setErrors(prev => ({ ...prev, description: '' })); else setErrors(prev => ({ ...prev, description: 'Please provide at least 10 characters' })); }}
                        rows={5}
                        className={errors.description ? 'border-red-400 dark:border-red-500' : ''}
                      />
                      {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                    </div>
                  </div>
                )}

                {/* Step 3: Confirmation */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-4 border border-slate-200 dark:border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <User className="size-4 text-amber-500" />
                        Your Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Name:</span>
                          <p className="font-medium text-slate-900 dark:text-white">{personalInfo.name}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Email:</span>
                          <p className="font-medium text-slate-900 dark:text-white">{personalInfo.email}</p>
                        </div>
                        {personalInfo.phone && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Phone:</span>
                            <p className="font-medium text-slate-900 dark:text-white">{personalInfo.phone}</p>
                          </div>
                        )}
                        {personalInfo.company && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Company:</span>
                            <p className="font-medium text-slate-900 dark:text-white">{personalInfo.company}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-4 border border-slate-200 dark:border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="size-4 text-amber-500" />
                        Project Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Service:</span>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {services.find(s => s.id === projectDetails.serviceType)?.title || projectDetails.serviceType}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Budget:</span>
                          <p className="font-medium text-slate-900 dark:text-white">{projectDetails.budgetRange}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-sm">Description:</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                          {projectDetails.description}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                      By submitting, you agree to be contacted by our team regarding your quotation request.
                    </p>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-2">
                  {currentStep > 1 && (
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      className="border-slate-200 dark:border-slate-600 flex-1"
                    >
                      <ArrowLeft className="size-4 mr-2" />
                      Back
                    </Button>
                  )}
                  {currentStep < 3 ? (
                    <Button
                      onClick={handleNext}
                      className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-md"
                    >
                      Next
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-md"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Request
                          <ArrowRight className="size-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
