class EdgeTouring extends Edge {
    constructor(stateOrigin, stateArrival, characterOfInput, characterOfOut, move, comment = '') {
        super(stateOrigin, stateArrival, comment);
        this.CharacterOfInput = characterOfInput;
        this.CharacterOfOut = characterOfOut;
        this.Move = move;
    }
}