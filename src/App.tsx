import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Flame, CheckCircle, Circle, XCircle, Skull, Brain, Plus, X, TrendingUp, Award, Percent, BarChart3, ChevronLeft, ChevronRight, Lightbulb, Dumbbell, Footprints, Bike, Waves, Utensils, Beer, Candy, Cigarette, Book, HeartPulse, Pen, Briefcase, Coffee } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

enum DayType {
  GREEN_INTENSE = 'GREEN_INTENSE',
  GREEN_LIGHT = 'GREEN_LIGHT',
  NEUTRAL = 'NEUTRAL',
  RED_LIGHT = 'RED_LIGHT',
  RED_INTENSE = 'RED_INTENSE'
}

interface DayEntry {
  date: string;
  type: DayType;
  note: string;
  tags: string[];
  learnedSomething: boolean;
}

interface Stats {
  totalScore: number;
  currentStreak: number;
  longestStreak: number;
  positiveDayPercentage: number;
}

const DAY_CONFIG = {
  [DayType.GREEN_INTENSE]: { label: 'Intensywny', icon: Flame, color: 'bg-emerald-600', hoverColor: 'hover:bg-emerald-700', textColor: 'text-emerald-600', score: 1 },
  [DayType.GREEN_LIGHT]: { label: 'Dobry', icon: CheckCircle, color: 'bg-emerald-400', hoverColor: 'hover:bg-emerald-500', textColor: 'text-emerald-400', score: 1 },
  [DayType.NEUTRAL]: { label: 'Odpoczynek', icon: Circle, color: 'bg-amber-400', hoverColor: 'hover:bg-amber-500', textColor: 'text-amber-400', score: 0 },
  [DayType.RED_LIGHT]: { label: 'Potknięcie', icon: XCircle, color: 'bg-rose-400', hoverColor: 'hover:bg-rose-500', textColor: 'text-rose-400', score: -1 },
  [DayType.RED_INTENSE]: { label: 'Porażka', icon: Skull, color: 'bg-rose-600', hoverColor: 'hover:bg-rose-700', textColor: 'text-rose-600', score: -1 }
};

const PRESET_TAGS = ['Siłownia', 'Bieganie', 'Joga', 'Pływanie', 'Rower', 'Fast Food', 'Alkohol', 'Słodycze', 'Palenie', 'Czytanie', 'Medytacja', 'Dziennik', 'Nauka', 'Praca'];

const TAG_ICONS: Record<string, React.ElementType> = {
  'Siłownia': Dumbbell, 'Bieganie': Footprints, 'Joga': HeartPulse, 'Pływanie': Waves, 'Rower': Bike, 'Fast Food': Utensils, 'Alkohol': Beer, 'Słodycze': Candy, 'Palenie': Cigarette, 'Czytanie': Book, 'Medytacja': Brain, 'Dziennik': Pen, 'Nauka': Book, 'Praca': Briefcase, 'Kawa': Coffee
};

const CHART_COLORS = {
  [DayType.GREEN_INTENSE]: '#059669', [DayType.GREEN_LIGHT]: '#34d399', [DayType.NEUTRAL]: '#fbbf24', [DayType.RED_LIGHT]: '#fb7185', [DayType.RED_INTENSE]: '#dc2626'
};

const SUPABASE_URL = 'https://iifwbonrnitlmqcwzrot.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpZndib25ybml0bG1xY3d6cm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTYzMTgsImV4cCI6MjA4MTM5MjMxOH0.W0PSihnIM3tStHH4IrFRJJDYHNYrJW6quydp8T80oZQ';

