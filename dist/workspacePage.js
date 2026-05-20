(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/shared/EventBus.js
  var EventBus_exports = {};
  __export(EventBus_exports, {
    EventBus: () => EventBus,
    eventBus: () => eventBus
  });
  var EventBus, eventBus;
  var init_EventBus = __esm({
    "src/shared/EventBus.js"() {
      EventBus = class {
        constructor() {
          this.listeners = {};
        }
        on(event, callback) {
          if (!this.listeners[event]) {
            this.listeners[event] = [];
          }
          this.listeners[event].push(callback);
          return () => this.off(event, callback);
        }
        off(event, callback) {
          if (!this.listeners[event]) return;
          this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
        }
        emit(event, data) {
          if (!this.listeners[event]) return;
          this.listeners[event].forEach((callback) => callback(data));
        }
      };
      eventBus = new EventBus();
    }
  });

  // src/domain/models/WorkspaceDocument.js
  var WorkspaceDocument;
  var init_WorkspaceDocument = __esm({
    "src/domain/models/WorkspaceDocument.js"() {
      init_EventBus();
      WorkspaceDocument = class {
        constructor(mode = "automata") {
          this.mode = mode;
          this.nodes = [];
          this.edges = [];
          this.nodeCounter = 0;
        }
        setMode(mode) {
          this.mode = mode;
        }
        getMode() {
          return this.mode;
        }
        getNodes() {
          return this.nodes;
        }
        getEdges() {
          return this.edges;
        }
        getNodeById(id) {
          return this.nodes.find((n) => n.id === id);
        }
        getEdgeById(id) {
          return this.edges.find((e) => e.id === id);
        }
        addNode(node) {
          this.nodes.push(node);
          if (parseInt(node.label.replace("q", "")) >= this.nodeCounter) {
            this.nodeCounter = parseInt(node.label.replace("q", "")) + 1;
          }
          eventBus.emit("workspace:changed", this);
        }
        removeNode(id) {
          this.nodes = this.nodes.filter((n) => n.id !== id);
          this.edges = this.edges.filter((e) => e.from !== id && e.to !== id);
          eventBus.emit("workspace:changed", this);
        }
        addEdge(edge) {
          this.edges.push(edge);
          eventBus.emit("workspace:changed", this);
        }
        removeEdge(id) {
          this.edges = this.edges.filter((e) => e.id !== id);
          eventBus.emit("workspace:changed", this);
        }
        setInitialState(id) {
          this.nodes.forEach((node) => {
            node.IsStart = node.id === id;
          });
          eventBus.emit("workspace:changed", this);
        }
        toggleFinalState(id) {
          const node = this.getNodeById(id);
          if (node) {
            node.IsEnd = !node.IsEnd;
            eventBus.emit("workspace:changed", this);
          }
        }
        getNextNodeLabel() {
          return `q${this.nodeCounter++}`;
        }
        clear() {
          this.nodes = [];
          this.edges = [];
          this.nodeCounter = 0;
          eventBus.emit("workspace:changed", this);
        }
        loadState(data) {
          this.nodes = data.nodes || [];
          this.edges = data.edges || [];
          this.nodeCounter = data.nodeCounter || 0;
          this.mode = data.mode || this.mode;
          eventBus.emit("workspace:changed", this);
        }
        getState() {
          return {
            nodes: JSON.parse(JSON.stringify(this.nodes)),
            edges: JSON.parse(JSON.stringify(this.edges)),
            nodeCounter: this.nodeCounter,
            mode: this.mode
          };
        }
      };
    }
  });

  // src/application/HistoryManager.js
  var HistoryManager;
  var init_HistoryManager = __esm({
    "src/application/HistoryManager.js"() {
      init_EventBus();
      HistoryManager = class {
        constructor(document2) {
          this.document = document2;
          this.undoStack = [];
          this.redoStack = [];
        }
        execute(command) {
          command.execute(this.document);
          this.undoStack.push(command);
          this.redoStack = [];
          this._notify();
        }
        undo() {
          if (this.canUndo()) {
            const command = this.undoStack.pop();
            command.undo(this.document);
            this.redoStack.push(command);
            this._notify();
          }
        }
        redo() {
          if (this.canRedo()) {
            const command = this.redoStack.pop();
            command.execute(this.document);
            this.undoStack.push(command);
            this._notify();
          }
        }
        canUndo() {
          return this.undoStack.length > 0;
        }
        canRedo() {
          return this.redoStack.length > 0;
        }
        clear() {
          this.undoStack = [];
          this.redoStack = [];
          this._notify();
        }
        _notify() {
          eventBus.emit("history:changed", {
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
          });
        }
      };
    }
  });

  // src/canvas/tools/Tool.js
  var Tool;
  var init_Tool = __esm({
    "src/canvas/tools/Tool.js"() {
      Tool = class {
        constructor(canvasController) {
          this.controller = canvasController;
        }
        onMouseDown(event, context) {
        }
        onMouseMove(event, context) {
        }
        onMouseUp(event, context) {
        }
        onKeyDown(event, context) {
        }
        onDeactivate() {
        }
      };
    }
  });

  // src/application/commands/MoveStateCommand.js
  var MoveStateCommand;
  var init_MoveStateCommand = __esm({
    "src/application/commands/MoveStateCommand.js"() {
      MoveStateCommand = class {
        constructor(nodeId, startX, startY, endX, endY) {
          this.nodeId = nodeId;
          this.startX = startX;
          this.startY = startY;
          this.endX = endX;
          this.endY = endY;
        }
        execute(document2) {
          const node = document2.getNodeById(this.nodeId);
          if (node) {
            node.x = this.endX;
            node.y = this.endY;
            Promise.resolve().then(() => (init_EventBus(), EventBus_exports)).then(({ eventBus: eventBus2 }) => eventBus2.emit("workspace:changed", document2));
          }
        }
        undo(document2) {
          const node = document2.getNodeById(this.nodeId);
          if (node) {
            node.x = this.startX;
            node.y = this.startY;
            Promise.resolve().then(() => (init_EventBus(), EventBus_exports)).then(({ eventBus: eventBus2 }) => eventBus2.emit("workspace:changed", document2));
          }
        }
      };
    }
  });

  // src/canvas/tools/SelectTool.js
  var SelectTool;
  var init_SelectTool = __esm({
    "src/canvas/tools/SelectTool.js"() {
      init_Tool();
      init_MoveStateCommand();
      SelectTool = class extends Tool {
        constructor(controller) {
          super(controller);
          this.draggedNode = null;
          this.startX = 0;
          this.startY = 0;
          this.isPanning = false;
        }
        onMouseDown(event, context) {
          const { x, y } = context.getMousePos(event);
          const object = context.getObjectAt(x, y);
          if (object && object.type === "node") {
            this.draggedNode = object.object;
            this.startX = this.draggedNode.x;
            this.startY = this.draggedNode.y;
            context.selection.selectNode(this.draggedNode.id);
          } else if (object && object.type === "edge") {
            context.selection.selectEdge(object.object.id);
          } else {
            context.selection.clear();
            this.isPanning = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
          }
        }
        onMouseMove(event, context) {
          if (this.draggedNode) {
            const { x, y } = context.getMousePos(event);
            this.draggedNode.x = x;
            this.draggedNode.y = y;
            context.renderer.redraw();
          } else if (this.isPanning) {
            const dx = event.clientX - this.lastMouseX;
            const dy = event.clientY - this.lastMouseY;
            context.viewState.panX += dx;
            context.viewState.panY += dy;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            context.renderer.redraw();
          }
        }
        onMouseUp(event, context) {
          if (this.draggedNode) {
            const { x, y } = context.getMousePos(event);
            if (this.startX !== x || this.startY !== y) {
              const command = new MoveStateCommand(this.draggedNode.id, this.startX, this.startY, x, y);
              context.history.execute(command);
            }
            this.draggedNode = null;
          }
          this.isPanning = false;
        }
      };
    }
  });

  // src/domain/models/State.js
  var State;
  var init_State = __esm({
    "src/domain/models/State.js"() {
      State = class {
        constructor(id, label, x, y) {
          this.id = id;
          this.label = label;
          this.x = x;
          this.y = y;
          this.radius = 30;
          this.IsStart = false;
          this.IsEnd = false;
          this.note = "";
        }
      };
    }
  });

  // src/domain/factories/StateFactory.js
  var StateFactory;
  var init_StateFactory = __esm({
    "src/domain/factories/StateFactory.js"() {
      init_State();
      StateFactory = class {
        static createState(id, label, x, y) {
          return new State(id, label, x, y);
        }
      };
    }
  });

  // src/application/commands/AddStateCommand.js
  var AddStateCommand;
  var init_AddStateCommand = __esm({
    "src/application/commands/AddStateCommand.js"() {
      AddStateCommand = class {
        constructor(node) {
          this.node = node;
        }
        execute(document2) {
          document2.addNode(this.node);
        }
        undo(document2) {
          document2.removeNode(this.node.id);
        }
      };
    }
  });

  // src/canvas/tools/AddStateTool.js
  var AddStateTool;
  var init_AddStateTool = __esm({
    "src/canvas/tools/AddStateTool.js"() {
      init_Tool();
      init_StateFactory();
      init_AddStateCommand();
      AddStateTool = class extends Tool {
        onMouseDown(event, context) {
          const { x, y } = context.getMousePos(event);
          const clickedObj = context.getObjectAt(x, y);
          if (clickedObj && clickedObj.type === "node") return;
          const document2 = context.getDocument();
          const label = document2.getNextNodeLabel();
          const id = Date.now().toString();
          const newState = StateFactory.createState(id, label, x, y);
          const command = new AddStateCommand(newState);
          context.history.execute(command);
        }
      };
    }
  });

  // src/domain/models/EdgeAutomata.js
  var EdgeAutomata;
  var init_EdgeAutomata = __esm({
    "src/domain/models/EdgeAutomata.js"() {
      EdgeAutomata = class {
        constructor(id, from, to, labels) {
          this.id = id;
          this.from = from;
          this.to = to;
          this.labels = labels || [];
          this.note = "";
        }
      };
    }
  });

  // src/domain/models/EdgeTuring.js
  var EdgeTuring;
  var init_EdgeTuring = __esm({
    "src/domain/models/EdgeTuring.js"() {
      EdgeTuring = class {
        constructor(id, from, to, labels) {
          this.id = id;
          this.from = from;
          this.to = to;
          this.labels = labels || [];
          this.note = "";
        }
        addLabel(read, write, direction) {
          this.labels.push({
            read,
            write,
            direction
          });
        }
      };
    }
  });

  // src/domain/factories/EdgeFactory.js
  var EdgeFactory;
  var init_EdgeFactory = __esm({
    "src/domain/factories/EdgeFactory.js"() {
      init_EdgeAutomata();
      init_EdgeTuring();
      EdgeFactory = class {
        static createEdge(mode, id, from, to, labels = []) {
          if (mode === "turing") {
            return new EdgeTuring(id, from, to, labels);
          }
          return new EdgeAutomata(id, from, to, labels);
        }
      };
    }
  });

  // src/application/commands/AddEdgeCommand.js
  var AddEdgeCommand;
  var init_AddEdgeCommand = __esm({
    "src/application/commands/AddEdgeCommand.js"() {
      AddEdgeCommand = class {
        constructor(edge) {
          this.edge = edge;
        }
        execute(document2) {
          document2.addEdge(this.edge);
        }
        undo(document2) {
          document2.removeEdge(this.edge.id);
        }
      };
    }
  });

  // src/canvas/tools/AddEdgeTool.js
  var AddEdgeTool;
  var init_AddEdgeTool = __esm({
    "src/canvas/tools/AddEdgeTool.js"() {
      init_Tool();
      init_EdgeFactory();
      init_AddEdgeCommand();
      AddEdgeTool = class extends Tool {
        constructor(controller) {
          super(controller);
          this.sourceNode = null;
        }
        onMouseDown(event, context) {
          const { x, y } = context.getMousePos(event);
          const object = context.getObjectAt(x, y);
          if (object && object.type === "node") {
            this.sourceNode = object.object;
            context.drawingState.edgeCreation = { sourceNode: this.sourceNode, mouseX: x, mouseY: y };
          }
        }
        onMouseMove(event, context) {
          if (this.sourceNode) {
            const { x, y } = context.getMousePos(event);
            context.drawingState.edgeCreation.mouseX = x;
            context.drawingState.edgeCreation.mouseY = y;
            context.renderer.redraw();
          }
        }
        onMouseUp(event, context) {
          if (this.sourceNode) {
            const { x, y } = context.getMousePos(event);
            const object = context.getObjectAt(x, y);
            if (object && object.type === "node") {
              const targetNode = object.object;
              const document2 = context.getDocument();
              const id = Date.now().toString();
              const mode = document2.getMode();
              const newEdge = EdgeFactory.createEdge(mode, id, this.sourceNode.id, targetNode.id);
              const command = new AddEdgeCommand(newEdge);
              context.history.execute(command);
              context.eventBus.emit("edge:created", newEdge);
            }
            this.sourceNode = null;
            context.drawingState.edgeCreation = null;
            context.renderer.redraw();
          }
        }
        onDeactivate() {
          this.sourceNode = null;
        }
      };
    }
  });

  // src/application/commands/DeleteStateCommand.js
  var DeleteStateCommand;
  var init_DeleteStateCommand = __esm({
    "src/application/commands/DeleteStateCommand.js"() {
      DeleteStateCommand = class {
        constructor(nodeId) {
          this.nodeId = nodeId;
          this.deletedNode = null;
          this.deletedEdges = [];
        }
        execute(document2) {
          this.deletedNode = document2.getNodeById(this.nodeId);
          this.deletedEdges = document2.getEdges().filter((e) => e.from === this.nodeId || e.to === this.nodeId);
          document2.removeNode(this.nodeId);
        }
        undo(document2) {
          if (this.deletedNode) {
            document2.addNode(this.deletedNode);
            this.deletedEdges.forEach((edge) => document2.addEdge(edge));
          }
        }
      };
    }
  });

  // src/application/commands/DeleteEdgeCommand.js
  var DeleteEdgeCommand;
  var init_DeleteEdgeCommand = __esm({
    "src/application/commands/DeleteEdgeCommand.js"() {
      DeleteEdgeCommand = class {
        constructor(edgeId) {
          this.edgeId = edgeId;
          this.deletedEdge = null;
        }
        execute(document2) {
          this.deletedEdge = document2.getEdgeById(this.edgeId);
          if (this.deletedEdge) {
            document2.removeEdge(this.edgeId);
          }
        }
        undo(document2) {
          if (this.deletedEdge) {
            document2.addEdge(this.deletedEdge);
          }
        }
      };
    }
  });

  // src/canvas/tools/DeleteTool.js
  var DeleteTool;
  var init_DeleteTool = __esm({
    "src/canvas/tools/DeleteTool.js"() {
      init_Tool();
      init_DeleteStateCommand();
      init_DeleteEdgeCommand();
      DeleteTool = class extends Tool {
        onMouseDown(event, context) {
          const { x, y } = context.getMousePos(event);
          const object = context.getObjectAt(x, y);
          if (object) {
            let command;
            if (object.type === "node") {
              command = new DeleteStateCommand(object.object.id);
            } else if (object.type === "edge") {
              command = new DeleteEdgeCommand(object.object.id);
            }
            if (command) {
              context.history.execute(command);
            }
          }
        }
      };
    }
  });

  // src/application/commands/SetInitialStateCommand.js
  var SetInitialStateCommand;
  var init_SetInitialStateCommand = __esm({
    "src/application/commands/SetInitialStateCommand.js"() {
      SetInitialStateCommand = class {
        constructor(nodeId) {
          this.nodeId = nodeId;
          this.previousInitialStateId = null;
        }
        execute(document2) {
          const previous = document2.getNodes().find((n) => n.IsStart);
          this.previousInitialStateId = previous ? previous.id : null;
          document2.setInitialState(this.nodeId);
        }
        undo(document2) {
          if (this.previousInitialStateId !== null) {
            document2.setInitialState(this.previousInitialStateId);
          } else {
            const current = document2.getNodeById(this.nodeId);
            if (current) current.IsStart = false;
            Promise.resolve().then(() => (init_EventBus(), EventBus_exports)).then(({ eventBus: eventBus2 }) => eventBus2.emit("workspace:changed", document2));
          }
        }
      };
    }
  });

  // src/canvas/tools/SetInitialStateTool.js
  var SetInitialStateTool;
  var init_SetInitialStateTool = __esm({
    "src/canvas/tools/SetInitialStateTool.js"() {
      init_Tool();
      init_SetInitialStateCommand();
      SetInitialStateTool = class extends Tool {
        onMouseDown(event, context) {
          const { x, y } = context.getMousePos(event);
          const object = context.getObjectAt(x, y);
          if (object && object.type === "node") {
            const command = new SetInitialStateCommand(object.object.id);
            context.history.execute(command);
          }
        }
      };
    }
  });

  // src/application/commands/ToggleFinalStateCommand.js
  var ToggleFinalStateCommand;
  var init_ToggleFinalStateCommand = __esm({
    "src/application/commands/ToggleFinalStateCommand.js"() {
      ToggleFinalStateCommand = class {
        constructor(nodeId) {
          this.nodeId = nodeId;
        }
        execute(document2) {
          document2.toggleFinalState(this.nodeId);
        }
        undo(document2) {
          document2.toggleFinalState(this.nodeId);
        }
      };
    }
  });

  // src/canvas/tools/SetFinalStateTool.js
  var SetFinalStateTool;
  var init_SetFinalStateTool = __esm({
    "src/canvas/tools/SetFinalStateTool.js"() {
      init_Tool();
      init_ToggleFinalStateCommand();
      SetFinalStateTool = class extends Tool {
        onMouseDown(event, context) {
          const { x, y } = context.getMousePos(event);
          const object = context.getObjectAt(x, y);
          if (object && object.type === "node") {
            const command = new ToggleFinalStateCommand(object.object.id);
            context.history.execute(command);
          }
        }
      };
    }
  });

  // src/canvas/CanvasController.js
  var CanvasController;
  var init_CanvasController = __esm({
    "src/canvas/CanvasController.js"() {
      init_EventBus();
      init_SelectTool();
      init_AddStateTool();
      init_AddEdgeTool();
      init_DeleteTool();
      init_SetInitialStateTool();
      init_SetFinalStateTool();
      CanvasController = class {
        constructor(canvasElement, document2, history, renderer) {
          this.canvas = canvasElement;
          this.document = document2;
          this.history = history;
          this.renderer = renderer;
          this.eventBus = eventBus;
          this.viewState = { panX: 0, panY: 0, scale: 1 };
          this.selection = {
            nodes: /* @__PURE__ */ new Set(),
            edges: /* @__PURE__ */ new Set(),
            selectNode: (id) => this.selection.nodes.add(id),
            selectEdge: (id) => this.selection.edges.add(id),
            clear: () => {
              this.selection.nodes.clear();
              this.selection.edges.clear();
            }
          };
          this.drawingState = { edgeCreation: null, edgeReassignment: null };
          this.tools = {
            "select": new SelectTool(this),
            "addNode": new AddStateTool(this),
            "addEdge": new AddEdgeTool(this),
            "delete": new DeleteTool(this),
            "setStart": new SetInitialStateTool(this),
            "setEnd": new SetFinalStateTool(this)
          };
          this.currentToolId = "select";
          this.bindEvents();
          eventBus.on("tool:changed", (toolId) => this.setTool(toolId));
          eventBus.on("workspace:changed", () => this.renderer.redraw());
        }
        setTool(toolId) {
          if (this.tools[this.currentToolId].onDeactivate) {
            this.tools[this.currentToolId].onDeactivate();
          }
          if (this.tools[toolId]) {
            this.currentToolId = toolId;
          }
        }
        getCurrentTool() {
          return this.tools[this.currentToolId];
        }
        getDocument() {
          return this.document;
        }
        getMousePos(evt) {
          const rect = this.canvas.getBoundingClientRect();
          const x = (evt.clientX - rect.left - this.viewState.panX) / this.viewState.scale;
          const y = (evt.clientY - rect.top - this.viewState.panY) / this.viewState.scale;
          return { x, y };
        }
        getObjectAt(x, y) {
          const nodes = this.document.getNodes();
          for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            if (Math.hypot(node.x - x, node.y - y) <= node.radius) {
              return { type: "node", object: node };
            }
          }
          const edges = this.document.getEdges();
          for (let i = edges.length - 1; i >= 0; i--) {
            if (this.renderer.isClickOnEdge(x, y, edges[i])) return { type: "edge", object: edges[i] };
          }
          return null;
        }
        bindEvents() {
          this.canvas.addEventListener("mousedown", (e) => this.getCurrentTool().onMouseDown(e, this));
          this.canvas.addEventListener("mousemove", (e) => this.getCurrentTool().onMouseMove(e, this));
          window.addEventListener("mouseup", (e) => this.getCurrentTool().onMouseUp(e, this));
        }
      };
    }
  });

  // src/canvas/drawing/drawNode.js
  function drawNode(ctx, node, selectedNodeIds, theme) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
    ctx.fillStyle = theme.nodeFill || "#f0f0f0";
    ctx.fill();
    ctx.lineWidth = selectedNodeIds.includes(node.id) ? 3 : 2;
    ctx.strokeStyle = selectedNodeIds.includes(node.id) ? theme.selectedNode || "#4a90e2" : theme.nodeStroke || "#333";
    ctx.stroke();
    if (node.IsStart) {
      ctx.beginPath();
      ctx.moveTo(node.x - node.radius - 20, node.y);
      ctx.lineTo(node.x - node.radius, node.y);
      ctx.lineTo(node.x - node.radius - 10, node.y - 10);
      ctx.moveTo(node.x - node.radius, node.y);
      ctx.lineTo(node.x - node.radius - 10, node.y + 10);
      ctx.stroke();
    }
    if (node.IsEnd) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius - 5, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.fillStyle = theme.nodeText || "#000";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.label, node.x, node.y);
  }
  var init_drawNode = __esm({
    "src/canvas/drawing/drawNode.js"() {
    }
  });

  // src/canvas/drawing/drawAutomataEdge.js
  function drawEdge(ctx, edge, nodes, edgeDrawCounts, selectedEdgeIds, theme) {
    const fromNode = nodes.find((n) => n.id === edge.from);
    const toNode = nodes.find((n) => n.id === edge.to);
    if (!fromNode || !toNode) return;
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    ctx.strokeStyle = selectedEdgeIds.includes(edge.id) ? theme.selectedEdge || "#4a90e2" : theme.edgeStroke || "#333";
    ctx.lineWidth = 2;
    ctx.stroke();
    if (edge.labels && edge.labels.length > 0) {
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;
      ctx.fillStyle = theme.edgeText || "#000";
      ctx.font = "12px Arial";
      ctx.fillText(edge.labels.join(","), midX, midY - 10);
    }
  }
  var init_drawAutomataEdge = __esm({
    "src/canvas/drawing/drawAutomataEdge.js"() {
    }
  });

  // src/canvas/drawing/drawTuringEdge.js
  function drawEdgeTuring(ctx, edge, nodes, edgeDrawCounts, selectedEdgeIds, theme) {
    const fromNode = nodes.find((n) => n.id === edge.from);
    const toNode = nodes.find((n) => n.id === edge.to);
    if (!fromNode || !toNode) return;
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    ctx.strokeStyle = selectedEdgeIds.includes(edge.id) ? theme.selectedEdge || "#4a90e2" : theme.edgeStroke || "#333";
    ctx.lineWidth = 2;
    ctx.stroke();
    if (edge.labels && edge.labels.length > 0) {
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;
      ctx.fillStyle = theme.edgeText || "#000";
      ctx.font = "10px Arial";
      const labelText = edge.labels.map((l) => `${l.read};${l.write},${l.direction}`).join(" | ");
      ctx.fillText(labelText, midX, midY - 10);
    }
  }
  var init_drawTuringEdge = __esm({
    "src/canvas/drawing/drawTuringEdge.js"() {
    }
  });

  // src/canvas/CanvasRenderer.js
  var CanvasRenderer;
  var init_CanvasRenderer = __esm({
    "src/canvas/CanvasRenderer.js"() {
      init_drawNode();
      init_drawAutomataEdge();
      init_drawTuringEdge();
      CanvasRenderer = class {
        constructor(canvasElement, document2, controller) {
          this.canvas = canvasElement;
          this.ctx = canvasElement.getContext("2d");
          this.document = document2;
          this.controller = controller;
          this.theme = {
            background: "#fff",
            nodeFill: "#f0f0f0",
            nodeStroke: "#333",
            nodeText: "#000",
            edgeStroke: "#333",
            edgeText: "#000",
            selectedNode: "#4a90e2",
            selectedEdge: "#4a90e2"
          };
        }
        isClickOnEdge(x, y, edge) {
          return false;
        }
        redraw() {
          const { ctx, canvas, document: document2, controller } = this;
          const { viewState, selection, drawingState } = controller;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(viewState.panX, viewState.panY);
          ctx.scale(viewState.scale, viewState.scale);
          const mode = document2.getMode();
          const nodes = document2.getNodes();
          const edges = document2.getEdges();
          const edgeDrawCounts = {};
          edges.forEach((edge) => {
            const isSelected = selection.edges.has(edge.id);
            if (mode === "turing") {
              drawEdgeTuring(ctx, edge, nodes, edgeDrawCounts, isSelected ? [edge.id] : [], this.theme);
            } else {
              drawEdge(ctx, edge, nodes, edgeDrawCounts, isSelected ? [edge.id] : [], this.theme);
            }
          });
          nodes.forEach((node) => {
            const isSelected = selection.nodes.has(node.id);
            drawNode(ctx, node, isSelected ? [node.id] : [], this.theme);
          });
          if (drawingState && drawingState.edgeCreation) {
            const { sourceNode, mouseX, mouseY } = drawingState.edgeCreation;
            ctx.beginPath();
            ctx.moveTo(sourceNode.x, sourceNode.y);
            ctx.lineTo(mouseX, mouseY);
            ctx.strokeStyle = this.theme.selectedEdge;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.restore();
        }
      };
    }
  });

  // src/application/WorkspaceController.js
  var WorkspaceController;
  var init_WorkspaceController = __esm({
    "src/application/WorkspaceController.js"() {
      init_EventBus();
      init_WorkspaceDocument();
      init_HistoryManager();
      init_CanvasController();
      init_CanvasRenderer();
      WorkspaceController = class {
        constructor(canvasElement) {
          this.document = new WorkspaceDocument();
          this.history = new HistoryManager(this.document);
          this.renderer = new CanvasRenderer(canvasElement, this.document, null);
          this.canvasController = new CanvasController(canvasElement, this.document, this.history, this.renderer);
          this.renderer.controller = this.canvasController;
          eventBus.on("ui:undo", () => this.history.undo());
          eventBus.on("ui:redo", () => this.history.redo());
          eventBus.on("ui:clear", () => this.document.clear());
          eventBus.on("ui:setMode", (mode) => {
            this.document.setMode(mode);
            this.renderer.redraw();
          });
          this.renderer.redraw();
        }
        load(data) {
          this.document.loadState(data);
          this.history.clear();
        }
        export() {
          return this.document.getState();
        }
      };
    }
  });

  // src/ui/ToolbarView.js
  var ToolbarView;
  var init_ToolbarView = __esm({
    "src/ui/ToolbarView.js"() {
      init_EventBus();
      ToolbarView = class {
        constructor(toolbarElement) {
          this.element = toolbarElement;
          this.buttons = this.element.querySelectorAll(".tool-button");
          this.bindEvents();
          eventBus.on("tool:changed", (toolId) => this.updateActiveButton(toolId));
          eventBus.on("history:changed", ({ canUndo, canRedo }) => this.updateHistoryButtons(canUndo, canRedo));
        }
        bindEvents() {
          this.buttons.forEach((btn) => {
            btn.addEventListener("click", (e) => {
              const toolId = btn.getAttribute("data-tool-id") || btn.id;
              const map = {
                "select": "select",
                "node": "addNode",
                "edge": "addEdge",
                "delete": "delete",
                "initial-state": "setStart",
                "final-state": "setEnd"
              };
              if (map[toolId]) {
                eventBus.emit("tool:changed", map[toolId]);
              } else if (toolId === "undoButton") {
                eventBus.emit("ui:undo");
              } else if (toolId === "redoButton") {
                eventBus.emit("ui:redo");
              }
            });
          });
        }
        updateActiveButton(toolId) {
          const reverseMap = {
            "select": "select",
            "addNode": "node",
            "addEdge": "edge",
            "delete": "delete",
            "setStart": "initial-state",
            "setEnd": "final-state"
          };
          this.buttons.forEach((btn) => btn.classList.remove("active"));
          const activeBtn = Array.from(this.buttons).find((b) => b.id === reverseMap[toolId]);
          if (activeBtn) activeBtn.classList.add("active");
        }
        updateHistoryButtons(canUndo, canRedo) {
          const undoBtn = Array.from(this.buttons).find((b) => b.id === "undoButton");
          const redoBtn = Array.from(this.buttons).find((b) => b.id === "redoButton");
          if (undoBtn) undoBtn.disabled = !canUndo;
          if (redoBtn) redoBtn.disabled = !canRedo;
        }
      };
    }
  });

  // src/ui/ThemeController.js
  var ThemeController;
  var init_ThemeController = __esm({
    "src/ui/ThemeController.js"() {
      ThemeController = class {
        constructor(toggleButton) {
          this.button = toggleButton;
          this.body = document.body;
          if (this.button) {
            this.button.addEventListener("click", () => this.toggleTheme());
          }
        }
        toggleTheme() {
          this.body.classList.toggle("dark");
          this.body.classList.toggle("light");
        }
      };
    }
  });

  // src/main/workspacePage.js
  var require_workspacePage = __commonJS({
    "src/main/workspacePage.js"() {
      init_WorkspaceController();
      init_ToolbarView();
      init_ThemeController();
      document.addEventListener("DOMContentLoaded", () => {
        const canvasElement = document.getElementById("canvas");
        if (!canvasElement) return;
        const workspaceController = new WorkspaceController(canvasElement);
        const toolbarElement = document.querySelector(".toolbar");
        if (toolbarElement) {
          new ToolbarView(toolbarElement);
        }
        const themeToggleBtn = document.querySelector(".theme-toggle-button-header");
        if (themeToggleBtn) {
          new ThemeController(themeToggleBtn);
        }
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get("mode") || "automata";
        workspaceController.document.setMode(mode);
        window.addEventListener("resize", () => {
          canvasElement.width = canvasElement.parentElement.clientWidth;
          canvasElement.height = canvasElement.parentElement.clientHeight;
          workspaceController.renderer.redraw();
        });
        window.dispatchEvent(new Event("resize"));
      });
    }
  });
  require_workspacePage();
})();
//# sourceMappingURL=workspacePage.js.map
