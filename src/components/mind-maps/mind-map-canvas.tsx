'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FoldHorizontal, Maximize, Minimize, Scan, UnfoldHorizontal, ZoomIn, ZoomOut } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { countMindMapNodes, type MindMapNode } from '@/lib/mind-maps/parse-markdown';
import { fitToViewport, layoutMindMap, type NodeSize, type PositionedNode } from '@/lib/mind-maps/layout';

/**
 * Interactive mind map: nodes are HTML (real fonts, wrapping, design tokens), edges are
 * one SVG layer, both inside a single transformed plane. Nodes are measured once per
 * (depth, text) before paint, then laid out by `layoutMindMap`.
 *
 * Gestures: drag to pan, pinch / ctrl+wheel to zoom, wheel or trackpad to pan, tap a
 * branch to fold it. Keyboard (when the map has focus): arrows pan, + / − zoom, 0 fits.
 */

interface MindMapCanvasProps {
  root: MindMapNode;
  /** Changing it re-fits the map to the viewport (e.g. a different map, or a structure change). */
  fitKey?: string;
  className?: string;
}

interface View {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 2.5;
const DRAG_THRESHOLD = 4;
const AUTO_COLLAPSE_ABOVE = 120;

const NODE_CLASS = [
  'max-w-72 rounded-2xl bg-primary px-5 py-3 text-headline-sm text-on-primary',
  'max-w-60 rounded-xl bg-card px-4 py-2.5 text-body-md font-semibold text-on-surface shadow-ambient',
  'max-w-56 rounded-lg border border-outline-variant/15 bg-card px-3 py-1.5 text-body-sm text-on-surface',
] as const;

const sizeKey = (node: MindMapNode, depth: number): string => `${Math.min(depth, 2)}|${node.text}`;

function initialCollapsed(root: MindMapNode): Set<string> {
  const collapsed = new Set<string>();
  if (countMindMapNodes(root) <= AUTO_COLLAPSE_ABOVE) return collapsed;
  const walk = (node: MindMapNode, depth: number): void => {
    if (depth >= 2 && node.children.length > 0) collapsed.add(node.id);
    node.children.forEach((child) => walk(child, depth + 1));
  };
  walk(root, 0);
  return collapsed;
}

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function MindMapCanvas({ root, fitKey, className }: MindMapCanvasProps): React.JSX.Element {
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const sizes = useRef(new Map<string, NodeSize>());
  const [sizeVersion, setSizeVersion] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => initialCollapsed(root));
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [fitted, setFitted] = useState(false);
  const fitPending = useRef(true);
  const interacted = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  const layout = useMemo(
    () => layoutMindMap(root, (node, depth) => sizes.current.get(sizeKey(node, depth)), collapsed),
    // sizeVersion: the measured sizes live in a ref; the version says they changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [root, collapsed, sizeVersion],
  );
  const allMeasured = layout.nodes.every((entry) => sizes.current.has(sizeKey(entry.node, entry.depth)));

  // Measure new nodes before paint, so they never flash at a fallback size.
  useLayoutEffect(() => {
    let changed = false;
    for (const entry of layout.nodes) {
      const key = sizeKey(entry.node, entry.depth);
      if (sizes.current.has(key)) continue;
      const element = nodeRefs.current.get(entry.node.id);
      if (!element) continue;
      sizes.current.set(key, { width: element.offsetWidth, height: element.offsetHeight });
      changed = true;
    }
    if (changed) setSizeVersion((version) => version + 1);
  }, [layout]);

