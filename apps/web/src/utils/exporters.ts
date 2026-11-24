import type { LexoProject, Transition } from '../engine/types';
import { groupedLabel } from '../model/project';
import { edgeGeometry, graphBounds, NODE_RADIUS } from './geometry';

export type ExportTheme = 'light' | 'soft-light' | 'dark' | 'transparent';

interface ThemePalette {
  background: string | null;
  nodeFill: string;
  nodeStroke: string;
  text: string;
  edge: string;
  accent: string;
  muted: string;
}

const PALETTES: Record<ExportTheme, ThemePalette> = {
  light: {
    background: '#ffffff',
    nodeFill: '#ffffff',
    nodeStroke: '#0f172a',
    text: '#0f172a',
    edge: '#475569',
    accent: '#2563eb',
    muted: '#64748b',
  },
  'soft-light': {
    background: '#f2efe9',
    nodeFill: '#f8f6f1',
    nodeStroke: '#1c1917',
    text: '#1c1917',
    edge: '#57534e',
    accent: '#2563eb',
    muted: '#57534e',
  },
  dark: {
    background: '#0b0f19',
    nodeFill: '#111827',
    nodeStroke: '#94a3b8',
    text: '#f1f5f9',
    edge: '#64748b',
    accent: '#38bdf8',
    muted: '#64748b',
  },
  transparent: {
    background: null,
    nodeFill: '#ffffff',
    nodeStroke: '#0f172a',
    text: '#0f172a',
    edge: '#475569',
    accent: '#2563eb',
    muted: '#64748b',
  },
};

interface EdgeGroup {
  from: string;
  to: string;
  transitions: Transition[];
  key: string;
}

