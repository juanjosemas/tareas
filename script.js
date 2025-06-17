const lista = document.querySelector('#lista');
const input = document.querySelector('#input');
const botonEnter = document.querySelector('#boton-enter');
const botonGrabarVoz = document.getElementById('boton-grabar-voz'); // Nuevo botón

const check = 'fa-check-circle';
const uncheck = 'fa-circle';
const lineThrough = 'line-through';
let LIST;
let id; // para que inicie en 0 cada tarea tendra un id diferente


// --- FUNCIÓN PARA AÑADIR UN PRODUCTO A LA LISTA (DOM y Array) ---
function procesarYAnadirTarea(nombreTarea) {
    const tareaLimpia = nombreTarea.trim();
    if (tareaLimpia) {
        agregarTareaAlDOM(tareaLimpia, id, false, false); // Añade al DOM
        LIST.push({
            nombre: tareaLimpia,
            id: id,
            realizado: false,
            eliminado: false
        });
        localStorage.setItem('TODO', JSON.stringify(LIST));
        id++; // Incrementar el ID para el próximo elemento
        console.log("Producto añadido:", tareaLimpia, "ID actual para próximo:", id);
        console.log(LIST);
        return true; // Éxito
    }
    return false; // No se añadió nada (ej. string vacío)
}

// --- FUNCIÓN PARA AGREGAR TAREA AL DOM ---
function agregarTareaAlDOM(tarea, idItem, realizado, eliminado) {
    if (eliminado) { return; } // si existe eliminado es true si no es false 

    const REALIZADO_CLASS = realizado ? check : uncheck; // si realizado es verdadero check si no uncheck
    const LINE_CLASS = realizado ? lineThrough : '';

    const elementoHTML = `
        <li id="elemento-${idItem}"> <!-- ID único para el li si es necesario, aunque manejamos por el ID del icono -->
            <i class="far ${REALIZADO_CLASS}" data-action="toggleRealizado" id="${idItem}"></i>
            <p class="text ${LINE_CLASS}">${tarea}</p>
            <i class="fas fa-trash" data-action="eliminar" id="${idItem}"></i> 
        </li>
    `;
    lista.insertAdjacentHTML("beforeend", elementoHTML);
}

// --- FUNCIÓN DE TAREA REALIZADA ---
function tareaRealizada(element) {
    element.classList.toggle(check);
    element.classList.toggle(uncheck);
    element.parentNode.querySelector('.text').classList.toggle(lineThrough);
    
    const itemId = parseInt(element.id); // Asegurarse que el ID es un número
    const tareaEnLista = LIST.find(item => item.id === itemId);
    if (tareaEnLista) {
        tareaEnLista.realizado = !tareaEnLista.realizado;
    } else {
        console.error("No se encontró la tarea en LIST con id:", itemId);
    }
    localStorage.setItem('TODO', JSON.stringify(LIST));
    // console.log(LIST);
}

// --- FUNCIÓN DE TAREA ELIMINADA ---
function tareaEliminada(element) {
    element.parentNode.parentNode.removeChild(element.parentNode); // Elimina el <li> del DOM

    const itemId = parseInt(element.id); // Asegurarse que el ID es un número
    const tareaEnLista = LIST.find(item => item.id === itemId);
    if (tareaEnLista) {
        tareaEnLista.eliminado = true; // Marcar como eliminado en el array
        // Opcional: filtrar la lista para removerlo permanentemente si no se quiere guardar el estado "eliminado"
        // LIST = LIST.filter(item => item.id !== itemId); 
    } else {
        console.error("No se encontró la tarea en LIST con id para eliminar:", itemId);
    }
    localStorage.setItem('TODO', JSON.stringify(LIST));
    console.log("Producto eliminado. Lista actualizada:", LIST);
}


// --- EVENT LISTENERS ---

// Evento para el botón de Enter (check)
botonEnter.addEventListener('click', () => {
    const tareaTexto = input.value;
    if (procesarYAnadirTarea(tareaTexto)) {
        input.value = ''; // Limpiar el input solo si se añadió la tarea
    }
});

// Evento para la tecla Enter en el input
input.addEventListener('keyup', function (event) { // Mejor escuchar en el input directamente
    if (event.key === 'Enter') {
        const tareaTexto = input.value;
        if (procesarYAnadirTarea(tareaTexto)) {
            input.value = ''; // Limpiar el input
        }
    }
});

// Evento para clicks en la lista (marcar como realizado o eliminar)
lista.addEventListener('click', function (event) {
    const element = event.target; // Elemento que disparó el evento (el icono <i>)
    if (element.tagName === 'I' && element.attributes['data-action']) { // Asegurarse que es un icono con data-action
        const action = element.attributes['data-action'].value;
        
        if (action === 'toggleRealizado') {
            tareaRealizada(element);
        } else if (action === 'eliminar') {
            tareaEliminada(element);
        }
    }
});


