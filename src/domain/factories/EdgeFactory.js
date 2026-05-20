import { EdgeAutomata } from '../models/EdgeAutomata.js';
import { EdgeTuring } from '../models/EdgeTuring.js';

export class EdgeFactory {
  static createEdge(mode, id, from, to, labels = []) {
    if (mode === 'turing') {
      return new EdgeTuring(id, from, to, labels);
    }
    return new EdgeAutomata(id, from, to, labels);
  }
}
