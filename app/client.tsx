"use client"

import Debug from '@/lib/debug';
import { useSubscription } from "hasyx";
import { Avatar, AvatarFallback, AvatarImage } from "hasyx/components/ui/avatar";
import { Badge } from "hasyx/components/ui/badge";

import { Cyto, CytoEdge, CytoNode, CytoStyle } from "hasyx/lib/cyto";
import React, { useCallback, useMemo } from "react";

import { useDeep } from "deep7/lib/react";
import { Button } from 'hasyx/components/ui/button';

const debug = Debug('cyto');

// Стили для Cytoscape
const stylesheet = [
  {
    selector: 'node',
    style: {
      'background-color': '#000000',
      'background-opacity': 0,
      'shape': 'rectangle',
      'width': 150,
      'height': 80
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 1,
      'line-color': '#d3d3d3',
      'target-arrow-color': '#d3d3d3',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier'
    }
  },
  {
    selector: `node.deep`,
    style: {
    }
  },
  {
    selector: `edge.deep-context`,
    style: {
    }
  },
  {
    selector: `edge.deep-type`,
    style: {
      'line-style': 'dashed',
    }
  },
];

function CytoDeep({ deep }: { deep: any }) {
  if (deep._id == deep.deep._id) {
    return <CytoDeepDeep deep={deep} />;
  }
  if (deep.type) {
    if (deep.type.is(deep.Contain)) {
      return <CytoDeepContext deep={deep} />;
    } else if (deep.type.is(deep.String) || deep.type.is(deep.Number) || deep.type.is(deep.Function)) {
      return <></>;
    }
  }
  return <CytoDeepNode deep={deep} />;
};

function CytoDeepDeep({ deep }: { deep: any }) {
  return <CytoNode element={{
    id: `deep-${deep._id}`,
    data: {
      id: `deep-${deep._id}`,
    },
    classes: ['deep'],
  }}>
    <Avatar className="w-50 h-50">
      <AvatarImage src={'/logo.svg'} />
      <AvatarFallback>D</AvatarFallback>
    </Avatar>
  </CytoNode>;
}

function CytoDeepNode({ deep }: { deep: any }) {
  let name = `${deep._id.slice(0, 4)}...`;
  if (deep.name) name = `${name} ${deep.name}`;
  // if (deep.type) name = `${name} (${deep.type.name})`;
  return <>
    <CytoNode element={{
      id: `deep-${deep._id}`,
      data: {
        id: `deep-${deep._id}`,
      },
      classes: ['deep'],
    }}>
      <div className="">
        <Badge variant="outline">
          <div>{name}</div>
        </Badge>
      </div>
    </CytoNode>
    {deep._type && <CytoEdge element={{
      id: `deep-type-${deep._id}`,
      data: {
        id: `deep-type-${deep._id}`,
        source: `deep-${deep._id}`,
        target: `deep-${deep._type}`,
      },
      classes: ['deep-type'],
    }}/>}
  </>;
}

function CytoDeepContext({ deep }: { deep: any }) {
  return <CytoEdge element={{
    id: `deep-context-${deep._id}`,
    data: {
      id: `deep-context-${deep._id}`,
      source: `deep-${deep._from}`,
      target: `deep-${deep._to}`,
    },
    classes: ['deep-context'],
  }} />;
}

export default function Client() {
  const deep = useDeep();

  const elements = useMemo(() => {
    const elements: any = [];
    if (deep) {
      for (const id of deep._ids) {
        const d = deep(id);
        elements.push(<CytoDeep key={id} deep={d} />);
      }
    }
    return elements;
  }, [deep]);

  const onGraphLoaded = useCallback((cy) => {
    global.cy = cy;
    cy.zoom(1);
    cy.center();
  }, []);

  const onInsert = useCallback((inserted, insertQuery) => {
    debug("Cyto client: onInsert called", { inserted, insertQuery });
  }, []);
  
  const layoutConfig = useMemo(() => ({
    name: 'cola',
    nodeDimensionsIncludeLabels: true,
    fit: false
  }), []);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Cyto 
        onLoaded={onGraphLoaded}
        onInsert={onInsert}
        buttons={true}
        layout={layoutConfig}
      >
        <CytoStyle stylesheet={stylesheet} />

        {elements}
      </Cyto>
    </div>
  );
}
