"use client"

import { useEffect, useState } from "react";
import { 
  GraphView, 
  type INode,
  type IEdge,
  type SelectionT,
  type IPoint
} from "react-digraph";
import {
  Card,
  CardHeader,
  CardTitle,
} from "hasyx/components/ui/card";
import { useDeep } from "@/lib/react";

// GraphConfig for react-digraph
const GraphConfig = {
  NodeTypes: {
    empty: {
      typeText: "Node",
      shapeId: "#empty",
      shape: (
        <symbol viewBox="0 0 100 100" id="empty" key="0">
          <circle cx="50" cy="50" r="45"></circle>
        </symbol>
      )
    }
  },
  NodeSubtypes: {},
  EdgeTypes: {
    emptyEdge: {
      shapeId: "#emptyEdge",
      shape: (
        <symbol viewBox="0 0 50 50" id="emptyEdge" key="0">
          <circle cx="25" cy="25" r="8" fill="currentColor"></circle>
        </symbol>
      )
    }
  }
};

// Constants for graph rendering
const NODE_KEY = "id";

// Custom node renderer for shadcn Card components
const CustomNodeRender = (nodeRef: React.RefObject<SVGGElement>, data: INode, id: string, selected: boolean, hovered: boolean) => {
  // Extract first part of UUID (before first dash)
  const shortId = data.title ? data.title.split('-')[0] : 'Unknown';
  
  return (
    <g ref={nodeRef}>
      <foreignObject x={-75} y={-40} width={150} height={80}>
        <Card className="w-full h-full bg-white shadow-md border border-gray-200">
          <CardHeader className="p-2">
            <CardTitle className="text-sm font-semibold">{shortId}</CardTitle>
          </CardHeader>
        </Card>
      </foreignObject>
    </g>
  );
};

export default function App() {
  const deep = useDeep();
  const [graphData, setGraphData] = useState<{ nodes: INode[]; edges: IEdge[]; }>({ nodes: [], edges: [] });
  const [selected, setSelected] = useState<SelectionT>({ nodes: new Map(), edges: new Map() });

  useEffect(() => {
    if (!deep || !deep._id) return;
    
    try {
      // Get all IDs from deep._id Set
      const ids = Array.from(deep._id) as string[];
      
      // Create nodes from IDs - position them in a circle layout
      const nodes: INode[] = ids.map((id, index) => {
        const angle = (index / ids.length) * 2 * Math.PI;
        const radius = Math.min(500, ids.length * 30);
        const x = Math.cos(angle) * radius + 600;
        const y = Math.sin(angle) * radius + 400;
        
        return {
          id,
          title: id,
          x,
          y,
          type: 'empty'
        };
      });

      // Create edges connecting consecutive nodes
      const edges: IEdge[] = [];
      if (nodes.length > 1) {
        for (let i = 0; i < nodes.length; i++) {
          edges.push({
            source: nodes[i].id,
            target: nodes[(i + 1) % nodes.length].id,
            type: 'emptyEdge'
          });
        }
      }

      setGraphData({ nodes, edges });
    } catch (error) {
      console.error("Error creating graph:", error);
    }
  }, [deep]);

  // Graph event handlers
  const onSelect = (selected: SelectionT) => {
    setSelected(selected);
  };

  const onCreateNode = (x: number, y: number) => {
    // Create node functionality (if needed)
  };

  const onUpdateNode = (node: INode, updatedNodes?: Map<string, INode> | null, updatedNodePosition?: IPoint) => {
    // Update node position functionality
    const nodes = graphData.nodes.map(n => {
      if (n.id === node.id) {
        return { ...n, x: node.x, y: node.y };
      }
      return n;
    });
    setGraphData({ ...graphData, nodes });
  };

  const onCreateEdge = (sourceNode: INode, targetNode: INode) => {
    // Create edge functionality (if needed)
  };

  const onSwapEdge = (sourceNode: INode, targetNode: INode, edge: IEdge) => {
    // Swap edge functionality (if needed)
  };

  return (
    <div className="w-full h-screen bg-gray-50 p-4">
      <div className="w-full h-full border border-gray-200 rounded-lg bg-white">
        {deep && graphData.nodes.length > 0 ? (
          <GraphView
            nodeKey={NODE_KEY}
            nodes={graphData.nodes}
            edges={graphData.edges}
            selected={selected}
            nodeTypes={GraphConfig.NodeTypes}
            nodeSubtypes={GraphConfig.NodeSubtypes}
            edgeTypes={GraphConfig.EdgeTypes}
            onSelect={onSelect}
            onCreateNode={onCreateNode}
            onUpdateNode={onUpdateNode}
            onCreateEdge={onCreateEdge}
            onSwapEdge={onSwapEdge}
            renderNode={CustomNodeRender}
            gridDotSize={1}
            gridSize={5000}
            gridSpacing={100}
            showGraphControls={true}
            zoomDelay={500}
            minZoom={0.1}
            maxZoom={1.5}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <p>Loading graph data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
