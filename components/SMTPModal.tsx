
import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Info, ShieldCheck } from 'lucide-react';
import { SmtpConfig } from '../types';

interface SMTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SmtpConfig;
  onSave: (config: SmtpConfig) => void;
}

export const SMTPModal: React.FC<SMTPModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [email, setEmail] = useState(config.email || '');
  const [appPassword, setAppPassword] = useState(config.appPassword || '');

  useEffect(() => {
    if (isOpen) {
      setEmail(config.email || '');
      setAppPassword(config.appPassword || '');
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      email,
      appPassword,
      isConfigured: email.trim() !== '' && appPassword.trim() !== ''
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-8 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
             <ShieldCheck className="w-6 h-6 text-indigo-600" />
             <h3 className="text-2xl font-bold dark:text-white">Gateway Config</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl flex gap-4 border border-indigo-100 dark:border-indigo-800">
            <Info className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-sm text-indigo-900 dark:text-indigo-300">
              <p className="font-bold mb-1">Google App Password Required</p>
              <p className="opacity-80">You cannot use your standard Google password. You must generate a 16-character App Password in your Google Account Security settings.</p>
              <a 
                href="https://myaccount.google.com/apppasswords" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-3 font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-widest text-[10px]"
              >
                Launch Google Settings <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 pl-1">Sender Gmail</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none font-bold"
                placeholder="your.email@gmail.com"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 pl-1">Google App Password</label>
              <input 
                type="password" 
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none font-bold tracking-widest"
                placeholder="xxxx xxxx xxxx xxxx"
              />
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50 dark:bg-gray-900/50 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-4 rounded-2xl text-gray-400 font-bold hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex-[2] px-4 py-4 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
          >
            Authorize Connection
          </button>
        </div>
      </div>
    </div>
  );
};
