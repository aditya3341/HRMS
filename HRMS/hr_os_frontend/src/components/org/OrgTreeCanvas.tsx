import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  MiniMap,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import OrgNodeCard from './OrgNodeCard';
import { OrgNodeData } from '../../lib/orgChartApi';
import { Search, X, ChevronDown, Eye, Zap, ZoomIn, ZoomOut, RefreshCcw } from 'lucide-react';

const nodeTypes = {
  custom: OrgNodeCard,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Auto-layout elements mathematically using Dagre
export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 140 });

  nodes.forEach((node) => {
    const isExecutive = node.data?.designation?.toLowerCase().includes('director') || 
                        node.data?.designation?.toLowerCase().includes('head') ||
                        node.data?.designation?.toLowerCase().includes('manager') ||
                        node.data?.designation?.toLowerCase().includes('cto') ||
                        node.data?.designation?.toLowerCase().includes('ceo');
    dagreGraph.setNode(node.id, { width: isExecutive ? 320 : 288, height: 180 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isExecutive = node.data?.designation?.toLowerCase().includes('director') || 
                        node.data?.designation?.toLowerCase().includes('head') ||
                        node.data?.designation?.toLowerCase().includes('manager') ||
                        node.data?.designation?.toLowerCase().includes('cto') ||
                        node.data?.designation?.toLowerCase().includes('ceo');
    const width = isExecutive ? 320 : 288;
    const newNode = { ...node };

    newNode.position = {
      x: nodeWithPosition.x - width / 2,
      y: nodeWithPosition.y - 180 / 2,
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

// Flatten recursive ABAC REST tree into ReactFlow maps
export const parseOrgData = (orgData: OrgNodeData[], parentName: string | null = null) => {
  const flatNodes: Node[] = [];
  const flatEdges: Edge[] = [];

  const traverse = (node: OrgNodeData, parentId: string | null = null, parentNodeName: string | null = null) => {
    const childCount = node.children?.length || 0;

    flatNodes.push({
      id: node.id,
      type: 'custom',
      data: {
        id: node.id,
        name: node.name,
        designation: node.designation,
        department: node.department,
        avatarUrl: node.avatarUrl,
        reportingTo: parentNodeName,
        childrenCount: childCount,
      },
      position: { x: 0, y: 0 },
    });

    if (parentId) {
      flatEdges.push({
        id: `e-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: 'rgba(100, 116, 139, 0.4)',
          strokeWidth: 2.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'rgba(100, 116, 139, 0.4)',
        },
      });
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => traverse(child, node.id, node.name));
    }
  };

  orgData.forEach((root) => traverse(root, null, null));
  return { flatNodes, flatEdges };
};

interface OrgTreeCanvasProps {
  data: OrgNodeData[];
}

const OrgTreeCanvas: React.FC<OrgTreeCanvasProps> = ({ data }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Extract unique departments for filtering
  const departments = useMemo(() => {
    const depts = new Set<string>();
    const collect = (nodeList: OrgNodeData[]) => {
      nodeList.forEach((node) => {
        depts.add(node.department);
        if (node.children) collect(node.children);
      });
    };
    collect(data);
    return Array.from(depts).sort();
  }, [data]);

  // Statistics
  const stats = useMemo(() => {
    let total = 0;
    let deptCount: Record<string, number> = {};
    const collect = (nodeList: OrgNodeData[]) => {
      nodeList.forEach((node) => {
        total++;
        deptCount[node.department] = (deptCount[node.department] || 0) + 1;
        if (node.children) collect(node.children);
      });
    };
    collect(data);
    return { total, deptCount };
  }, [data]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const { flatNodes, flatEdges } = parseOrgData(data);

    // Filter based on search and department
    let filteredNodes = flatNodes;
    let filteredEdges = flatEdges;

    if (searchTerm || departmentFilter) {
      // Find matching node IDs
      const matchingIds = new Set<string>();

      flatNodes.forEach((node) => {
        const matchesSearch =
          !searchTerm ||
          node.data.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.data.designation.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDept = !departmentFilter || node.data.department === departmentFilter;

        if (matchesSearch && matchesDept) {
          matchingIds.add(node.id);
        }
      });

      // Keep edges only if both source and target match
      filteredEdges = flatEdges.filter(
        (edge) => matchingIds.has(edge.source) && matchingIds.has(edge.target)
      );

      filteredNodes = flatNodes.filter((node) => matchingIds.has(node.id));

      // Mark search results
      filteredNodes = filteredNodes.map((node) => ({
        ...node,
        data: { ...node.data, isSearchResult: !!searchTerm },
      }));
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      filteredNodes,
      filteredEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [data, searchTerm, departmentFilter]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setDepartmentFilter(null);
  }, []);

  const handleZoomIn = useCallback(() => {
    rfInstance?.zoomIn();
  }, [rfInstance]);

  const handleZoomOut = useCallback(() => {
    rfInstance?.zoomOut();
  }, [rfInstance]);

  const handleFitView = useCallback(() => {
    rfInstance?.fitView({ padding: 0.2 });
  }, [rfInstance]);

  const departmentColors: Record<string, { from: string; to: string; bg: string }> = {
    engineering: { from: 'from-blue-500', to: 'to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    sales: { from: 'from-emerald-500', to: 'to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    marketing: { from: 'from-purple-500', to: 'to-pink-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    hr: { from: 'from-orange-500', to: 'to-red-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    finance: { from: 'from-indigo-500', to: 'to-blue-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    operations: { from: 'from-yellow-500', to: 'to-orange-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    product: { from: 'from-fuchsia-500', to: 'to-purple-500', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20' },
    design: { from: 'from-pink-500', to: 'to-rose-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  };

  const hasActiveFilters = searchTerm || departmentFilter;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0f1117] dark:to-gray-900">
      {/* Header with Search and Controls */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex gap-3 items-stretch">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {hasActiveFilters && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-sm">
              <span>{departmentFilter ? `${departmentFilter} ✓` : 'All Depts'}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="hidden group-hover:block absolute top-full mt-1 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-48 overflow-hidden">
              <button
                onClick={() => setDepartmentFilter(null)}
                className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  !departmentFilter ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-900 dark:text-white'
                }`}
              >
                All Departments
              </button>
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDepartmentFilter(dept)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-l-3 ${
                    departmentFilter === dept
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium border-blue-500'
                      : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                  }`}
                >
                  {dept} ({stats.deptCount[dept] || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Buttons */}
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`px-3 py-2.5 rounded-lg border transition-all ${
              showLegend
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Toggle legend"
          >
            <Zap className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className={`px-3 py-2.5 rounded-lg border transition-all ${
              showMinimap
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Toggle minimap"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Info Bar */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-semibold">{nodes.length}</span> of <span className="font-semibold">{stats.total}</span> employees shown
              {departmentFilter && ` in ${departmentFilter}`}
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={(instance) => setRfInstance(instance)}
          onMoveEnd={(event, viewport) => setZoomLevel(viewport.zoom)}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={1.8}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnScroll
          panOnDrag
          className="bg-white dark:bg-gray-900"
        >
          <Controls
            showInteractive={false}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl overflow-hidden [&>button]:!border-b [&>button]:!border-gray-200 dark:[&>button]:!border-gray-700 [&>button]:p-2 hover:[&>button]:bg-gray-100 dark:hover:[&>button]:bg-gray-700 transition-colors"
          />
          <Background gap={24} size={2} color="rgba(156, 163, 175, 0.15)" />

          {showMinimap && (
            <MiniMap
              nodeColor={(node) => '#3b82f6'}
              nodeStrokeColor={(node) => '#1e40af'}
              nodeBorderRadius={8}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(156, 163, 175, 0.2)',
              }}
            />
          )}

          <div className="absolute top-4 right-4 z-20 grid gap-2 p-2 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-700 shadow-xl backdrop-blur-md">
            <button
              onClick={handleZoomIn}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitView}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition"
              title="Fit view"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
            <div className="mt-1 px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-300 text-center">
              {Math.round(zoomLevel * 100)}%
            </div>
          </div>
        </ReactFlow>

        {/* Legend Sidebar */}
        {showLegend && (
          <div className="absolute bottom-6 left-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 max-w-xs z-10">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Department Colors</h3>
            <div className="space-y-2">
              {Object.entries(departmentColors).map(([dept, colors]) => (
                <div key={dept} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colors.from} ${colors.to}`} />
                  <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">{dept}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p><span className="font-semibold">Total Employees:</span> {stats.total}</p>
              <p><span className="font-semibold">Departments:</span> {departments.length}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgTreeCanvas;
