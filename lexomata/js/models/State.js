class State {
    constructor(stateName, x, y, isStart = false, isEnd = false, comment = '') {
        this.StateName = stateName;
        this.IsStart = isStart;
        this.IsEnd = isEnd;
        this.Comment = comment;
        this.Edges = [];
        this.x = x;
        this.y = y;
    }

    addEdge(edge) {
        if (edge instanceof Edge) {
            this.Edges.push(edge);
        } else {
            throw new Error('No se puede añadir algo que no es un Edge');
        }
    }
}