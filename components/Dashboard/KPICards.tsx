import React from 'react';
import { CheckCircle2, Circle, Clock, Layers } from 'lucide-react';

interface KPICardsProps {
  completed: number;
  inProgress: number;
  planned: number;
}

export const KPICards: React.FC<KPICardsProps> = ({ completed, inProgress, planned }) => {
  const total = completed + inProgress + planned;

  const cards = [
    { label: "Bajarildi", count: completed, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
    { label: "Jarayonda", count: inProgress, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
    { label: "Rejada", count: planned, icon: Circle, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Jami Vazifalar", count: total, icon: Layers, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-100" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className={`bg-white rounded-lg p-4 shadow-sm border ${card.border} flex items-center justify-between`}>
             <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.count}</p>
             </div>
             <div className={`p-3 rounded-full ${card.bg} ${card.color}`}>
                <Icon size={24} />
             </div>
          </div>
        )
      })}
    </div>
  );
};
