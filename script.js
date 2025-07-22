const lista = document.querySelector('#lista');
const input = document.querySelector('#input');
const botonEnter = document.querySelector('#boton-enter');
const botonGrabarVoz = document.getElementById('boton-grabar-voz');
const botonLimpiarCompletadas = document.getElementById('boton-limpiar-completadas');
const themeToggleButton = document.getElementById('theme-toggle-button');

// ================== INICIO DEL CAMBIO: NUEVOS ELEMENTOS ==================
const notificationContainer = document.getElementById('notification-container');
const notificationMessage = document.getElementById('notification-message');
const undoButton = document.getElementById('undo-button');
const mensajeListaVacia = document.getElementById('mensaje-lista-vacia');
const botonExportar = document.getElementById('boton-exportar');
const botonImportar = document.getElementById('boton-importar');
const importFileInput = document.getElementById('import-file-input');
// =================== FIN DEL CAMBIO ====================

// --- CONSTANTES PARA ESTILOS ---
const check = 'fa-check-circle';
const uncheck = 'fa-circle';
const lineThrough = 'line-through';

// --- VARIABLES GLOBALES ---
let LIST; 
let id;   
let notificationTimer = null;
let lastDeleted = null;

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

// --- FUNCIÓN PARA AÑADIR UN PRODUCTO A LA LISTA ---
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
        actualizarVisibilidadBotonLimpiar(); 
        checkListEmptyState();
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
    }
    localStorage.setItem('TODO', JSON.stringify(LIST));
    actualizarVisibilidadBotonLimpiar(); 
}

// --- FUNCIÓN DE TAREA ELIMINADA ---
function tareaEliminada(element) {
    const liPadre = element.closest('li');
    const itemId = parseInt(element.id);
    const tareaIndex = LIST.findIndex(item => item.id === itemId);
    if (tareaIndex > -1) {
        lastDeleted = { item: LIST[tareaIndex], index: tareaIndex };
        LIST.splice(tareaIndex, 1);
        localStorage.setItem('TODO', JSON.stringify(LIST));
        liPadre.classList.add('removing');
        liPadre.addEventListener('transitionend', () => liPadre?.remove());
        actualizarVisibilidadBotonLimpiar();
        checkListEmptyState();
        showNotification('Tarea eliminada', true);
    }
}

// --- FUNCIÓN PARA COPIAR TAREA AL PORTAPAPELES ---
function copiarTareaAlPortapapeles(element) {
    const textoParaCopiar = element.closest('li')?.querySelector('.text')?.textContent;
    if (textoParaCopiar) {
        navigator.clipboard.writeText(textoParaCopiar)
            .then(() => showNotification('¡Tarea copiada al portapapeles!'))
            .catch(err => console.error('Error al copiar el texto: ', err));
    }
}

// ================== FUNCIONES DE UI Y DATOS ==================
function actualizarVisibilidadBotonLimpiar() {
    botonLimpiarCompletadas.classList.toggle('hidden', !LIST.some(item => item.realizado));
}

function checkListEmptyState() {
    mensajeListaVacia.classList.toggle('hidden', LIST.length > 0);
}

function limpiarTareasCompletadas() {
    if (window.confirm("¿Estás seguro de que quieres eliminar TODAS las tareas completadas?")) {
        LIST = LIST.filter(item => !item.realizado);
        localStorage.setItem('TODO', JSON.stringify(LIST));
        lista.innerHTML = '';
        cargarListaDesdeStorage(LIST);
        showNotification('Tareas completadas eliminadas');
    }
}

function showNotification(message, showUndo = false) {
    clearTimeout(notificationTimer);
    notificationMessage.textContent = message;
    notificationContainer.classList.add('show');
    undoButton.classList.toggle('hidden', !showUndo);
    notificationTimer = setTimeout(() => {
        notificationContainer.classList.remove('show');
        lastDeleted = null;
    }, 5000);
}

function undoDelete() {
    if (lastDeleted) {
        LIST.splice(lastDeleted.index, 0, lastDeleted.item);
        localStorage.setItem('TODO', JSON.stringify(LIST));
        lista.innerHTML = '';
        cargarListaDesdeStorage(LIST);
        lastDeleted = null;
        notificationContainer.classList.remove('show');
    }
}

