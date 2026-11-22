import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ArrowLeftRight, Pencil, Trash2 } from 'lucide-react';
import type { LexoProject, State, Transition } from '../engine/types';
import { groupedLabel } from '../model/project';
import type { CanvasHandle, Selection, Tool } from '../uiTypes';
import {
  clampZoom,
  edgeGeometry,
  fitCamera,
  NODE_RADIUS,
  screenToWorld,
  snapToGrid,
  type Camera,
  type Point,
} from '../utils/geometry';

interface GraphCanvasProps {
  project: LexoProject;
  tool: Tool;
  selection: Selection;
  activeStateIds: string[];
  firedTransitionIds: string[];
  onSelect: (selection: Selection) => void;
  onCreateState: (x: number, y: number) => void;
  onCreateTransition: (from: string, to: string) => void;
  onMoveState: (id: string, x: number, y: number, final: boolean) => void;
  onDeleteState: (id: string) => void;
  onEditEdge: (from: string, to: string) => void;
  onInvertEdge?: (from: string, to: string) => void;
  onReassignEdge?: (from: string, to: string, nextFrom: string, nextTo: string) => void;
  onUpdateEdgeComment?: (from: string, to: string, comment?: string) => void;
  onDeleteEdge?: (from: string, to: string) => void;
  showGrid?: boolean;
  snapEnabled?: boolean;
  showNotes?: boolean;
}

interface EdgeContextMenuState {
  from: string;
  to: string;
  x: number;
  y: number;
}

interface EdgeGroup {
  from: string;
  to: string;
  transitions: Transition[];
  key: string;
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
  moved: boolean;
}

interface PanState {
  startX: number;
  startY: number;
  cameraX: number;
  cameraY: number;
  moved: boolean;
}

function groupEdges(transitions: Transition[]): EdgeGroup[] {
  const groups = new Map<string, EdgeGroup>();

  for (const transition of transitions) {
    const key = `${transition.from}->${transition.to}`;
    const existing = groups.get(key);
    if (existing) {
      existing.transitions.push(transition);
    } else {
      groups.set(key, {
        from: transition.from,
        to: transition.to,
        transitions: [transition],
        key,
      });
    }
  }

  return [...groups.values()];
}

function nodeFontSize(label: string): number {
  if (label.length <= 4) {
    return 12;
  }
  if (label.length <= 7) {
    return 10;
  }
  return 9;
}

