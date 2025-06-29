const lista = document.querySelector('#lista');
const input = document.querySelector('#input');
const botonEnter = document.querySelector('#boton-enter');
const botonGrabarVoz = document.getElementById('boton-grabar-voz');

// --- CONSTANTES PARA ESTILOS ---
const check = 'fa-check-circle';
const uncheck = 'fa-circle';
const lineThrough = 'line-through';

// --- VARIABLES GLOBALES PARA EL ESTADO DE LA LISTA ---
let LIST; 
let id;   

// --- FUNCIÓN PARA CONVERTIR PALABRAS DE NÚMEROS A DÍGITOS ---
function palabraANumero(palabraNumero) {
    const palabra = palabraNumero.toLowerCase().trim();
    const palabraLimpia = palabra.replace(/[.,!?]$/, '');
    const mapaNumeros = {
        'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4','cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9','diez': '10', 'once': '11', 'doce': '12', 'trece': '13', 'catorce': '14','quince': '15', 'dieciséis': '16', 'diecisiete': '17', 'dieciocho': '18', 'diecinueve': '19', 'veinte': '20', 'veintiuno': '21', 'veintidos': '22', 'veintitres': '23', 'veinticuatro': '24', 'veinticinco': '25','veintiseis': '26', 'veintisiete': '27', 'veintiocho': '28', 'veintinueve': '29', 'treinta': '30', 'cuarenta': '40', 'cincuenta': '50', 'sesenta': '60', 'setenta': '70', 'coma': ',', 'guión': '-', 'punto': '.', 'pregunta': '?'
    };
    const numero = mapaNumeros[palabraLimpia];
    if (numero !== undefined) {
        const puntuacion = palabra.match(/[.,!?]$/);
        return numero + (puntuacion ? puntuacion[0] : '');
    }
    return null;
}

// --- FUNCIÓN PARA AÑADIR UN PRODUCTO A LA LISTA (DOM y Array) ---
function procesarYAnadirTarea(nombreTarea) {
    const tareaLimpia = nombreTarea.trim();
    if (tareaLimpia) {
        agregarTareaAlDOM(tareaLimpia, id, false, false);
        LIST.push({
            nombre: tareaLimpia,
            id: id,
            realizado: false,
            eliminado: false
        });
        localStorage.setItem('TODO', JSON.stringify(LIST));
        id++;
        console.log("Producto añadido:", tareaLimpia, "ID actual para próximo:", id);
        return true;
    }
    return false;
}

