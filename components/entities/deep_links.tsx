"use client";

import React, { useState } from 'react';
import { useQuery } from 'hasyx';
import { Button as UIButton } from 'hasyx/components/ui/button';
import { Card as UICard, CardContent, CardHeader, CardTitle } from 'hasyx/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from 'hasyx/components/ui/avatar';
import { Badge } from 'hasyx/components/ui/badge';
import { X } from 'lucide-react';
import { CytoNode as CytoNodeComponent, CytoEdge as CytoEdgeComponent } from 'hasyx/lib/cyto';
import { cn } from 'hasyx/lib/utils';

interface DeepLinkData {
  id?: string;
  deep: any;
  [key: string]: any;
}

export function Button({ data, ...props }: {
  data: DeepLinkData;
  [key: string]: any;
}) {
  return (
    <UIButton
      variant="outline"
      className="h-auto p-2 justify-start gap-2 min-w-0"
      {...props}
    >
      <span className="truncate text-xs">{data?.id}</span>
    </UIButton>
  );
}

export function Card({ data, onClose, ...props }: {
  data: DeepLinkData;
  onClose?: () => void;
  [key: string]: any;
}) {
  return (
    <UICard className="w-80" {...props}>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{data?.id}</div>
      </CardContent>
    </UICard>
  );
}

export function CytoNode({ data, ...props }: {
  data: DeepLinkData;
  [key: string]: any;
}) {
  const name = data?._name || data?.id?.slice(0, 4);
  const image = data?.image;
  const [opened, setOpened] = useState(false);
  const deep = data?.deep;
  return <>
    <CytoNodeComponent {...props}
      onClick={() => setOpened(true)}
      element={{
        id: data.id,
        ...props?.element,
        data: {
          id: data.id,
          label: 'abc',
          image: image,
        },
        classes: cn('entity', 'deep_links', { avatar: !!image, opened, }, props.classes)
      }}
      children={opened ? <Card data={data} onClose={() => setOpened(false)} /> : null}
    />
    {!!deep && <>
      {!!deep?._type && <CytoEdgeComponent {...props}
        element={{
          id: `${deep._id}_type`,
          data: {
            id: `${deep._id}_type`,
            source: deep._id,
            target: deep?._type,
            _: '_type',
          },
          classes: cn('deep_links', '_type', props.classes).split(' '),
        }}
      />}
      {!!deep?._from && <CytoEdgeComponent {...props}
        element={{
          id: `${deep._id}_from`,
          data: {
            id: `${deep._id}_from`,
            source: deep._id,
            target: deep?._from,
            _: '_from',
          },
          classes: cn('deep_links', '_from', props.classes).split(' '),
        }}
      />}
      {!!deep?._to && <CytoEdgeComponent {...props}
        element={{
          id: `${deep._id}_to`,
          data: {
            id: `${deep._id}_to`,
            source: deep._id,
            target: deep?._to,
            _: '_to',
          },
          classes: cn('deep_links', '_to', props.classes).split(' '),
        }}
      />}
      {/* {!!deep?._value && <CytoEdgeComponent {...props}
        element={{
          id: `${deep._id}_value`,
          data: {
            id: `${deep._id}_value`,
            source: deep._id,
            target: deep?._value,
            _: '_value',
          },
          classes: cn('deep_links', '_value', props.classes).split(' '),
        }}
      />} */}
    </>}
  </>;
}