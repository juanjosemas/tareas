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
// =================== FIN DEL CAMBIO ====================

// --- CONSTANTES PARA ESTILOS ---
const check = 'fa-check-circle';
const uncheck = 'fa-circle';
const lineThrough = 'line-through';

// --- VARIABLES GLOBALES ---
let LIST; 
let id;   
// ================== INICIO DEL CAMBIO: VARIABLES PARA NUEVAS FUNCIONES ==================
let notificationTimer = null; // Para controlar el temporizador de la notificación
let lastDeleted = null;       // Para guardar la última tarea eliminada (para el Deshacer)
// =================== FIN DEL CAMBIO ====================


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
        checkListEmptyState(); // Actualizar estado de lista vacía
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
    
    // No usamos la animación al cargar la página, solo para nuevas tareas.
    // La animación se aplica directamente por CSS a todos los 'li' nuevos.
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

    // Guardamos la tarea y su posición por si se quiere deshacer
    const tareaIndex = LIST.findIndex(item => item.id === itemId);
    if (tareaIndex > -1) {
        lastDeleted = { item: LIST[tareaIndex], index: tareaIndex };
        
        // La eliminamos del array y guardamos
        LIST.splice(tareaIndex, 1);
        localStorage.setItem('TODO', JSON.stringify(LIST));

        // Animación de salida
        liPadre.classList.add('removing');
        // Esperamos que termine la animación para quitar el elemento del DOM
        liPadre.addEventListener('transitionend', () => {
            liPadre?.remove();
        });

        actualizarVisibilidadBotonLimpiar();
        checkListEmptyState(); // Comprobar si la lista quedó vacía
        showNotification('Tarea eliminada', true); // Mostrar notificación con botón Deshacer
    }
}

// --- FUNCIÓN PARA COPIAR TAREA AL PORTAPAPELES ---
function copiarTareaAlPortapapeles(element) {
    const liPadre = element.closest('li');
    const textoParaCopiar = liPadre?.querySelector('.text')?.textContent;

    if (textoParaCopiar) {
        navigator.clipboard.writeText(textoParaCopiar)
            .then(() => {
                showNotification('¡Tarea copiada al portapapeles!');
                console.log(`Texto copiado: "${textoParaCopiar}"`);
            })
            .catch(err => {
                console.error('Error al copiar el texto: ', err);
                alert("No se pudo copiar el texto.");
            });
    }
}

// ================== INICIO DEL CAMBIO: NUEVAS FUNCIONES DE UI ==================
// Muestra u oculta el botón de "Limpiar Completadas"
function actualizarVisibilidadBotonLimpiar() {
    const hayCompletadas = LIST.some(item => item.realizado);
    botonLimpiarCompletadas.classList.toggle('hidden', !hayCompletadas);
}

// Comprueba si la lista está vacía y muestra un mensaje
function checkListEmptyState() {
    mensajeListaVacia.classList.toggle('hidden', LIST.length > 0);
}

// Lógica para limpiar todas las tareas completadas
function limpiarTareasCompletadas() {
    if (window.confirm("¿Estás seguro de que quieres eliminar TODAS las tareas completadas?")) {
        LIST = LIST.filter(item => !item.realizado);
        localStorage.setItem('TODO', JSON.stringify(LIST));
        
        // Re-renderizamos toda la lista
        lista.innerHTML = '';
        cargarListaDesdeStorage(LIST);
        showNotification('Tareas completadas eliminadas');
        console.log("Tareas completadas eliminadas.");
    }
}

// Muestra una notificación (toast)
function showNotification(message, showUndo = false) {
    clearTimeout(notificationTimer); // Cancela el timer anterior si existe
    
    notificationMessage.textContent = message;
    notificationContainer.classList.add('show');
    
    undoButton.classList.toggle('hidden', !showUndo);

    // La notificación se oculta después de 5 segundos
    notificationTimer = setTimeout(() => {
        notificationContainer.classList.remove('show');
        lastDeleted = null; // Si el tiempo pasa, ya no se puede deshacer
    }, 5000);
}

