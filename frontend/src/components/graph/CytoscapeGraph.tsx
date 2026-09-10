import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import type { GraphNodeData, GraphEdgeData } from '../../types/graph';
import { ZoomIn, ZoomOut, Maximize2, Crosshair, Camera, LayoutGrid } from 'lucide-react';

interface CytoscapeGraphProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  rootAccountId?: string;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  onSelectNode: (node: GraphNodeData) => void;
  onSelectEdge: (edge: GraphEdgeData) => void;
  onClearSelection: () => void;
  className?: string;
}

export const CytoscapeGraph: React.FC<CytoscapeGraphProps> = ({
  nodes,
  edges,
  rootAccountId,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onClearSelection,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [activeLayout, setActiveLayout] = useState<'cose' | 'concentric' | 'breadthfirst' | 'circle'>('cose');

  // Initialize and update Cytoscape graph
  useEffect(() => {
    if (!containerRef.current) return;

    // Build elements
    const elements: cytoscape.ElementDefinition[] = [
      ...nodes.map((n) => ({
        group: 'nodes' as const,
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          riskScore: n.riskScore,
          riskLevel: n.riskLevel,
          isRoot: n.isRoot || n.id === rootAccountId,
          inflow: n.inflow,
          outflow: n.outflow,
          raw: n,
        },
      })),
      ...edges.map((e) => ({
        group: 'edges' as const,
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          amount: e.amount,
          label: e.label,
          isFlagged: e.isFlagged,
          raw: e,
        },
      })),
    ];

    // Destroy existing instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Initialize instance
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        // Core Node Styling
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#cbd5e1',
            'font-size': '10px',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'text-outline-color': '#090d16',
            'text-outline-width': 2,
            'width': 36,
            'height': 36,
            'background-color': '#3b82f6',
            'border-width': 2,
            'border-color': '#1d4ed8',
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 0.2,
          },
        },
        // Account Node Severity Variations
        {
          selector: 'node[type = "ACCOUNT"][riskLevel = "CRITICAL"]',
          style: {
            'background-color': '#ef4444',
            'border-color': '#dc2626',
            'width': 42,
            'height': 42,
          },
        },
        {
          selector: 'node[type = "ACCOUNT"][riskLevel = "HIGH"]',
          style: {
            'background-color': '#f97316',
            'border-color': '#ea580c',
            'width': 38,
            'height': 38,
          },
        },
        {
          selector: 'node[type = "ACCOUNT"][riskLevel = "MEDIUM"]',
          style: {
            'background-color': '#eab308',
            'border-color': '#ca8a04',
          },
        },
        {
          selector: 'node[type = "ACCOUNT"][riskLevel = "LOW"]',
          style: {
            'background-color': '#2563eb',
            'border-color': '#1d4ed8',
          },
        },
        // Root Ego Account Node
        {
          selector: 'node[?isRoot]',
          style: {
            'border-width': 4,
            'border-color': '#38bdf8',
            'width': 48,
            'height': 48,
            'font-size': '11px',
            'font-weight': 700,
          },
        },
        // Hardware / Device Nodes
        {
          selector: 'node[type = "DEVICE"]',
          style: {
            'shape': 'diamond',
            'background-color': '#9333ea',
            'border-color': '#c084fc',
            'border-width': 2,
            'width': 32,
            'height': 32,
          },
        },
        // Selected Node Highlight
        {
          selector: 'node:selected',
          style: {
            'border-color': '#facc15',
            'border-width': 4,
            'border-opacity': 1,
          },
        },
        // Edge Styling
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.1,
            'label': 'data(label)',
            'font-size': '9px',
            'color': '#94a3b8',
            'text-rotation': 'autorotate',
            'text-background-color': '#0b0f19',
            'text-background-opacity': 0.85,
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
          },
        },
        // Flagged Transaction Edge
        {
          selector: 'edge[?isFlagged]',
          style: {
            'width': 3.5,
            'line-color': '#f97316',
            'target-arrow-color': '#f97316',
            'color': '#fed7aa',
          },
        },
        // Shared Device Link Edge
        {
          selector: 'edge[type = "SHARED_DEVICE"]',
          style: {
            'line-style': 'dashed',
            'line-dash-pattern': [6, 3],
            'line-color': '#a855f7',
            'target-arrow-shape': 'none',
            'width': 1.8,
            'color': '#d8b4fe',
          },
        },
        // Selected Edge Highlight
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#facc15',
            'target-arrow-color': '#facc15',
            'width': 4,
          },
        },
      ],
      layout: getLayoutConfig(activeLayout),
    });

    // Tap node
    cy.on('tap', 'node', (evt) => {
      const nodeData = evt.target.data('raw') as GraphNodeData;
      if (nodeData) onSelectNode(nodeData);
    });

    // Tap edge
    cy.on('tap', 'edge', (evt) => {
      const edgeData = evt.target.data('raw') as GraphEdgeData;
      if (edgeData) onSelectEdge(edgeData);
    });

    // Tap background to clear
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onClearSelection();
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [nodes, edges, rootAccountId, activeLayout]);

  // Sync selected element from props
  useEffect(() => {
    if (!cyRef.current) return;
    cyRef.current.elements().unselect();

    if (selectedNodeId) {
      const node = cyRef.current.getElementById(selectedNodeId);
      if (node) node.select();
    } else if (selectedEdgeId) {
      const edge = cyRef.current.getElementById(selectedEdgeId);
      if (edge) edge.select();
    }
  }, [selectedNodeId, selectedEdgeId]);

  // Layout helper
  function getLayoutConfig(name: string): cytoscape.LayoutOptions {
    switch (name) {
      case 'concentric':
        return {
          name: 'concentric',
          concentric: (node: any) => (node.data('isRoot') ? 10 : 2),
          levelWidth: () => 1,
          padding: 40,
          animate: true,
          animationDuration: 500,
        };
      case 'breadthfirst':
        return {
          name: 'breadthfirst',
          directed: true,
          padding: 40,
          spacingFactor: 1.25,
          animate: true,
          animationDuration: 500,
        };
      case 'circle':
        return {
          name: 'circle',
          padding: 40,
          animate: true,
          animationDuration: 500,
        };
      case 'cose':
      default:
        return {
          name: 'cose',
          idealEdgeLength: () => 90,
          nodeOverlap: 20,
          refresh: 20,
          fit: true,
          padding: 40,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: () => 400000,
          edgeElasticity: () => 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
          animate: false,
        };
    }
  }

  // Toolbar Actions
  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 30);
  const handleCenterRoot = () => {
    if (!cyRef.current || !rootAccountId) return;
    const root = cyRef.current.getElementById(rootAccountId);
    if (root.length > 0) {
      cyRef.current.center(root);
      cyRef.current.zoom(1.5);
    }
  };

  const handleExportPng = () => {
    if (!cyRef.current) return;
    const png64 = cyRef.current.png({ full: true, scale: 2, bg: '#090d16' });
    const link = document.createElement('a');
    link.download = `fraudlens-graph-${rootAccountId || 'network'}.png`;
    link.href = png64;
    link.click();
  };

  return (
    <div className={`relative bg-[#090d16] rounded-xl border border-slate-800 overflow-hidden ${className}`}>
      {/* Cytoscape Canvas Container */}
      <div ref={containerRef} className="w-full h-full min-h-[500px]" />

      {/* Floating Interactive Canvas Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 shadow-xl">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFit}
          title="Fit Network to Screen"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        {rootAccountId && (
          <button
            onClick={handleCenterRoot}
            title="Center on Root Account"
            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-950/50 rounded transition"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}
        <div className="w-px h-4 bg-slate-700 mx-1" />
        <button
          onClick={handleExportPng}
          title="Export Canvas as High-Res PNG"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Layout Selector */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 shadow-xl text-xs text-slate-300">
        <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Layout:</span>
        <select
          value={activeLayout}
          onChange={(e) => setActiveLayout(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 outline-none focus:border-blue-500"
        >
          <option value="cose">Force-Directed (COSE)</option>
          <option value="concentric">Concentric Ego Rings</option>
          <option value="breadthfirst">Hierarchical Flow</option>
          <option value="circle">Radial Circle</option>
        </select>
      </div>

      {/* Floating Graph Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 shadow-lg text-[11px] text-slate-400 flex items-center gap-4 select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400" />
          <span>Low Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-400" />
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-500 border border-orange-400" />
          <span>High Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500 border border-red-400" />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rotate-45 bg-purple-500 border border-purple-400" />
          <span>Device</span>
        </div>
      </div>
    </div>
  );
};
