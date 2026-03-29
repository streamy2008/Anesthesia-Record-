import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface VitalSign {
  time: string;
  bp: string; // Format: "120/80"
  hr: string;
  spo2: string;
  rr: string;
  temp: string;
  sedation: string;
}

interface VitalSignsChartProps {
  data: VitalSign[];
  onChange: (index: number, field: keyof VitalSign, value: string) => void;
}

interface ChartConfig {
  title: string;
  field: keyof VitalSign;
  color: string;
  domain: [number, number];
  unit: string;
}

export function VitalSignsChart({ data, onChange }: VitalSignsChartProps) {
  const configs: ChartConfig[] = [
    { title: '心率 (HR)', field: 'hr', color: '#ef4444', domain: [0, 200], unit: 'bpm' },
    { title: '血压 (BP)', field: 'bp', color: '#f97316', domain: [0, 200], unit: 'mmHg' },
    { title: '血氧 (SpO2)', field: 'spo2', color: '#3b82f6', domain: [0, 100], unit: '%' },
    { title: '呼吸 (RR)', field: 'rr', color: '#10b981', domain: [0, 50], unit: '次/分' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {configs.map((config) => (
        <div key={config.field} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }}></div>
              {config.title}
            </h4>
            <span className="text-[10px] text-slate-400">{config.unit}</span>
          </div>
          <SingleChart config={config} data={data} onChange={onChange} />
        </div>
      ))}
    </div>
  );
}

function SingleChart({ config, data, onChange }: { config: ChartConfig, data: VitalSign[], onChange: any }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = 400 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain(config.domain)
      .range([height, 0]);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(data.length).tickFormat((i) => data[i as number].time))
      .attr('font-size', '10px');

    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .attr('font-size', '10px');

    // Grid
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.05)
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ''));

    const parseBP = (bp: string) => {
      const parts = bp.split('/');
      return {
        sys: parseInt(parts[0]) || 0,
        dia: parseInt(parts[1]) || 0
      };
    };

    const drag = d3.drag<SVGCircleElement, any>()
      .on('drag', function (event, d) {
        const index = d.index;
        const newValue = Math.round(y.invert(event.y));
        const clampedValue = Math.max(config.domain[0], Math.min(config.domain[1], newValue));
        
        if (config.field === 'bp') {
          const currentBP = parseBP(data[index].bp);
          if (d.type === 'sys') {
            onChange(index, 'bp', `${clampedValue}/${currentBP.dia}`);
          } else {
            onChange(index, 'bp', `${currentBP.sys}/${clampedValue}`);
          }
        } else {
          onChange(index, config.field, clampedValue.toString());
        }
      });

    if (config.field === 'bp') {
      // BP Lines (Systolic and Diastolic)
      const lineSys = d3.line<any>()
        .x((_, i) => x(i))
        .y(d => y(parseBP(d.bp).sys));
      
      const lineDia = d3.line<any>()
        .x((_, i) => x(i))
        .y(d => y(parseBP(d.bp).dia));

      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', config.color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,2')
        .attr('d', lineSys);

      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', config.color)
        .attr('stroke-width', 2)
        .attr('d', lineDia);

      data.forEach((d, i) => {
        const bp = parseBP(d.bp);
        g.append('circle')
          .datum({ index: i, type: 'sys' })
          .attr('cx', x(i))
          .attr('cy', y(bp.sys))
          .attr('r', 4)
          .attr('fill', config.color)
          .attr('cursor', 'ns-resize')
          .call(drag as any);

        g.append('circle')
          .datum({ index: i, type: 'dia' })
          .attr('cx', x(i))
          .attr('cy', y(bp.dia))
          .attr('r', 4)
          .attr('fill', config.color)
          .attr('cursor', 'ns-resize')
          .call(drag as any);
      });
    } else {
      // Single Line
      const line = d3.line<any>()
        .x((_, i) => x(i))
        .y(d => y(parseInt(d[config.field as keyof VitalSign] as string) || 0));

      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', config.color)
        .attr('stroke-width', 2)
        .attr('d', line);

      data.forEach((d, i) => {
        const val = parseInt(d[config.field as keyof VitalSign] as string) || 0;
        g.append('circle')
          .datum({ index: i })
          .attr('cx', x(i))
          .attr('cy', y(val))
          .attr('r', 4)
          .attr('fill', config.color)
          .attr('cursor', 'ns-resize')
          .call(drag as any);
      });
    }

  }, [data, onChange, config]);

  return (
    <div className="w-full overflow-hidden">
      <svg ref={svgRef} width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet"></svg>
    </div>
  );
}
