
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, JobType, AutomatedJob } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const analyzeResume = async (text: string): Promise<ResumeData['analysis']> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the following resume text and extract skills, experience, education, and a brief summary.
    
    Resume Text:
    ${text}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          experience: { type: Type.ARRAY, items: { type: Type.STRING } },
          education: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING }
        },
        required: ["skills", "experience", "education", "summary"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const extractJobsFromRawHtml = async (html: string): Promise<AutomatedJob[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the following HTML content and extract a list of job or internship postings.
    For each job, extract: title, location, positions (number of openings), studentType (e.g. PhD, Masters), deadline (as string), and a short description.
    
    HTML:
    ${html.substring(0, 30000)} // Truncate to avoid token limits
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            location: { type: Type.STRING },
            positions: { type: Type.STRING },
            studentType: { type: Type.STRING },
            deadline: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "location", "positions", "studentType", "deadline", "description"]
        }
      }
    }
  });

  const parsed = JSON.parse(response.text);
  return parsed.map((job: any, index: number) => ({
    ...job,
    id: `ai-job-${Date.now()}-${index}`,
    status: 'available'
  }));
};

export const generateJobEmail = async (
  resume: ResumeData, 
  jobDescription: string, 
  jobType: JobType
): Promise<{ subject: string; body: string }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are a world-class career coach.
    Generate a professional application email and a subject line for a ${jobType} position.
    
    Resume Info:
    Summary: ${resume.analysis?.summary}
    Skills: ${resume.analysis?.skills.join(", ")}
    
    Job Description:
    ${jobDescription}
    
    Output in JSON format with "subject" and "body" keys.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          body: { type: Type.STRING }
        },
        required: ["subject", "body"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const refineEmailWithChat = async (
  currentEmail: string,
  instruction: string,
  resumeContext: string
): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `The user wants to refine this job application email.
    
    Current Email:
    ${currentEmail}
    
    User Instruction:
    ${instruction}
    
    Applicant Context:
    ${resumeContext}
    
    Output ONLY the updated email text. No preamble.`,
  });

  return response.text;
};

export const suggestResumeImprovements = async (resumeText: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Read this resume and suggest 5-7 concrete, impactful improvements to make it more professional and modern. Focus on quantifiable achievements and strong action verbs.
    
    Resume Text:
    ${resumeText}`,
  });
  return response.text;
};

export const rewriteResumeWithImprovements = async (resumeText: string, suggestions: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Take this resume text and apply the following suggested improvements. Rewrite the resume to be professional, clean, and highly effective for job applications.
    
    Original Resume:
    ${resumeText}
    
    Suggestions to apply:
    ${suggestions}
    
    Output ONLY the final improved resume text.`,
  });
  return response.text;
};