// Función para deshacer la eliminación
function undoDelete() {
    if (lastDeleted) {
        // Reinsertamos el elemento en su posición original en el array
        LIST.splice(lastDeleted.index, 0, lastDeleted.item);
        localStorage.setItem('TODO', JSON.stringify(LIST));

        // Limpiamos y volvemos a renderizar toda la lista para mantener el orden
        lista.innerHTML = '';
        cargarListaDesdeStorage(LIST);
        
        lastDeleted = null; // Limpiamos la variable
        notificationContainer.classList.remove('show'); // Ocultamos la notificación
    }
}
// =================== FIN DEL CAMBIO ====================

// --- EVENT LISTENERS ---
botonEnter.addEventListener('click', () => {
    if (procesarYAnadirTarea(input.value)) {
        input.value = '';
        input.blur();
    }
});

input.addEventListener('keyup', function (event) {
    if (event.key === 'Enter') {
        if (procesarYAnadirTarea(input.value)) {
            input.value = '';
            input.blur(); 
        }
    }
});

botonLimpiarCompletadas.addEventListener('click', limpiarTareasCompletadas);
undoButton.addEventListener('click', undoDelete); // Listener para el botón Deshacer

themeToggleButton.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    
    const icon = themeToggleButton.querySelector('i');
    let theme = 'light';
    if (document.body.classList.contains('dark-mode')) {
        theme = 'dark';
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
    localStorage.setItem('theme', theme);
});

lista.addEventListener('click', function (event) {
    const element = event.target;
    if (draggedItem && draggedItem.classList.contains('dragging-task')) { return; }
    
    if (element.tagName === 'I' && element.dataset.action) {
        const action = element.dataset.action;
        
        if (action === 'toggleRealizado') {
            tareaRealizada(element);
        } else if (action === 'eliminar') {
            // Ya no mostramos el confirm aquí, la opción de deshacer es suficiente
            tareaEliminada(element);
        } else if (action === 'copiar') {
            copiarTareaAlPortapapeles(element);
        }
    }
});

// --- LÓGICA DE CARGA INICIAL DE DATOS ---
function cargarListaDesdeStorage(arrayItems) {
    arrayItems.forEach(function (item) {
        if (item && !item.eliminado) { 
            // Añadimos las tareas sin animación al cargar la página
            const li = document.createElement('li');
            li.id = `elemento-${item.id}`;
            const REALIZADO_CLASS = item.realizado ? check : uncheck;
            const LINE_CLASS = item.realizado ? lineThrough : '';
            li.innerHTML = `
                <i class="fas ${REALIZADO_CLASS}" data-action="toggleRealizado" id="${item.id}"></i>
                <p class="text ${LINE_CLASS}">${item.nombre}</p>
                <i class="fas fa-copy" data-action="copiar" id="${item.id}"></i> 
                <i class="fas fa-trash" data-action="eliminar" id="${item.id}"></i>`;
            lista.appendChild(li);
        }
    });
    // Actualizamos la UI después de cargar
    actualizarVisibilidadBotonLimpiar(); 
    checkListEmptyState();
}

// Aplicar el tema guardado al cargar la página
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleButton.querySelector('i').className = 'fas fa-sun';
}

// Cargar la lista de tareas
let data = localStorage.getItem('TODO');
if (data) {
    try {
        LIST = JSON.parse(data);
        if (!Array.isArray(LIST)) { LIST = []; }
    } catch (e) {
        console.error("Error al parsear datos de localStorage, iniciando lista vacía.", e);
        LIST = [];
    }
    LIST = LIST.filter(item => item && !item.eliminado);
    const maxId = Math.max(...LIST.map(item => item.id), -1);
    id = maxId + 1;
    cargarListaDesdeStorage(LIST);
    console.log("Lista cargada desde localStorage:", LIST);
} else {
    LIST = [];
    id = 0;
    checkListEmptyState(); // Comprobar estado inicial
    console.log("No hay datos en localStorage. Iniciando lista vacía.");
}

// --- RESTO DEL CÓDIGO (RECONOCIMIENTO DE VOZ, EDICIÓN, DRAG & DROP) ---
// (Sin cambios, pero he eliminado la confirmación de voz para que sea consistente con el clic)
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