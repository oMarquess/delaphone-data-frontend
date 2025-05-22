'use client';

import React, { useState } from 'react';
import { DatePicker, ConfigProvider, theme, Button, Space, Popover } from 'antd';
import type { DatePickerProps, GetProps } from 'antd';
import { useTheme } from 'next-themes';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { CalendarClock, Filter } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

type RangePickerProps = GetProps<typeof DatePicker.RangePicker>;

const { RangePicker } = DatePicker;

interface DateRangePickerProps {
  onChange?: (value: RangePickerProps['value'], dateString: [string, string]) => void;
  onOk?: (value: DatePickerProps['value'] | RangePickerProps['value']) => void;
  startDate?: string;
  endDate?: string;
  defaultValue?: [string, string];
}

const datePresets = [
  { label: 'Today', getValue: () => {
    const today = new Date();
    return {
      startDate: format(startOfDay(today), 'yyyy-MM-dd'),
      endDate: format(endOfDay(today), 'yyyy-MM-dd')
    };
  }},
  { label: 'Yesterday', getValue: () => {
    const yesterday = subDays(new Date(), 1);
    return {
      startDate: format(startOfDay(yesterday), 'yyyy-MM-dd'),
      endDate: format(endOfDay(yesterday), 'yyyy-MM-dd')
    };
  }},
  { label: 'Last 7 Days', getValue: () => {
    const end = new Date();
    const start = subDays(end, 6);
    return {
      startDate: format(startOfDay(start), 'yyyy-MM-dd'),
      endDate: format(endOfDay(end), 'yyyy-MM-dd')
    };
  }},
  { label: 'Last 30 Days', getValue: () => {
    const end = new Date();
    const start = subDays(end, 29);
    return {
      startDate: format(startOfDay(start), 'yyyy-MM-dd'),
      endDate: format(endOfDay(end), 'yyyy-MM-dd')
    };
  }},
  { label: 'This Month', getValue: () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      startDate: format(startOfDay(start), 'yyyy-MM-dd'),
      endDate: format(endOfDay(end), 'yyyy-MM-dd')
    };
  }},
  { label: 'Last Month', getValue: () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return {
      startDate: format(startOfDay(start), 'yyyy-MM-dd'),
      endDate: format(endOfDay(end), 'yyyy-MM-dd')
    };
  }}
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  onChange, 
  onOk, 
  startDate, 
  endDate,
  defaultValue 
}) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const [localDateRange, setLocalDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(() => {
    if (startDate && endDate) {
      return [dayjs(startDate), dayjs(endDate)];
    }
    if (defaultValue) {
      return [dayjs(defaultValue[0]), dayjs(defaultValue[1])];
    }
    // Default to Today
    const today = new Date();
    return [dayjs(startOfDay(today)), dayjs(endOfDay(today))];
  });
  const [presetOpen, setPresetOpen] = useState(false);
  
  // Disable future dates
  const disabledDate = (current: Dayjs) => {
    return current && current > dayjs().endOf('day');
  };

  const handlePresetSelect = (preset: typeof datePresets[0]) => {
    const { startDate, endDate } = preset.getValue();
    const newRange: [Dayjs, Dayjs] = [dayjs(startDate), dayjs(endDate)];
    setLocalDateRange(newRange);
    if (onChange) {
      onChange(newRange, [startDate, endDate]);
    }
    setPresetOpen(false);
  };

  const handleApplyFilter = () => {
    if (localDateRange && localDateRange[0] && localDateRange[1]) {
      const startDate = format(localDateRange[0].toDate(), 'yyyy-MM-dd');
      const endDate = format(localDateRange[1].toDate(), 'yyyy-MM-dd');
      if (onChange) {
        onChange(localDateRange, [startDate, endDate]);
      }
    }
  };

  const presetContent = (
    <div className="p-2 space-y-1 w-[160px]">
      {datePresets.map((preset) => (
        <button
          key={preset.label}
          onClick={() => handlePresetSelect(preset)}
          className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        components: {
          DatePicker: isDarkMode ? {
            colorBgContainer: '#1f2937',
            colorText: '#f3f4f6',
            colorBorder: '#374151',
            colorPrimary: '#3b82f6',
          } : undefined,
        },
      }}
    >
      <Space.Compact className="w-full">
        <Popover
          content={presetContent}
          trigger="click"
          placement="bottomLeft"
          open={presetOpen}
          onOpenChange={setPresetOpen}
        >
          <Button
            icon={<CalendarClock size={16} />}
            className="flex items-center justify-center"
          />
        </Popover>
        <RangePicker
          format="YYYY-MM-DD"
          onChange={(dates) => {
            setLocalDateRange(dates);
          }}
          value={localDateRange}
          style={{ width: '100%' }}
          disabledDate={disabledDate}
        />
        <Button
          type="primary"
          icon={<Filter size={16} />}
          onClick={handleApplyFilter}
          className="flex items-center justify-center"
        />
      </Space.Compact>
    </ConfigProvider>
  );
}; 