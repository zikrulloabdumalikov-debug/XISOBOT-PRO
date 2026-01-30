import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { formatRangeDisplay, getPresetRange, PresetType, formatDateISO } from '../../utils/dateUtils';

interface PeriodPickerProps {
  startDate: Date;
  endDate: Date;
  selectedPreset: PresetType;
  onChange: (range: { start: Date; end: Date; preset: PresetType }) => void;
}

const PRESETS: { id: PresetType; label: string }[] = [
    { id: 'all', label: 'Filtrsiz' },
    { id: 'today', label: 'Bugun' },
    { id: 'yesterday', label: 'Kecha' },
    { id: 'thisMonth', label: 'Joriy oy' },
    { id: 'prevMonth', label: "O'tgan oy" },
    { id: 'thisWeek', label: 'Joriy hafta' },
    { id: 'prevWeek', label: "O'tgan hafta" },
    { id: 'q1', label: '1-chorak' },
    { id: 'q2', label: '2-chorak' },
    { id: 'q3', label: '3-chorak' },
    { id: 'q4', label: '4-chorak' },
    { id: 'half1', label: '1-yarim yillik' },
    { id: 'half2', label: '2-yarim yillik' },
    { id: 'thisYear', label: 'Joriy yil' },
    { id: 'prevYear', label: "O'tgan yil" },
    { id: 'custom', label: 'Boshqa davr' },
];

export const WeekPicker: React.FC<PeriodPickerProps> = ({ 
  startDate, 
  endDate, 
  selectedPreset,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // For custom date inputs
  const [customStart, setCustomStart] = useState(formatDateISO(startDate));
  const [customEnd, setCustomEnd] = useState(formatDateISO(endDate));

  // Sync custom inputs if props change externally
  useEffect(() => {
    setCustomStart(formatDateISO(startDate));
    setCustomEnd(formatDateISO(endDate));
  }, [startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetSelect = (preset: PresetType) => {
    if (preset === 'custom') {
        // Just switch mode, don't change dates yet (or keep current)
        onChange({ start: startDate, end: endDate, preset: 'custom' });
        setIsOpen(false);
        return;
    }
    const range = getPresetRange(preset);
    onChange({ ...range, preset });
    setIsOpen(false);
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
     if (!value) return;
     const newStartStr = type === 'start' ? value : customStart;
     const newEndStr = type === 'end' ? value : customEnd;
     
     setCustomStart(newStartStr);
     setCustomEnd(newEndStr);

     onChange({
        start: new Date(newStartStr),
        end: new Date(newEndStr),
        preset: 'custom'
     });
  };

  const currentLabel = PRESETS.find(p => p.id === selectedPreset)?.label || 'Boshqa davr';

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left Side: Display Range */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="bg-teal-50 p-2 rounded-full text-teal-700">
                <Calendar size={20} />
            </div>
            <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium">Davr ({currentLabel})</p>
                {selectedPreset === 'custom' ? (
                   <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="date" 
                        value={customStart}
                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-teal-500 focus:border-teal-500"
                      />
                      <span className="text-gray-400">-</span>
                      <input 
                        type="date" 
                        value={customEnd}
                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-teal-500 focus:border-teal-500"
                      />
                   </div>
                ) : (
                    <p className="text-lg font-bold text-gray-800">
                        {formatRangeDisplay(startDate, endDate)}
                    </p>
                )}
            </div>
        </div>

        {/* Right Side: Dropdown Trigger */}
        <div className="relative w-full md:w-64" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-teal-500/20"
            >
                <span className="font-medium">{currentLabel}</span>
                <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => handlePresetSelect(preset.id)}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors
                                    ${selectedPreset === preset.id ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'}
                                    ${preset.id === 'custom' ? 'border-t border-gray-100 mt-1' : ''}
                                `}
                            >
                                {preset.label}
                                {selectedPreset === preset.id && <Check size={16} className="text-teal-600" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};