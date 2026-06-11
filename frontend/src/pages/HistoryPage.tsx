import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar } from 'lucide-react';

const data = [
  { date: 'Jun 1', score: 68 },
  { date: 'Jun 5', score: 72 },
  { date: 'Jun 10', score: 75 },
  { date: 'Jun 15', score: 79 },
  { date: 'Jun 20', score: 82 },
];

const historyList = [
  { id: 1, date: 'June 20, 2026', time: '08:30 AM', score: 82 },
  { id: 2, date: 'June 15, 2026', time: '09:15 AM', score: 79 },
  { id: 3, date: 'June 10, 2026', time: '07:45 AM', score: 75 },
];

export default function HistoryPage() {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-8 pt-4 tracking-tight">Progress Tracking</h2>
      
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-10">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Last 30 Days</h3>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dy={10} fontWeight={600} />
              <YAxis domain={['auto', 100]} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} fontWeight={600} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '10px 16px' }}
                itemStyle={{ color: '#0ea5e9', fontWeight: '800', fontSize: '16px' }}
                labelStyle={{ color: '#6b7280', fontWeight: '600', marginBottom: '4px', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={4} dot={{ fill: '#0ea5e9', strokeWidth: 3, r: 5, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">Past Scans</h3>
      <div className="space-y-3">
        {historyList.map(item => (
          <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:border-sky-200 transition-colors">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-base">{item.date}</h4>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{item.time}</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="text-xl font-extrabold text-sky-500">{item.score}</div>
              <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Score</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
