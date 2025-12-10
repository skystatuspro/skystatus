import React from 'react';

interface MonthPickerProps {
  value: string; // Format: YYYY-MM
  onChange: (value: string) => void;
  compact?: boolean;
}

const MONTHS_NL = [
  'Januari',
  'Februari',
  'Maart',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Augustus',
  'September',
  'Oktober',
  'November',
  'December',
];

export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  // Parse YYYY-MM safely
  const [yearStr, monthStr] = (value || '').split('-');

  const currentYear = parseInt(yearStr, 10) || new Date().getFullYear();
  const currentMonth = parseInt(monthStr, 10) || new Date().getMonth() + 1;

  // Year range: 2020 - 2040
  const years = Array.from({ length: 21 }, (_, i) => 2020 + i);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    onChange(`${currentYear}-${newMonth.toString().padStart(2, '0')}`);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    onChange(`${newYear}-${currentMonth.toString().padStart(2, '0')}`);
  };

  const selectBase =
    'bg-transparent cursor-pointer focus:outline-none appearance-none hover:text-brand-600 transition-colors text-center';
  const textBase = compact
    ? 'text-xs font-medium text-slate-600'
    : 'text-sm font-bold text-slate-700';

  return (
    <div className={`flex items-center ${compact ? 'gap-0.5' : 'gap-1'}`}>
      <div className="relative">
        <select
          value={currentMonth}
          onChange={handleMonthChange}
          className={`${selectBase} ${textBase} ${
            compact ? 'py-0 px-0.5' : 'py-1'
          }`}
        >
          {MONTHS_NL.map((m, i) => (
            <option key={i} value={i + 1}>
              {compact ? m.substring(0, 3) : m}
            </option>
          ))}
        </select>
      </div>

      <span
        className={`${
          compact ? 'text-[10px]' : 'text-xs'
        } text-slate-300 select-none`}
      >
        /
      </span>

      <div className="relative">
        <select
          value={currentYear}
          onChange={handleYearChange}
          className={`${selectBase} ${textBase} ${
            compact ? 'py-0 px-0.5' : 'py-1'
          }`}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
