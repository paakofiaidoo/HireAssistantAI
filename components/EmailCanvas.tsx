
import React, { useState } from 'react';
import { Send, Wand2, ArrowLeft, RefreshCw, MessageSquare, AtSign, Type } from 'lucide-react';
import { ChatMessage } from '../types';
import { refineEmailWithChat } from '../geminiService';

interface EmailCanvasProps {
  emailBody: string;
  recipientEmail: string;
  subject: string;
  onUpdate: (newBody: string) => void;
  onUpdateRecipient: (newEmail: string) => void;
  onUpdateSubject: (newSubject: string) => void;
  onSend: () => void;
  onBack: () => void;
  resumeContext: string;
}

export const EmailCanvas: React.FC<EmailCanvasProps> = ({ 
  emailBody, 
  recipientEmail,
  subject,
  onUpdate, 
  onUpdateRecipient,
  onUpdateSubject,
  onSend, 
  onBack,
  resumeContext 
}) => {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRefining, setIsRefining] = useState(false);

  const handleRefine = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setIsRefining(true);
    const instruction = chatInput;
    setChatInput('');

    try {
      const refined = await refineEmailWithChat(emailBody, instruction, resumeContext);
      onUpdate(refined);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Email updated!' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Correction failed. Try again.' }]);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Left: Chat Refinement */}
      <div className="w-full lg:w-[400px] border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h4 className="font-bold dark:text-white">Gemini Refiner</h4>
          </div>
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-10 p-6 space-y-4">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                <Wand2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">Try asking for specific changes:</p>
              <ul className="text-xs space-y-2 opacity-70 italic text-left list-disc list-inside">
                <li>"Mention my data visualization projects"</li>
                <li>"Make the tone more enthusiastic"</li>
                <li>"Shorten it for a quick read"</li>
                <li>"Add a specific note about Python proficiency"</li>
              </ul>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                m.role === 'user' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {isRefining && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2 text-sm text-gray-400 flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Polishing email...
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRefine()}
              placeholder="Give instructions to AI..."
              className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-gray-700 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
            />
            <button 
              onClick={handleRefine}
              disabled={isRefining || !chatInput.trim()}
              className="absolute right-2 top-2 p-2 text-indigo-600 hover:text-indigo-700 disabled:text-gray-400"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Email Editor */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 overflow-hidden relative">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 w-full space-y-3">
               <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AtSign className="w-3 h-3 text-gray-400" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recipients</span>
                    </div>
                    <input 
                      type="text" 
                      value={recipientEmail}
                      onChange={(e) => onUpdateRecipient(e.target.value)}
                      placeholder="hr@corp.com, manager@corp.com"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Type className="w-3 h-3 text-gray-400" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Subject</span>
                    </div>
                    <input 
                      type="text" 
                      value={subject}
                      onChange={(e) => onUpdateSubject(e.target.value)}
                      placeholder="Email Subject"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    />
                  </div>
               </div>
            </div>
            <button 
              onClick={onSend}
              disabled={!recipientEmail.trim() || !subject.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              Dispatch Application
            </button>
          </div>
        </div>

        <div className="flex-1 p-8 lg:p-12 overflow-y-auto bg-[#fafafa] dark:bg-gray-900/20">
          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 rounded-3xl min-h-full p-10 flex flex-col">
            <textarea 
              value={emailBody}
              onChange={(e) => onUpdate(e.target.value)}
              className="w-full flex-1 text-lg leading-relaxed text-gray-800 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none resize-none font-serif"
              spellCheck={false}
              placeholder="Your generated application will appear here..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};
