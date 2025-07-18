let isSelected=false;
let OriginState=-1;
function createEdge(event){
const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let indexState=-1, distAnt=1000;
    for(let i=0; i<states.length; i++){
        if(selectState(x, y, states[i].x, states[i].y, distAnt)){
            indexState=i;
        }
    }
    console.log(indexState);
    if(indexState!=-1){
        if(isSelected){
            // Si ya hay un estado seleccionado, se añade la arista
            // desde el estado anteriormente seleccionado al estado actual
            states[OriginState].insertEdge(new Edge(OriginState, states[indexState]));
            edges.push(new Edge(states[OriginState].x,states[OriginState].y,states[indexState].x,states[indexState].y,OriginState, states[indexState]));
            drawEdge(states[OriginState].x,states[OriginState].y,states[indexState].x,states[indexState].y)
            OriginState=null;
            isSelected=false;
        }else{
            // Si no hay un estado seleccionado, se guarda el estado
            // actual como el origen
            OriginState=indexState;            
            isSelected=true;
        }
    }
}
//Funcion auxiliar para seleccionar el estado mas cercano al click
function selectState(x, y, targetX, targetY, distAnt) {
    const distance = Math.sqrt((x - targetX) ** 2 + (y - targetY) ** 2);
    if(distance <= 20&& distance < distAnt){
        distAnt=distance;
        return true;
    }
    return false;
}

// canvas.addEventListener('click', createState);