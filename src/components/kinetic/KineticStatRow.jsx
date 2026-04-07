import { Card, CardContent } from '@/components/ui/card';

export default function KineticStatRow({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {stats.map(s => (
        <Card key={s.label} className="bg-white/5 border-white/10">
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center gap-2">
              <s.icon className={`w-4 h-4 ${s.color} flex-shrink-0`} />
              <div className="min-w-0">
                <p className={`text-lg font-bold ${s.color} leading-tight`}>{s.value}</p>
                <p className="text-white/40 text-[10px] truncate">{s.label}</p>
                {s.sub && <p className="text-white/25 text-[9px] truncate">{s.sub}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}