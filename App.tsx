
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { SMTPModal } from './components/SMTPModal';
import { EmailCanvas } from './components/EmailCanvas';
import { AutomateTab } from './components/AutomateTab';
import { 
  FileUp, 
  Search, 
  Send, 
  CheckCircle2, 
  FileText, 
  ChevronRight,
  Sparkles,
  Loader2,
  Check,
  ShieldCheck,
  ClipboardList,
  ListFilter
} from 'lucide-react';
import { SmtpConfig, ResumeData, JobType, JobApplication, AutomatedJob } from './types';
import { extractTextFromPdf } from './utils/pdf';
import { analyzeResume, generateJobEmail, suggestResumeImprovements, rewriteResumeWithImprovements } from './geminiService';
import { db } from './db';

const App: React.FC = () => {
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({ email: '', appPassword: '', isConfigured: false });
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [automatedJobs, setAutomatedJobs] = useState<AutomatedJob[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [sendProgress, setSendProgress] = useState<string>('');

  // Load state from DB on mount
  useEffect(() => {
    const loadState = async () => {
      const [savedSmtp, savedResume, savedJobs, savedRecipient] = await Promise.all([
        db.get<SmtpConfig>('smtp_config'),
        db.get<ResumeData>('user_resume'),
        db.get<AutomatedJob[]>('automated_jobs'),
        db.get<string>('last_recipient')
      ]);
      
      if (savedSmtp) setSmtpConfig(savedSmtp);
      if (savedResume) setResume(savedResume);
      if (savedJobs) setAutomatedJobs(savedJobs);
      if (savedRecipient) setRecipientEmail(savedRecipient);
      
      setIsDbLoaded(true);
    };
    loadState();
  }, []);

  // Persist state changes
  useEffect(() => {
    if (isDbLoaded) db.set('smtp_config', smtpConfig);
  }, [smtpConfig, isDbLoaded]);

  useEffect(() => {
    if (isDbLoaded) {
      if (resume) db.set('user_resume', resume);
      else db.remove('user_resume');
    }
  }, [resume, isDbLoaded]);

  useEffect(() => {
    if (isDbLoaded) db.set('automated_jobs', automatedJobs);
  }, [automatedJobs, isDbLoaded]);

  useEffect(() => {
    if (isDbLoaded) db.set('last_recipient', recipientEmail);
  }, [recipientEmail, isDbLoaded]);

  const [activeTab, setActiveTab] = useState<'applications' | 'resume' | 'automate'>('automate');
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [isProcessingResume, setIsProcessingResume] = useState(false);
  const [jobType, setJobType] = useState<JobType>('internship');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [view, setView] = useState<'form' | 'canvas' | 'sending' | 'success'>('form');
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [improvements, setImprovements] = useState<string | null>(null);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingResume(true);
    try {
      const text = await extractTextFromPdf(file);
      const analysis = await analyzeResume(text);
      setResume({ 
        fileName: file.name, 
        fileBlob: file, 
        content: text, 
        analysis 
      });
    } catch (err) {
      console.error(err);
      alert("Failed to read PDF.");
    } finally {
      setIsProcessingResume(false);
    }
  };

  const handleGenerate = async (overrideJob?: Partial<JobApplication>) => {
    const desc = overrideJob?.description || jobDescription;
    const recipient = overrideJob?.recipientEmail || recipientEmail;
    
    if (!resume) {
      alert("Please upload your resume first.");
      setActiveTab('resume');
      return;
    }

    if (!desc) {
      alert("Job description is missing.");
      return;
    }

    setIsGenerating(true);
    try {
      const { subject, body } = await generateJobEmail(resume, desc, jobType);
      setApplication({
        description: desc,
        recipientEmail: recipient,
        subject,
        jobType,
        generatedEmail: body,
        sourceJobId: overrideJob?.sourceJobId
      });
      setView('canvas');
    } catch (err) {
      console.error(err);
      alert("Error generating email.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImproveResume = async () => {
    if (!resume) return;
    setIsGenerating(true);
    try {
      const imp = await suggestResumeImprovements(resume.content);
      setImprovements(imp);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyImprovements = async () => {
    if (!resume || !improvements) return;
    setIsImproving(true);
    try {
      const newText = await rewriteResumeWithImprovements(resume.content, improvements);
      const newAnalysis = await analyzeResume(newText);
      setResume({
        ...resume,
        content: newText,
        analysis: newAnalysis
      });
      setImprovements(null);
      alert("Resume updated with improvements!");
    } catch (err) {
      console.error(err);
      alert("Failed to apply improvements.");
    } finally {
      setIsImproving(false);
    }
  };

  const handleSendEmail = () => {
    if (!smtpConfig.isConfigured) {
      setIsSmtpModalOpen(true);
      return;
    }
    
    setView('sending');
    const steps = [
      'Establishing TLS connection to smtp.gmail.com:587...',
      'Authenticating as ' + smtpConfig.email + '...',
      'Setting MAIL FROM: <' + smtpConfig.email + '>...',
      'Setting RCPT TO: <' + application?.recipientEmail + '>...',
      'Attaching resume: ' + resume?.fileName + '...',
      'Transferring MIME payload...',
      '250 OK: Message accepted for delivery.'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setSendProgress(steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
        if (application?.sourceJobId) {
          setAutomatedJobs(prevJobs => 
            prevJobs.map(job => 
              job.id === application.sourceJobId ? { ...job, status: 'applied' } : job
            )
          );
        }
        setView('success');
      }
    }, 600);
  };

  if (!isDbLoaded) return <div className="h-screen w-screen flex items-center justify-center dark:bg-gray-900"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <Layout 
      onOpenSettings={() => setIsSmtpModalOpen(true)} 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
    >
      <div className="max-w-6xl mx-auto p-6 md:p-10 h-full">
        {activeTab === 'automate' && view === 'form' && (
          <AutomateTab 
            onApply={(job) => {
              setJobDescription(job.description);
              handleGenerate({ description: job.description, sourceJobId: job.id });
            }} 
            jobs={automatedJobs}
            setJobs={setAutomatedJobs}
          />
        )}

        {(activeTab === 'applications' || activeTab === 'resume') && view === 'form' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight dark:text-white">
                {activeTab === 'resume' ? 'Resume Command Center' : 'Application Launcher'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {activeTab === 'resume' ? 'Manage your persisted profile and AI enhancements.' : 'Configure and dispatch your next career opportunity.'}
              </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <section className={`space-y-6 ${activeTab === 'applications' ? 'hidden lg:block' : ''}`}>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h3 className="font-bold text-lg dark:text-white">Professional Profile</h3>
                    </div>
                    {resume && (
                      <div className="flex items-center gap-2 text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                        <ShieldCheck className="w-3 h-3" /> PERSISTED
                      </div>
                    )}
                  </div>

                  {!resume ? (
                    <div className="relative border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-10 text-center hover:border-indigo-400 transition-colors group flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50">
                      <input type="file" id="resume-upload" accept=".pdf" onChange={handleResumeUpload} className="sr-only" disabled={isProcessingResume} />
                      <label htmlFor="resume-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                        {isProcessingResume ? (
                          <div className="space-y-3">
                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
                            <p className="text-sm text-gray-500">Processing PDF...</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-gray-100 dark:bg-gray-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                              <FileUp className="w-10 h-10 text-gray-400 group-hover:text-indigo-500" />
                            </div>
                            <div>
                              <p className="font-bold text-lg dark:text-white">Upload Resume (PDF)</p>
                              <p className="text-sm text-gray-500 mt-1">Data will be stored securely in your browser.</p>
                            </div>
                          </div>
                        )}
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="font-bold text-indigo-900 dark:text-indigo-100 truncate max-w-[180px]">{resume.fileName}</span>
                        </div>
                        <button onClick={() => { setResume(null); setImprovements(null); }} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold">Clear Data</button>
                      </div>

                      <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl space-y-4 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Extracted Doc Summary</p>
                           <button onClick={() => {
                             navigator.clipboard.writeText(resume.content);
                             alert("Full resume text copied to clipboard!");
                           }} className="text-[10px] font-bold text-indigo-500 hover:underline flex items-center gap-1">
                             <ClipboardList className="w-3 h-3" /> Copy Full Doc
                           </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic leading-relaxed line-clamp-4">
                          "{resume.analysis?.summary || resume.content.substring(0, 300) + '...'}"
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {resume.analysis?.skills.slice(0, 8).map((skill, i) => (
                            <span key={i} className="px-2.5 py-1 bg-white dark:bg-gray-800 rounded-lg text-[10px] font-bold shadow-sm border border-gray-100 dark:border-gray-700 dark:text-gray-300 uppercase">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button onClick={handleImproveResume} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 py-4 bg-white dark:bg-gray-800 border-2 border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold hover:bg-indigo-50 transition-all disabled:opacity-50">
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Get Professional Polish Tips
                      </button>
                      
                      {improvements && (
                        <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-3xl border border-amber-100 dark:border-amber-900/50 text-sm animate-in fade-in zoom-in duration-300 space-y-5">
                          <h4 className="font-bold flex items-center gap-2 text-amber-800 dark:text-amber-200"><Sparkles className="w-5 h-5" /> Gemini Recommendations</h4>
                          <div className="whitespace-pre-wrap leading-relaxed text-amber-900/80 dark:text-amber-200/80 border-l-2 border-amber-300 pl-4">{improvements}</div>
                          <button onClick={handleApplyImprovements} disabled={isImproving} className="w-full flex items-center justify-center gap-2 py-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 shadow-xl shadow-amber-600/20">
                            {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Apply & Rewrite Doc
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <section className={`space-y-6 ${activeTab === 'resume' ? 'hidden' : ''}`}>
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                      <Search className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-lg dark:text-white">Target Assignment</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-tighter pl-1">Job Type</label>
                      <select value={jobType} onChange={(e) => setJobType(e.target.value as JobType)} className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold dark:text-white appearance-none transition-all">
                        <option value="internship">Internship</option>
                        <option value="full-time">Full-time</option>
                        <option value="contract">Contract</option>
                        <option value="remote">Remote</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-tighter pl-1">Recipient Email</label>
                      <input type="text" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="hr@company.com" className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold dark:text-white transition-all" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-tighter pl-1">Job Description</label>
                    <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste job requirements here..." className="w-full h-52 px-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium dark:text-white resize-none transition-all" />
                  </div>

                  <button onClick={() => handleGenerate()} disabled={isGenerating || !resume || !jobDescription} className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50 transition-all uppercase tracking-widest text-sm">
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                    Compose & Edit
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {view === 'canvas' && application && (
          <div className="h-[calc(100vh-80px)] -m-6 md:-m-10">
            <EmailCanvas emailBody={application.generatedEmail} recipientEmail={application.recipientEmail} subject={application.subject} onUpdate={(body) => setApplication({...application, generatedEmail: body})} onUpdateRecipient={setRecipientEmail} onUpdateSubject={(subject) => setApplication({...application, subject})} onSend={handleSendEmail} onBack={() => setView('form')} resumeContext={resume?.content || ''} />
          </div>
        )}

        {view === 'sending' && (
          <div className="flex flex-col items-center justify-center h-full space-y-8 text-center animate-in fade-in duration-500">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center">
                <Send className="w-14 h-14 text-indigo-600 animate-pulse" />
              </div>
              <div className="absolute inset-0 w-32 h-32 rounded-full border-t-4 border-indigo-600 animate-spin"></div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold dark:text-white">Executing Google SMTP Protocol</h2>
              <p className="text-gray-500 dark:text-gray-400 font-mono text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded-xl min-w-[400px]">
                {sendProgress || 'Initializing...'}
              </p>
            </div>
          </div>
        )}

        {view === 'success' && (
          <div className="flex flex-col items-center justify-center h-full space-y-8 text-center animate-in zoom-in duration-500">
            <div className="w-32 h-32 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/20">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <div className="space-y-3 max-w-lg">
              <h2 className="text-3xl font-bold dark:text-white">Email Sent Successfully!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">Your application has been dispatched via SMTP. Response tracking enabled.</p>
            </div>
            <button onClick={() => { setView('form'); setActiveTab('automate'); }} className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg transition-all hover:-translate-y-1 active:scale-95">Return to Dashboard</button>
          </div>
        )}
      </div>

      <SMTPModal isOpen={isSmtpModalOpen} onClose={() => setIsSmtpModalOpen(false)} config={smtpConfig} onSave={setSmtpConfig} />
    </Layout>
  );
};

export default App;
