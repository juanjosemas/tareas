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
    const soundsToggleSwitch = document.getElementById('sounds-toggle-switch');

    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelector('.filter-buttons');

    const soundAdd = document.getElementById('sound-add');
    const soundComplete = document.getElementById('sound-complete');
    const soundDelete = document.getElementById('sound-delete');
    const soundEmpty = document.getElementById('sound-empty');
    const allSounds = [soundAdd, soundComplete, soundDelete, soundEmpty];

    // ================== VARIABLES GLOBALES Y CONSTANTES ==================
    const check = 'fa-check-circle', uncheck = 'fa-circle', lineThrough = 'line-through';
    let LIST, id, notificationTimer = null, lastDeleted = null;
    let settings;
    let currentFilter = 'all';
    let searchTerm = '';
    let isAudioUnlocked = false;

    function unlockAudio() {
        if (isAudioUnlocked) return;
        allSounds.forEach(sound => {
            if (sound) {
                sound.play().catch(() => {});
                sound.pause();
                sound.currentTime = 0;
            }
        });
        isAudioUnlocked = true;
        document.body.removeEventListener('click', unlockAudio);
        document.body.removeEventListener('touchstart', unlockAudio);
    }
    document.body.addEventListener('click', unlockAudio);
    document.body.addEventListener('touchstart', unlockAudio);

    // ================== LÓGICA DE CONFIGURACIÓN ==================
    const defaultSettings = {
        theme: 'light',
        taskColor: 'blue',
        fontSize: 1.1,
        animations: true,
        confirmations: true,
        sounds: true,
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
            const firstColorInput = document.querySelector('input[name="task-color"]');
            if (firstColorInput) {
                firstColorInput.checked = true;
                settings.taskColor = firstColorInput.value;
                saveSettings();
            }
        }
        
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
        soundsToggleSwitch.checked = settings.sounds;
    }

    // ================== LÓGICA DE EFECTOS DE SONIDO ==================
    function playSound(soundElement) {
        if (settings.sounds && soundElement && isAudioUnlocked) {
            soundElement.currentTime = 0;
            soundElement.play().catch(e => console.error("Error al reproducir sonido:", e));
        }
    }

    function renderTasks() {
        lista.innerHTML = '';
        const filteredList = LIST.filter(item => {
            if (item.eliminado) return false;
            if (currentFilter === 'pending' && item.realizado) return false;
            if (currentFilter === 'completed' && !item.realizado) return false;
            const term = searchTerm.toLowerCase();
            const taskNameMatch = item.nombre.toLowerCase().includes(term);
            const subtaskNameMatch = item.subtasks && item.subtasks.some(sub => sub.nombre.toLowerCase().includes(term));
            return taskNameMatch || subtaskNameMatch;
        });
        checkListEmptyState(filteredList.length === 0 && LIST.some(t => !t.eliminado));
        if (filteredList.length > 0) {
             filteredList.forEach(item => agregarTareaAlDOM(item));
        }
    }
    
    // (El resto del script es idéntico al anterior)
    // ...
    function procesarYAnadirTarea(nombreTarea) {
        const tareaLimpia = nombreTarea.trim();
        if (tareaLimpia) {
            const newTask = {
                nombre: tareaLimpia,
                id: id,
                realizado: false,
                eliminado: false,
                subtasks: []
            };
            LIST.push(newTask);
            localStorage.setItem('TODO', JSON.stringify(LIST));
            id++;
            renderTasks();
            actualizarVisibilidadBotonLimpiar();
            playSound(soundAdd);
            return true;
        }
        return false;
    }

    function agregarTareaAlDOM(item) {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.id = `elemento-${item.id}`;

        const isCompleted = item.realizado;
        const REALIZADO_CLASS = isCompleted ? check : uncheck;
        const LINE_CLASS = isCompleted ? lineThrough : '';

        li.innerHTML = `
            <div class="task-content">
                <i class="fas ${REALIZADO_CLASS}" data-action="toggleRealizado" id="${item.id}"></i>
                <p class="text ${LINE_CLASS}">${item.nombre}</p>
                <div class="task-icons">
                    <i class="fas fa-tasks" data-action="toggleSubtasks" id="${item.id}" title="Ver/Añadir subtareas"></i>
                    <i class="fas fa-copy" data-action="copiar" id="${item.id}" title="Copiar"></i>
                    <i class="fas fa-trash" data-action="eliminar" id="${item.id}" title="Eliminar"></i>
                </div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill"></div>
            </div>
            <div class="subtask-container">
                <ul class="subtask-list"></ul>
                <div class="add-subtask-wrapper">
                    <input type="text" class="add-subtask-input" placeholder="Nueva subtarea + Enter">
                </div>
            </div>
        `;
        lista.appendChild(li);
        updateProgressBar(item.id);
    }
    
    function tareaRealizada(element) {
        const itemId = parseInt(element.id);
        const tarea = LIST.find(item => item.id === itemId);
        if (tarea) {
            tarea.realizado = !tarea.realizado;
            tarea.subtasks.forEach(sub => sub.realizado = tarea.realizado);
            localStorage.setItem('TODO', JSON.stringify(LIST));
            renderTasks();
            actualizarVisibilidadBotonLimpiar();
            if (tarea.realizado) playSound(soundComplete);
        }
    }

    function tareaEliminada(element) {
        const itemId = parseInt(element.id);
        const tareaIndex = LIST.findIndex(item => item.id === itemId);
        if (tareaIndex > -1) {
            lastDeleted = { ...LIST[tareaIndex] };
            LIST[tareaIndex].eliminado = true;
            localStorage.setItem('TODO', JSON.stringify(LIST));
            renderTasks();
            actualizarVisibilidadBotonLimpiar();
            showNotification('Tarea enviada a la papelera', true);
            playSound(soundDelete);
        }
    }

    function addSubtask(inputElement, parentId) {
        const subtaskName = inputElement.value.trim();
        if (subtaskName) {
            const parentTask = LIST.find(task => task.id === parentId);
            if (parentTask) {
                const newSubtask = {
                    nombre: subtaskName,
                    id: `${parentId}-${Date.now()}`,
                    realizado: false,
                };
                parentTask.subtasks.push(newSubtask);
                localStorage.setItem('TODO', JSON.stringify(LIST));
                renderSubtasks(parentId);
                updateProgressBar(parentId);
                inputElement.value = '';
                playSound(soundAdd);
            }
        }
    }

    function subtaskRealizada(subtaskId, parentId) {
        const parentTask = LIST.find(task => task.id === parentId);
        if (parentTask) {
            const subtask = parentTask.subtasks.find(sub => sub.id === subtaskId);
            if (subtask) {
                subtask.realizado = !subtask.realizado;
                const allSubtasksDone = parentTask.subtasks.every(s => s.realizado);
                parentTask.realizado = allSubtasksDone;
                
                localStorage.setItem('TODO', JSON.stringify(LIST));
                renderSubtasks(parentId);
                updateProgressBar(parentId);

                const taskElement = document.getElementById(`elemento-${parentId}`);
                if (taskElement) {
                    const checkIcon = taskElement.querySelector('[data-action="toggleRealizado"]');
                    const textP = taskElement.querySelector('p.text');
                    checkIcon.className = `fas ${parentTask.realizado ? check : uncheck}`;
                    textP.classList.toggle('line-through', parentTask.realizado);
                }

                if (subtask.realizado) playSound(soundComplete);
            }
        }
    }

    function deleteSubtask(subtaskId, parentId) {
        const parentTask = LIST.find(task => task.id === parentId);
        if (parentTask) {
            parentTask.subtasks = parentTask.subtasks.filter(sub => sub.id !== subtaskId);
            localStorage.setItem('TODO', JSON.stringify(LIST));
            renderSubtasks(parentId);
            updateProgressBar(parentId);
            playSound(soundDelete);
        }
    }

    function renderSubtasks(parentId) {
        const parentTask = LIST.find(task => task.id === parentId);
        const subtaskContainer = document.querySelector(`#elemento-${parentId} .subtask-list`);
        if (parentTask && subtaskContainer) {
            subtaskContainer.innerHTML = '';
            parentTask.subtasks.forEach(sub => {
                const subLi = document.createElement('li');
                subLi.className = 'subtask-item';
                const REALIZADO_CLASS = sub.realizado ? check : uncheck;
                const LINE_CLASS = sub.realizado ? lineThrough : '';
                subLi.innerHTML = `
                    <i class="fas ${REALIZADO_CLASS}" data-action="toggleSubtask" data-id="${sub.id}"></i>
                    <p class="text ${LINE_CLASS}">${sub.nombre}</p>
                    <i class="fas fa-trash" data-action="deleteSubtask" data-id="${sub.id}"></i>
                `;
                subtaskContainer.appendChild(subLi);
            });
        }
    }

    function updateProgressBar(parentId) {
        const parentTask = LIST.find(task => task.id === parentId);
        const progressBarFill = document.querySelector(`#elemento-${parentId} .progress-bar-fill`);
        if (parentTask && progressBarFill) {
            const total = parentTask.subtasks.length;
            if (total === 0) {
                progressBarFill.style.width = '0%';
                return;
            }
            const completed = parentTask.subtasks.filter(s => s.realizado).length;
            const percentage = (completed / total) * 100;
            progressBarFill.style.width = `${percentage}%`;
        }
    }

    function copiarTareaAlPortapapeles(element) {
        const textoParaCopiar = element?.textContent;
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
                renderTasks();
                showNotification(`${tareasMovidas} tarea(s) movida(s) a la papelera.`);
                playSound(soundEmpty);
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

    function checkListEmptyState(forceEmpty) {
        const hasVisibleTasks = LIST.some(item => !item.eliminado);
        mensajeListaVacia.classList.toggle('hidden', hasVisibleTasks && !forceEmpty);
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
                if (!vistaPrincipal.classList.contains('hidden')) renderTasks();
                else renderPapelera();
            }
            lastDeleted = null;
            notificationContainer.classList.remove('show');
        }
    }

    function renderPapelera() {
        papeleraLista.innerHTML = '';
        LIST.filter(item => item.eliminado).forEach(item => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.id = `elemento-${item.id}`;
            li.innerHTML = `
                <div class="task-content" style="cursor: default;">
                    <p class="text ${item.realizado ? lineThrough : ''}">${item.nombre}</p>
                    <div class="task-icons">
                        <i class="fas fa-undo" data-action="restaurar" id="${item.id}" title="Restaurar Tarea"></i> 
                        <i class="fas fa-trash-alt" data-action="eliminar-perm" id="${item.id}" title="Eliminar Permanentemente"></i> 
                    </div>
                </div>
            `;
            papeleraLista.appendChild(li);
        });
        checkPapeleraEmptyState();
    }

    function restaurarTarea(element) {
        const tarea = LIST.find(item => item.id === parseInt(element.id));
        if (tarea) {
            tarea.eliminado = false;
            localStorage.setItem('TODO', JSON.stringify(LIST));
            renderPapelera();
            showNotification('Tarea restaurada a la lista principal.');
        }
    }

    function eliminarPermanentemente(element) {
        const doIt = () => {
            const itemId = parseInt(element.id);
            LIST = LIST.filter(item => item.id !== itemId);
            localStorage.setItem('TODO', JSON.stringify(LIST));
            renderPapelera();
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
            renderPapelera();
            showNotification('La papelera ha sido vaciada.');
            playSound(soundEmpty);
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
        renderTasks();
    }

    function mostrarVistaPapelera() {
        vistaPrincipal.classList.add('hidden');
        vistaConfiguracion.classList.add('hidden');
        vistaPapelera.classList.remove('hidden');
        renderPapelera();
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

        LIST.forEach(item => { 
            if (item.eliminado === undefined) item.eliminado = false;
            if (item.subtasks === undefined) item.subtasks = [];
        });
        id = Math.max(0, ...LIST.map(item => item.id)) + 1;
        renderTasks();
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

        const action = element.dataset.action;
        const parentLi = element.closest('.task-item');
        if (!parentLi) return;

        const parentId = parseInt(parentLi.id.replace('elemento-', ''));

        if (action === 'toggleRealizado') tareaRealizada(element);
        else if (action === 'eliminar') tareaEliminada(element);
        else if (action === 'copiar') copiarTareaAlPortapapeles(parentLi.querySelector('p.text'));
        else if (action === 'toggleSubtasks') {
            const container = parentLi.querySelector('.subtask-container');
            container.classList.toggle('show');
            if (container.classList.contains('show')) {
                renderSubtasks(parentId);
            }
        }
        else if (action === 'toggleSubtask') subtaskRealizada(element.dataset.id, parentId);
        else if (action === 'deleteSubtask') deleteSubtask(element.dataset.id, parentId);
    });
    
    lista.addEventListener('keyup', (event) => {
        if (event.key === 'Enter' && event.target.classList.contains('add-subtask-input')) {
            const parentId = parseInt(event.target.closest('.task-item').id.replace('elemento-', ''));
            addSubtask(event.target, parentId);
        }
    });

    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderTasks();
    });

    filterButtons.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderTasks();
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
            const parentLi = element.closest('.task-item');
            if (action === 'restaurar') restaurarTarea(parentLi.querySelector('[data-action="restaurar"]'));
            else if (action === 'eliminar-perm') eliminarPermanentemente(parentLi.querySelector('[data-action="eliminar-perm"]'));
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
    soundsToggleSwitch.addEventListener('change', (e) => {
        settings.sounds = e.target.checked;
        saveSettings();
    });
    
    let draggedItem = null, longPressTimer = null, initialTouchY = 0, placeholder = null;
    const LONG_PRESS_DURATION = 500;
    let isDragging = false;
    
    const createPlaceholder = (height) => { if (!placeholder) { placeholder = document.createElement('li'); placeholder.className = 'placeholder-task'; } placeholder.style.height = `${height}px`; return placeholder; };
    const getElementDirectlyUnder = (x, y) => { if(draggedItem) draggedItem.style.display = 'none'; const el = document.elementFromPoint(x, y); if(draggedItem) draggedItem.style.display = ''; return el; };
    
    const handleTouchStart = (event) => {
        const targetLi = event.target.closest('.task-item');
        if (!targetLi || event.target.closest('.subtask-container') || event.target.tagName === 'I' || event.target.tagName === 'INPUT' || lista.querySelector('input.edit-task-input')) return;
        
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
            const targetLi = overElement.closest('.task-item:not(.placeholder-task):not(.dragging-task)');
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
        
        const tasksInDOM = Array.from(lista.querySelectorAll('.task-item:not(.placeholder-task)'));
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
        if (draggedItem?.classList.contains('dragging-task') || !target.classList.contains('text') || target.closest('.subtask-item')) return;
        if (lista.querySelector('input.edit-task-input')) lista.querySelector('input.edit-task-input').blur();
        const listItem = target.closest('.task-item');
        const taskId = parseInt(listItem?.id.replace('elemento-', ''));
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
        renderTasks(); // Re-renderizar para que se aplique bien el texto
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
            } catch(e) { console.error("Error al iniciar reconocimiento:", e); }
        });
        recognition.onstart = () => {
            botonGrabarVoz.disabled = true;
            botonGrabarVoz.classList.add('escuchando');
        };
        recognition.onend = () => {
            botonGrabarVoz.disabled = false;
            botonGrabarVoz.classList.remove('escuchando');
        };
        recognition.onerror = (event) => console.error('Error en el reconocimiento de voz:', event.error);
        recognition.onresult = (event) => {
            const rawSpeechResult = event.results[0][0].transcript.trim();
            procesarYAnadirTarea(rawSpeechResult);
        };
    } else {
        console.warn("API de Reconocimiento de Voz no compatible.");
        if(botonGrabarVoz) botonGrabarVoz.style.display = 'none';
    }

    inicializarApp();
});