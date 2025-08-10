class EdgeTuring {
    constructor(fromId, toId,  transitions= [], characterOfInput, characterOfOut, move, comment = '') {
        this.id = Date.now() + Math.random();
        this.from = fromId;
        this.to = toId;
        transitions={
            read:'',
            write:'',
            move:''
        };
        this.CharacterOfInput = characterOfInput;
        this.CharacterOfOut = characterOfOut;
        this.Move = move;
    }
    
}