export class EdgeTuring {
    constructor(id, from, to, labels) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.labels = labels || [];
        this.note = "";
    }

    addLabel(read, write, direction) {
        this.labels.push({
            read: read,
            write: write,
            direction: direction
        });
    }
}
