"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

interface BarChartData {
  name: string;
  count?: number;
  avgMinutes?: number;
  minutes?: number;
  hours?: number;
}

export function CallsByTypeChart({ data }: { data: BarChartData[] }) {
  if (data.length === 0) {
    return <EmptyChart message="No call data for this period" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CallsByUnitChart({ data }: { data: BarChartData[] }) {
  if (data.length === 0) {
    return <EmptyChart message="No call data for this period" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CallsByHourChart({ data }: { data: { hour: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AvgDurationChart({ data }: { data: BarChartData[] }) {
  if (data.length === 0) {
    return <EmptyChart message="No duration data for this period" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 12 }} unit=" min" />
        <Tooltip formatter={(value) => [`${value} min`, "Avg duration"]} />
        <Bar dataKey="avgMinutes" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OutcomesChart({ data }: { data: BarChartData[] }) {
  if (data.length === 0) {
    return <EmptyChart message="No outcome data for this period" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) =>
            `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
          }
          labelLine={false}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TeamTimeChart({ data }: { data: { date: string; hours: number }[] }) {
  if (data.length === 0) {
    return <EmptyChart message="No team time data for this period" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 12 }} unit=" h" />
        <Tooltip formatter={(value) => [`${value} hrs`, "Team time"]} />
        <Line
          type="monotone"
          dataKey="hours"
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          dot={{ fill: CHART_COLORS[0], r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center text-muted text-sm">{message}</div>
  );
}
