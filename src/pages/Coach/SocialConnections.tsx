import React from 'react';
import { Instagram, Linkedin, Twitter, Sparkles } from 'lucide-react';

interface SocialConnectionsProps {
  socialLinks: {
    instagram: string;
    linkedin: string;
    twitter: string;
  };
  onChange: (links: any) => void;
}

export function SocialConnections({ socialLinks, onChange }: SocialConnectionsProps) {
  const handleLinkChange = (field: string, value: string) => {
    onChange({
      ...socialLinks,
      [field]: value
    });
  };

  return (
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
        <Sparkles size={14} className="text-pink-500" /> Presencia Digital y Redes
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Instagram</label>
          <div className="relative">
            <Instagram size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" />
            <input 
              type="text"
              value={socialLinks?.instagram || ''}
              onChange={e => handleLinkChange('instagram', e.target.value)}
              placeholder="@usuario"
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 transition-all"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase px-1">LinkedIn</label>
          <div className="relative">
            <Linkedin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
            <input 
              type="url"
              value={socialLinks?.linkedin || ''}
              onChange={e => handleLinkChange('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/usuario"
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Twitter (X)</label>
          <div className="relative">
            <Twitter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800" />
            <input 
              type="text"
              value={socialLinks?.twitter || ''}
              onChange={e => handleLinkChange('twitter', e.target.value)}
              placeholder="@usuario"
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-slate-800/10 focus:border-slate-800 transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