// --- FUNCIÓN PARA AGREGAR TAREA AL DOM ---
function agregarTareaAlDOM(tarea, idItem, realizado, eliminado) {
    if (eliminado) { return; }

    const REALIZADO_CLASS = realizado ? check : uncheck;
    const LINE_CLASS = realizado ? lineThrough : '';
    
    const elementoHTML = `
        <li id="elemento-${idItem}">
            <i class="fas ${REALIZADO_CLASS}" data-action="toggleRealizado" id="${idItem}"></i>
            <p class="text ${LINE_CLASS}">${tarea}</p>
            <i class="fas fa-copy" data-action="copiar" id="${idItem}"></i> 
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
    
    const itemId = parseInt(element.id);
    const tareaEnLista = LIST.find(item => item.id === itemId);
    if (tareaEnLista) {
        tareaEnLista.realizado = !tareaEnLista.realizado;
    } else {
        console.error("No se encontró la tarea en LIST con id:", itemId);
    }
    localStorage.setItem('TODO', JSON.stringify(LIST));
}

// --- FUNCIÓN DE TAREA ELIMINADA ---
function tareaEliminada(element) {
    const liPadre = element.closest('li');
    liPadre?.remove();

    const itemId = parseInt(element.id);
    const tareaEnLista = LIST.find(item => item.id === itemId);
    if (tareaEnLista) {
        tareaEnLista.eliminado = true;
    } else {
        console.error("No se encontró la tarea en LIST con id para eliminar:", itemId);
    }
    localStorage.setItem('TODO', JSON.stringify(LIST));
    console.log("Producto eliminado. Lista actualizada:", LIST);
}

// --- FUNCIÓN PARA COPIAR TAREA AL PORTAPAPELES ---
function copiarTareaAlPortapapeles(element) {
    const liPadre = element.closest('li');
    const textoParaCopiar = liPadre?.querySelector('.text')?.textContent;

    if (textoParaCopiar) {
        navigator.clipboard.writeText(textoParaCopiar)
            .then(() => {
                // ================== INICIO DEL CAMBIO ==================
                // ÉXITO: El texto se ha copiado.
                console.log(`Texto copiado: "${textoParaCopiar}"`);
                
                // Se ha eliminado el código que cambiaba el icono temporalmente.
                // El icono ya no cambiará.
                // =================== FIN DEL CAMBIO ====================
            })
            .catch(err => {
                // ERROR: Si algo falla (ej. permisos denegados).
                console.error('Error al copiar el texto: ', err);
                alert("No se pudo copiar el texto.");
            });
    }
}

// --- EVENT LISTENERS ---
botonEnter.addEventListener('click', () => {
    const tareaTexto = input.value;
    if (procesarYAnadirTarea(tareaTexto)) {
        input.value = '';
    }
});

input.addEventListener('keyup', function (event) {
    if (event.key === 'Enter') {
        const tareaTexto = input.value;
        if (procesarYAnadirTarea(tareaTexto)) {
            input.value = '';
        }
    }
});

// Evento para clicks en la lista (marcar como realizado, eliminar o copiar)
lista.addEventListener('click', function (event) {
    const element = event.target;
    
    if (draggedItem && draggedItem.classList.contains('dragging-task')) {
        return;
    }
    
    if (element.tagName === 'I' && element.dataset.action) {
        const action = element.dataset.action;
        
        if (action === 'toggleRealizado') {
            tareaRealizada(element);
        } else if (action === 'eliminar') {
            if (window.confirm("¿Estás seguro de que quieres eliminar esta tarea?")) {
                tareaEliminada(element);
            } else {
                console.log("Eliminación cancelada por el usuario.");
            }
        } else if (action === 'copiar') {
            copiarTareaAlPortapapeles(element);
        }
    }
});


// --- LÓGICA DE CARGA INICIAL DE DATOS ---
function cargarListaDesdeStorage(arrayItems) {
    arrayItems.forEach(function (item) {
        if (item && !item.eliminado) { 
            agregarTareaAlDOM(item.nombre, item.id, item.realizado, false);
        }
    });
}

let data = localStorage.getItem('TODO');
if (data) {
    try {
        LIST = JSON.parse(data);
        if (!Array.isArray(LIST)) {
            LIST = [];
        }
    } catch (e) {
        console.error("Error al parsear datos de localStorage, iniciando lista vacía.", e);
        LIST = [];
    }

    LIST = LIST.filter(item => item && !item.eliminado);
    
    const maxId = Math.max(...LIST.map(item => item.id), -1);
    id = maxId + 1;

    cargarListaDesdeStorage(LIST);
    console.log("Lista cargada desde localStorage:", LIST);
    console.log("Próximo ID será:", id);
} else {
    LIST = [];
    id = 0;
    console.log("No hay datos en localStorage. Iniciando lista vacía. Próximo ID:", id);
}


// --- IMPLEMENTACIÓN DE RECONOCIMIENTO DE VOZ ---
// (Esta sección no ha sido modificada)
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    botonGrabarVoz.addEventListener('click', () => {
        const existingEditInput = lista.querySelector('input.edit-task-input');
        if (existingEditInput) {
            existingEditInput.blur();
        }

        try {
            recognition.start();
            botonGrabarVoz.disabled = true;
            botonGrabarVoz.classList.add('escuchando');
            botonGrabarVoz.querySelector('i').className = 'fas fa-microphone-alt';
            console.log("Reconocimiento de voz iniciado...");
        } catch(e) {
            console.error("Error al iniciar reconocimiento (ya estaba iniciado?):", e);
            botonGrabarVoz.disabled = false;
            botonGrabarVoz.classList.remove('escuchando');
            botonGrabarVoz.querySelector('i').className = 'fas fa-microphone';
        }
    });

    recognition.onresult = (event) => {
        const rawSpeechResult = event.results[0][0].transcript.trim();
        const speechResultLower = rawSpeechResult.toLowerCase();
        
        console.log('Texto reconocido (original):', rawSpeechResult);
        console.log('Texto reconocido (procesando):', speechResultLower);

        let tareaProcesadaPorComandoDeAccion = false;

        const prefijosComandos = {
            eliminar: ["eliminar tarea ", "borrar tarea "],
            completar: ["completar tarea ", "marcar tarea ", "tachar tarea ", "realizar tarea "]
        };

        function procesarComandoAccion(tipoComando, prefijos) {
            for (const prefijo of prefijos) {
                if (speechResultLower.startsWith(prefijo)) {
                    const numeroPalabraODigito = rawSpeechResult.substring(prefijo.length).trim();
                    const numeroConvertido = palabraANumero(numeroPalabraODigito.toLowerCase());
                    const idParaBuscar = numeroConvertido || numeroPalabraODigito;

                    const idTarea = parseInt(idParaBuscar);

                    if (!isNaN(idTarea)) {
                        let elementoIcono;
                        if (tipoComando === "eliminar") {
                            elementoIcono = document.querySelector(`.fa-trash[id="${idTarea}"]`);
                        } else if (tipoComando === "completar") {
                            elementoIcono = document.querySelector(`i[data-action="toggleRealizado"][id="${idTarea}"]`);
                        }

                        if (elementoIcono) {
                            if (tipoComando === "eliminar") tareaEliminada(elementoIcono);
                            if (tipoComando === "completar") tareaRealizada(elementoIcono);
                            tareaProcesadaPorComandoDeAccion = true;
                            console.log(`Comando: ${tipoComando} tarea con ID ${idTarea}`);
                            return true;
                        } else {
                            console.log(`No se encontró tarea con ID ${idTarea} para ${tipoComando}.`);
                            tareaProcesadaPorComandoDeAccion = true;
                            return true;
                        }
                    } else {
                        console.log(`Número '${numeroPalabraODigito}' no válido para ${tipoComando}.`);
                        tareaProcesadaPorComandoDeAccion = true;
                        return true;
                    }
                }
            }
            return false;
        }

        if (procesarComandoAccion("eliminar", prefijosComandos.eliminar)) {
        } else if (procesarComandoAccion("completar", prefijosComandos.completar)) {
        }

        if (!tareaProcesadaPorComandoDeAccion) {
            let nombreTareaParaAnadir;
            const prefijosAgregar = ["agregar tarea ", "añadir tarea ", "nueva tarea "];
            let textoBaseParaNombre = rawSpeechResult;

            for (const prefijo of prefijosAgregar) {
                if (speechResultLower.startsWith(prefijo)) {
                    textoBaseParaNombre = rawSpeechResult.substring(prefijo.length).trim();
                    break; 
                }
            }
            
            if (textoBaseParaNombre) {
                const palabrasOriginales = textoBaseParaNombre.split(' ');
                const palabrasProcesadas = palabrasOriginales.map(palabraOriginal => {
                    const numeroConvertido = palabraANumero(palabraOriginal);
                    return numeroConvertido !== null ? numeroConvertido : palabraOriginal;
                });
                nombreTareaParaAnadir = palabrasProcesadas.join(' ');
                console.log(`Nombre de tarea procesado palabra por palabra: "${textoBaseParaNombre}" -> "${nombreTareaParaAnadir}"`);
            } else {
                nombreTareaParaAnadir = ""; 
                console.log("No se proporcionó texto para el nombre de la tarea después del prefijo, o el texto reconocido estaba vacío.");
            }
            
            if (nombreTareaParaAnadir.trim()) {
                 procesarYAnadirTarea(nombreTareaParaAnadir);
            } else {
                console.log("No se añadió tarea porque el nombre resultante estaba vacío.");
            }
        }
    };

    recognition.onspeechend = () => {
        recognition.stop();
    };
    
    recognition.onend = () => {
        if (botonGrabarVoz) {
            botonGrabarVoz.disabled = false;
            botonGrabarVoz.classList.remove('escuchando');
            if (botonGrabarVoz.querySelector('i')) {
                botonGrabarVoz.querySelector('i').className = 'fas fa-microphone';
            }
        }
        console.log("Evento 'onend' del reconocimiento de voz (detenido o finalizado).");
    };

    recognition.onerror = (event) => {
        console.error('Error en el reconocimiento de voz:', event.error);
    };

    recognition.onnomatch = () => {
        console.log("No hubo coincidencia en el reconocimiento.");
    };

} else {
    console.warn("La API de Reconocimiento de Voz no es compatible con este navegador.");
    if(botonGrabarVoz) botonGrabarVoz.style.display = 'none';
}


// --- LÓGICA PARA EDITAR TAREAS CON DOBLE CLIC ---
// (Esta sección no ha sido modificada)
function finalizarEdicionTarea(inputElement, taskId, guardar) {
    const tareaEnLista = LIST.find(item => item.id === taskId);
    if (!tareaEnLista) {
        console.error("Error al finalizar edición: Tarea no encontrada en LIST con ID:", taskId);
        if (inputElement && inputElement.parentNode) {
            inputElement.remove();
        }
        return;
    }

    let textoFinal;
    if (guardar) {
        const nuevoTexto = inputElement.value.trim();
        if (nuevoTexto === "") {
            textoFinal = tareaEnLista.nombre;
        } else {
            textoFinal = nuevoTexto;
            tareaEnLista.nombre = textoFinal;
            localStorage.setItem('TODO', JSON.stringify(LIST));
            console.log(`Tarea ID ${taskId} actualizada a: "${textoFinal}"`);
        }
    } else {
        textoFinal = tareaEnLista.nombre;
        console.log(`Edición cancelada para tarea ID ${taskId}. Restaurado: "${textoFinal}"`);
    }

    const nuevoPElement = document.createElement('p');
    nuevoPElement.classList.add('text');
    if (tareaEnLista.realizado) {
        nuevoPElement.classList.add(lineThrough);
    }
    nuevoPElement.textContent = textoFinal;

    if (inputElement && inputElement.parentNode) {
        inputElement.replaceWith(nuevoPElement);
    } else {
        console.warn("Input de edición ya no estaba en el DOM al intentar finalizar.");
    }
}


lista.addEventListener('dblclick', function(event) {
    const target = event.target;

    if (draggedItem && draggedItem.classList.contains('dragging-task')) {
        return; 
    }

    if (target.tagName === 'P' && target.classList.contains('text')) {
        const existingEditInput = lista.querySelector('input.edit-task-input');
        if (existingEditInput && existingEditInput !== target.parentNode.querySelector('input.edit-task-input')) {
            existingEditInput.blur(); 
        }
        
        if (target.tagName !== 'P') return;

        const pElement = target;
        const listItem = pElement.closest('li');
        if (!listItem) return;

        const iconElement = listItem.querySelector('i[data-action]');
        if (!iconElement || !iconElement.id) return;
        
        const taskId = parseInt(iconElement.id);
        const tareaEnLista = LIST.find(item => item.id === taskId);
        if (!tareaEnLista) return;

        const textoOriginal = tareaEnLista.nombre;

        const inputDeEdicion = document.createElement('input');
        inputDeEdicion.type = 'text';
        inputDeEdicion.value = textoOriginal;
        inputDeEdicion.className = 'edit-task-input';
        
        pElement.replaceWith(inputDeEdicion);
        inputDeEdicion.focus();
        inputDeEdicion.select();

        inputDeEdicion.addEventListener('blur', function() {
            finalizarEdicionTarea(this, taskId, true);
        });

        inputDeEdicion.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
            } else if (e.key === 'Escape') {
                finalizarEdicionTarea(this, taskId, false);
            }
        });
    }
});

// --- LÓGICA PARA ARRASTRAR Y SOLTAR (DRAG AND DROP) EN TÁCTIL ---
// (Esta sección no ha sido modificada)
let draggedItem = null;      
let longPressTimer = null;   
let initialTouchY = 0;       
let placeholder = null;      
const LONG_PRESS_DURATION = 500;
let isDragging = false;      

function createPlaceholder(height) {
    if (!placeholder) {
        placeholder = document.createElement('li');
        placeholder.className = 'placeholder-task';
    }
    placeholder.style.height = `${height}px`;
    return placeholder;
}

function handleTouchStart(event) {
    const targetLi = event.target.closest('li');
    if (!targetLi || targetLi.classList.contains('placeholder-task') || event.target.tagName === 'INPUT') {
        return;
    }

    const existingEditInput = lista.querySelector('input.edit-task-input');
    if (existingEditInput) {
        existingEditInput.blur(); 
    }
    
    draggedItem = targetLi;
    isDragging = false; 
    initialTouchY = event.touches[0].clientY;

    longPressTimer = setTimeout(() => {
        if (!draggedItem) return;

        isDragging = true; 
        console.log("Long press detectado, iniciando drag");
        draggedItem.classList.add('dragging-task');

        placeholder = createPlaceholder(draggedItem.offsetHeight);
        
        lista.addEventListener('touchmove', handleTouchMove, { passive: false });
        lista.addEventListener('touchend', handleTouchEnd);
        lista.addEventListener('touchcancel', handleTouchEnd);
    }, LONG_PRESS_DURATION);
}

function handleTouchMove(event) {
    if (!draggedItem) { 
        clearTimeout(longPressTimer);
        return;
    }
    
    if (!isDragging && Math.abs(event.touches[0].clientY - initialTouchY) > 10) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        draggedItem = null;
        console.log("Movimiento antes de long press, cancelando drag.");
        return;
    }

    if (!isDragging) return; 

    event.preventDefault(); 

    const currentTouchY = event.touches[0].clientY;
    const overElement = getElementDirectlyUnder(event.touches[0].clientX, currentTouchY);

    if (placeholder && overElement) {
        const targetLi = overElement.closest('li:not(.placeholder-task):not(.dragging-task)');
        if (targetLi) {
            const rect = targetLi.getBoundingClientRect();
            const targetMiddleY = rect.top + rect.height / 2;
            
            if (currentTouchY < targetMiddleY) {
                targetLi.parentNode.insertBefore(placeholder, targetLi);
            } else {
                targetLi.parentNode.insertBefore(placeholder, targetLi.nextSibling);
            }
        }
    }
}

function getElementDirectlyUnder(x, y) {
    if(draggedItem) draggedItem.style.display = 'none';
    let elementUnder = document.elementFromPoint(x, y);
    if(draggedItem) draggedItem.style.display = '';
    return elementUnder;
}

function handleTouchEnd() {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    
    if (!draggedItem || !isDragging) {
        draggedItem = null;
        isDragging = false;
        return;
    }
    
    console.log("Touch end, finalizando drag");

    draggedItem.classList.remove('dragging-task');
    
    if (placeholder && placeholder.parentNode) {
        placeholder.replaceWith(draggedItem);
    }
    placeholder = null;

    const newOrderedIds = Array.from(lista.querySelectorAll('li'))
                             .map(li => parseInt(li.id.split('-')[1]));
    
    const newLIST = [];
    newOrderedIds.forEach(itemId => {
        const item = LIST.find(task => task && task.id === itemId);
        if (item) {
            newLIST.push(item);
        }
    });

    if (newLIST.length === LIST.length) {
        LIST = newLIST;
        localStorage.setItem('TODO', JSON.stringify(LIST));
        console.log("LISTA reordenada y guardada:", LIST);
    } else {
        console.warn("Discrepancia en la longitud de la lista después de reordenar. No se guardó para evitar pérdida de datos.");
    }

    draggedItem = null;
    isDragging = false;
    lista.removeEventListener('touchmove', handleTouchMove);
    lista.addEventListener('touchend', handleTouchEnd);
    lista.addEventListener('touchcancel', handleTouchEnd);
}

lista.addEventListener('touchstart', handleTouchStart, { passive: true });