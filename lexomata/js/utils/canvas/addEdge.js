let isSelected=false;
let OriginState=null;
function createEdge(event){
const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let indexState=-1, distAnt=1000;
    /*  
    * Esta funcion encuentra el estado mas cercano al click
    * en un radio de 20 px, si no encuentra ninguno
    * deja "indexState" en -1
    */
    for(let i=0; i<states.length; i++){
        if(selectState(x, y, states[i].x, states[i].y, distAnt)){
            indexState=i;
        }
    }
    if(indexState!=-1){
        if(isSelected){
            // Si ya hay un estado seleccionado, se añade la arista
            // desde el estado anteriormente seleccionado al estado actual
            states[OriginState].addEdge(new Edge(OriginState, states[indexState]));
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
//La distancia de 20 es el radio que tiene cada uno de los estados
function selectState(x, y, targetX, targetY, distAnt) {
    const distance = Math.sqrt((x - targetX) ** 2 + (y - targetY) ** 2);
    if(distance <= 20&& distance < distAnt){
        distAnt=distance;
        return true;
    }
    return false;
}

// canvas.addEventListener('click', createState);