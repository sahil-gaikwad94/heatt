'use client';
import * as React from 'react';
import { TopBar } from '@/components/shell/Shell';
import { HeatDashboard } from '@/components/heat/Heatmap';

export default function HeatmapPage() {
  return (
    <div className="mx-auto w-full max-w-[980px] pt-1">
      <TopBar title="Heat dashboard" sub="your thermal ledger" />
      <div className="pt-2 pb-8">
        <HeatDashboard />
      </div>
    </div>
  );
}