// ================== INICIO DEL CAMBIO: FUNCIÓN EXPORTAR CORREGIDA ==================
// Función para exportar la lista de tareas
function exportarTareas() {
    if (LIST.length === 0) {
        showNotification("No hay tareas para exportar.");
        return;
    }
    
    try {
        const dataStr = JSON.stringify(LIST, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.style.display = 'none'; // No es necesario que sea visible
        link.href = url;
        link.download = `tareas-backup-${new Date().toISOString().slice(0, 10)}.json`;
        
        document.body.appendChild(link);
        link.click();

        // Usamos un temporizador para dar tiempo al navegador a procesar el clic
        // antes de eliminar el enlace y el objeto URL. ¡Esta es la clave!
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);

        showNotification("Lista de tareas exportada con éxito.");

    } catch (error) {
        console.error("Error al exportar:", error);
        showNotification("Error al intentar exportar la lista.");
    }
}
// =================== FIN DEL CAMBIO ====================

// Función para manejar la importación de tareas
function importarTareas(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedList = JSON.parse(e.target.result);
            if (!Array.isArray(importedList)) {
                throw new Error("El archivo no contiene una lista válida.");
            }
            const esValido = importedList.every(item => typeof item.nombre === 'string' && typeof item.id === 'number');
            if (!esValido) {
                throw new Error("El formato de las tareas en el archivo es incorrecto.");
            }

            if (confirm("Esto reemplazará tu lista actual con el contenido del archivo. ¿Deseas continuar?")) {
                LIST = importedList;
                id = Math.max(...LIST.map(item => item.id), -1) + 1;
                localStorage.setItem('TODO', JSON.stringify(LIST));
                lista.innerHTML = '';
                cargarListaDesdeStorage(LIST);
                showNotification("¡Lista importada con éxito!");
            }
        } catch (error) {
            showNotification(`Error: ${error.message}`);
        } finally {
            importFileInput.value = '';
        }
    };
    reader.readAsText(file);
}

// --- EVENT LISTENERS ---
botonEnter.addEventListener('click', () => {
    if (procesarYAnadirTarea(input.value)) {
        input.value = '';
        input.blur();
    }
});

input.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        if (procesarYAnadirTarea(input.value)) {
            input.value = '';
            input.blur(); 
        }
    }
});

botonLimpiarCompletadas.addEventListener('click', limpiarTareasCompletadas);
undoButton.addEventListener('click', undoDelete);
botonExportar.addEventListener('click', exportarTareas);
botonImportar.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', importarTareas);

themeToggleButton.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggleButton.querySelector('i');
    let theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', theme);
});

lista.addEventListener('click', (event) => {
    if (draggedItem?.classList.contains('dragging-task')) return;
    const element = event.target;
    if (element.tagName === 'I' && element.dataset.action) {
        const action = element.dataset.action;
        if (action === 'toggleRealizado') tareaRealizada(element);
        else if (action === 'eliminar') tareaEliminada(element);
        else if (action === 'copiar') copiarTareaAlPortapapeles(element);
    }
});

// --- LÓGICA DE CARGA INICIAL DE DATOS ---
function cargarListaDesdeStorage(arrayItems) {
    lista.innerHTML = '';
    arrayItems.forEach(item => {
        if (item && !item.eliminado) { 
            const REALIZADO_CLASS = item.realizado ? check : uncheck;
            const LINE_CLASS = item.realizado ? lineThrough : '';
            const elementoHTML = `
                <li id="elemento-${item.id}" style="animation: none;">
                    <i class="fas ${REALIZADO_CLASS}" data-action="toggleRealizado" id="${item.id}"></i>
                    <p class="text ${LINE_CLASS}">${item.nombre}</p>
                    <i class="fas fa-copy" data-action="copiar" id="${item.id}"></i> 
                    <i class="fas fa-trash" data-action="eliminar" id="${item.id}"></i> 
                </li>`;
            lista.insertAdjacentHTML("beforeend", elementoHTML);
        }
    });
    actualizarVisibilidadBotonLimpiar(); 
    checkListEmptyState();
}

