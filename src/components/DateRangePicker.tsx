'use client';

import React from 'react';
import { DatePicker, ConfigProvider, theme } from 'antd';
import type { DatePickerProps, GetProps } from 'antd';
import { useTheme } from 'next-themes';

type RangePickerProps = GetProps<typeof DatePicker.RangePicker>;

const { RangePicker } = DatePicker;

interface DateRangePickerProps {
  onChange?: (value: RangePickerProps['value'], dateString: [string, string]) => void;
  onOk?: (value: DatePickerProps['value'] | RangePickerProps['value']) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ onChange, onOk }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        components: {
          DatePicker: isDarkMode ? {
            colorBgContainer: '#1f2937', // dark:bg-gray-800
            colorText: '#f3f4f6', // text-gray-100
            colorBorder: '#374151', // border-gray-700
            colorPrimary: '#3b82f6', // blue-500
          } : undefined,
        },
      }}
    >
      <RangePicker
        // showTime={{ format: 'HH:mm' }}
        format="YYYY-MM-DD"
        onChange={onChange}
        onOk={onOk}
      />
    </ConfigProvider>
  );
}; 