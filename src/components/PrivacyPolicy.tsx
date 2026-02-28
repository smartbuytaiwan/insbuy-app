import React from 'react';
import { SiteSettings } from '../types';

const PrivacyPolicy = ({ siteSettings }: { siteSettings: SiteSettings }) => {
  return (
    <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm max-w-4xl mx-auto my-4 min-h-[70vh] animate-fade-in-up">
      <h2 className="text-3xl font-black mb-8 text-slate-800 border-b pb-4">隱私權政策 (Privacy Policy)</h2>
      <div className="whitespace-pre-wrap text-slate-600 leading-relaxed font-sans">
        {siteSettings.privacyPolicy || '目前尚無內容。'}
      </div>
    </div>
  );
};

export default PrivacyPolicy;