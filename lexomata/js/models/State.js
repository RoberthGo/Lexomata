class State {
    constructor(stateName, isStart = false, isEnd = false, comment = '') {
        this.StateName = stateName;
        this.IsStart = isStart;
        this.IsEnd = isEnd;
        this.Comment = comment;
        this.Edges = []; 
    }

    addEdge(edge) {
        if (edge instanceof Edge) {
            this.Edges.push(edge);
        } else {
            throw new Error('No se puede añadir algo que no es un Edge');
        }
    }
}