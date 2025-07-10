function changeTool(tool,id) {
    const canvas = document.getElementById('canvas');
    document.getElementById(id).focus();
    console.log(tool)
    switch(tool){
        case 'addNode':
            if (canvas) {
                canvas.onclick = createState;
            }
            break;
        case 'addEdge':
            if (canvas) {
                canvas.onclick = createEdge;   
            }
            break;
        case 'select':
            if (canvas) {
                canvas.onclick = selectTool;
            }
            break;
        case 'delete':
            if (canvas) {
                canvas.onclick = deleteTool;
            }
            break;
        default:
            break;
    }                      
}