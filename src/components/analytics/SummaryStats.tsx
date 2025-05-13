'use client';

import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { PhoneOutlined, UserOutlined, ClockCircleOutlined, BarChartOutlined } from '@ant-design/icons';

interface SummaryStatsProps {
  data: {
    total_callers: number;
    total_calls: number;
    total_duration: number;
    avg_calls_per_caller: number;
  };
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({ data }) => {
  // Format duration from seconds to minutes
  const formatDuration = (seconds: number) => {
    return (seconds / 60).toFixed(2);
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <Card className="h-full">
          <Statistic
            title="Total Calls"
            value={data.total_calls}
            prefix={<PhoneOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card className="h-full">
          <Statistic
            title="Total Callers"
            value={data.total_callers}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card className="h-full">
          <Statistic
            title="Total Duration (min)"
            value={formatDuration(data.total_duration)}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card className="h-full">
          <Statistic
            title="Avg Calls/Caller"
            value={data.avg_calls_per_caller.toFixed(2)}
            prefix={<BarChartOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
    </Row>
  );
}; 