  // Web fonts can swap in after the first measure: measure everything again once.
  useEffect(() => {
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (cancelled) return;
      sizes.current.clear();
      fitPending.current = !interacted.current;
      setSizeVersion((version) => version + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const fit = useCallback((): void => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const next = fitToViewport(layout.bounds, { width: viewport.clientWidth, height: viewport.clientHeight });
    setView({ x: next.x, y: next.y, scale: next.scale });
  }, [layout.bounds]);

  // Fit on first paint, after "fold/expand all", and whenever fitKey changes.
  const fittedKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!allMeasured) return;
    const key = fitKey ?? '';
    if (!fitPending.current && fittedKey.current === key) return;
    if (fittedKey.current !== key) interacted.current = false;
    fitPending.current = false;
    fittedKey.current = key;
    fit();
    setFitted(true);
  }, [allMeasured, fit, fitKey]);

  // Keep the map framed when the viewport changes size, until the user moves it.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      if (!interacted.current && allMeasured) fit();
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [allMeasured, fit]);

  useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    const onChange = (): void => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const zoomAt = useCallback((factor: number, pointX: number, pointY: number): void => {
    interacted.current = true;
    setView((current) => {
      const scale = clampScale(current.scale * factor);
      const ratio = scale / current.scale;
      return { scale, x: pointX - (pointX - current.x) * ratio, y: pointY - (pointY - current.y) * ratio };
    });
  }, []);

  const zoomCenter = useCallback(
    (factor: number): void => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      zoomAt(factor, viewport.clientWidth / 2, viewport.clientHeight / 2);
    },
    [zoomAt],
  );

  const panBy = useCallback((dx: number, dy: number): void => {
    interacted.current = true;
    setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
  }, []);

  // Wheel needs a non-passive listener to keep the page from scrolling or zooming.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const rect = viewport.getBoundingClientRect();
        zoomAt(Math.exp(-event.deltaY * 0.01), event.clientX - rect.left, event.clientY - rect.top);
      } else {
        panBy(-event.deltaX, -event.deltaY);
      }
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [panBy, zoomAt]);

  // Pointer gestures: one pointer pans, two pinch. A drag never counts as a tap on a node.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ startX: 0, startY: 0, moved: false });
  const suppressClick = useRef(false);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      gesture.current = { startX: event.clientX, startY: event.clientY, moved: false };
      suppressClick.current = false;
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const point = { x: event.clientX, y: event.clientY };

    if (pointers.current.size >= 2) {
      const others = [...pointers.current.entries()].filter(([id]) => id !== event.pointerId);
      const other = others[0]?.[1];
      pointers.current.set(event.pointerId, point);
      if (!other) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(point.x - other.x, point.y - other.y);
      const midBefore = { x: (previous.x + other.x) / 2, y: (previous.y + other.y) / 2 };
      const midAfter = { x: (point.x + other.x) / 2, y: (point.y + other.y) / 2 };
      gesture.current.moved = true;
      if (before > 0) zoomAt(after / before, midAfter.x - rect.left, midAfter.y - rect.top);
      panBy(midAfter.x - midBefore.x, midAfter.y - midBefore.y);
      return;
    }

    pointers.current.set(event.pointerId, point);
    if (!gesture.current.moved) {
      const distance = Math.hypot(point.x - gesture.current.startX, point.y - gesture.current.startY);
      if (distance < DRAG_THRESHOLD) return;
      gesture.current.moved = true;
      // Capture only once it is a drag, so a plain tap still reaches the node button.
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    panBy(point.x - previous.x, point.y - previous.y);
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>): void => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0 && gesture.current.moved) suppressClick.current = true;
  };

  const toggle = useCallback((id: string): void => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const collapseAll = (): void => {
    setCollapsed(new Set(root.children.filter((child) => child.children.length > 0).map((child) => child.id)));
    fitPending.current = true;
  };

  const expandAll = (): void => {
    setCollapsed(new Set());
    fitPending.current = true;
  };

  const toggleFullscreen = (): void => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frameRef.current?.requestFullscreen();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget) return;
    const step = 48;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => panBy(step, 0),
      ArrowRight: () => panBy(-step, 0),
      ArrowUp: () => panBy(0, step),
      ArrowDown: () => panBy(0, -step),
      '+': () => zoomCenter(1.2),
      '=': () => zoomCenter(1.2),
      '-': () => zoomCenter(1 / 1.2),
      '0': fit,
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const plane = useMemo(
    () => (
      <>
        <svg aria-hidden className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1">
          {layout.edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.path}
              className={cn('fill-none', edge.depth === 1 ? 'stroke-primary/40' : 'stroke-outline-variant')}
              strokeWidth={edge.depth === 1 ? 2.5 : 1.5}
              strokeLinecap="round"
            />
          ))}
        </svg>
        {layout.nodes.map((entry) => (
          <MindMapNodeView
            key={entry.node.id}
            entry={entry}
            onToggle={toggle}
            register={(element) => {
              if (element) nodeRefs.current.set(entry.node.id, element);
              else nodeRefs.current.delete(entry.node.id);
            }}
          />
        ))}
      </>
    ),
    [layout, toggle],
  );

  return (
    <div
      ref={frameRef}
      className={cn('relative overflow-hidden rounded-2xl bg-surface-container-low', fullscreen && 'rounded-none', className)}
    >
      <div
        ref={viewportRef}
        role="group"
        aria-roledescription="mind map"
        aria-label={`Mind map: ${root.text}. Drag to move, pinch or use the zoom buttons to zoom, tap a branch to fold it.`}
        tabIndex={0}
        className="absolute inset-0 cursor-grab touch-none outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      >
        <div
          className={cn('absolute top-0 left-0 origin-top-left', !fitted && 'invisible')}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          {plane}
        </div>
      </div>

      <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-full bg-card p-1 shadow-ambient">
        <ToolbarButton label="Zoom out" onClick={() => zoomCenter(1 / 1.25)}>
          <ZoomOut />
        </ToolbarButton>
        <span className="hidden w-11 text-center text-label-sm tabular text-on-surface-variant sm:inline">
          {Math.round(view.scale * 100)}%
        </span>
        <ToolbarButton label="Zoom in" onClick={() => zoomCenter(1.25)}>
          <ZoomIn />
        </ToolbarButton>
        <ToolbarButton label="Fit to screen" onClick={fit}>
          <Scan />
        </ToolbarButton>
        {collapsed.size > 0 ? (
          <ToolbarButton label="Expand all branches" onClick={expandAll}>
            <UnfoldHorizontal />
          </ToolbarButton>
        ) : (
          <ToolbarButton label="Fold to main branches" onClick={collapseAll}>
            <FoldHorizontal />
          </ToolbarButton>
        )}
        {canFullscreen && (
          <ToolbarButton label={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>
            {fullscreen ? <Minimize /> : <Maximize />}
          </ToolbarButton>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="size-11 rounded-full sm:size-9"
    >
      {children}
    </Button>
  );
}

function hiddenCount(node: MindMapNode): number {
  return countMindMapNodes(node) - 1;
}

function MindMapNodeView({
  entry,
  onToggle,
  register,
}: {
  entry: PositionedNode;
  onToggle: (id: string) => void;
  register: (element: HTMLElement | null) => void;
}): React.JSX.Element {
  const { node, depth, side, x, y, collapsed } = entry;
  const className = cn(
    'absolute top-0 left-0 w-max text-left break-words whitespace-normal',
    NODE_CLASS[Math.min(depth, 2)],
  );
  const style = { transform: `translate(${x}px, ${y}px)` };

  if (node.children.length === 0) {
    return (
      <div ref={register} className={className} style={style}>
        {node.text}
      </div>
    );
  }

  return (
    <button
      ref={register}
      type="button"
      aria-expanded={!collapsed}
      onClick={() => onToggle(node.id)}
      className={cn(
        className,
        'cursor-pointer outline-none transition-[filter] hover:brightness-95 focus-visible:ring-3 focus-visible:ring-ring/50',
      )}
      style={style}
    >
      {node.text}
      {collapsed && (
        <span
          className={cn(
            'absolute top-1/2 -translate-y-1/2 rounded-full bg-primary-container px-2 py-0.5 text-label-sm tabular text-on-primary-container',
            side === 'left' ? '-left-2 -translate-x-full' : '-right-2 translate-x-full',
          )}
        >
          +{hiddenCount(node)}
        </span>
      )}
    </button>
  );
}
