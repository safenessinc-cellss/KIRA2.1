const fs = require('fs');
let content = fs.readFileSync('src/pages/Landing.tsx', 'utf-8');

// Theme updates for Coach modal
content = content.replace('text-slate-800 mb-4 px-1 uppercase tracking-widest text-slate-400">Contenido Destacado', 'text-white mb-4 px-1 uppercase tracking-widest text-slate-400">Contenido Destacado');
content = content.replace("color = 'text-indigo-500'", "color = 'text-kiragold'");
content = content.replace("bg = 'bg-indigo-50'", "bg = 'bg-slate-800'");
content = content.replace("color = 'text-rose-500'; bg = 'bg-rose-50';", "color = 'text-rose-400'; bg = 'bg-slate-800';");
content = content.replace("color = 'text-sky-500'; bg = 'bg-sky-50';", "color = 'text-sky-400'; bg = 'bg-slate-800';");

content = content.replace('border-dashed border-slate-200 bg-slate-50/50', 'border-dashed border-slate-700 bg-slate-800/50');
content = content.replace('bg-slate-200 text-slate-400 flex items-center justify-center', 'bg-slate-800 text-slate-500 flex items-center justify-center');
content = content.replace('text-[13px] font-bold text-slate-400 truncate', 'text-[13px] font-bold text-slate-300 truncate');

content = content.replace('border-slate-100 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-100/50', 'border-slate-700 hover:border-kirateal hover:bg-slate-800 hover:shadow-kirateal/10');
content = content.replace('text-[13px] font-bold text-slate-800 truncate', 'text-[13px] font-bold text-slate-200 truncate');

content = content.replace('text-sm font-bold text-slate-800 mb-4 px-1 uppercase tracking-widest text-slate-400 flex items-center gap-2', 'text-sm font-bold text-white mb-4 px-1 uppercase tracking-widest flex items-center gap-2 text-slate-400');

content = content.replace('grid grid-cols-3 gap-1 grid-flow-row', 'grid grid-cols-3 gap-1 grid-flow-row rounded-xl overflow-hidden border border-slate-700/50');
content = content.replace('bg-slate-100 overflow-hidden group cursor-pointer border border-slate-200/50', 'bg-slate-800 overflow-hidden group cursor-pointer');

fs.writeFileSync('src/pages/Landing.tsx', content);
