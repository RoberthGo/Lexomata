import { State } from '../models/State.js';

export class StateFactory {
  static createState(id, label, x, y) {
    return new State(id, label, x, y);
  }
}
