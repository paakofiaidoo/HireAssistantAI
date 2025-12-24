
import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { 
  Globe, 
  RefreshCw, 
  Search, 
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  Info,
  Filter,
  Trash2,
  Cpu,
  Linkedin,
  Building,
  ArrowUpRight
} from 'lucide-react';
import { AutomatedJob } from '../types';
import { extractJobsFromHtml } from '../utils/scraper';
import { extractJobsFromRawHtml } from '../geminiService';
import { db } from '../db';

interface AutomateTabProps {
  onApply: (job: AutomatedJob) => void;
  jobs: AutomatedJob[];
  setJobs: (jobs: AutomatedJob[]) => void;
}

type FilterType = 'all' | AutomatedJob['status'];
type Provider = 'amstat' | 'linkedin' | 'indeed' | 'glassdoor' | 'custom_ai';

const PROVIDERS = [
  { id: 'amstat', name: 'Amstat (2026)', active: true, icon: Globe, url: 'https://stattrak.amstat.org/2025/12/01/2026-internships/' },
  { id: 'custom_ai', name: 'Custom AI Extract', active: true, icon: Cpu },
  { id: 'linkedin', name: 'LinkedIn', active: false, icon: Linkedin },
  { id: 'indeed', name: 'Indeed', active: false, icon: Building },
  { id: 'glassdoor', name: 'Glassdoor', active: false, icon: Globe },
];