const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleButton.querySelector('i').className = 'fas fa-sun';
}

let data = localStorage.getItem('TODO');
try {
    LIST = data ? JSON.parse(data) : [];
    if (!Array.isArray(LIST)) LIST = [];
} catch (e) {
    LIST = [];
}
LIST = LIST.filter(item => item && !item.eliminado);
id = Math.max(...LIST.map(item => item.id), -1) + 1;
cargarListaDesdeStorage(LIST);

// --- RESTO DEL CÓDIGO (RECONOCIMIENTO DE VOZ, EDICIÓN, DRAG & DROP) ---
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    botonGrabarVoz.addEventListener('click', () => {
        const existingEditInput = lista.querySelector('input.edit-task-input');
        if (existingEditInput) { existingEditInput.blur(); }
        try {
            recognition.start();
            botonGrabarVoz.disabled = true;
            botonGrabarVoz.classList.add('escuchando');
            botonGrabarVoz.querySelector('i').className = 'fas fa-microphone-alt';
        } catch(e) {
            console.error("Error al iniciar reconocimiento:", e);
            botonGrabarVoz.disabled = false;
            botonGrabarVoz.classList.remove('escuchando');
            botonGrabarVoz.querySelector('i').className = 'fas fa-microphone';
        }
    });
    recognition.onresult = (event) => {
        const rawSpeechResult = event.results[0][0].transcript.trim();
        const speechResultLower = rawSpeechResult.toLowerCase();
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
                            return true;
                        }
                    }
                    tareaProcesadaPorComandoDeAccion = true;
                    return true;
                }
            }
            return false;
        }
        if (!procesarComandoAccion("eliminar", prefijosComandos.eliminar) && !procesarComandoAccion("completar", prefijosComandos.completar)) {
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
            }
            if (nombreTareaParaAnadir && nombreTareaParaAnadir.trim()) {
                 procesarYAnadirTarea(nombreTareaParaAnadir);
            }
        }
    };
    recognition.onspeechend = () => { recognition.stop(); };
    recognition.onend = () => { if (botonGrabarVoz) { botonGrabarVoz.disabled = false; botonGrabarVoz.classList.remove('escuchando'); if (botonGrabarVoz.querySelector('i')) { botonGrabarVoz.querySelector('i').className = 'fas fa-microphone'; } } };
    recognition.onerror = (event) => { console.error('Error en el reconocimiento de voz:', event.error); };
    recognition.onnomatch = () => { console.log("No hubo coincidencia en el reconocimiento."); };
} else {
    console.warn("La API de Reconocimiento de Voz no es compatible con este navegador.");
    if(botonGrabarVoz) botonGrabarVoz.style.display = 'none';
}
function finalizarEdicionTarea(inputElement, taskId, guardar) {
    const tareaEnLista = LIST.find(item => item.id === taskId);
    if (!tareaEnLista) { if (inputElement?.parentNode) { inputElement.remove(); } return; }
    let textoFinal;
    if (guardar) {
        const nuevoTexto = inputElement.value.trim();
        textoFinal = nuevoTexto === "" ? tareaEnLista.nombre : nuevoTexto;
        tareaEnLista.nombre = textoFinal;
        localStorage.setItem('TODO', JSON.stringify(LIST));
    } else { textoFinal = tareaEnLista.nombre; }
    const nuevoPElement = document.createElement('p');
    nuevoPElement.className = `text ${tareaEnLista.realizado ? lineThrough : ''}`;
    nuevoPElement.textContent = textoFinal;
    inputElement?.replaceWith(nuevoPElement);
}
lista.addEventListener('dblclick', function(event) {
    const target = event.target;
    if (draggedItem?.classList.contains('dragging-task')) { return; }
    if (target.tagName === 'P' && target.classList.contains('text')) {
        const existingEditInput = lista.querySelector('input.edit-task-input');
        if (existingEditInput) { existingEditInput.blur(); }
        if (target.tagName !== 'P') return;
        const pElement = target;
        const listItem = pElement.closest('li');
        const iconElement = listItem?.querySelector('i[data-action]');
        if (!listItem || !iconElement?.id) return;
        const taskId = parseInt(iconElement.id);
        const tareaEnLista = LIST.find(item => item.id === taskId);
        if (!tareaEnLista) return;
        const inputDeEdicion = document.createElement('input');
        inputDeEdicion.type = 'text';
        inputDeEdicion.value = tareaEnLista.nombre;
        inputDeEdicion.className = 'edit-task-input';
        pElement.replaceWith(inputDeEdicion);
        inputDeEdicion.focus();
        inputDeEdicion.select();
        inputDeEdicion.addEventListener('blur', function() { finalizarEdicionTarea(this, taskId, true); });
        inputDeEdicion.addEventListener('keydown', function(e) { if (e.key === 'Enter') { this.blur(); } else if (e.key === 'Escape') { finalizarEdicionTarea(this, taskId, false); } });
    }
});
let draggedItem = null, longPressTimer = null, initialTouchY = 0, placeholder = null;
const LONG_PRESS_DURATION = 500;
let isDragging = false;
function createPlaceholder(height) { if (!placeholder) { placeholder = document.createElement('li'); placeholder.className = 'placeholder-task'; } placeholder.style.height = `${height}px`; return placeholder; }
function handleTouchStart(event) {
    const targetLi = event.target.closest('li');
    if (!targetLi || targetLi.classList.contains('placeholder-task') || event.target.tagName === 'INPUT') { return; }
    const existingEditInput = lista.querySelector('input.edit-task-input');
    if (existingEditInput) { existingEditInput.blur(); }
    draggedItem = targetLi; isDragging = false; initialTouchY = event.touches[0].clientY;
    longPressTimer = setTimeout(() => {
        if (!draggedItem) return;
        isDragging = true;
        draggedItem.classList.add('dragging-task');
        placeholder = createPlaceholder(draggedItem.offsetHeight);
        lista.addEventListener('touchmove', handleTouchMove, { passive: false });
        lista.addEventListener('touchend', handleTouchEnd);
        lista.addEventListener('touchcancel', handleTouchEnd);
    }, LONG_PRESS_DURATION);
}
function handleTouchMove(event) {
    if (!draggedItem) { clearTimeout(longPressTimer); return; }
    if (!isDragging && Math.abs(event.touches[0].clientY - initialTouchY) > 10) { clearTimeout(longPressTimer); longPressTimer = null; draggedItem = null; return; }
    if (!isDragging) return;
    event.preventDefault();
    const overElement = getElementDirectlyUnder(event.touches[0].clientX, event.touches[0].clientY);
    if (placeholder && overElement) {
        const targetLi = overElement.closest('li:not(.placeholder-task):not(.dragging-task)');
        if (targetLi) {
            const rect = targetLi.getBoundingClientRect();
            if (event.touches[0].clientY < rect.top + rect.height / 2) { targetLi.parentNode.insertBefore(placeholder, targetLi); } else { targetLi.parentNode.insertBefore(placeholder, targetLi.nextSibling); }
        }
    }
}
function getElementDirectlyUnder(x, y) { if(draggedItem) draggedItem.style.display = 'none'; let elementUnder = document.elementFromPoint(x, y); if(draggedItem) draggedItem.style.display = ''; return elementUnder; }
function handleTouchEnd() {
    clearTimeout(longPressTimer); longPressTimer = null;
    if (!draggedItem || !isDragging) { draggedItem = null; isDragging = false; return; }
    draggedItem.classList.remove('dragging-task');
    if (placeholder?.parentNode) { placeholder.replaceWith(draggedItem); }
    placeholder = null;
    const newOrderedIds = Array.from(lista.querySelectorAll('li')).map(li => parseInt(li.id.split('-')[1]));
    const newLIST = newOrderedIds.map(id => LIST.find(task => task && task.id === id)).filter(Boolean);
    if (newLIST.length === LIST.length) {
        LIST = newLIST;
        localStorage.setItem('TODO', JSON.stringify(LIST));
    }
    draggedItem = null; isDragging = false;
    lista.removeEventListener('touchmove', handleTouchMove);
    lista.removeEventListener('touchend', handleTouchEnd);
    lista.removeEventListener('touchcancel', handleTouchEnd);
}
lista.addEventListener('touchstart', handleTouchStart, { passive: true });