const StorageService = {
  supabaseEnabled: SUPABASE_URL !== 'TWOJ_PROJECT_URL' && SUPABASE_KEY !== 'TWOJ_ANON_KEY',
  userId: null as string | null,
  async init() {
    if (!this.supabaseEnabled) { console.warn('Supabase nie skonfigurowany - używam localStorage'); return; }
    let userId = localStorage.getItem('habitforged_user_id');
    if (!userId) { userId = 'user_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('habitforged_user_id', userId); }
    this.userId = userId;
  },
  async loadEntries(): Promise<Record<string, DayEntry>> {
    if (!this.supabaseEnabled) {
      try { const data = localStorage.getItem('habitforged_data'); return data ? JSON.parse(data) : {}; } catch (error) { console.error('Failed to load from localStorage:', error); return {}; }
    }
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/entries?user_id=eq.${this.userId}`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      const entries: Record<string, DayEntry> = {};
      data.forEach((row: any) => { entries[row.date] = { date: row.date, type: row.type, note: row.note || '', tags: row.tags || [], learnedSomething: row.learned_something || false }; });
      return entries;
    } catch (error) { console.error('Failed to load from Supabase:', error); return {}; }
  },
  async saveEntry(entry: DayEntry): Promise<void> {
    if (!this.supabaseEnabled) {
      try { const data = localStorage.getItem('habitforged_data'); const entries = data ? JSON.parse(data) : {}; entries[entry.date] = entry; localStorage.setItem('habitforged_data', JSON.stringify(entries)); } catch (error) { console.error('Failed to save to localStorage:', error); }
      return;
    }
    try {
      const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/entries?user_id=eq.${this.userId}&date=eq.${entry.date}`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
      const existing = await checkResponse.json();
      const payload = { user_id: this.userId, date: entry.date, type: entry.type, note: entry.note, tags: entry.tags, learned_something: entry.learnedSomething };
      if (existing.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/entries?user_id=eq.${this.userId}&date=eq.${entry.date}`, { method: 'PATCH', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(payload) });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/entries`, { method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(payload) });
      }
    } catch (error) { console.error('Failed to save to Supabase:', error); }
  }
};

const DateUtils = {
  formatDate(date: Date): string { return date.toISOString().split('T')[0]; },
  parseDate(dateStr: string): Date { return new Date(dateStr + 'T00:00:00'); },
  isToday(dateStr: string): boolean { return dateStr === this.formatDate(new Date()); },
  isFuture(dateStr: string): boolean { const today = new Date(); today.setHours(0, 0, 0, 0); const checkDate = this.parseDate(dateStr); return checkDate > today; },
  getDaysInMonth(year: number, month: number): number { return new Date(year, month + 1, 0).getDate(); },
  getFirstDayOfMonth(year: number, month: number): number { return new Date(year, month, 1).getDay(); }
};

const StatsCalculator = {
  calculateStats(entries: Record<string, DayEntry>): Stats {
    const entryArray = Object.values(entries).sort((a, b) => a.date.localeCompare(b.date));
    let totalScore = 0, currentStreak = 0, longestStreak = 0, tempStreak = 0, positiveCount = 0;
    const today = DateUtils.formatDate(new Date());
    let streakActive = true;
    for (let i = entryArray.length - 1; i >= 0; i--) {
      const entry = entryArray[i];
      const config = DAY_CONFIG[entry.type];
      totalScore += config.score;
      if (config.score >= 0) {
        positiveCount++; tempStreak++;
        if (streakActive && entry.date <= today) { currentStreak++; }
      } else {
        if (streakActive && entry.date <= today) { streakActive = false; }
        longestStreak = Math.max(longestStreak, tempStreak); tempStreak = 0;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    const positiveDayPercentage = entryArray.length > 0 ? Math.round((positiveCount / entryArray.length) * 100) : 0;
    return { totalScore, currentStreak, longestStreak, positiveDayPercentage };
  },
  getDistribution(entries: Record<string, DayEntry>) {
    const counts: Record<DayType, number> = { [DayType.GREEN_INTENSE]: 0, [DayType.GREEN_LIGHT]: 0, [DayType.NEUTRAL]: 0, [DayType.RED_LIGHT]: 0, [DayType.RED_INTENSE]: 0 };
    Object.values(entries).forEach(entry => { counts[entry.type]++; });
    return Object.entries(counts).filter(([_, value]) => value > 0).map(([type, value]) => ({ name: DAY_CONFIG[type as DayType].label, value, color: CHART_COLORS[type as DayType] }));
  }
};

const EditModal: React.FC<{ date: string; entry: DayEntry | null; onSave: (entry: DayEntry) => void; onClose: () => void; }> = ({ date, entry, onSave, onClose }) => {
  const [type, setType] = useState<DayType>(entry?.type || DayType.NEUTRAL);
  const [note, setNote] = useState(entry?.note || '');
  const [tags, setTags] = useState<string[]>(entry?.tags || []);
  const [learnedSomething, setLearnedSomething] = useState(entry?.learnedSomething || false);
  const [customTag, setCustomTag] = useState('');
  const handleSave = () => { onSave({ date, type, note, tags, learnedSomething }); };
  const addCustomTag = () => { if (customTag.trim() && !tags.includes(customTag.trim())) { setTags([...tags, customTag.trim()]); setCustomTag(''); } };
  const removeTag = (tag: string) => { setTags(tags.filter(t => t !== tag)); };
  const togglePresetTag = (tag: string) => { if (tags.includes(tag)) { removeTag(tag); } else { setTags([...tags, tag]); } };
  return (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"><div className="p-6"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800">Edytuj Dzień - {date}</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button></div><div className="mb-6"><label className="block text-sm font-semibold text-gray-700 mb-3">Typ Dnia</label><div className="grid grid-cols-5 gap-2">{Object.entries(DAY_CONFIG).map(([key, config]) => { const Icon = config.icon; const isSelected = type === key; return (<button key={key} onClick={() => setType(key as DayType)} className={`p-3 rounded-lg border-2 transition-all ${isSelected ? `${config.color} border-gray-800 text-white` : 'bg-gray-100 border-gray-200 hover:border-gray-300'}`}><Icon size={24} className="mx-auto mb-1" /><div className="text-xs font-medium">{config.label}</div></button>); })}</div></div><div className="mb-6"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={learnedSomething} onChange={(e) => setLearnedSomething(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500" /><span className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Brain size={20} className="text-indigo-600" />Nauczyłem się czegoś dzisiaj</span></label></div><div className="mb-6"><label className="block text-sm font-semibold text-gray-700 mb-3">Tagi</label><div className="flex flex-wrap gap-2 mb-3">{PRESET_TAGS.map(tag => (<button key={tag} onClick={() => togglePresetTag(tag)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${tags.includes(tag) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{tag}</button>))}</div><div className="flex gap-2"><input type="text" value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addCustomTag()} placeholder="Dodaj własny tag..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" /><button onClick={addCustomTag} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><Plus size={20} /></button></div>{tags.length > 0 && (<div className="mt-3 flex flex-wrap gap-2">{tags.map(tag => (<span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">{tag}<button onClick={() => removeTag(tag)} className="hover:text-indigo-900"><X size={14} /></button></span>))}</div>)}</div><div className="mb-6"><label className="block text-sm font-semibold text-gray-700 mb-3">Notatka</label><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Jak minął Twój dzień? Co udało Ci się osiągnąć?" rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" /></div><div className="flex gap-3"><button onClick={handleSave} className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">Zapisz</button><button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Anuluj</button></div></div></div></div>);
};

const StatsCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; color: string; }> = ({ icon: Icon, label, value, color }) => (<div className="bg-white rounded-xl shadow-md p-6 border-l-4" style={{ borderColor: color }}><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600 mb-1">{label}</p><p className="text-3xl font-bold text-gray-800">{value}</p></div><Icon size={40} style={{ color }} /></div></div>);

const CalendarView: React.FC<{ year: number; month: number; entries: Record<string, DayEntry>; onDayClick: (date: string) => void; }> = ({ year, month, entries, onDayClick }) => {
  const daysInMonth = DateUtils.getDaysInMonth(year, month);
  const firstDay = DateUtils.getFirstDayOfMonth(year, month);
  const today = DateUtils.formatDate(new Date());
  const days = [];
  for (let i = 0; i < firstDay; i++) { days.push(<div key={`empty-${i}`} className="aspect-square" />); }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = DateUtils.formatDate(new Date(year, month, day));
    const entry = entries[date];
    const isFuture = DateUtils.isFuture(date);
    const isCurrentDay = DateUtils.isToday(date);
    const config = entry ? DAY_CONFIG[entry.type] : null;
    const Icon = config?.icon;
    days.push(<button key={date} onClick={() => !isFuture && onDayClick(date)} disabled={isFuture} className={`aspect-square rounded-lg border-2 transition-all relative ${isCurrentDay ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-gray-200'} ${isFuture ? 'bg-gray-100 cursor-not-allowed opacity-50' : entry ? `${config.color} ${config.hoverColor} text-white cursor-pointer` : 'bg-white hover:bg-gray-50 cursor-pointer'}`}><div className="absolute top-1 left-2 text-xs font-bold">{day}</div>{entry && Icon && (<div className="flex items-center justify-center h-full"><Icon size={24} /></div>)}{entry?.learnedSomething && (<div className="absolute top-1 right-1 bg-yellow-400 rounded-full p-1"><Lightbulb size={16} className="text-yellow-900" fill="currentColor" /></div>)}{entry?.tags && entry.tags.length > 0 && (<div className="absolute bottom-1 left-1 right-1 flex justify-center gap-1 flex-wrap">{entry.tags.slice(0, 3).map((tag, idx) => { const TagIcon = TAG_ICONS[tag]; if (!TagIcon) return null; return (<div key={idx} className="bg-white/90 rounded-full p-1" title={tag}><TagIcon size={14} className="text-gray-700" /></div>); })}{entry.tags.length > 3 && (<div className="bg-white/90 rounded-full px-1.5 py-0.5" title={`+${entry.tags.length - 3} więcej`}><span className="text-[10px] font-bold text-gray-700">+{entry.tags.length - 3}</span></div>)}</div>)}</button>);
  }
  return (<div className="bg-white rounded-xl shadow-md p-6"><div className="grid grid-cols-7 gap-2 mb-2">{['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'].map(day => (<div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">{day}</div>))}</div><div className="grid grid-cols-7 gap-2">{days}</div></div>);
};

const App: React.FC = () => {
  const [entries, setEntries] = useState<Record<string, DayEntry>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  useEffect(() => { const loadData = async () => { await StorageService.init(); const data = await StorageService.loadEntries(); setEntries(data); setLoading(false); }; loadData(); }, []);
  const stats = useMemo(() => StatsCalculator.calculateStats(entries), [entries]);
  const distribution = useMemo(() => StatsCalculator.getDistribution(entries), [entries]);
  const handleSaveEntry = async (entry: DayEntry) => { const updatedEntries = { ...entries, [entry.date]: entry }; setEntries(updatedEntries); await StorageService.saveEntry(entry); setSelectedDate(null); };
  const handlePrevMonth = () => { setCurrentDate(new Date(currentYear, currentMonth - 1, 1)); };
  const handleNextMonth = () => { const today = new Date(); if (currentYear < today.getFullYear() || (currentYear === today.getFullYear() && currentMonth < today.getMonth())) { setCurrentDate(new Date(currentYear, currentMonth + 1, 1)); } };
  const monthName = currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  const canGoNext = () => { const today = new Date(); return currentYear < today.getFullYear() || (currentYear === today.getFullYear() && currentMonth < today.getMonth()); };
  return (<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50"><div className="max-w-7xl mx-auto p-6"><div className="mb-8"><h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3"><Calendar className="text-indigo-600" size={40} />HabitForged{StorageService.supabaseEnabled && (<span className="text-sm font-normal text-green-600 flex items-center gap-1">☁️ Synchronizacja włączona</span>)}</h1><p className="text-gray-600">Śledź swoje postępy, buduj pozytywne serie, wykuwaj lepsze nawyki</p></div>{loading ? (<div className="flex items-center justify-center h-64"><div className="text-gray-600 text-xl">Ładowanie danych...</div></div>) : (<><div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8"><StatsCard icon={TrendingUp} label="Całkowity Wynik" value={stats.totalScore} color="#4f46e5" /><StatsCard icon={Flame} label="Aktualna Seria" value={`${stats.currentStreak} dni`} color="#f59e0b" /><StatsCard icon={Award} label="Najdłuższa Seria" value={`${stats.longestStreak} dni`} color="#10b981" /><StatsCard icon={Percent} label="Pozytywne Dni" value={`${stats.positiveDayPercentage}%`} color="#8b5cf6" /></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"><div className="lg:col-span-2"><div className="flex items-center justify-between mb-4"><button onClick={handlePrevMonth} className="p-2 rounded-lg bg-white shadow hover:bg-gray-50 transition-colors"><ChevronLeft size={24} /></button><h2 className="text-2xl font-bold text-gray-800">{monthName}</h2><button onClick={handleNextMonth} disabled={!canGoNext()} className={`p-2 rounded-lg bg-white shadow transition-colors ${canGoNext() ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}><ChevronRight size={24} /></button></div><CalendarView year={currentYear} month={currentMonth} entries={entries} onDayClick={setSelectedDate} /></div><div className="bg-white rounded-xl shadow-md p-6"><h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={24} className="text-indigo-600" />Rozkład</h3>{distribution.length > 0 ? (<ResponsiveContainer width="100%" height={300}><PieChart><Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{distribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>) : (<div className="flex items-center justify-center h-64 text-gray-400"><p>Brak danych. Zacznij śledzić!</p></div>)}</div></div>{selectedDate && (<EditModal date={selectedDate} entry={entries[selectedDate] || null} onSave={handleSaveEntry} onClose={() => setSelectedDate(null)} />)}</>)}</div></div>);
};

export default App;