function groupTransitions(transitions: Transition[]): EdgeGroup[] {
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labelFontSize(label: string): number {
  if (label.length <= 4) {
    return 12;
  }
  if (label.length <= 7) {
    return 10;
  }
  return 9;
}

function labelLines(project: LexoProject, group: EdgeGroup): string[] {
  const label = groupedLabel(project, group.transitions);
  return project.machineType === 'TM_SINGLE' || project.machineType === 'TM_MULTI'
    ? label.split('\n')
    : [label];
}

export interface ExportOptions {
  includeTestCases?: boolean;
}

/** Genera un SVG limpio, autocontenido y sin recursos remotos. */
export function projectToSvg(
  project: LexoProject,
  theme: ExportTheme = 'light',
  padding = 48,
  options: ExportOptions = {},
): string {
  const palette = PALETTES[theme];
  const bounds = graphBounds(project.states);
  const testCases = options.includeTestCases ? project.testCases : [];
  const tableHeight = testCases.length > 0 ? 44 + testCases.length * 22 + 16 : 0;
  const width = Math.max(
    testCases.length > 0 ? 340 : 0,
    Math.ceil(bounds.maxX - bounds.minX + padding * 2),
  );
  const graphHeight = Math.ceil(bounds.maxY - bounds.minY + padding * 2);
  const height = graphHeight + tableHeight;
  const offsetX = -bounds.minX + padding;
  const offsetY = -bounds.minY + padding;
  const groups = groupTransitions(project.transitions);
  const reverseKeys = new Set(groups.map((group) => group.key));

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(project.name)}">`,
  );
  parts.push('<defs>');
  parts.push(
    `<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.edge}"/></marker>`,
  );
  parts.push('</defs>');

  if (palette.background) {
    parts.push(`<rect width="${width}" height="${height}" fill="${palette.background}"/>`);
  }

  parts.push(`<g transform="translate(${offsetX} ${offsetY})">`);

  const statesById = new Map(project.states.map((state) => [state.id, state]));

  for (const group of groups) {
    const from = statesById.get(group.from);
    const to = statesById.get(group.to);
    if (!from || !to) {
      continue;
    }

    const reverseKey = `${group.to}->${group.from}`;
    const hasReverse =
      group.from !== group.to &&
      reverseKeys.has(reverseKey) &&
      group.transitions.every((transition) => transition.curveOffset === 0) &&
      (groups.find((candidate) => candidate.key === reverseKey)?.transitions.every(
        (transition) => transition.curveOffset === 0,
      ) ??
        false);

    const geometry = edgeGeometry(from, to, group.transitions[0]?.curveOffset ?? 0, {
      hasReverse,
    });

    parts.push(
      `<path d="${geometry.path}" fill="none" stroke="${palette.edge}" stroke-width="1.6" marker-end="url(#arrow)"/>`,
    );

    const lines = labelLines(project, group);
    const lineHeight = 13;
    const startY = geometry.label.y - ((lines.length - 1) * lineHeight) / 2;
    const labelWidth = Math.max(20, Math.max(...lines.map((line) => line.length)) * 6.4 + 12);
    parts.push(
      `<rect x="${geometry.label.x - labelWidth / 2}" y="${startY - 11}" width="${labelWidth}" height="${lines.length * lineHeight + 4}" rx="5" fill="${palette.background ?? '#ffffff'}" stroke="${palette.muted}" stroke-width="0.8"/>`,
    );
    lines.forEach((line, index) => {
      parts.push(
        `<text x="${geometry.label.x}" y="${startY + index * lineHeight}" text-anchor="middle" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="11" fill="${palette.text}">${escapeXml(line)}</text>`,
      );
    });
  }

  for (const state of project.states) {
    if (state.isInitial) {
      const startX = state.x - NODE_RADIUS - 36;
      parts.push(
        `<path d="M ${startX} ${state.y} L ${state.x - NODE_RADIUS - 3} ${state.y}" stroke="${palette.edge}" stroke-width="1.6" fill="none" marker-end="url(#arrow)"/>`,
      );
    }

    parts.push(
      `<circle cx="${state.x}" cy="${state.y}" r="${NODE_RADIUS}" fill="${palette.nodeFill}" stroke="${state.isAccepting ? palette.accent : palette.nodeStroke}" stroke-width="${state.isAccepting ? 2 : 1.6}"/>`,
    );

    if (state.isAccepting) {
      parts.push(
        `<circle cx="${state.x}" cy="${state.y}" r="${NODE_RADIUS - 6}" fill="none" stroke="${palette.accent}" stroke-width="1.2"/>`,
      );
    }

    parts.push(
      `<text x="${state.x}" y="${state.y + 4}" text-anchor="middle" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="${labelFontSize(state.label)}" fill="${palette.text}">${escapeXml(state.label)}</text>`,
    );
  }

  parts.push('</g>');

  if (testCases.length > 0) {
    const tableY = graphHeight + 8;
    const tableX = padding;
    const tableWidth = Math.max(240, width - padding * 2);
    parts.push(`<g transform="translate(${tableX} ${tableY})">`);
    parts.push(
      `<text x="0" y="14" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="11" font-weight="600" fill="${palette.text}">Casos Multi-Run</text>`,
    );
    parts.push(
      `<line x1="0" y1="22" x2="${tableWidth}" y2="22" stroke="${palette.nodeStroke}" stroke-width="1"/>`,
    );
    testCases.forEach((tc, index) => {
      const y = 38 + index * 22;
      const inputLabel = tc.input.length > 0 ? tc.input : project.config.epsilonSymbol;
      parts.push(
        `<text x="4" y="${y}" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="11" fill="${palette.text}">${escapeXml(inputLabel)}</text>`,
      );
      parts.push(
        `<text x="${tableWidth - 4}" y="${y}" text-anchor="end" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="10" fill="${palette.muted}">${escapeXml(tc.expected)}</text>`,
      );
    });
    parts.push('</g>');
  }

  parts.push('</svg>');

  return parts.join('\n');
}

const LATEX_ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  _: '\\_',
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  '{': '\\{',
  '}': '\\}',
  '^': '\\^{}',
  '~': '\\~{}',
  'ε': '\\varepsilon',
  '□': '\\square',
  '→': '\\to',
};