// --- LÓGICA DE CARGA INICIAL DE DATOS ---
function cargarListaDesdeStorage(arrayItems) {
    arrayItems.forEach(function (item) {
        // Solo cargar si no está marcado como eliminado, o si tu lógica lo requiere de otra forma
        if (!item.eliminado) { 
            agregarTareaAlDOM(item.nombre, item.id, item.realizado, item.eliminado);
        }
    });
}

let data = localStorage.getItem('TODO');
if (data) {
    LIST = JSON.parse(data);
    // Filtrar los elementos ya marcados como eliminados para no considerarlos en el cálculo del próximo ID
    // y para no cargarlos si no se desea. Si quieres que 'eliminado' solo oculte, no filtres aquí.
    LIST = LIST.filter(item => !item.eliminado); // Esto limpia los eliminados del array activo
    
    // Recalcular el próximo ID basado en el máximo ID existente + 1
    // Si LIST está vacío después de filtrar, el id inicial será 0.
    id = LIST.length > 0 ? Math.max(...LIST.map(item => item.id)) + 1 : 0;
    
    cargarListaDesdeStorage(LIST); // Carga los elementos NO eliminados al DOM
    console.log("Lista cargada desde localStorage:", LIST);
    console.log("Próximo ID será:", id);
} else {
    LIST = [];
    id = 0;
    console.log("No hay datos en localStorage. Iniciando lista vacía. Próximo ID:", id);
}


// --- IMPLEMENTACIÓN DE RECONOCIMIENTO DE VOZ ---
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'es-ES'; // Español de España
    recognition.interimResults = false; // No queremos resultados provisionales
    recognition.maxAlternatives = 1; // Solo la mejor transcripción

    botonGrabarVoz.addEventListener('click', () => {
        try {
            recognition.start();
            botonGrabarVoz.disabled = true;
            botonGrabarVoz.classList.add('escuchando');
            botonGrabarVoz.querySelector('i').className = 'fas fa-microphone-alt'; // Cambiar icono si quieres
            console.log("Reconocimiento de voz iniciado...");
        } catch(e) {
            console.error("Error al iniciar reconocimiento (ya estaba iniciado?):", e);
            // Asegurar que el botón se re-habilita si falla el inicio
            botonGrabarVoz.disabled = false;
            botonGrabarVoz.classList.remove('escuchando');
            botonGrabarVoz.querySelector('i').className = 'fas fa-microphone';
        }
    });

    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        console.log('Texto reconocido:', speechResult);
        
        // Procesar y añadir la tarea. No limpiamos el input de texto aquí.
        procesarYAnadirTarea(speechResult); 
    };

    recognition.onspeechend = () => {
        recognition.stop();
        botonGrabarVoz.disabled = false;
        botonGrabarVoz.classList.remove('escuchando');
        botonGrabarVoz.querySelector('i').className = 'fas fa-microphone';
        console.log("Reconocimiento de voz detenido (fin de habla).");
    };
    
    recognition.onend = () => { // Se llama después de onresult y onspeechend, o si no hubo habla.
        botonGrabarVoz.disabled = false;
        botonGrabarVoz.classList.remove('escuchando');
        botonGrabarVoz.querySelector('i').className = 'fas fa-microphone';
        console.log("Evento 'onend' del reconocimiento de voz.");
    };

    recognition.onerror = (event) => {
        console.error('Error en el reconocimiento de voz:', event.error);
        let mensajeError = 'Error en el reconocimiento: ';
        if (event.error === 'no-speech') {
            mensajeError += 'No se detectó voz. Intenta de nuevo.';
        } else if (event.error === 'audio-capture') {
            mensajeError += 'Problema con el micrófono. Asegúrate que tiene permisos.';
        } else if (event.error === 'not-allowed') {
            mensajeError += 'Permiso para usar el micrófono denegado.';
        } else {
            mensajeError += event.error;
        }
        alert(mensajeError);
        botonGrabarVoz.disabled = false;
        botonGrabarVoz.classList.remove('escuchando');
        botonGrabarVoz.querySelector('i').className = 'fas fa-microphone';
    };

    recognition.onnomatch = () => {
        alert("No se pudo reconocer lo que dijiste. Por favor, intenta de nuevo.");
        // El botón ya se debería haber re-habilitado por onend o onspeechend
        console.log("No hubo coincidencia en el reconocimiento.");
    };

} else {
    console.warn("La API de Reconocimiento de Voz no es compatible con este navegador.");
    alert("Tu navegador no soporta el reconocimiento de voz. Considera usar Chrome o Edge.");
    botonGrabarVoz.style.display = 'none'; // Ocultar el botón si no hay soporte
}