export const GraphCanvas = forwardRef<CanvasHandle, GraphCanvasProps>(function GraphCanvas(
  {
    project,
    tool,
    selection,
    activeStateIds,
    firedTransitionIds,
    onSelect,
    onCreateState,
    onCreateTransition,
    onMoveState,
    onDeleteState,
    onEditEdge,
    onInvertEdge,
    onReassignEdge,
    onUpdateEdgeComment,
    onDeleteEdge,
    showGrid = true,
    snapEnabled = true,
    showNotes = true,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [hoverWorld, setHoverWorld] = useState<Point | null>(null);
  const [panning, setPanning] = useState(false);
  const [edgeMenu, setEdgeMenu] = useState<EdgeContextMenuState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const touchPointersRef = useRef<Map<number, Point>>(new Map());
  const pinchRef = useRef<{ distance: number; mid: Point } | null>(null);
  const spaceRef = useRef(false);
  const fittedProject = useRef<string | null>(null);

  const openEdgeMenu = useCallback(
    (event: ReactMouseEvent, from: string, to: string) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      const rawX = rect ? event.clientX - rect.left : event.clientX;
      const rawY = rect ? event.clientY - rect.top : event.clientY;
      setEdgeMenu({
        from,
        to,
        x: Math.max(8, Math.min(rawX, Math.max(8, size.width - 248))),
        y: Math.max(8, Math.min(rawY, Math.max(8, size.height - 220))),
      });
      onSelect({ kind: 'edge', from, to });
    },
    [onSelect, size.height, size.width],
  );

  useEffect(() => {
    if (!edgeMenu) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEdgeMenu(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [edgeMenu]);

  const activeStates = useMemo(() => new Set(activeStateIds), [activeStateIds]);
  const firedEdges = useMemo(() => new Set(firedTransitionIds), [firedTransitionIds]);
  const statesById = useMemo(
    () => new Map(project.states.map((state) => [state.id, state])),
    [project.states],
  );
  const groups = useMemo(() => groupEdges(project.transitions), [project.transitions]);
  const reverseKeys = useMemo(() => new Set(groups.map((group) => group.key)), [groups]);

  const getRect = useCallback(() => {
    return svgRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
  }, []);

  const toWorld = useCallback(
    (event: { clientX: number; clientY: number }): Point => {
      return screenToWorld(event.clientX, event.clientY, getRect(), camera);
    },
    [camera, getRect],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: Math.max(1, entry.contentRect.width),
          height: Math.max(1, entry.contentRect.height),
        });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fit = useCallback(() => {
    setCamera(fitCamera(project.states, size.width, size.height));
  }, [project.states, size.width, size.height]);

  useEffect(() => {
    if (size.width <= 1 || size.height <= 1) {
      return;
    }
    if (fittedProject.current !== project.id) {
      fittedProject.current = project.id;
      setCamera(fitCamera(project.states, size.width, size.height));
    }
  }, [project.id, project.states, size.width, size.height]);

  const zoomAt = useCallback(
    (factor: number, screenX: number, screenY: number) => {
      setCamera((current) => {
        const zoom = clampZoom(current.zoom * factor);
        if (zoom === current.zoom) {
          return current;
        }
        const worldX = screenX / current.zoom + current.x;
        const worldY = screenY / current.zoom + current.y;
        return {
          zoom,
          x: worldX - screenX / zoom,
          y: worldY - screenY / zoom,
        };
      });
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => zoomAt(1.2, size.width / 2, size.height / 2),
      zoomOut: () => zoomAt(1 / 1.2, size.width / 2, size.height / 2),
      fit,
      centerOnState: (stateId: string) => {
        const state = statesById.get(stateId);
        if (!state) {
          return;
        }
        setCamera((current) => ({
          ...current,
          x: state.x - size.width / (2 * current.zoom),
          y: state.y - size.height / (2 * current.zoom),
        }));
      },
    }),
    [zoomAt, fit, size.width, size.height, statesById],
  );

  useEffect(() => {
    const element = svgRef.current;
    if (!element) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomAt(
        event.deltaY < 0 ? 1.12 : 1 / 1.12,
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [zoomAt]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spaceRef.current = true;
      }
      if (event.key === 'Escape') {
        setPendingFrom(null);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spaceRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleBackgroundPointerDown = (event: ReactPointerEvent<SVGRectElement>) => {
    setEdgeMenu(null);
    if (event.button !== 0 && event.button !== 1) {
      return;
    }

    setPendingFrom(null);
    const shouldPan = event.button === 1 || spaceRef.current || tool === 'select' || tool === 'erase';
    if (!shouldPan) {
      return;
    }

    panRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      cameraX: camera.x,
      cameraY: camera.y,
      moved: false,
    };
    setPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (pendingFrom) {
      setHoverWorld(toWorld(event));
    }

    const drag = dragRef.current;
    if (drag) {
      const world = toWorld(event);
      const rawX = world.x - drag.offsetX;
      const rawY = world.y - drag.offsetY;
      const x = snapEnabled ? snapToGrid(rawX) : Math.round(rawX);
      const y = snapEnabled ? snapToGrid(rawY) : Math.round(rawY);
      if (!drag.moved) {
        drag.moved = true;
      }
      onMoveState(drag.id, x, y, false);
      return;
    }

    if (touchPointersRef.current.has(event.pointerId)) {
      touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointersRef.current.size === 2) {
        const [p1, p2] = [...touchPointersRef.current.values()];
        if (p1 && p2) {
          const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
          const prev = pinchRef.current;
          if (prev && prev.distance > 0) {
            const rect = svgRef.current?.getBoundingClientRect();
            const factor = distance / prev.distance;
            const dx = mid.x - prev.mid.x;
            const dy = mid.y - prev.mid.y;
            setCamera((current) => {
              const nextZoom = clampZoom(current.zoom * factor);
              const screenX = mid.x - (rect?.left ?? 0);
              const screenY = mid.y - (rect?.top ?? 0);
              const worldX = screenX / current.zoom + current.x;
              const worldY = screenY / current.zoom + current.y;
              return {
                zoom: nextZoom,
                x: worldX - screenX / nextZoom - dx / nextZoom,
                y: worldY - screenY / nextZoom - dy / nextZoom,
              };
            });
          }
          pinchRef.current = { distance, mid };
          return;
        }
      }
    }

    const pan = panRef.current;
    if (pan) {
      const dx = event.clientX - pan.startX;
      const dy = event.clientY - pan.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        pan.moved = true;
      }
      setCamera((current) => ({
        ...current,
        x: pan.cameraX - dx / current.zoom,
        y: pan.cameraY - dy / current.zoom,
      }));
    }
  };

  const handlePointerUp = (event?: ReactPointerEvent<SVGSVGElement>) => {
    if (event) {
      touchPointersRef.current.delete(event.pointerId);
      if (touchPointersRef.current.size < 2) {
        pinchRef.current = null;
      }
    }

    const drag = dragRef.current;
    if (drag) {
      dragRef.current = null;
      if (drag.moved) {
        const state = statesById.get(drag.id);
        if (state) {
          onMoveState(drag.id, state.x, state.y, true);
        }
      }
    }

    const pan = panRef.current;
    if (pan) {
      panRef.current = null;
      setPanning(false);
      if (!pan.moved) {
        onSelect({ kind: 'none' });
      }
    }
  };

  const handleNodePointerDown = (
    event: ReactPointerEvent<SVGGElement>,
    state: State,
  ) => {
    event.stopPropagation();

    if (tool === 'erase') {
      onDeleteState(state.id);
      return;
    }

    if (tool === 'transition') {
      if (!pendingFrom) {
        setPendingFrom(state.id);
        onSelect({ kind: 'state', id: state.id });
      } else {
        onCreateTransition(pendingFrom, state.id);
        setPendingFrom(null);
      }
      return;
    }

    if (tool === 'state') {
      onSelect({ kind: 'state', id: state.id });
      return;
    }

    onSelect({ kind: 'state', id: state.id });
    const world = toWorld(event);
    dragRef.current = {
      id: state.id,
      offsetX: world.x - state.x,
      offsetY: world.y - state.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleBackgroundDoubleClick = (event: ReactPointerEvent<SVGRectElement>) => {
    if (tool !== 'select' && tool !== 'state') {
      return;
    }
    const world = toWorld(event);
    onCreateState(
      snapEnabled ? snapToGrid(world.x) : Math.round(world.x),
      snapEnabled ? snapToGrid(world.y) : Math.round(world.y),
    );
  };

  const gridSize = 24 * camera.zoom;
  const gridOffsetX = ((-camera.x * camera.zoom) % gridSize + gridSize) % gridSize;
  const gridOffsetY = ((-camera.y * camera.zoom) % gridSize + gridSize) % gridSize;
  const cursorClass =
    tool === 'state' || tool === 'transition'
      ? 'cursor-crosshair'
      : tool === 'erase'
        ? 'cursor-not-allowed'
        : panning
          ? 'cursor-grabbing'
          : 'cursor-grab';

  const pendingState = pendingFrom ? statesById.get(pendingFrom) : undefined;
  const hoverTarget = hoverWorld;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[var(--bg-canvas)]">
      <svg
        ref={svgRef}
        className={`h-full w-full touch-none select-none ${cursorClass}`}
        role="img"
        aria-label="Lienzo del autómata"
        onPointerDown={(event) => {
          if (event.pointerType === 'touch') {
            touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (touchPointersRef.current.size === 2) {
              dragRef.current = null;
              panRef.current = null;
              const [p1, p2] = [...touchPointersRef.current.values()];
              if (p1 && p2) {
                pinchRef.current = {
                  distance: Math.hypot(p2.x - p1.x, p2.y - p1.y),
                  mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
                };
              }
            }
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => handlePointerUp()}
      >
        <defs>
          <pattern
            id="canvas-dots"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
            x={gridOffsetX}
            y={gridOffsetY}
          >
            <circle cx={1.2} cy={1.2} r={1.1} fill="var(--bg-dot-grid)" />
          </pattern>
          <marker
            id="canvas-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-secondary)" />
          </marker>
          <marker
            id="canvas-arrow-active"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-active)" />
          </marker>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill={showGrid ? 'url(#canvas-dots)' : 'transparent'}
          onPointerDown={handleBackgroundPointerDown}
          onDoubleClick={handleBackgroundDoubleClick}
        />

        <g transform={`translate(${-camera.x * camera.zoom} ${-camera.y * camera.zoom}) scale(${camera.zoom})`}>
          {groups.map((group) => {
            const from = statesById.get(group.from);
            const to = statesById.get(group.to);
            if (!from || !to) {
              return null;
            }

            const reverseKey = `${group.to}->${group.from}`;
            const reverseGroup = groups.find((candidate) => candidate.key === reverseKey);
            const hasReverse =
              group.from !== group.to &&
              reverseKeys.has(reverseKey) &&
              group.transitions.every((transition) => transition.curveOffset === 0) &&
              (reverseGroup?.transitions.every((transition) => transition.curveOffset === 0) ?? false);

            const geometry = edgeGeometry(from, to, group.transitions[0]?.curveOffset ?? 0, {
              hasReverse,
            });
            const active = group.transitions.some((transition) => firedEdges.has(transition.id));
            const selected =
              selection.kind === 'edge' &&
              selection.from === group.from &&
              selection.to === group.to;
            const lines = groupedLabel(project, group.transitions).split('\n');
            const edgeNote = group.transitions.find((item) => item.comment?.trim())?.comment?.trim();
            const lineHeight = 14;
            const labelWidth = Math.max(
              26,
              Math.max(...lines.map((line) => line.length)) * 6.5 + 16,
            );
            const labelHeight = lines.length * lineHeight + 6;
            const stroke = active
              ? 'var(--accent-active)'
              : selected
                ? 'var(--accent-selection)'
                : 'var(--text-secondary)';

            return (
              <g key={group.key}>
                <path
                  d={geometry.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  className="cursor-pointer"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    onSelect({ kind: 'edge', from: group.from, to: group.to });
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    onEditEdge(group.from, group.to);
                  }}
                  onContextMenu={(event) => openEdgeMenu(event, group.from, group.to)}
                />
                <path
                  d={geometry.path}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={selected || active ? 2.2 : 1.5}
                  strokeDasharray={active ? '7 5' : undefined}
                  markerEnd={
                    active ? 'url(#canvas-arrow-active)' : 'url(#canvas-arrow)'
                  }
                  className="pointer-events-none transition-[stroke] duration-150"
                />
                <g
                  transform={`translate(${geometry.label.x} ${geometry.label.y})`}
                  className="cursor-pointer"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setEdgeMenu(null);
                    onSelect({ kind: 'edge', from: group.from, to: group.to });
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    onEditEdge(group.from, group.to);
                  }}
                  onContextMenu={(event) => openEdgeMenu(event, group.from, group.to)}
                >
                  <rect
                    x={-labelWidth / 2}
                    y={-labelHeight / 2}
                    width={labelWidth}
                    height={labelHeight}
                    rx={6}
                    fill="var(--bg-surface)"
                    stroke={active || selected ? stroke : 'var(--border-subtle)'}
                    strokeWidth={1}
                  />
                  {lines.map((line, index) => (
                    <text
                      key={`${line}-${index}`}
                      x={0}
                      y={-labelHeight / 2 + 15 + index * lineHeight}
                      textAnchor="middle"
                      className="mono pointer-events-none"
                      fontSize={11}
                      fill="var(--text-primary)"
                    >
                      {line}
                    </text>
                  ))}
                  {showNotes && edgeNote ? (
                    <text
                      x={0}
                      y={labelHeight / 2 + 11}
                      textAnchor="middle"
                      className="pointer-events-none"
                      fontSize={9}
                      fill="var(--text-muted)"
                    >
                      {edgeNote.length > 22 ? `${edgeNote.slice(0, 21)}…` : edgeNote}
                    </text>
                  ) : null}
                </g>
              </g>
            );
          })}

          {pendingState && hoverTarget ? (
            <line
              x1={pendingState.x}
              y1={pendingState.y}
              x2={hoverTarget.x}
              y2={hoverTarget.y}
              stroke="var(--accent-active)"
              strokeWidth={1.6}
              strokeDasharray="6 5"
              className="pointer-events-none"
            />
          ) : null}

          {project.states.map((state) => {
            const active = activeStates.has(state.id);
            const selected = selection.kind === 'state' && selection.id === state.id;
            const pending = pendingFrom === state.id;

            return (
              <g
                key={state.id}
                transform={`translate(${state.x} ${state.y})`}
                className={tool === 'select' ? 'cursor-grab' : 'cursor-pointer'}
                onPointerDown={(event) => handleNodePointerDown(event, state)}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  onSelect({ kind: 'state', id: state.id });
                }}
              >
                {active ? (
                  <circle
                    r={NODE_RADIUS + 8}
                    fill="var(--accent-active-soft)"
                    stroke="var(--accent-active)"
                    strokeWidth={2}
                    className="pointer-events-none"
                  />
                ) : null}

                {state.isInitial ? (
                  <path
                    d={`M ${-NODE_RADIUS - 38} 0 L ${-NODE_RADIUS - 4} 0`}
                    stroke={active ? 'var(--accent-active)' : 'var(--text-secondary)'}
                    strokeWidth={1.6}
                    fill="none"
                    markerEnd="url(#canvas-arrow)"
                    className="pointer-events-none"
                  />
                ) : null}

                <circle
                  r={NODE_RADIUS}
                  fill="var(--bg-surface)"
                  stroke={
                    selected || pending
                      ? 'var(--accent-selection)'
                      : active
                        ? 'var(--accent-active)'
                        : state.isAccepting
                          ? 'var(--accent-accept)'
                          : 'var(--border-strong)'
                  }
                  strokeWidth={selected || active ? 2.4 : 1.6}
                  className="transition-[stroke] duration-150"
                />

                {state.isAccepting ? (
                  <circle
                    r={NODE_RADIUS - 6}
                    fill="none"
                    stroke={active ? 'var(--accent-active)' : 'var(--accent-accept)'}
                    strokeWidth={1.2}
                    className="pointer-events-none"
                  />
                ) : null}

                <text
                  y={4}
                  textAnchor="middle"
                  className="mono pointer-events-none"
                  fontSize={nodeFontSize(state.label)}
                  fill="var(--text-primary)"
                >
                  {state.label}
                </text>

                {showNotes && state.comment?.trim() ? (
                  <text
                    y={NODE_RADIUS + 13}
                    textAnchor="middle"
                    className="pointer-events-none"
                    fontSize={9}
                    fill="var(--text-muted)"
                  >
                    {state.comment.trim().length > 22
                      ? `${state.comment.trim().slice(0, 21)}…`
                      : state.comment.trim()}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
        <span className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 px-1.5 py-0.5 backdrop-blur">
          {Math.round(camera.zoom * 100)}%
        </span>
        <span>{project.states.length} estados</span>
        <span>{project.transitions.length} reglas</span>
        {pendingFrom ? (
          <span className="text-[var(--accent-active)]">elige el destino · Esc cancela</span>
        ) : null}
      </div>

      {edgeMenu ? (
        <div
          role="menu"
          aria-label="Acciones de arista"
          style={{ left: edgeMenu.x, top: edgeMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute z-30 w-60 space-y-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2.5 text-[12px] shadow-[var(--shadow-panel)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5">
            <span className="mono text-[11px] font-medium text-[var(--text-secondary)]">
              {statesById.get(edgeMenu.from)?.label ?? edgeMenu.from} →{' '}
              {statesById.get(edgeMenu.to)?.label ?? edgeMenu.to}
            </span>
            <button
              type="button"
              onClick={() => setEdgeMenu(null)}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Esc
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onEditEdge(edgeMenu.from, edgeMenu.to);
              setEdgeMenu(null);
            }}
            className="flex h-7 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
          >
            <Pencil aria-hidden="true" className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            Editar transiciones
          </button>

          <button
            type="button"
            disabled={edgeMenu.from === edgeMenu.to}
            onClick={() => {
              onInvertEdge?.(edgeMenu.from, edgeMenu.to);
              setEdgeMenu(null);
            }}
            className="flex h-7 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] disabled:opacity-40"
          >
            <ArrowLeftRight aria-hidden="true" className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            Invertir dirección
          </button>

          {onReassignEdge ? (
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <label className="space-y-0.5">
                <span className="text-[10px] text-[var(--text-muted)]">Origen</span>
                <select
                  value={edgeMenu.from}
                  onChange={(event) => {
                    const nextFrom = event.target.value;
                    onReassignEdge(edgeMenu.from, edgeMenu.to, nextFrom, edgeMenu.to);
                    setEdgeMenu((current) => (current ? { ...current, from: nextFrom } : null));
                  }}
                  className="mono h-7 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-1 text-[11px] text-[var(--text-primary)]"
                >
                  {project.states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-[var(--text-muted)]">Destino</span>
                <select
                  value={edgeMenu.to}
                  onChange={(event) => {
                    const nextTo = event.target.value;
                    onReassignEdge(edgeMenu.from, edgeMenu.to, edgeMenu.from, nextTo);
                    setEdgeMenu((current) => (current ? { ...current, to: nextTo } : null));
                  }}
                  className="mono h-7 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-1 text-[11px] text-[var(--text-primary)]"
                >
                  {project.states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {onUpdateEdgeComment ? (
            <label className="block space-y-0.5 pt-0.5">
              <span className="text-[10px] text-[var(--text-muted)]">Nota</span>
              <input
                type="text"
                value={
                  project.transitions.find(
                    (item) => item.from === edgeMenu.from && item.to === edgeMenu.to && item.comment,
                  )?.comment ?? ''
                }
                placeholder="Anotación opcional…"
                onChange={(event) =>
                  onUpdateEdgeComment(edgeMenu.from, edgeMenu.to, event.target.value)
                }
                className="h-7 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 text-[11px] text-[var(--text-primary)] focus:border-[var(--border-strong)] focus:outline-none"
              />
            </label>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onDeleteEdge?.(edgeMenu.from, edgeMenu.to);
              setEdgeMenu(null);
            }}
            className="flex h-7 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left text-[var(--accent-reject)] hover:bg-[var(--accent-reject-soft)]"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            Eliminar arista
          </button>
        </div>
      ) : null}
    </div>
  );
});