function escapeLatex(value: string): string {
  return value.replace(/[\\_&%$#{}^~ε□→]/g, (character) => LATEX_ESCAPES[character] ?? character);
}

/** Genera código TikZ listo para compilar con LaTeX. */
export function projectToTikz(project: LexoProject, options: ExportOptions = {}): string {
  const scale = 0.026;
  const groups = groupTransitions(project.transitions);
  const reverseKeys = new Set(groups.map((group) => group.key));
  const nodeNames = new Map(project.states.map((state, index) => [state.id, `s${index}`]));

  const lines: string[] = [];
  lines.push('\\begin{tikzpicture}[>=stealth, shorten >=1pt, auto, node distance=3cm, semithick]');
  lines.push('  \\tikzstyle{every state}=[fill=white, draw=black, text=black, minimum size=1.3cm]');
  lines.push('');

  for (const state of project.states) {
    const name = nodeNames.get(state.id) ?? 's0';
    const options = ['state'];
    if (state.isInitial) {
      options.push('initial');
    }
    if (state.isAccepting) {
      options.push('accepting');
    }
    lines.push(
      `  \\node[${options.join(', ')}] (${name}) at (${(state.x * scale).toFixed(2)}, ${(-state.y * scale).toFixed(2)}) {$${escapeLatex(state.label)}$};`,
    );
  }

  lines.push('');

  for (const group of groups) {
    const fromName = nodeNames.get(group.from);
    const toName = nodeNames.get(group.to);
    if (!fromName || !toName) {
      continue;
    }

    const labels = labelLines(project, group)
      .map((line) => escapeLatex(line))
      .join(', ');
    const labelNode = `node {$${labels}$}`;

    if (group.from === group.to) {
      lines.push(`  \\path[->] (${fromName}) edge[loop above] ${labelNode} (${toName});`);
      continue;
    }

    const reverseKey = `${group.to}->${group.from}`;
    const hasReverse = reverseKeys.has(reverseKey);
    const offset = group.transitions[0]?.curveOffset ?? 0;
    let bend = '';
    if (offset !== 0) {
      bend = `bend ${offset > 0 ? 'left' : 'right'}=${Math.min(60, Math.abs(offset) / 2).toFixed(0)}`;
    } else if (hasReverse) {
      bend = 'bend left=22';
    }

    lines.push(
      `  \\path[->] (${fromName}) edge[${bend}] ${labelNode} (${toName});`,
    );
  }

  lines.push('\\end{tikzpicture}');

  if (options.includeTestCases && project.testCases.length > 0) {
    lines.push('');
    lines.push('\\begin{tabular}{ll}');
    lines.push('  \\hline');
    lines.push('  Entrada & Esperado \\\\');
    lines.push('  \\hline');
    for (const tc of project.testCases) {
      const input = tc.input.length > 0 ? escapeLatex(tc.input) : '\\varepsilon';
      lines.push(`  $${input}$ & ${escapeLatex(tc.expected)} \\\\`);
    }
    lines.push('  \\hline');
    lines.push('\\end{tabular}');
  }

  return lines.join('\n');
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const MAX_PNG_CANVAS_DIM = 8192;
const MAX_PNG_CANVAS_AREA = 33_554_432;

export function clampPngScale(width: number, height: number, requestedScale: number): number {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const dimScale = Math.min(MAX_PNG_CANVAS_DIM / safeW, MAX_PNG_CANVAS_DIM / safeH);
  const areaScale = Math.sqrt(MAX_PNG_CANVAS_AREA / (safeW * safeH));
  return Math.max(0.25, Math.min(requestedScale, dimScale, areaScale));
}

/** Rasteriza un SVG a PNG usando canvas local (sin red). */
export async function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  const parser = new DOMParser();
  const document = parser.parseFromString(svg, 'image/svg+xml');
  const root = document.documentElement;
  const width = Number(root.getAttribute('width')) || 800;
  const height = Number(root.getAttribute('height')) || 600;
  const effectiveScale = clampPngScale(width, height, scale);

  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  image.src = url;

  try {
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * effectiveScale));
    canvas.height = Math.max(1, Math.round(height * effectiveScale));
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('No se pudo crear el contexto 2D para exportar PNG.');
    }
    context.scale(effectiveScale, effectiveScale);
    context.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('No se pudo generar el PNG.'));
        }
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
