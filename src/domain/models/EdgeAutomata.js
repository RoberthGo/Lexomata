export class EdgeAutomata {
    constructor(id, from, to, labels) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.labels = labels || [];
        this.note = "";
    }
}
