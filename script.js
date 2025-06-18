const lista = document.querySelector('#lista');
const input = document.querySelector('#input');
const botonEnter = document.querySelector('#boton-enter');
const botonGrabarVoz = document.getElementById('boton-grabar-voz');

const check = 'fa-check-circle';
const uncheck = 'fa-circle';
const lineThrough = 'line-through';
let LIST;
let id;

// --- FUNCIÓN PARA CONVERTIR PALABRAS DE NÚMEROS A DÍGITOS ---
function palabraANumero(palabraNumero) {
    const palabra = palabraNumero.toLowerCase().trim();
    const palabraLimpia = palabra.replace(/[.,!?]$/, '');
    const mapaNumeros = {
        'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4',
        'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9',
        'diez': '10', 'once': '11', 'doce': '12', 'trece': '13', 'catorce': '14',
        'quince': '15', 'dieciséis': '16', 'diecisiete': '17', 'dieciocho': '18',
        'diecinueve': '19', 'veinte': '20'
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
    if (liPadre) {
        liPadre.remove();
    } else {
        console.error("No se pudo encontrar el elemento <li> padre para eliminar.");
        if (element.parentNode && element.parentNode.parentNode === lista) {
             element.parentNode.parentNode.removeChild(element.parentNode);
        }
    }

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

// Evento para clicks en la lista (marcar como realizado o eliminar)
lista.addEventListener('click', function (event) {
    const element = event.target;
    // Prevenir que un click normal active la lógica si estamos en modo drag
    if (draggedItem && draggedItem.classList.contains('dragging-task')) {
        return;
    }
    if (element.tagName === 'I' && element.attributes['data-action']) {
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
        if (!item.eliminado) { 
            agregarTareaAlDOM(item.nombre, item.id, item.realizado, item.eliminado);
        }
    });
}

let data = localStorage.getItem('TODO');
if (data) {
    LIST = JSON.parse(data);
    // Asegurarse de que LIST es un array y filtrar los eliminados
    if (Array.isArray(LIST)) {
        LIST = LIST.filter(item => item && !item.eliminado); // Añadida comprobación de item
    } else {
        LIST = []; // Si no es un array, inicializar
    }
    id = LIST.length > 0 ? Math.max(...LIST.map(item => item.id)) + 1 : 0;
    cargarListaDesdeStorage(LIST);
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
        if (botonGrabarVoz) { // Comprobar si el botón existe antes de manipularlo
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
function finalizarEdicionTarea(inputElement, taskId, guardar) {
    const tareaEnLista = LIST.find(item => item.id === taskId);
    if (!tareaEnLista) {
        console.error("Error al finalizar edición: Tarea no encontrada en LIST con ID:", taskId);
        if (inputElement && inputElement.parentNode) { // Comprobar inputElement
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

    if (inputElement && inputElement.parentNode) { // Comprobar inputElement
        inputElement.replaceWith(nuevoPElement);
    } else {
        console.warn("Input de edición ya no estaba en el DOM al intentar finalizar.");
    }
}


lista.addEventListener('dblclick', function(event) {
    const target = event.target;

    if (draggedItem && draggedItem.classList.contains('dragging-task')) {
        return; // No permitir dblclick mientras se arrastra
    }

    if (target.tagName === 'P' && target.classList.contains('text')) {
        const existingEditInput = lista.querySelector('input.edit-task-input');
        if (existingEditInput && existingEditInput !== target.parentNode.querySelector('input.edit-task-input')) { // Evitar blur sobre sí mismo si ya es un input
            existingEditInput.blur(); 
        }
        // Si el elemento que recibió el dblclick es ahora un input (porque el blur anterior lo reemplazó), no hacemos nada más.
        if (target.tagName !== 'P') return;


        const pElement = target;
        const listItem = pElement.closest('li');
        if (!listItem) return;

        const iconElement = listItem.querySelector('i[data-action]');
        if (!iconElement || !iconElement.id) return; //Asegurar que el icono tiene ID
        
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
let draggedItem = null;
let longPressTimer = null;
let initialTouchY = 0;
let initialScrollY = 0; // Podría usarse si la lista tiene su propio scroll
let placeholder = null;
const LONG_PRESS_DURATION = 500;
let isDragging = false; // Flag para controlar estado de arrastre

function createPlaceholder(height) {
    // Reutilizar placeholder si ya existe, si no, crearlo.
    if (!placeholder) {
        placeholder = document.createElement('li');
        placeholder.className = 'placeholder-task';
        placeholder.style.backgroundColor = 'rgba(0,0,0,0.1)';
        placeholder.style.listStyleType = 'none';
    }
    placeholder.style.height = `${height}px`; // Siempre ajustar altura
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
    isDragging = false; // Resetear flag
    initialTouchY = event.touches[0].clientY;
    // initialScrollY = lista.scrollTop; // Descomentar si la lista es scrollable

    longPressTimer = setTimeout(() => {
        if (!draggedItem) return;

        isDragging = true; // Indicar que el arrastre ha comenzado
        console.log("Long press detectado, iniciando drag");
        draggedItem.classList.add('dragging-task');

        const draggedItemHeight = draggedItem.offsetHeight;
        placeholder = createPlaceholder(draggedItemHeight);
        // El placeholder se insertará en touchmove

        lista.addEventListener('touchmove', handleTouchMove, { passive: false });
        lista.addEventListener('touchend', handleTouchEnd);
        lista.addEventListener('touchcancel', handleTouchEnd);
    }, LONG_PRESS_DURATION);
}

function handleTouchMove(event) {
    if (!draggedItem) { // Si no hay item seleccionado, salir
        clearTimeout(longPressTimer); // Limpiar timer si el dedo se movió antes del long press
        return;
    }
    
    // Si el dedo se mueve significativamente ANTES de que el long press se active
    if (!isDragging && Math.abs(event.touches[0].clientY - initialTouchY) > 10) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        draggedItem = null; // No iniciar drag
        console.log("Movimiento antes de long press, cancelando drag.");
        // Quitar listeners si se añadieron prematuramente (aunque no deberían)
        lista.removeEventListener('touchmove', handleTouchMove);
        lista.removeEventListener('touchend', handleTouchEnd);
        lista.removeEventListener('touchcancel', handleTouchEnd);
        return;
    }

    if (!isDragging) return; // Si el long press no se ha activado aún, no hacer nada más.

    event.preventDefault();

    const currentTouchY = event.touches[0].clientY;
    const deltaY = currentTouchY - initialTouchY;

    draggedItem.style.transform = `translateY(${deltaY}px)`;
    draggedItem.style.zIndex = '1000';

    const overElement = getElementDirectlyUnder(event.touches[0].clientX, currentTouchY);

    if (placeholder && overElement) {
        const targetLi = overElement.closest('li:not(.placeholder-task):not(.dragging-task)'); // No sobre sí mismo ni placeholder
        if (targetLi) {
            const rect = targetLi.getBoundingClientRect();
            // Calcular el punto medio del targetLi relativo al viewport
            const targetMiddleY = rect.top + rect.height / 2;
            
            // Si el currentTouchY (posición del dedo) está por encima del punto medio del targetLi,
            // insertar el placeholder ANTES del targetLi.
            // Si está por debajo, insertarlo DESPUÉS.
            if (currentTouchY < targetMiddleY) {
                targetLi.parentNode.insertBefore(placeholder, targetLi);
            } else {
                targetLi.parentNode.insertBefore(placeholder, targetLi.nextSibling);
            }
        } else if (lista.children.length > 0 && !lista.contains(placeholder)) {
            // Si no estamos sobre un LI válido pero el placeholder no está,
            // y hay elementos en la lista, intentamos añadirlo al final o principio.
            // Esto es una heurística simple.
            if (currentTouchY < lista.firstElementChild.getBoundingClientRect().top + lista.firstElementChild.offsetHeight / 2 && lista.firstElementChild !== draggedItem) {
                lista.insertBefore(placeholder, lista.firstElementChild);
            } else if (currentTouchY > lista.lastElementChild.getBoundingClientRect().bottom - lista.lastElementChild.offsetHeight / 2 && lista.lastElementChild !== draggedItem) {
                lista.appendChild(placeholder);
            }
        }
    }
}


function getElementDirectlyUnder(x, y) {
    const originalDraggedVisibility = draggedItem ? draggedItem.style.visibility : '';
    const originalPlaceholderVisibility = placeholder ? placeholder.style.visibility : '';

    if (draggedItem) draggedItem.style.visibility = 'hidden'; // Usar visibility en lugar de display
    if (placeholder) placeholder.style.visibility = 'hidden';

    let elementUnder = document.elementFromPoint(x, y);

    if (draggedItem) draggedItem.style.visibility = originalDraggedVisibility;
    if (placeholder) placeholder.style.visibility = originalPlaceholderVisibility;
    
    return elementUnder;
}


function handleTouchEnd(event) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    
    // Solo continuar si realmente estábamos arrastrando (isDragging es true)
    if (!draggedItem || !isDragging) {
        draggedItem = null; // Limpiar por si acaso
        isDragging = false;
        // Asegurarse de quitar listeners si no se completó el drag
        lista.removeEventListener('touchmove', handleTouchMove);
        lista.removeEventListener('touchend', handleTouchEnd);
        lista.removeEventListener('touchcancel', handleTouchEnd);
        return;
    }
    
    console.log("Touch end, finalizando drag");

    draggedItem.classList.remove('dragging-task');
    draggedItem.style.transform = '';
    draggedItem.style.zIndex = '';
    draggedItem.style.visibility = ''; // Restaurar visibilidad

    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(draggedItem, placeholder);
        placeholder.remove();
    } else if (draggedItem.parentNode !== lista) { // Si el placeholder no se usó pero el item se "desprendió"
         // Esto es un fallback, idealmente el placeholder siempre debería guiar
        lista.appendChild(draggedItem); // Lo añade al final si no hay mejor sitio
    }
    placeholder = null; // Asegurarse de limpiar la referencia al placeholder

    // Reordenar el array LIST
    const newOrderedIds = Array.from(lista.querySelectorAll('li:not(.placeholder-task)'))
                             .map(li => {
                                 const idAttr = li.id;
                                 return idAttr ? parseInt(idAttr.split('-')[1]) : null;
                             })
                             .filter(idVal => idVal !== null); // Filtrar nulls por si acaso
    
    const newLIST = [];
    newOrderedIds.forEach(itemId => {
        const item = LIST.find(task => task && task.id === itemId); // Comprobar task
        if (item) {
            newLIST.push(item);
        }
    });

    // Solo actualizar si el orden realmente cambió o si el tamaño es el mismo
    // (para evitar problemas si un item se perdió)
    if (newLIST.length === LIST.filter(item => item && !item.eliminado).length) {
        LIST = newLIST;
        localStorage.setItem('TODO', JSON.stringify(LIST));
        console.log("LISTA reordenada y guardada:", LIST);
    } else {
        console.warn("Discrepancia en la longitud de la lista después de reordenar. No se guardó para evitar pérdida de datos.");
        // Aquí podrías querer recargar la lista desde localStorage o una lógica de recuperación.
        // Por ahora, solo logueamos.
    }


    draggedItem = null;
    isDragging = false;
    lista.removeEventListener('touchmove', handleTouchMove);
    lista.removeEventListener('touchend', handleTouchEnd);
    lista.removeEventListener('touchcancel', handleTouchEnd);
}

lista.addEventListener('touchstart', handleTouchStart, { passive: true });