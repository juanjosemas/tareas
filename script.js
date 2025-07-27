document.addEventListener('DOMContentLoaded', () => {

    // ================== ASIGNACIÓN DE ELEMENTOS DEL DOM ==================
    const lista = document.querySelector('#lista');
    const input = document.querySelector('#input');
    const botonEnter = document.querySelector('#boton-enter');
    const botonGrabarVoz = document.getElementById('boton-grabar-voz');
    const notificationContainer = document.getElementById('notification-container');
    const notificationMessage = document.getElementById('notification-message');
    const undoButton = document.getElementById('undo-button');
    const mensajeListaVacia = document.getElementById('mensaje-lista-vacia');
    const menuTrigger = document.getElementById('menu-trigger-icon'); 
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('overlay');
    const botonLimpiarCompletadas = document.getElementById('boton-limpiar-completadas');
    const botonIrAPapelera = document.getElementById('boton-ir-a-papelera');
    const botonIrAConfiguracion = document.getElementById('boton-ir-a-configuracion');
    const vistaPrincipal = document.getElementById('vista-principal');
    const vistaPapelera = document.getElementById('vista-papelera');
    const vistaConfiguracion = document.getElementById('vista-configuracion');
    const papeleraLista = document.getElementById('papelera-lista');
    const mensajePapeleraVacia = document.getElementById('mensaje-papelera-vacia');
    const botonesVolverLista = document.querySelectorAll('.boton-volver-lista');
    const botonVaciarPapelera = document.getElementById('boton-vaciar-papelera');
    const themeToggleSwitch = document.getElementById('theme-toggle-switch');
    const taskColorSelector = document.getElementById('task-color-selector');
    const fontSizeSlider = document.getElementById('font-size-slider');
    const animationsToggleSwitch = document.getElementById('animations-toggle-switch');
    const confirmationsToggleSwitch = document.getElementById('confirmations-toggle-switch');

    // ================== VARIABLES GLOBALES Y CONSTANTES ==================
    const check = 'fa-check-circle', uncheck = 'fa-circle', lineThrough = 'line-through';
    let LIST, id, notificationTimer = null, lastDeleted = null;
    let settings;

    // ================== LÓGICA DE CONFIGURACIÓN ==================
    const defaultSettings = {
        theme: 'light',
        taskColor: 'blue', // CAMBIO: El nuevo color por defecto es el azul fuerte
        fontSize: 1.1,
        animations: true,
        confirmations: true
    };

    function loadSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('APP_SETTINGS'));
        settings = { ...defaultSettings, ...savedSettings };
    }

    function saveSettings() {
        localStorage.setItem('APP_SETTINGS', JSON.stringify(settings));
    }

    function applySettings() {
        document.body.classList.toggle('dark-mode', settings.theme === 'dark');
        themeToggleSwitch.checked = (settings.theme === 'dark');

        document.body.className = document.body.className.replace(/task-theme-\w+/g, '').trim();
        document.body.classList.add(`task-theme-${settings.taskColor}`);
        
        const selectedColorInput = document.querySelector(`input[name="task-color"][value="${settings.taskColor}"]`);
        if (selectedColorInput) {
            selectedColorInput.checked = true;
        } else {
            document.querySelector('input[name="task-color"]').checked = true;
            settings.taskColor = document.querySelector('input[name="task-color"]').value;
            saveSettings();
        }
        
        // CAMBIO: Ahora el texto oscuro se aplica al verde claro en lugar de al blanco
        let textColor = 'white'; 
        if (settings.taskColor === 'lightgreen') {
            textColor = '#004b23';
        }
        document.documentElement.style.setProperty('--task-text-color', textColor);
        
        document.documentElement.style.setProperty('--task-font-size', `${settings.fontSize}rem`);
        fontSizeSlider.value = settings.fontSize;

        document.body.classList.toggle('animations-disabled', !settings.animations);
        animationsToggleSwitch.checked = settings.animations;

        confirmationsToggleSwitch.checked = settings.confirmations;
    }

    // (El resto del script es idéntico al anterior, no necesita más cambios)
    // ...
    function procesarYAnadirTarea(nombreTarea) {
        const tareaLimpia = nombreTarea.trim();
        if (tareaLimpia) {
            agregarTareaAlDOM(tareaLimpia, id, false);
            LIST.push({ nombre: tareaLimpia, id: id, realizado: false, eliminado: false });
            localStorage.setItem('TODO', JSON.stringify(LIST));
            id++;
            actualizarVisibilidadBotonLimpiar(); 
            checkListEmptyState(); 
            return true;
        }
        return false;
    }

    function agregarTareaAlDOM(tarea, idItem, realizado) {
        const REALIZADO_CLASS = realizado ? check : uncheck;
        const LINE_CLASS = realizado ? lineThrough : '';
        const elementoHTML = `
            <li id="elemento-${idItem}">
                <i class="fas ${REALIZADO_CLASS}" data-action="toggleRealizado" id="${idItem}"></i>
                <p class="text ${LINE_CLASS}">${tarea}</p>
                <i class="fas fa-copy" data-action="copiar" id="${idItem}"></i> 
                <i class="fas fa-trash" data-action="eliminar" id="${idItem}"></i> 
            </li>`;
        lista.insertAdjacentHTML("beforeend", elementoHTML);
    }

    function tareaRealizada(element) {
        element.classList.toggle(check);
        element.classList.toggle(uncheck);
        element.parentNode.querySelector('.text').classList.toggle(lineThrough);
        const tarea = LIST.find(item => item.id === parseInt(element.id));
        if (tarea) { tarea.realizado = !tarea.realizado; }
        localStorage.setItem('TODO', JSON.stringify(LIST));
        actualizarVisibilidadBotonLimpiar(); 
    }

    function tareaEliminada(element) {
        const liPadre = element.closest('li');
        const itemId = parseInt(element.id);
        const tareaIndex = LIST.findIndex(item => item.id === itemId);
        if (tareaIndex > -1) {
            lastDeleted = { ...LIST[tareaIndex] };
            LIST[tareaIndex].eliminado = true;
            localStorage.setItem('TODO', JSON.stringify(LIST));
            liPadre.classList.add('removing');
            liPadre.addEventListener('transitionend', () => liPadre?.remove());
            actualizarVisibilidadBotonLimpiar();
            checkListEmptyState();
            showNotification('Tarea enviada a la papelera', true);
        }
    }

    function copiarTareaAlPortapapeles(element) {
        const textoParaCopiar = element.closest('li')?.querySelector('.text')?.textContent;
        if (textoParaCopiar) {
            navigator.clipboard.writeText(textoParaCopiar)
                .then(() => showNotification('¡Tarea copiada al portapapeles!'))
                .catch(err => console.error('Error al copiar el texto: ', err));
        }
    }

    function limpiarTareasCompletadas() {
        const doIt = () => {
            let tareasMovidas = 0;
            LIST.forEach(item => {
                if (item.realizado && !item.eliminado) {
                    item.eliminado = true;
                    tareasMovidas++;
                }
            });
            if (tareasMovidas > 0) {
                localStorage.setItem('TODO', JSON.stringify(LIST));
                renderizarListaPrincipal();
                showNotification(`${tareasMovidas} tarea(s) movida(s) a la papelera.`);
            }
            cerrarMenu();
        };
        
        if (settings.confirmations) {
            if (window.confirm("¿Mover todas las tareas completadas a la papelera?")) {
                doIt();
            }
        } else {
            doIt();
        }
    }

    function actualizarVisibilidadBotonLimpiar() {
        const hayCompletadas = LIST.some(item => item.realizado && !item.eliminado);
        botonLimpiarCompletadas.style.display = hayCompletadas ? 'flex' : 'none';
    }

    function checkListEmptyState() {
        mensajeListaVacia.classList.toggle('hidden', LIST.some(item => !item.eliminado));
    }

    function checkPapeleraEmptyState() {
        const hayEnPapelera = LIST.some(item => item.eliminado);
        mensajePapeleraVacia.classList.toggle('hidden', hayEnPapelera);
        botonVaciarPapelera.style.display = hayEnPapelera ? 'block' : 'none';
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
            const tarea = LIST.find(item => item.id === lastDeleted.id);
            if (tarea) {
                tarea.eliminado = false;
                localStorage.setItem('TODO', JSON.stringify(LIST));
                if (!vistaPrincipal.classList.contains('hidden')) renderizarListaPrincipal();
                else renderizarPapelera();
            }
            lastDeleted = null;
            notificationContainer.classList.remove('show');
        }
    }

    function renderizarPapelera() {
        papeleraLista.innerHTML = '';
        LIST.filter(item => item.eliminado).forEach(item => {
            const elementoHTML = `
                <li id="elemento-${item.id}">
                    <p class="text ${item.realizado ? lineThrough : ''}">${item.nombre}</p>
                    <i class="fas fa-undo" data-action="restaurar" id="${item.id}" title="Restaurar Tarea"></i> 
                    <i class="fas fa-trash-alt" data-action="eliminar-perm" id="${item.id}" title="Eliminar Permanentemente"></i> 
                </li>`;
            papeleraLista.insertAdjacentHTML("beforeend", elementoHTML);
        });
        checkPapeleraEmptyState();
    }

    function restaurarTarea(element) {
        const tarea = LIST.find(item => item.id === parseInt(element.id));
        if (tarea) {
            tarea.eliminado = false;
            localStorage.setItem('TODO', JSON.stringify(LIST));
            renderizarPapelera();
            showNotification('Tarea restaurada a la lista principal.');
        }
    }

    function eliminarPermanentemente(element) {
        const doIt = () => {
            const itemId = parseInt(element.id);
            LIST = LIST.filter(item => item.id !== itemId);
            localStorage.setItem('TODO', JSON.stringify(LIST));
            renderizarPapelera();
        };

        if (settings.confirmations) {
            if (window.confirm("Esta acción no se puede deshacer. ¿Eliminar la tarea permanentemente?")) {
                doIt();
            }
        } else {
            doIt();
        }
    }

    function vaciarPapelera() {
        const doIt = () => {
            LIST = LIST.filter(item => !item.eliminado);
            localStorage.setItem('TODO', JSON.stringify(LIST));
            renderizarPapelera();
            showNotification('La papelera ha sido vaciada.');
        };

        if (settings.confirmations) {
            if (window.confirm("¿Estás seguro de que quieres eliminar PERMANENTEMENTE todas las tareas de la papelera?")) {
                doIt();
            }
        } else {
            doIt();
        }
    }

    function mostrarVistaPrincipal() {
        vistaPapelera.classList.add('hidden');
        vistaConfiguracion.classList.add('hidden');
        vistaPrincipal.classList.remove('hidden');
        renderizarListaPrincipal();
    }

    function mostrarVistaPapelera() {
        vistaPrincipal.classList.add('hidden');
        vistaConfiguracion.classList.add('hidden');
        vistaPapelera.classList.remove('hidden');
        renderizarPapelera();
        cerrarMenu();
    }

    function mostrarVistaConfiguracion() {
        vistaPrincipal.classList.add('hidden');
        vistaPapelera.classList.add('hidden');
        vistaConfiguracion.classList.remove('hidden');
        cerrarMenu();
    }

    function abrirMenu() {
        sideMenu.classList.add('show');
        overlay.classList.add('show');
    }

    function cerrarMenu() {
        sideMenu.classList.remove('show');
        overlay.classList.remove('show');
    }
    
    function renderizarListaPrincipal() {
        lista.innerHTML = '';
        LIST.filter(item => !item.eliminado).forEach(item => {
            agregarTareaAlDOM(item.nombre, item.id, item.realizado);
        });
        actualizarVisibilidadBotonLimpiar(); 
        checkListEmptyState();
    }

    function inicializarApp() {
        loadSettings();
        applySettings();

        const data = localStorage.getItem('TODO');
        try {
            LIST = data ? JSON.parse(data) : [];
            if (!Array.isArray(LIST)) LIST = [];
        } catch (e) {
            console.error("Error al parsear datos, iniciando lista vacía.", e);
            LIST = [];
        }

        LIST.forEach(item => { if (item.eliminado === undefined) item.eliminado = false; });
        id = Math.max(...LIST.map(item => item.id), -1) + 1;
        renderizarListaPrincipal();
    }

    // EVENT LISTENERS
    botonEnter.addEventListener('click', () => {
        if (procesarYAnadirTarea(input.value)) input.value = '';
    });
    input.addEventListener('keyup', (event) => {
        if (event.key === 'Enter' && procesarYAnadirTarea(input.value)) input.value = '';
    });

    lista.addEventListener('click', (event) => {
        const element = event.target;
        if (draggedItem?.classList.contains('dragging-task')) return;
        if (element.tagName === 'I' && element.dataset.action) {
            const { action } = element.dataset;
            if (action === 'toggleRealizado') tareaRealizada(element);
            else if (action === 'eliminar') tareaEliminada(element);
            else if (action === 'copiar') copiarTareaAlPortapapeles(element);
        }
    });

    menuTrigger.addEventListener('click', abrirMenu);
    overlay.addEventListener('click', cerrarMenu);

    botonLimpiarCompletadas.addEventListener('click', limpiarTareasCompletadas);
    undoButton.addEventListener('click', undoDelete); 
    botonIrAPapelera.addEventListener('click', mostrarVistaPapelera);
    botonIrAConfiguracion.addEventListener('click', mostrarVistaConfiguracion);
    botonVaciarPapelera.addEventListener('click', vaciarPapelera);

    botonesVolverLista.forEach(boton => {
        boton.addEventListener('click', mostrarVistaPrincipal);
    });

    papeleraLista.addEventListener('click', (event) => {
        const element = event.target;
        if (element.tagName === 'I' && element.dataset.action) {
            const { action } = element.dataset;
            if (action === 'restaurar') restaurarTarea(element);
            else if (action === 'eliminar-perm') eliminarPermanentemente(element);
        }
    });

    themeToggleSwitch.addEventListener('change', (e) => {
        settings.theme = e.target.checked ? 'dark' : 'light';
        saveSettings();
        applySettings();
    });

    taskColorSelector.addEventListener('change', (e) => {
        settings.taskColor = e.target.value;
        saveSettings();
        applySettings();
    });

    fontSizeSlider.addEventListener('input', (e) => {
        settings.fontSize = e.target.value;
        document.documentElement.style.setProperty('--task-font-size', `${settings.fontSize}rem`);
    });
    fontSizeSlider.addEventListener('change', saveSettings);

    animationsToggleSwitch.addEventListener('change', (e) => {
        settings.animations = e.target.checked;
        saveSettings();
        applySettings();
    });

    confirmationsToggleSwitch.addEventListener('change', (e) => {
        settings.confirmations = e.target.checked;
        saveSettings();
    });
    
    // (Resto de listeners y funciones no necesitan cambios)
    
    let draggedItem = null, longPressTimer = null, initialTouchY = 0, placeholder = null;
    const LONG_PRESS_DURATION = 500;
    let isDragging = false;
    
    const createPlaceholder = (height) => { if (!placeholder) { placeholder = document.createElement('li'); placeholder.className = 'placeholder-task'; } placeholder.style.height = `${height}px`; return placeholder; };
    const getElementDirectlyUnder = (x, y) => { if(draggedItem) draggedItem.style.display = 'none'; const el = document.elementFromPoint(x, y); if(draggedItem) draggedItem.style.display = ''; return el; };
    
    const handleTouchStart = (event) => {
        const targetLi = event.target.closest('li');
        if (!targetLi || targetLi.classList.contains('placeholder-task') || event.target.tagName === 'INPUT' || lista.querySelector('input.edit-task-input')) return;
        
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
    };
    
    const handleTouchMove = (event) => {
        if (!draggedItem) { clearTimeout(longPressTimer); return; }
        if (!isDragging && Math.abs(event.touches[0].clientY - initialTouchY) > 10) { clearTimeout(longPressTimer); longPressTimer = null; draggedItem = null; return; }
        if (!isDragging) return;
        
        event.preventDefault();
        const overElement = getElementDirectlyUnder(event.touches[0].clientX, event.touches[0].clientY);
        if (placeholder && overElement) {
            const targetLi = overElement.closest('li:not(.placeholder-task):not(.dragging-task)');
            if (targetLi) {
                const rect = targetLi.getBoundingClientRect();
                if (event.touches[0].clientY < rect.top + rect.height / 2) targetLi.parentNode.insertBefore(placeholder, targetLi);
                else targetLi.parentNode.insertBefore(placeholder, targetLi.nextSibling);
            }
        }
    };
    
    const handleTouchEnd = () => {
        clearTimeout(longPressTimer); longPressTimer = null;
        if (!draggedItem || !isDragging) { draggedItem = null; isDragging = false; return; }
        
        draggedItem.classList.remove('dragging-task');
        if (placeholder?.parentNode) placeholder.replaceWith(draggedItem);
        placeholder = null;
        
        const tasksInDOM = Array.from(lista.querySelectorAll('li:not(.placeholder-task)'));
        const newOrderedIds = tasksInDOM.map(li => parseInt(li.id.split('-')[1]));
        
        const visibleTasks = LIST.filter(t => !t.eliminado);
        if (newOrderedIds.length === visibleTasks.length) {
            const newOrderedTasks = newOrderedIds.map(id => visibleTasks.find(task => task && task.id === id)).filter(Boolean);
            const deletedTasks = LIST.filter(t => t.eliminado);
            LIST = [...newOrderedTasks, ...deletedTasks];
            localStorage.setItem('TODO', JSON.stringify(LIST));
        }

        draggedItem = null; isDragging = false;
        lista.removeEventListener('touchmove', handleTouchMove);
        lista.removeEventListener('touchend', handleTouchEnd);
        lista.removeEventListener('touchcancel', handleTouchEnd);
    };
    
    lista.addEventListener('touchstart', handleTouchStart);
    lista.addEventListener('dblclick', (event) => {
        const { target } = event;
        if (draggedItem?.classList.contains('dragging-task') || !target.classList.contains('text')) return;
        if (lista.querySelector('input.edit-task-input')) lista.querySelector('input.edit-task-input').blur();
        const listItem = target.closest('li');
        const taskId = parseInt(listItem?.querySelector('[data-action]')?.id);
        const tarea = LIST.find(item => item.id === taskId);
        if (!tarea) return;
        const inputDeEdicion = document.createElement('input');
        inputDeEdicion.type = 'text';
        inputDeEdicion.value = tarea.nombre;
        inputDeEdicion.className = 'edit-task-input';
        target.replaceWith(inputDeEdicion);
        inputDeEdicion.focus();
        inputDeEdicion.select();
        inputDeEdicion.onblur = () => finalizarEdicionTarea(inputDeEdicion, taskId, true);
        inputDeEdicion.onkeydown = (e) => {
            if (e.key === 'Enter') inputDeEdicion.blur();
            else if (e.key === 'Escape') finalizarEdicionTarea(inputDeEdicion, taskId, false);
        };
    });
    
    function finalizarEdicionTarea(inputElement, taskId, guardar) {
        const tarea = LIST.find(item => item.id === taskId);
        if (!tarea) { inputElement?.parentNode.remove(); return; }
        const textoFinal = (guardar && inputElement.value.trim()) ? inputElement.value.trim() : tarea.nombre;
        tarea.nombre = textoFinal;
        localStorage.setItem('TODO', JSON.stringify(LIST));
        const pElement = document.createElement('p');
        pElement.className = `text ${tarea.realizado ? lineThrough : ''}`;
        pElement.textContent = textoFinal;
        inputElement.replaceWith(pElement);
    }
    
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        botonGrabarVoz.addEventListener('click', () => {
            if (lista.querySelector('input.edit-task-input')) lista.querySelector('input.edit-task-input').blur();
            try {
                recognition.start();
                botonGrabarVoz.disabled = true;
                botonGrabarVoz.classList.add('escuchando');
            } catch(e) { console.error("Error al iniciar reconocimiento:", e); }
        });
        recognition.onstart = () => { botonGrabarVoz.querySelector('i').className = 'fas fa-microphone-alt'; };
        recognition.onend = () => { botonGrabarVoz.disabled = false; botonGrabarVoz.classList.remove('escuchando'); if (botonGrabarVoz.querySelector('i')) { botonGrabarVoz.querySelector('i').className = 'fas fa-microphone'; } };
        recognition.onerror = (event) => console.error('Error en el reconocimiento de voz:', event.error);
        recognition.onresult = (event) => {
            const rawSpeechResult = event.results[0][0].transcript.trim();
            const speechResultLower = rawSpeechResult.toLowerCase();
            const prefijosComandos = {
                eliminar: ["eliminar tarea ", "borrar tarea "],
                completar: ["completar tarea ", "marcar tarea ", "tachar tarea ", "realizar tarea "]
            };
            const procesarComandoAccion = (tipo, prefijos) => {
                for (const prefijo of prefijos) {
                    if (speechResultLower.startsWith(prefijo)) {
                        const idParaBuscar = palabraANumero(rawSpeechResult.substring(prefijo.length).trim().toLowerCase()) || rawSpeechResult.substring(prefijo.length).trim();
                        const idTarea = parseInt(idParaBuscar);
                        if (!isNaN(idTarea)) {
                            const selector = tipo === "eliminar" ? `.fa-trash[id="${idTarea}"]` : `i[data-action="toggleRealizado"][id="${idTarea}"]`;
                            const icono = document.querySelector(selector);
                            if (icono) {
                                if (tipo === "eliminar") tareaEliminada(icono);
                                else tareaRealizada(icono);
                                return true;
                            }
                        }
                        return true;
                    }
                }
                return false;
            };
            if (!procesarComandoAccion("eliminar", prefijosComandos.eliminar) && !procesarComandoAccion("completar", prefijosComandos.completar)) {
                let textoBase = rawSpeechResult;
                const prefijosAgregar = ["agregar tarea ", "añadir tarea ", "nueva tarea "];
                for (const prefijo of prefijosAgregar) {
                    if (speechResultLower.startsWith(prefijo)) {
                        textoBase = rawSpeechResult.substring(prefijo.length).trim();
                        break;
                    }
                }
                if (textoBase) {
                    const nombreTarea = textoBase.split(' ').map(p => palabraANumero(p) || p).join(' ');
                    if (nombreTarea.trim()) procesarYAnadirTarea(nombreTarea);
                }
            }
        };
    } else {
        console.warn("API de Reconocimiento de Voz no compatible.");
        if(botonGrabarVoz) botonGrabarVoz.style.display = 'none';
    }

    // Arrancamos la aplicación
    inicializarApp();
});