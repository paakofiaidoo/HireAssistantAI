
export type JobType = 'internship' | 'contract' | 'full-time' | 'remote' | 'part-time';

export interface SmtpConfig {
  email: string;
  appPassword: string;
  isConfigured: boolean;
}

export interface ResumeData {
  fileName: string;
  fileBlob?: Blob; // Added for persistence of the actual file
  content: string; // The extracted "Doc" text
  analysis?: {
    skills: string[];
    experience: string[];
    education: string[];
    summary: string;
  };
}

export interface AutomatedJob {
  id: string;
  title: string;
  location: string;
  positions: string;
  studentType: string;
  deadline: string;
  description: string;
  status: 'available' | 'expired' | 'applied' | 'skipped';
}

export interface JobApplication {
  description: string;
  recipientEmail: string;
  subject: string;
  jobType: JobType;
  generatedEmail: string;
  sourceJobId?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
