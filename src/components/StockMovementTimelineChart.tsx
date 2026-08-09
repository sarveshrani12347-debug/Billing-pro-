import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Calendar, 
  Layers, Filter, RefreshCw, BarChart2, LineChart, Activity, 
  Clock, FileText, CheckCircle2, ChevronRight, Info, Search, Download
} from 'lucide-react';
import { Item, StockTransaction } from '../types';

interface DailyMovementData {
  dateStr: string; // YYYY-MM-DD
  date: Date;
  inflow: number;
  outflow: number;
  net: number;
  cumulative: number;
  transactions: StockTransaction[];
}

interface StockMovementTimelineChartProps {
  items: Item[];
  transactions: StockTransaction[];
  isLight: boolean;
  selectedItemId?: string | null;
  onSelectItem?: (itemId: string) => void;
  showToast?: (msg: string, type?: 'success' | 'info' | 'warning' | 'error' | string) => void;
}

export function StockMovementTimelineChart({
  items,
  transactions,
  isLight,
  selectedItemId: propSelectedItemId,
  onSelectItem,
  showToast
}: StockMovementTimelineChartProps) {
  // --- STATE ---
  const [selectedItemId, setSelectedItemId] = useState<string>(
    propSelectedItemId || (items.length > 0 ? items[0].id : 'ALL')
  );
  const [timeWindowDays, setTimeWindowDays] = useState<number>(30); // 7, 14, 30, 90, 180, 365
  const [chartMode, setChartMode] = useState<'dual' | 'net' | 'cumulative'>('dual');
  const [hoveredPoint, setHoveredPoint] = useState<DailyMovementData | null>(null);
  const [selectedDatePoint, setSelectedDatePoint] = useState<DailyMovementData | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const svgRef = useRef<SVGSVGElement | null>(null);
  const brushRef = useRef<SVGGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(750);

  // Sync prop selected item if updated externally
  useEffect(() => {
    if (propSelectedItemId) {
      setSelectedItemId(propSelectedItemId);
    }
  }, [propSelectedItemId]);

  // Responsive width detection with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        setContainerWidth(Math.floor(entries[0].contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Selected Item Object
  const currentItem = useMemo(() => {
    if (selectedItemId === 'ALL') return null;
    return items.find(i => i.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // Filter items for dropdown search
  const filteredCatalogItems = useMemo(() => {
    if (!searchFilter.trim()) return items;
    const q = searchFilter.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
  }, [items, searchFilter]);

  // --- DATA CALCULATIONS & AGGREGATION ---
  const dailyData = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - (timeWindowDays - 1));
    startDate.setHours(0, 0, 0, 0);

    // Build map of YYYY-MM-DD dates in range
    const map = new Map<string, { inflow: number; outflow: number; transactions: StockTransaction[] }>();
    
    // Initialize dates in range
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      map.set(key, { inflow: 0, outflow: 0, transactions: [] });
    }

    // Filter transactions by item and date range
    const filteredTx = transactions.filter(tx => {
      if (selectedItemId !== 'ALL' && tx.itemId !== selectedItemId) return false;
      const txDate = new Date(tx.timestamp);
      return txDate >= startDate && txDate <= now;
    });

    // Sort chronologically
    filteredTx.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Populate daily movement
    filteredTx.forEach(tx => {
      const d = new Date(tx.timestamp);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;

      if (map.has(key)) {
        const entry = map.get(key)!;
        entry.transactions.push(tx);
        if (tx.type === 'INFLOW') {
          entry.inflow += tx.quantity;
        } else if (tx.type === 'OUTFLOW') {
          entry.outflow += tx.quantity;
        }
      }
    });

    // Calculate baseline stock level prior to time window for accurate cumulative curve
    let baselineStock = 0;
    if (selectedItemId !== 'ALL') {
      transactions.forEach(tx => {
        if (tx.itemId === selectedItemId) {
          const txDate = new Date(tx.timestamp);
          if (txDate < startDate) {
            if (tx.type === 'INFLOW') baselineStock += tx.quantity;
            else if (tx.type === 'OUTFLOW') baselineStock -= tx.quantity;
          }
        }
      });
    }

    // Convert map to array with cumulative tracking
    const result: DailyMovementData[] = [];
    let running = baselineStock;

    Array.from(map.entries()).forEach(([dateStr, val]) => {
      const net = val.inflow - val.outflow;
      running += net;
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);

      result.push({
        dateStr,
        date: dateObj,
        inflow: val.inflow,
        outflow: val.outflow,
        net,
        cumulative: Math.max(0, running),
        transactions: val.transactions
      });
    });

    return result;
  }, [transactions, selectedItemId, timeWindowDays]);

  // Aggregate Metrics Summary
  const summaryMetrics = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let peakInflow = { dateStr: '', val: 0 };
    let peakOutflow = { dateStr: '', val: 0 };

    dailyData.forEach(d => {
      totalInflow += d.inflow;
      totalOutflow += d.outflow;
      if (d.inflow > peakInflow.val) peakInflow = { dateStr: d.dateStr, val: d.inflow };
      if (d.outflow > peakOutflow.val) peakOutflow = { dateStr: d.dateStr, val: d.outflow };
    });

    const netDelta = totalInflow - totalOutflow;
    const avgNetVelocity = (netDelta / (dailyData.length || 1)).toFixed(1);

    return {
      totalInflow,
      totalOutflow,
      netDelta,
      avgNetVelocity,
      peakInflow,
      peakOutflow
    };
  }, [dailyData]);

  // --- D3 RENDERING EFFECT ---
  useEffect(() => {
    if (!svgRef.current || dailyData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean slate

    const margin = { top: 30, right: 35, bottom: 45, left: 50 };
    const width = Math.max(300, containerWidth - margin.left - margin.right);
    const height = 260 - margin.top - margin.bottom;

    const g = svg
      .attr('width', containerWidth)
      .attr('height', 260)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale (Dates)
    const xScale = d3.scaleBand<string>()
      .domain(dailyData.map(d => d.dateStr))
      .range([0, width])
      .padding(0.3);

    // Compute Y domain depending on mode
    let yMin = 0;
    let yMax = 10;

    if (chartMode === 'dual') {
      const maxIn = d3.max(dailyData, (d: DailyMovementData) => d.inflow) || 0;
      const maxOut = d3.max(dailyData, (d: DailyMovementData) => d.outflow) || 0;
      yMax = Math.max(10, Math.ceil(Math.max(maxIn, maxOut) * 1.15));
    } else if (chartMode === 'net') {
      const minNet = d3.min(dailyData, (d: DailyMovementData) => d.net) || 0;
      const maxNet = d3.max(dailyData, (d: DailyMovementData) => d.net) || 0;
      const absMax = Math.max(Math.abs(minNet), Math.abs(maxNet), 5);
      yMin = -absMax * 1.15;
      yMax = absMax * 1.15;
    } else if (chartMode === 'cumulative') {
      const maxCum = d3.max(dailyData, (d: DailyMovementData) => d.cumulative) || 0;
      const minCum = d3.min(dailyData, (d: DailyMovementData) => d.cumulative) || 0;
      yMin = Math.min(0, minCum);
      yMax = Math.max(10, Math.ceil(maxCum * 1.15));
    }

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .nice()
      .range([height, 0]);

    // Gridlines background
    const yTicks = yScale.ticks(5);
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', isLight ? '#e2e8f0' : '#1e293b')
      .attr('stroke-dasharray', '3,3');

    // Zero baseline for net mode
    if (chartMode === 'net') {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', isLight ? '#64748b' : '#94a3b8')
        .attr('stroke-width', 1.5);
    }

    // Axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => {
        const parts = d.split('-');
        return `${parts[1]}/${parts[2]}`;
      });

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => d3.format(',.0f')(d as number));

    // Render X Axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.5em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-35)')
      .style('fill', isLight ? '#64748b' : '#94a3b8')
      .style('font-size', '9.5px')
      .style('font-weight', '600');

    // Render Y Axis
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('fill', isLight ? '#64748b' : '#94a3b8')
      .style('font-size', '10px')
      .style('font-family', 'monospace');

    // Style axis lines
    g.selectAll('.domain')
      .attr('stroke', isLight ? '#cbd5e1' : '#334155');

    // --- RENDER BARS OR AREA CHART BASED ON MODE ---
    if (chartMode === 'dual') {
      const subBand = xScale.bandwidth() / 2;

      // Inflow Bars (Green)
      g.selectAll<SVGRectElement, DailyMovementData>('.bar-inflow')
        .data(dailyData)
        .enter()
        .append('rect')
        .attr('class', 'bar-inflow')
        .attr('x', (d: DailyMovementData) => (xScale(d.dateStr) || 0))
        .attr('width', subBand - 1)
        .attr('y', (d: DailyMovementData) => yScale(d.inflow))
        .attr('height', (d: DailyMovementData) => Math.max(0, height - yScale(d.inflow)))
        .attr('fill', '#10b981') // Emerald 500
        .attr('rx', 2.5)
        .attr('opacity', 0.85);

      // Outflow Bars (Rose/Amber)
      g.selectAll<SVGRectElement, DailyMovementData>('.bar-outflow')
        .data(dailyData)
        .enter()
        .append('rect')
        .attr('class', 'bar-outflow')
        .attr('x', (d: DailyMovementData) => (xScale(d.dateStr) || 0) + subBand)
        .attr('width', subBand - 1)
        .attr('y', (d: DailyMovementData) => yScale(d.outflow))
        .attr('height', (d: DailyMovementData) => Math.max(0, height - yScale(d.outflow)))
        .attr('fill', '#f43f5e') // Rose 500
        .attr('rx', 2.5)
        .attr('opacity', 0.85);

      // Overlay Net trend line on top
      const lineGen = d3.line<DailyMovementData>()
        .x(d => (xScale(d.dateStr) || 0) + xScale.bandwidth() / 2)
        .y(d => yScale(d.net))
        .curve(d3.curveMonotoneX);

      // Gradient area under net curve
      const areaGen = d3.area<DailyMovementData>()
        .x(d => (xScale(d.dateStr) || 0) + xScale.bandwidth() / 2)
        .y0(height)
        .y1(d => yScale(d.net))
        .curve(d3.curveMonotoneX);

      const svgDefs = svg.append('defs');
      const gradient = svgDefs.append('linearGradient')
        .attr('id', 'net-dual-gradient')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#6366f1')
        .attr('stop-opacity', 0.25);
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#6366f1')
        .attr('stop-opacity', 0);

      g.append('path')
        .datum(dailyData)
        .attr('fill', 'url(#net-dual-gradient)')
        .attr('d', areaGen);

      g.append('path')
        .datum(dailyData)
        .attr('fill', 'none')
        .attr('stroke', '#6366f1') // Indigo 500
        .attr('stroke-width', 2)
        .attr('d', lineGen);

    } else if (chartMode === 'net') {
      // Net Bars (+ above zero, - below zero)
      g.selectAll<SVGRectElement, DailyMovementData>('.bar-net')
        .data(dailyData)
        .enter()
        .append('rect')
        .attr('class', 'bar-net')
        .attr('x', (d: DailyMovementData) => xScale(d.dateStr) || 0)
        .attr('width', xScale.bandwidth())
        .attr('y', (d: DailyMovementData) => d.net >= 0 ? yScale(d.net) : yScale(0))
        .attr('height', (d: DailyMovementData) => Math.abs(yScale(d.net) - yScale(0)))
        .attr('fill', (d: DailyMovementData) => d.net >= 0 ? '#10b981' : '#f43f5e')
        .attr('rx', 3)
        .attr('opacity', 0.88);

    } else if (chartMode === 'cumulative') {
      // Gradient definition for cumulative stock curve
      const svgDefs = svg.append('defs');
      const cumGrad = svgDefs.append('linearGradient')
        .attr('id', 'cum-stock-gradient')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');

      cumGrad.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#3b82f6')
        .attr('stop-opacity', 0.4);
      cumGrad.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#3b82f6')
        .attr('stop-opacity', 0.02);

      const areaCum = d3.area<DailyMovementData>()
        .x(d => (xScale(d.dateStr) || 0) + xScale.bandwidth() / 2)
        .y0(height)
        .y1(d => yScale(d.cumulative))
        .curve(d3.curveMonotoneX);

      const lineCum = d3.line<DailyMovementData>()
        .x(d => (xScale(d.dateStr) || 0) + xScale.bandwidth() / 2)
        .y(d => yScale(d.cumulative))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(dailyData)
        .attr('fill', 'url(#cum-stock-gradient)')
        .attr('d', areaCum);

      g.append('path')
        .datum(dailyData)
        .attr('fill', 'none')
        .attr('stroke', '#2563eb')
        .attr('stroke-width', 2.5)
        .attr('d', lineCum);

      // Data dots on curve
      g.selectAll<SVGCircleElement, DailyMovementData>('.dot-cum')
        .data(dailyData)
        .enter()
        .append('circle')
        .attr('class', 'dot-cum')
        .attr('cx', (d: DailyMovementData) => (xScale(d.dateStr) || 0) + xScale.bandwidth() / 2)
        .attr('cy', (d: DailyMovementData) => yScale(d.cumulative))
        .attr('r', 3.5)
        .attr('fill', '#2563eb')
        .attr('stroke', isLight ? '#ffffff' : '#0f172a')
        .attr('stroke-width', 1.5);
    }

    // --- INTERACTIVE HOVER OVERLAY ---
    const overlay = g.append('rect')
      .attr('class', 'hover-overlay')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair');

    // Guide crosshair line
    const hoverLine = g.append('line')
      .attr('class', 'hover-guide-line')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
      .style('opacity', 0);

    overlay.on('mousemove', (event) => {
      const [mouseX] = d3.pointer(event);
      // Find closest date band
      const bandwidth = xScale.step();
      const index = Math.floor(mouseX / bandwidth);
      const clampedIdx = Math.max(0, Math.min(dailyData.length - 1, index));
      const targetPoint = dailyData[clampedIdx];

      if (targetPoint) {
        setHoveredPoint(targetPoint);
        const xPos = (xScale(targetPoint.dateStr) || 0) + xScale.bandwidth() / 2;
        hoverLine.attr('x1', xPos).attr('x2', xPos).style('opacity', 1);
      }
    });

    overlay.on('mouseleave', () => {
      setHoveredPoint(null);
      hoverLine.style('opacity', 0);
    });

    overlay.on('click', (event) => {
      const [mouseX] = d3.pointer(event);
      const bandwidth = xScale.step();
      const index = Math.floor(mouseX / bandwidth);
      const clampedIdx = Math.max(0, Math.min(dailyData.length - 1, index));
      const targetPoint = dailyData[clampedIdx];
      if (targetPoint) {
        setSelectedDatePoint(targetPoint);
        if (showToast) {
          showToast(`Selected date audit for ${targetPoint.dateStr} (${targetPoint.transactions.length} movement records)`, 'info');
        }
      }
    });

  }, [dailyData, chartMode, containerWidth, isLight]);

  // Handle CSV Export of Timeline Movement
  const handleExportTimelineCSV = () => {
    const headers = 'Date,Item SKU,Item Name,Inflow Qty,Outflow Qty,Net Daily Delta,Cumulative Stock Balance,Transactions Count\n';
    const rows = dailyData.map(d => {
      const sku = currentItem ? currentItem.sku : 'ALL';
      const name = currentItem ? currentItem.name.replace(/,/g, '') : 'All Catalog Items Aggregate';
      return `${d.dateStr},${sku},${name},${d.inflow},${d.outflow},${d.net},${d.cumulative},${d.transactions.length}`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Stock_Movement_Timeline_${selectedItemId}_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
    if (showToast) showToast("Exported daily net stock movement timeline to CSV file!", "success");
  };

  return (
    <div className={`p-6 border rounded-2xl space-y-6 transition-all duration-300 ${
      isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
    }`}>
      
      {/* HEADER BAR & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Activity className="h-5 w-5 animate-pulse" />
            </span>
            <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Interactive Daily Net Stock Movement Timeline
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-900/50">
                D3 Realtime Engine
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-xl">
            Track daily inbound inventory arrivals vs outbound dispatches, observe net delta flow velocity, and analyze stock balances over time.
          </p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportTimelineCSV}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-extrabold uppercase rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-indigo-500" /> Export Movement CSV
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS: ITEM SELECTOR, WINDOW SLIDER & CHART MODE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        
        {/* Item Dropdown Selector */}
        <div className="lg:col-span-5 space-y-1">
          <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider">
            Target Catalog Item
          </label>
          <div className="relative">
            <select
              value={selectedItemId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedItemId(val);
                if (onSelectItem) onSelectItem(val);
              }}
              className={`w-full font-bold text-xs rounded-lg px-3 py-2 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
              }`}
            >
              <option value="ALL">📦 ALL CATALOG ITEMS (Aggregated Net Ledger Flow)</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.sku}) - ₹{i.unitCost.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Time Window Buttons */}
        <div className="lg:col-span-4 space-y-1">
          <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider">
            Time Horizon Range
          </label>
          <div className="grid grid-cols-4 gap-1 bg-slate-200/60 dark:bg-slate-900 p-1 rounded-lg border border-slate-300/40 dark:border-slate-800">
            {[7, 14, 30, 90].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => setTimeWindowDays(days)}
                className={`py-1 text-[10.5px] font-extrabold rounded uppercase transition-all ${
                  timeWindowDays === days
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>

        {/* Chart View Mode Toggle */}
        <div className="lg:col-span-3 space-y-1">
          <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider">
            Visualization Mode
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-200/60 dark:bg-slate-900 p-1 rounded-lg border border-slate-300/40 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setChartMode('dual')}
              title="Dual Bars: Inflows (Green) vs Outflows (Red) + Net Trendline"
              className={`py-1 text-[10px] font-extrabold rounded uppercase transition-all ${
                chartMode === 'dual' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              In vs Out
            </button>
            <button
              type="button"
              onClick={() => setChartMode('net')}
              title="Net Movement Daily Delta Bars (+ / -)"
              className={`py-1 text-[10px] font-extrabold rounded uppercase transition-all ${
                chartMode === 'net' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Net Delta
            </button>
            <button
              type="button"
              onClick={() => setChartMode('cumulative')}
              title="Cumulative Stock Level Balance Over Time"
              className={`py-1 text-[10px] font-extrabold rounded uppercase transition-all ${
                chartMode === 'cumulative' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Balance
            </button>
          </div>
        </div>

      </div>

      {/* KPI METRIC HIGHLIGHTS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded-xl border ${
          isLight ? 'bg-emerald-50/50 border-emerald-200/80' : 'bg-emerald-950/20 border-emerald-900/50'
        }`}>
          <span className="text-[9px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider block">
            Total Inflow (+ Arrivals)
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-mono font-black text-emerald-700 dark:text-emerald-300">
              +{summaryMetrics.totalInflow.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-600/80 font-sans">units</span>
          </div>
          {summaryMetrics.peakInflow.val > 0 && (
            <span className="text-[9.5px] text-emerald-600/90 dark:text-emerald-400 font-mono block mt-1">
              Peak: +{summaryMetrics.peakInflow.val} on {summaryMetrics.peakInflow.dateStr}
            </span>
          )}
        </div>

        <div className={`p-3.5 rounded-xl border ${
          isLight ? 'bg-rose-50/50 border-rose-200/80' : 'bg-rose-950/20 border-rose-900/50'
        }`}>
          <span className="text-[9px] uppercase font-black text-rose-600 dark:text-rose-400 tracking-wider block">
            Total Outflow (- Dispatches)
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-mono font-black text-rose-700 dark:text-rose-300">
              -{summaryMetrics.totalOutflow.toLocaleString()}
            </span>
            <span className="text-[10px] text-rose-600/80 font-sans">units</span>
          </div>
          {summaryMetrics.peakOutflow.val > 0 && (
            <span className="text-[9.5px] text-rose-600/90 dark:text-rose-400 font-mono block mt-1">
              Peak: -{summaryMetrics.peakOutflow.val} on {summaryMetrics.peakOutflow.dateStr}
            </span>
          )}
        </div>

        <div className={`p-3.5 rounded-xl border ${
          isLight ? 'bg-indigo-50/50 border-indigo-200/80' : 'bg-indigo-950/20 border-indigo-900/50'
        }`}>
          <span className="text-[9px] uppercase font-black text-indigo-600 dark:text-indigo-400 tracking-wider block">
            Net Movement Delta
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-lg font-mono font-black ${
              summaryMetrics.netDelta >= 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {summaryMetrics.netDelta > 0 ? `+${summaryMetrics.netDelta}` : summaryMetrics.netDelta}
            </span>
            <span className="text-[10px] text-slate-500 font-sans">net units</span>
          </div>
          <span className="text-[9.5px] text-indigo-600/80 dark:text-indigo-400 font-mono block mt-1">
            Avg Velocity: {summaryMetrics.avgNetVelocity} units/day
          </span>
        </div>

        <div className={`p-3.5 rounded-xl border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
        }`}>
          <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">
            Current Stock Level
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-mono font-black text-slate-900 dark:text-white">
              {(dailyData.length > 0 ? dailyData[dailyData.length - 1].cumulative : 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 font-sans">
              {currentItem ? (currentItem.unit || 'Piece') : 'Total Units'}
            </span>
          </div>
          {currentItem && (
            <span className="text-[9.5px] text-slate-500 font-mono block mt-1 truncate">
              Valuation: ₹{( (dailyData.length > 0 ? dailyData[dailyData.length - 1].cumulative : 0) * currentItem.unitCost ).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* D3 TIMELINE SVG CANVAS CONTAINER */}
      <div ref={containerRef} className="relative space-y-2">
        
        {/* SVG Render Container */}
        <div className={`p-4 rounded-xl border overflow-hidden ${
          isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <svg ref={svgRef} className="w-full h-[260px] overflow-visible" />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2 pt-1">
          <div className="flex items-center gap-4">
            {chartMode === 'dual' && (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-emerald-500 inline-block"></span> Inbound Inflow (+ Arrival)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-rose-500 inline-block"></span> Outbound Outflow (- Dispatch)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 inline-block"></span> Net Movement Line
                </span>
              </>
            )}
            {chartMode === 'net' && (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-emerald-500 inline-block"></span> Positive Net Inflow (+ Delta)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-rose-500 inline-block"></span> Negative Net Outflow (- Delta)
                </span>
              </>
            )}
            {chartMode === 'cumulative' && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block"></span> Cumulative Inventory Balance Level
              </span>
            )}
          </div>
          <span className="font-mono text-[9.5px]">💡 Hover cursor over chart for crosshair details. Click date bar to inspect transactions.</span>
        </div>

        {/* FLOATING CURSOR HOVER CARD TOOLTIP */}
        {hoveredPoint && (
          <div className={`p-3 rounded-xl border shadow-xl text-xs space-y-1.5 max-w-xs animate-fadeIn ${
            isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-slate-900/95 border-slate-700 text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-1 font-mono text-[11px]">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {hoveredPoint.dateStr}
              </span>
              <span className="text-[10px] text-slate-400">{hoveredPoint.transactions.length} Tx Records</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
              <div>
                <span className="text-slate-400 text-[9px] uppercase block">Inflow (+):</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">+{hoveredPoint.inflow} units</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] uppercase block">Outflow (-):</span>
                <span className="font-bold font-mono text-rose-600 dark:text-rose-400">-{hoveredPoint.outflow} units</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] uppercase block">Net Daily Delta:</span>
                <span className={`font-bold font-mono ${hoveredPoint.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {hoveredPoint.net > 0 ? `+${hoveredPoint.net}` : hoveredPoint.net} units
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] uppercase block">Cum. Balance:</span>
                <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">{hoveredPoint.cumulative} units</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* SELECTED DATE AUDIT INSPECTOR TABLE */}
      {selectedDatePoint && (
        <div className={`p-4 border rounded-xl space-y-3 animate-fadeIn ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
                Daily Stock Transaction Audit Log – {selectedDatePoint.dateStr}
              </h4>
            </div>
            <button
              onClick={() => setSelectedDatePoint(null)}
              className="text-[10px] font-extrabold uppercase text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              Close Inspector ✕
            </button>
          </div>

          {selectedDatePoint.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="text-[9.5px] uppercase font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">Movement Type</th>
                    <th className="py-2 px-3">Item / SKU</th>
                    <th className="py-2 px-3 text-right">Quantity</th>
                    <th className="py-2 px-3 text-right">Unit Rate</th>
                    <th className="py-2 px-3">Invoice Ref</th>
                    <th className="py-2 px-3">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                  {selectedDatePoint.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50">
                      <td className="py-2 px-3 text-slate-500">
                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          tx.type === 'INFLOW' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-sans font-bold text-slate-800 dark:text-slate-200">
                        {tx.itemName} <span className="font-mono text-[10px] text-slate-400">({tx.sku})</span>
                      </td>
                      <td className={`py-2 px-3 text-right font-black ${
                        tx.type === 'INFLOW' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'INFLOW' ? `+${tx.quantity}` : `-${tx.quantity}`}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">
                        ₹{tx.unitCost.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">
                        {tx.invoiceNumber || 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-slate-500 font-sans text-[10px]">
                        {tx.operatorEmail || 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-3 text-center">
              No individual transactions registered on {selectedDatePoint.dateStr}. Net delta was 0.
            </p>
          )}
        </div>
      )}

    </div>
  );
}