export const AutomateTab: React.FC<AutomateTabProps> = ({ onApply, jobs, setJobs }) => {
  const [loading, setLoading] = useState(false);
  const [htmlInput, setHtmlInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedProvider, setSelectedProvider] = useState<Provider>('amstat');
  
  const [customUrl, setCustomUrl] = useState('');

  useEffect(() => {
    const loadLastUrl = async () => {
      const saved = await db.get<string>('last_fetch_url');
      if (saved) setCustomUrl(saved);
      else if (selectedProvider === 'amstat') setCustomUrl(PROVIDERS[0].url || '');
    };
    loadLastUrl();
  }, [selectedProvider]);

  const handleFetch = async () => {
    if (!customUrl) return;
    setLoading(true);
    setShowManualInput(false);
    await db.set('last_fetch_url', customUrl);
    
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(customUrl)}`;
      const response = await axios.get(proxyUrl);
      const htmlContent = response.data.contents;
      
      let extracted: AutomatedJob[] = [];
      if (selectedProvider === 'amstat') {
        extracted = extractJobsFromHtml(htmlContent);
      } else if (selectedProvider === 'custom_ai') {
        extracted = await extractJobsFromRawHtml(htmlContent);
      }

      if (extracted.length === 0) throw new Error('No jobs found');
      setJobs(extracted);
    } catch (error) {
      console.warn('Direct fetch failed, requesting manual source input');
      setShowManualInput(true);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessManualHtml = async () => {
    if (!htmlInput.trim()) return;
    setLoading(true);
    try {
      let extracted: AutomatedJob[] = [];
      if (selectedProvider === 'amstat') {
        extracted = extractJobsFromHtml(htmlInput);
      } else {
        extracted = await extractJobsFromRawHtml(htmlInput);
      }
      setJobs(extracted);
      setShowManualInput(false);
      setHtmlInput('');
    } catch (err) {
      alert("AI failed to extract jobs from this HTML. Try pasting a cleaner version of the source.");
    } finally {
      setLoading(false);
    }
  };

  const clearJobs = () => {
    if (confirm("Clear all extracted jobs?")) {
      setJobs([]);
    }
  };

  const filteredJobs = useMemo(() => {
    if (activeFilter === 'all') return jobs;
    return jobs.filter(job => job.status === activeFilter);
  }, [jobs, activeFilter]);

  const getStatusBadge = (status: AutomatedJob['status'], deadline: string) => {
    if (status === 'applied') {
      return <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Applied</span>;
    }
    if (status === 'expired') {
      return <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full"><AlertCircle className="w-3 h-3" /> Expired</span>;
    }
    if (status === 'skipped') {
      return <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">Skipped</span>;
    }
    return <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full"><Clock className="w-3 h-3" /> {deadline}</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight dark:text-white flex items-center gap-3">
          <Globe className="w-8 h-8 text-indigo-600" />
          Intelligence Sourcing
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-lg">Automate job discovery using site-specific scrapers or Gemini AI.</p>
      </header>

      {/* Provider & URL Input Area */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                disabled={!p.active}
                onClick={() => setSelectedProvider(p.id as Provider)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                  selectedProvider === p.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : p.active 
                      ? 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      : 'bg-gray-100 dark:bg-gray-900 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-60'
                }`}
              >
                <p.icon className="w-4 h-4" />
                {p.name}
                {!p.active && <span className="text-[9px] uppercase absolute -top-1 -right-1 bg-gray-400 text-white px-1 rounded-md">Soon</span>}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder={selectedProvider === 'custom_ai' ? "Paste any job listing URL..." : "Target Website URL"}
              className="flex-1 px-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium dark:text-white"
            />
            <button 
              onClick={handleFetch}
              disabled={loading || !customUrl}
              className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowUpRight className="w-5 h-5" />}
              {selectedProvider === 'custom_ai' ? 'AI Extract' : 'Fetch Jobs'}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3" />
              <span>{selectedProvider === 'custom_ai' ? 'Gemini will analyze the page content to find job details.' : 'Optimized parser active for selected site.'}</span>
            </div>
            {jobs.length > 0 && (
              <button onClick={clearJobs} className="text-red-500 hover:text-red-600 font-bold flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Clear List
              </button>
            )}
          </div>
        </div>
      </div>

      {showManualInput && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-8 rounded-3xl border border-amber-100 dark:border-amber-900/50 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300">
            <Cpu className="w-6 h-6" />
            <p className="font-bold text-lg">Source Extraction Fallback</p>
          </div>
          <p className="text-sm text-amber-800 dark:text-amber-400">
            Browser security prevented automatic extraction. Please paste the page HTML source below for AI processing.
          </p>
          <textarea 
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
            placeholder="Paste HTML here (Ctrl+U, Ctrl+A, Ctrl+C)..."
            className="w-full h-48 p-4 text-xs font-mono bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowManualInput(false)} className="px-6 py-2 text-sm font-bold text-amber-700 dark:text-amber-400">Cancel</button>
            <button 
              onClick={handleProcessManualHtml}
              disabled={loading}
              className="px-8 py-3 bg-amber-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Process with Gemini
            </button>
          </div>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 pl-2">
              <Filter className="w-4 h-4" />
              <span className="font-bold text-sm">Status Filter:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'available', 'expired', 'applied', 'skipped'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeFilter === type 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-50 dark:bg-gray-900 text-gray-500'
                  }`}
                >
                  {type.toUpperCase()} ({type === 'all' ? jobs.length : jobs.filter(j => j.status === type).length})
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col hover:shadow-2xl transition-all relative overflow-hidden group">
                <div className="mb-4 flex justify-between">
                  {getStatusBadge(job.status, job.deadline)}
                </div>
                <h4 className="font-bold text-xl dark:text-white leading-tight mb-4 group-hover:text-indigo-600 transition-colors">{job.title}</h4>
                <div className="space-y-2 mb-8 text-sm text-gray-500 dark:text-gray-400">
                   <p className="flex items-center gap-2"><strong>Location:</strong> {job.location}</p>
                   <p className="flex items-center gap-2"><strong>Student Type:</strong> {job.studentType}</p>
                   <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-xs italic">
                     {job.description.substring(0, 150)}...
                   </div>
                </div>
                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                  <button 
                    onClick={() => onApply(job)}
                    disabled={job.status === 'applied'}
                    className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                  >
                    {job.status === 'applied' ? 'Applied' : job.status === 'expired' ? 'Apply Anyway' : 'Apply Now'}
                  </button>
                  <button 
                    onClick={() => setJobs(jobs.map(j => j.id === job.id ? {...j, status: 'skipped'} : j))}
                    className="px-4 py-3 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
