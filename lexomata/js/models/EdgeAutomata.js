class EdgeAutomata extends Edge {
    constructor(stateOrigin, stateArrival, validation, isMetaCaracter, comment = '') {
        super(stateOrigin, stateArrival, comment);
        this.Validation = validation;
        this.IsMetaCaracter = isMetaCaracter;
    }
}