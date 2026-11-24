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
import { ArrowLeftRight, CheckCircle2, Flag, Pencil, Trash2 } from 'lucide-react';
import type { LexoProject, State, Transition } from '../engine/types';
import { groupedLabel } from '../model/project';
import type { CanvasHandle, Selection, Tool } from '../uiTypes';
import {
  clampZoom,
  edgeGeometry,
  fitCamera,
  GRID_SIZE,
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
  onMoveStates?: (ids: string[], dx: number, dy: number, final: boolean) => void;
  onDeleteState: (id: string) => void;
  onRenameState?: (id: string, label: string) => void;
  onMarkInitialState?: (id: string) => void;
  onToggleAcceptingState?: (id: string) => void;
  onEditEdge: (from: string, to: string) => void;
  onInvertEdge?: (from: string, to: string) => void;
  onUpdateEdgeCurve?: (from: string, to: string, curveOffset: number, final: boolean) => void;
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

interface StateContextMenuState {
  stateId: string;
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
    onMoveStates,
    onDeleteState,
    onRenameState,
    onMarkInitialState,
    onToggleAcceptingState,
    onEditEdge,
    onInvertEdge,
    onUpdateEdgeCurve,
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
  const [stateMenu, setStateMenu] = useState<StateContextMenuState | null>(null);
  const [editingState, setEditingState] = useState<{ id: string; draft: string } | null>(null);
  const [marquee, setMarquee] = useState<{ start: Point; current: Point } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const multiDragRef = useRef<{ ids: string[]; lastWorld: Point; moved: boolean } | null>(null);
  const marqueeRef = useRef<{ start: Point; current: Point } | null>(null);
  const curveDragRef = useRef<{ from: string; to: string; fromPt: Point; toPt: Point } | null>(null);
  const panRef = useRef<PanState | null>(null);
  const touchPointersRef = useRef<Map<number, Point>>(new Map());
  const pinchRef = useRef<{ distance: number; mid: Point } | null>(null);
  const pendingTouchStateRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null);
  const spaceRef = useRef(false);
  const fittedProject = useRef<string | null>(null);

  const openEdgeMenu = useCallback(
    (event: ReactMouseEvent, from: string, to: string) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      const rawX = rect ? event.clientX - rect.left : event.clientX;
      const rawY = rect ? event.clientY - rect.top : event.clientY;
      setStateMenu(null);
      setEdgeMenu({
        from,
        to,
        x: Math.max(8, Math.min(rawX, Math.max(8, size.width - 216))),
        y: Math.max(8, Math.min(rawY, Math.max(8, size.height - 150))),
      });
      onSelect({ kind: 'edge', from, to });
    },
    [onSelect, size.height, size.width],
  );

  const openStateMenu = useCallback(
    (event: ReactMouseEvent, stateId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      const rawX = rect ? event.clientX - rect.left : event.clientX;
      const rawY = rect ? event.clientY - rect.top : event.clientY;
      setEdgeMenu(null);
      setStateMenu({
        stateId,
        x: Math.max(8, Math.min(rawX, Math.max(8, size.width - 216))),
        y: Math.max(8, Math.min(rawY, Math.max(8, size.height - 150))),
      });
      onSelect({ kind: 'state', id: stateId });
    },
    [onSelect, size.height, size.width],
  );

  useEffect(() => {
    if (!edgeMenu && !stateMenu) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEdgeMenu(null);
        setStateMenu(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [edgeMenu, stateMenu]);

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
      const target = event.target as HTMLElement | null;
      const inInteractive = Boolean(
        target?.closest(
          'input, textarea, select, [contenteditable="true"], button, a, summary, [role="button"], [role="menuitem"], input[type="checkbox"]',
        ) || target?.isContentEditable,
      );
      const hasOpenDialog = Boolean(document.querySelector('[role="dialog"]'));
      if (event.code === 'Space' && !event.shiftKey && !inInteractive && !hasOpenDialog) {
        event.preventDefault();
        spaceRef.current = true;
      }
      if (event.key === 'F2' && !inInteractive && !hasOpenDialog && selection.kind === 'state') {
        const current = statesById.get(selection.id);
        if (current) {
          event.preventDefault();
          setEditingState({ id: current.id, draft: current.label });
        }
      }
      if (event.key === 'Escape') {
        setPendingFrom(null);
        setEditingState(null);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spaceRef.current = false;
      }
    };
    const handleBlur = () => {
      spaceRef.current = false;
      touchPointersRef.current.clear();
      pinchRef.current = null;
      pendingTouchStateRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [selection, statesById]);

  const handleBackgroundPointerDown = (event: ReactPointerEvent<SVGRectElement>) => {
    setEdgeMenu(null);
    setStateMenu(null);
    if (touchPointersRef.current.size >= 2) {
      pendingTouchStateRef.current = null;
      return;
    }
    if (event.button !== 0 && event.button !== 1) {
      return;
    }

    setPendingFrom(null);
    if (event.button === 0 && !spaceRef.current && tool === 'state') {
      if (event.pointerType === 'touch') {
        pendingTouchStateRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
        };
        return;
      }
      const world = toWorld(event);
      onCreateState(
        snapEnabled ? snapToGrid(world.x) : Math.round(world.x),
        snapEnabled ? snapToGrid(world.y) : Math.round(world.y),
      );
      return;
    }

    if (event.button === 0 && event.shiftKey && tool === 'select') {
      const world = toWorld(event);
      const box = { start: world, current: world };
      marqueeRef.current = box;
      setMarquee(box);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

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

    const activeMarquee = marqueeRef.current;
    if (activeMarquee) {
      const world = toWorld(event);
      const nextBox = { start: activeMarquee.start, current: world };
      marqueeRef.current = nextBox;
      setMarquee(nextBox);
      return;
    }

    const multiDrag = multiDragRef.current;
    if (multiDrag) {
      const world = toWorld(event);
      const dx = world.x - multiDrag.lastWorld.x;
      const dy = world.y - multiDrag.lastWorld.y;
      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
        multiDrag.moved = true;
        multiDrag.lastWorld = world;
        onMoveStates?.(multiDrag.ids, dx, dy, false);
      }
      return;
    }

    const curveDrag = curveDragRef.current;
    if (curveDrag) {
      const world = toWorld(event);
      const dx = curveDrag.toPt.x - curveDrag.fromPt.x;
      const dy = curveDrag.toPt.y - curveDrag.fromPt.y;
      const len = Math.hypot(dx, dy) || 1;
      const mx = (curveDrag.fromPt.x + curveDrag.toPt.x) / 2;
      const my = (curveDrag.fromPt.y + curveDrag.toPt.y) / 2;
      const nx = -dy / len;
      const ny = dx / len;
      const signed = (world.x - mx) * nx + (world.y - my) * ny;
      const clamped = Math.max(-140, Math.min(140, Math.round(signed)));
      onUpdateEdgeCurve?.(curveDrag.from, curveDrag.to, clamped, false);
      return;
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
      if (
        pendingTouchStateRef.current &&
        pendingTouchStateRef.current.pointerId === event.pointerId &&
        Math.hypot(
          event.clientX - pendingTouchStateRef.current.startX,
          event.clientY - pendingTouchStateRef.current.startY,
        ) > 10
      ) {
        pendingTouchStateRef.current = null;
      }
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
      if (
        pendingTouchStateRef.current &&
        pendingTouchStateRef.current.pointerId === event.pointerId &&
        touchPointersRef.current.size <= 1
      ) {
        const world = toWorld(event);
        onCreateState(
          snapEnabled ? snapToGrid(world.x) : Math.round(world.x),
          snapEnabled ? snapToGrid(world.y) : Math.round(world.y),
        );
      }
      pendingTouchStateRef.current = null;
      touchPointersRef.current.delete(event.pointerId);
      if (touchPointersRef.current.size < 2) {
        pinchRef.current = null;
      }
    }

    const finishedMarquee = marqueeRef.current;
    if (finishedMarquee) {
      marqueeRef.current = null;
      setMarquee(null);
      const minX = Math.min(finishedMarquee.start.x, finishedMarquee.current.x);
      const maxX = Math.max(finishedMarquee.start.x, finishedMarquee.current.x);
      const minY = Math.min(finishedMarquee.start.y, finishedMarquee.current.y);
      const maxY = Math.max(finishedMarquee.start.y, finishedMarquee.current.y);
      const hitIds = project.states
        .filter((s) => s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY)
        .map((s) => s.id);
      if (hitIds.length > 1) {
        onSelect({ kind: 'multi', stateIds: hitIds });
      } else if (hitIds.length === 1 && hitIds[0]) {
        onSelect({ kind: 'state', id: hitIds[0] });
      } else {
        onSelect({ kind: 'none' });
      }
    }

    const finishedMulti = multiDragRef.current;
    if (finishedMulti) {
      multiDragRef.current = null;
      if (finishedMulti.moved) {
        onMoveStates?.(finishedMulti.ids, 0, 0, true);
      }
    }

    const curveDragEnd = curveDragRef.current;
    if (curveDragEnd) {
      curveDragRef.current = null;
      const first = project.transitions.find(
        (t) => t.from === curveDragEnd.from && t.to === curveDragEnd.to,
      );
      onUpdateEdgeCurve?.(curveDragEnd.from, curveDragEnd.to, first?.curveOffset ?? 0, true);
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
    setEdgeMenu(null);
    setStateMenu(null);

    if (event.button === 2) {
      return;
    }

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

    if (event.shiftKey) {
      const currentIds =
        selection.kind === 'multi'
          ? [...selection.stateIds]
          : selection.kind === 'state'
            ? [selection.id]
            : [];
      const nextSet = new Set(currentIds);
      if (nextSet.has(state.id)) {
        nextSet.delete(state.id);
      } else {
        nextSet.add(state.id);
      }
      const nextIds = [...nextSet];
      if (nextIds.length > 1) {
        onSelect({ kind: 'multi', stateIds: nextIds });
      } else if (nextIds.length === 1 && nextIds[0]) {
        onSelect({ kind: 'state', id: nextIds[0] });
      } else {
        onSelect({ kind: 'none' });
      }
      return;
    }

    if (selection.kind === 'multi' && selection.stateIds.includes(state.id) && onMoveStates) {
      const world = toWorld(event);
      multiDragRef.current = {
        ids: selection.stateIds,
        lastWorld: world,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
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
    if (tool !== 'select') {
      return;
    }
    const world = toWorld(event);
    onCreateState(
      snapEnabled ? snapToGrid(world.x) : Math.round(world.x),
      snapEnabled ? snapToGrid(world.y) : Math.round(world.y),
    );
  };

  const gridSize = GRID_SIZE * camera.zoom;
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
        onPointerDownCapture={(event) => {
          if (event.pointerType === 'touch') {
            touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (touchPointersRef.current.size >= 2) {
              pendingTouchStateRef.current = null;
              if (dragRef.current) {
                if (dragRef.current.moved) {
                  const draggedState = statesById.get(dragRef.current.id);
                  if (draggedState) {
                    onMoveState(dragRef.current.id, draggedState.x, draggedState.y, true);
                  }
                }
                dragRef.current = null;
              }
              panRef.current = null;
              setPanning(false);
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
        onPointerLeave={() => {
          if (!dragRef.current && !panRef.current) {
            setHoverWorld(null);
          }
        }}
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
                    setEdgeMenu(null);
                    setStateMenu(null);
                    if (tool === 'erase') {
                      onDeleteEdge?.(group.from, group.to);
                      return;
                    }
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
                    setStateMenu(null);
                    if (tool === 'erase') {
                      onDeleteEdge?.(group.from, group.to);
                      return;
                    }
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
                  {selected && group.from !== group.to && onUpdateEdgeCurve ? (
                    <circle
                      cx={labelWidth / 2 + 8}
                      cy={0}
                      r={5}
                      fill="var(--accent-selection)"
                      stroke="var(--bg-surface)"
                      strokeWidth={1.5}
                      className="cursor-grab"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        curveDragRef.current = {
                          from: group.from,
                          to: group.to,
                          fromPt: { x: from.x, y: from.y },
                          toPt: { x: to.x, y: to.y },
                        };
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        onUpdateEdgeCurve(group.from, group.to, 0, true);
                      }}
                    >
                      <title>Arrastra para curvar arista (doble clic restablece)</title>
                    </circle>
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
            const selected =
              (selection.kind === 'state' && selection.id === state.id) ||
              (selection.kind === 'multi' && selection.stateIds.includes(state.id));
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
                  if (onRenameState) {
                    setEditingState({ id: state.id, draft: state.label });
                  }
                }}
                onContextMenu={(event) => openStateMenu(event, state.id)}
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
          {marquee ? (
            <rect
              x={Math.min(marquee.start.x, marquee.current.x)}
              y={Math.min(marquee.start.y, marquee.current.y)}
              width={Math.abs(marquee.current.x - marquee.start.x)}
              height={Math.abs(marquee.current.y - marquee.start.y)}
              fill="var(--accent-selection-soft)"
              stroke="var(--accent-selection)"
              strokeWidth={1.2}
              strokeDasharray="4 3"
              className="pointer-events-none"
            />
          ) : null}
        </g>
      </svg>

      {project.states.length <= 1 && project.transitions.length === 0 ? (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/85 px-3 py-1 text-[11px] text-[var(--text-muted)] backdrop-blur">
          Doble clic para crear un estado · <span className="mono">T</span> para conectar · clic derecho para acciones
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
        <span className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 px-1.5 py-0.5 backdrop-blur">
          {Math.round(camera.zoom * 100)}%
        </span>
        <span>{project.states.length} estados</span>
        <span>{project.transitions.length} reglas</span>
        {pendingFrom ? (
          <span className="text-[var(--accent-active)]">elige el destino · Esc cancela</span>
        ) : tool === 'state' ? (
          <span className="text-[var(--accent-selection)]">clic para crear estado</span>
        ) : tool === 'transition' ? (
          <span className="text-[var(--accent-selection)]">clic en origen → destino</span>
        ) : null}
      </div>

      {editingState ? (() => {
        const target = statesById.get(editingState.id);
        if (!target) {
          return null;
        }
        const left = (target.x - camera.x) * camera.zoom;
        const top = (target.y - camera.y) * camera.zoom;
        const commitRename = () => {
          const next = editingState.draft.trim();
          if (next && next !== target.label) {
            onRenameState?.(target.id, next);
          }
          setEditingState(null);
        };
        return (
          <input
            autoFocus
            value={editingState.draft}
            aria-label="Renombrar estado"
            style={{ left, top, transform: 'translate(-50%, -50%)' }}
            onFocus={(event) => event.currentTarget.select()}
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) =>
              setEditingState((current) =>
                current ? { ...current, draft: event.target.value } : null,
              )
            }
            onBlur={commitRename}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Enter') {
                commitRename();
              } else if (event.key === 'Escape') {
                setEditingState(null);
              }
            }}
            className="mono absolute z-30 h-7 w-24 rounded-[var(--radius-sm)] border border-[var(--accent-selection)] bg-[var(--bg-surface)] px-1.5 text-center text-[12px] font-semibold text-[var(--text-primary)] shadow-[var(--shadow-float)] focus:outline-none"
          />
        );
      })() : null}

      {stateMenu ? (
        <div
          role="menu"
          aria-label="Acciones de estado"
          style={{ left: stateMenu.x, top: stateMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute z-30 w-52 space-y-1 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2 text-[12px] shadow-[var(--shadow-panel)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1">
            <span className="mono text-[11px] font-medium text-[var(--text-secondary)]">
              {statesById.get(stateMenu.stateId)?.label ?? stateMenu.stateId}
            </span>
            <button
              type="button"
              onClick={() => setStateMenu(null)}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Esc
            </button>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onMarkInitialState?.(stateMenu.stateId);
              setStateMenu(null);
            }}
            className="flex h-7 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
          >
            <Flag aria-hidden="true" className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            Marcar inicial
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onToggleAcceptingState?.(stateMenu.stateId);
              setStateMenu(null);
            }}
            className="flex h-7 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
          >
            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            Alternar aceptación
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDeleteState(stateMenu.stateId);
              setStateMenu(null);
            }}
            className="flex h-7 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left text-[var(--accent-reject)] hover:bg-[var(--accent-reject-soft)]"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            Eliminar
          </button>
        </div>
      ) : null}

      {edgeMenu ? (
        <div
          role="menu"
          aria-label="Acciones de arista"
          style={{ left: edgeMenu.x, top: edgeMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute z-30 w-52 space-y-1 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2 text-[12px] shadow-[var(--shadow-panel)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1">
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
            role="menuitem"
            onClick={() => {
              onEditEdge(edgeMenu.from, edgeMenu.to);
              setEdgeMenu(null);
            }}
            className="flex h-7 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
          >
            <Pencil aria-hidden="true" className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            Editar reglas
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={edgeMenu.from === edgeMenu.to}
            onClick={() => {
              onInvertEdge?.(edgeMenu.from, edgeMenu.to);
              setEdgeMenu(null);
            }}
            className="flex h-7 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] disabled:opacity-40"
          >
            <ArrowLeftRight aria-hidden="true" className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            Invertir
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDeleteEdge?.(edgeMenu.from, edgeMenu.to);
              setEdgeMenu(null);
            }}
            className="flex h-7 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left text-[var(--accent-reject)] hover:bg-[var(--accent-reject-soft)]"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );
});
