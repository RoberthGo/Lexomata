class EdgeAutomata {
    constructor(fromId, toId, labels = [], isMetaCaracter = false) {
        this.id = Date.now() + Math.random();
        this.from = fromId;
        this.to = toId;
        this.labels = labels;
        this.note = "";
        this.IsMetaCaracter = isMetaCaracter;
    }
}