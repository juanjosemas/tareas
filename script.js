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

    const contextMenu = document.getElementById('context-menu');
    const modalOverlay = document.getElementById('modal-overlay');
    const editTaskModal = document.getElementById('edit-task-modal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const saveTaskBtn = document.querySelector('.save-task-btn');
    const modalTaskName = document.getElementById('modal-task-name');
    const modalTaskDesc = document.getElementById('modal-task-desc');
    const modalTaskDueDate = document.getElementById('modal-task-due-date');
    const modalTaskTags = document.getElementById('modal-task-tags');
    
    // ================== VARIABLES GLOBALES Y CONSTANTES ==================
    const check = 'fa-check-circle', uncheck = 'fa-circle', lineThrough = 'line-through';
    let LIST, id, notificationTimer = null, lastDeleted = null;
    let settings;
    let currentFilter = 'all';
    let searchTerm = '';
    let isAudioUnlocked = false;

    let contextMenuTaskId = null;
    let editModalTaskId = null;
    
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
        // CAMBIO: El color por defecto ahora es 'red'
        taskColor: 'red',
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
        if (selectedColorInput) selectedColorInput.checked = true;
        
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

    function playSound(soundElement) {
        if (settings.sounds && soundElement && isAudioUnlocked) {
            soundElement.currentTime = 0;
            soundElement.play().catch(e => console.error("Error al reproducir sonido:", e));
        }
    }
    
    // ================== LÓGICA PRINCIPAL DE TAREAS ==================

    function formatDueDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function isOverdue(dateString) {
        if (!dateString || new Date(dateString) >= new Date().setHours(0,0,0,0) ) {
            return false;
        }
        return true;
    }

    function renderTasks(options = {}) {
        const openExtras = new Set();
        document.querySelectorAll('.task-extra-container.show').forEach(container => {
            const parentId = parseInt(container.closest('.task-item').id.replace('elemento-', ''));
            openExtras.add(parentId);
        });
    
        lista.innerHTML = '';
        const filteredList = LIST.filter(item => {
            if (item.eliminado) return false;
            if (currentFilter === 'pending' && item.realizado) return false;
            if (currentFilter === 'completed' && !item.realizado) return false;
    
            const term = searchTerm.toLowerCase();
            if (term) {
                const taskNameMatch = item.nombre.toLowerCase().includes(term);
                const subtaskNameMatch = item.subtasks && item.subtasks.some(sub => sub.nombre.toLowerCase().includes(term));
                const descriptionMatch = item.descripcion && item.descripcion.toLowerCase().includes(term);
                const tagsMatch = item.etiquetas && item.etiquetas.some(tag => tag.toLowerCase().includes(term));
                return taskNameMatch || subtaskNameMatch || descriptionMatch || tagsMatch;
            }
            return true;
        });
    
        const tasksToDisplay = [...filteredList];
    
        tasksToDisplay.sort((a, b) => {
            if (a.realizado !== b.realizado) return a.realizado - b.realizado;
            const priorityOrder = { 'alta': 1, 'media': 2, 'baja': 3 };
            const priorityA = priorityOrder[a.prioridad] || 2;
            const priorityB = priorityOrder[b.prioridad] || 2;
            if (priorityA !== priorityB) return priorityA - priorityB;

            const dateA = a.vencimiento ? new Date(a.vencimiento) : null;
            const dateB = b.vencimiento ? new Date(b.vencimiento) : null;
            if (dateA && dateB) return dateA - dateB;
            if (dateA) return -1;
            if (dateB) return 1;

            return LIST.indexOf(a) - LIST.indexOf(b);
        });
    
        checkListEmptyState(tasksToDisplay.length === 0 && LIST.some(t => !t.eliminado));
    
        tasksToDisplay.forEach(item => {
            agregarTareaAlDOM(item);
            if (openExtras.has(item.id) && item.id !== options.keepClosedId) {
                const li = document.getElementById(`elemento-${item.id}`);
                const container = li.querySelector('.task-extra-container');
                if (container) {
                    container.classList.add('show');
                    renderExtraContent(item.id);
                }
            }
        });
    }
    
    function procesarYAnadirTarea(nombreTarea) {
        const tareaLimpia = nombreTarea.trim();
        if (tareaLimpia) {
            const newTask = {
                nombre: tareaLimpia,
                id: id,
                realizado: false,
                eliminado: false,
                subtasks: [],
                prioridad: 'media',
                vencimiento: null,
                descripcion: '',
                etiquetas: []
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
        const formattedDate = formatDueDate(item.vencimiento);
        const overdueClass = isOverdue(item.vencimiento) && !item.realizado ? 'overdue' : '';
        const hasSubtasksClass = (item.subtasks && item.subtasks.length > 0) ? 'has-subtasks' : '';
    
        li.innerHTML = `
            <div class="task-main-content">
                <div class="priority-indicator ${item.prioridad || 'media'}"></div>
                <div class="task-content">
                    <i class="fas ${REALIZADO_CLASS}" data-action="toggleRealizado" id="${item.id}"></i>
                    <div class="task-details">
                        <p class="text ${LINE_CLASS}">${item.nombre}</p>
                        ${(formattedDate || (item.etiquetas && item.etiquetas.length > 0)) ? `
                            <div class="task-meta">
                                ${formattedDate ? `<span class="due-date ${overdueClass}"><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>` : ''}
                            </div>
                            <div class="task-tags">
                                ${item.etiquetas.map(tag => `<span class="tag-item">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="task-actions">
                        <i class="fas fa-ellipsis-v task-menu-trigger ${hasSubtasksClass}" data-action="openContextMenu" id="${item.id}" title="Más opciones"></i>
                    </div>
                </div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill"></div>
            </div>
            <div class="task-extra-container"></div>
        `;
        
        lista.appendChild(li);
        updateProgressBar(item.id);
    }
    
    function tareaRealizada(element) {
        const itemId = parseInt(element.id);
        const tarea = LIST.find(item => item.id === itemId);
        if (tarea) {
            tarea.realizado = !tarea.realizado;
            if (Array.isArray(tarea.subtasks)) {
                tarea.subtasks.forEach(sub => sub.realizado = tarea.realizado);
            }
            localStorage.setItem('TODO', JSON.stringify(LIST));
            renderTasks();
            actualizarVisibilidadBotonLimpiar();
            if (tarea.realizado) playSound(soundComplete);
        }
    }

    function tareaEliminada(elementId) {
        const itemId = parseInt(elementId);
        const tareaIndex = LIST.findIndex(item => item.id === itemId);
        if (tareaIndex > -1) {
            lastDeleted = { ...LIST[tareaIndex], index: tareaIndex };
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
        if (!subtaskName) return;
    
        const parentTask = LIST.find(task => task.id === parentId);
        if (!parentTask) return;
    
        if (!Array.isArray(parentTask.subtasks)) parentTask.subtasks = [];
    
        const newSubtask = { nombre: subtaskName, id: `${parentId}-${Date.now()}`, realizado: false };
        parentTask.subtasks.push(newSubtask);
        parentTask.realizado = false;
    
        localStorage.setItem('TODO', JSON.stringify(LIST));
        playSound(soundAdd);
    
        // CAMBIO: Llamamos a renderTasks pasándole el ID de la tarea actual
        // para que sepa que no debe reabrir este panel de subtareas en concreto.
        renderTasks({ keepClosedId: parentId });
    }

    function subtaskRealizada(subtaskId, parentId) {
        const parentTask = LIST.find(task => task.id === parentId);
        if (!parentTask || !Array.isArray(parentTask.subtasks)) return;

        const subtask = parentTask.subtasks.find(sub => sub.id === subtaskId);
        if (!subtask) return;

        subtask.realizado = !subtask.realizado;
        parentTask.realizado = parentTask.subtasks.every(s => s.realizado);
        
        localStorage.setItem('TODO', JSON.stringify(LIST));
        if (subtask.realizado) playSound(soundComplete);
        
        renderTasks({ keepClosedId: parentId });
    }

    function deleteSubtask(subtaskId, parentId) {
        const parentTask = LIST.find(task => task.id === parentId);
        if (!parentTask || !Array.isArray(parentTask.subtasks)) return;

        parentTask.subtasks = parentTask.subtasks.filter(sub => sub.id !== subtaskId);
        
        if (parentTask.subtasks.length > 0) {
            parentTask.realizado = parentTask.subtasks.every(s => s.realizado);
        } else {
            parentTask.realizado = false;
        }

        localStorage.setItem('TODO', JSON.stringify(LIST));
        playSound(soundDelete);

        renderTasks({ keepClosedId: parentId });
    }

    function renderExtraContent(parentId) {
        const parentTask = LIST.find(task => task.id === parentId);
        const taskElement = document.getElementById(`elemento-${parentId}`);
        if (!parentTask || !taskElement) return;

        const extraContainer = taskElement.querySelector('.task-extra-container');
        if (!extraContainer) return;
        
        let contentHTML = '';

        if (parentTask.descripcion) {
            contentHTML += `
                <div class="task-description">
                    <h5><i class="fas fa-sticky-note"></i> Notas</h5>
                    <p>${parentTask.descripcion.replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }
        
        contentHTML += '<ul class="subtask-list">';
        if (Array.isArray(parentTask.subtasks)) {
            parentTask.subtasks.forEach(sub => {
                const REALIZADO_CLASS = sub.realizado ? check : uncheck;
                const LINE_CLASS = sub.realizado ? lineThrough : '';
                contentHTML += `
                    <li class="subtask-item">
                        <i class="fas ${REALIZADO_CLASS}" data-action="toggleSubtask" data-id="${sub.id}" data-parent-id="${parentId}"></i>
                        <p class="text ${LINE_CLASS}">${sub.nombre}</p>
                        <i class="fas fa-trash" data-action="deleteSubtask" data-id="${sub.id}" data-parent-id="${parentId}"></i>
                    </li>
                `;
            });
        }
        contentHTML += '</ul>';

        contentHTML += `
            <div class="add-subtask-wrapper">
                <input type="text" class="add-subtask-input" placeholder="Nueva subtarea + Enter" data-parent-id="${parentId}">
            </div>
        `;
        
        extraContainer.innerHTML = contentHTML;
    }

    function updateProgressBar(parentId) {
        const parentTask = LIST.find(task => task.id === parentId);
        const taskElement = document.getElementById(`elemento-${parentId}`);
        if (!parentTask || !taskElement) return;

        const progressBarFill = taskElement.querySelector('.progress-bar-fill');
        if (!progressBarFill) return;
        
        if (!Array.isArray(parentTask.subtasks) || parentTask.subtasks.length === 0) {
            progressBarFill.style.width = '0%';
            return;
        }

        const total = parentTask.subtasks.length;
        const completed = parentTask.subtasks.filter(s => s.realizado).length;
        const percentage = (completed / total) * 100;
        progressBarFill.style.width = `${percentage}%`;
    }

    function copiarTareaAlPortapapeles(taskId) {
        const tarea = LIST.find(item => item.id === taskId);
        if (tarea?.nombre) {
            navigator.clipboard.writeText(tarea.nombre)
                .then(() => showNotification('¡Nombre de tarea copiado!'))
                .catch(err => console.error('Error al copiar el texto: ', err));
        }
    }

    // ================== LÓGICA DE MENÚ, PAPELERA, VISTAS, ETC ==================

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
            if (window.confirm("¿Mover todas las tareas completadas a la papelera?")) doIt();
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
                <div class="task-main-content">
                    <div class="priority-indicator ${item.prioridad || 'media'}"></div>
                    <div class="task-content" style="cursor: default;">
                        <p class="text ${item.realizado ? lineThrough : ''}">${item.nombre}</p>
                        <div class="task-actions">
                            <i class="fas fa-undo" data-action="restaurar" id="${item.id}" title="Restaurar Tarea"></i> 
                            <i class="fas fa-trash-alt" data-action="eliminar-perm" id="${item.id}" title="Eliminar Permanentemente"></i> 
                        </div>
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
            if (window.confirm("Esta acción no se puede deshacer. ¿Eliminar la tarea permanentemente?")) doIt();
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
            if (window.confirm("¿Estás seguro de que quieres eliminar PERMANENTEMENTE todas las tareas de la papelera?")) doIt();
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
        closeContextMenu();
    }
    function cerrarMenu() {
        sideMenu.classList.remove('show');
        overlay.classList.remove('show');
    }

    // ====================== LÓGICA DEL MENÚ CONTEXTUAL ======================
    function openContextMenu(event, taskId) {
        event.stopPropagation();
        closeContextMenu();
        contextMenuTaskId = taskId;
        
        const task = LIST.find(t => t.id === taskId);
        if(!task) return;
        
        // Añadir/quitar clase al botón del menú contextual
        const subtaskBtn = contextMenu.querySelector('[data-action="toggleSubtasks"]');
        if (task.subtasks && task.subtasks.length > 0) {
            subtaskBtn.classList.add('has-subtasks-indicator');
        } else {
            subtaskBtn.classList.remove('has-subtasks-indicator');
        }

        contextMenu.classList.remove('hidden');

        const clickX = event.clientX;
        const clickY = event.clientY;
        const menuWidth = contextMenu.offsetWidth;
        const menuHeight = contextMenu.offsetHeight;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        let menuX = (clickX + menuWidth > screenWidth) ? screenWidth - menuWidth - 5 : clickX;
        let menuY = (clickY + menuHeight > screenHeight) ? screenHeight - menuHeight - 5 : clickY;
        
        contextMenu.style.left = `${menuX}px`;
        contextMenu.style.top = `${menuY}px`;
    }

    function closeContextMenu() {
        if (!contextMenu.classList.contains('hidden')) {
            contextMenu.classList.add('hidden');
            contextMenuTaskId = null;
        }
    }
    
    // ====================== LÓGICA DEL MODAL DE EDICIÓN ======================
    function openEditModal(taskId) {
        const task = LIST.find(item => item.id === taskId);
        if (!task) return;
        
        editModalTaskId = taskId;
        
        modalTaskName.value = task.nombre;
        modalTaskDesc.value = task.descripcion || '';
        modalTaskDueDate.value = task.vencimiento || '';
        modalTaskTags.value = task.etiquetas ? task.etiquetas.join(', ') : '';
        
        const priorityInput = document.querySelector(`input[name="modal-priority"][value="${task.prioridad}"]`);
        if (priorityInput) priorityInput.checked = true;

        modalOverlay.classList.add('show');
        editTaskModal.classList.remove('hidden');
    }
    function closeEditModal() {
        if (!editTaskModal.classList.contains('hidden')) {
            modalOverlay.classList.remove('show');
            editTaskModal.classList.add('hidden');
            editModalTaskId = null;
        }
    }
    function saveTaskChanges() {
        if (editModalTaskId === null) return;
        const task = LIST.find(item => item.id === editModalTaskId);
        if (!task) return;

        task.nombre = modalTaskName.value.trim();
        task.descripcion = modalTaskDesc.value.trim();
        task.vencimiento = modalTaskDueDate.value;
        
        const priorityInput = document.querySelector('input[name="modal-priority"]:checked');
        task.prioridad = priorityInput ? priorityInput.value : 'media';

        task.etiquetas = modalTaskTags.value.split(',')
                                     .map(tag => tag.trim())
                                     .filter(tag => tag !== '');

        localStorage.setItem('TODO', JSON.stringify(LIST));
        renderTasks();
        closeEditModal();
        showNotification('Tarea actualizada correctamente.');
    }
    
    // ============= LÓGICA DE EDICIÓN RÁPIDA (DOBLE TOQUE) =============
    function finalizarEdicionRapida(inputElement, taskId, guardar) {
        const tarea = LIST.find(item => item.id === taskId);
        if (!tarea) { 
            if(inputElement.parentNode) inputElement.parentNode.remove(); 
            return; 
        }
        
        if (guardar && inputElement.value.trim()) {
            tarea.nombre = inputElement.value.trim();
        }
        
        localStorage.setItem('TODO', JSON.stringify(LIST));
        renderTasks();
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
            if (!Array.isArray(item.subtasks)) item.subtasks = [];
            if (item.prioridad === undefined) item.prioridad = 'media';
            if (item.vencimiento === undefined) item.vencimiento = null;
            if (item.descripcion === undefined) item.descripcion = '';
            if (!Array.isArray(item.etiquetas)) item.etiquetas = [];
        });
        
        let maxId = 0;
        LIST.forEach(item => {
            if (item && typeof item.id === 'number' && item.id > maxId) maxId = item.id;
        });
        id = maxId + 1;

        renderTasks();
        actualizarVisibilidadBotonLimpiar();
    }
    
    // ================== EVENT LISTENERS ==================
    
    botonEnter.addEventListener('click', () => {
        if (procesarYAnadirTarea(input.value)) {
            input.value = '';
            input.blur();
        }
    });
    input.addEventListener('keyup', (event) => {
        if (event.key === 'Enter' && procesarYAnadirTarea(input.value)) {
            input.value = '';
            input.blur();
        }
    });

    lista.addEventListener('click', (event) => {
        const element = event.target;
        const parentLi = element.closest('.task-item');
        if (!parentLi) return;

        const parentId = parseInt(parentLi.id.replace('elemento-', ''));
        const action = element.dataset.action;
        
        if (action === 'toggleRealizado') tareaRealizada(element);
        else if (action === 'openContextMenu') openContextMenu(event, parentId);
        else if (element.closest('.subtask-item')) {
            const subtaskId = element.dataset.id;
            const subParentId = parseInt(element.dataset.parentId);
            if (action === 'toggleSubtask') subtaskRealizada(subtaskId, subParentId);
            else if (action === 'deleteSubtask') deleteSubtask(subtaskId, subParentId);
        }
    });

    lista.addEventListener('dblclick', (event) => {
        const { target } = event;
        if (!target.classList.contains('text') || target.closest('.subtask-item') || lista.querySelector('.edit-task-input')) return;
        
        const listItem = target.closest('.task-item');
        const taskId = parseInt(listItem?.id.replace('elemento-', ''));
        const tarea = LIST.find(item => item.id === taskId);
        
        if (!tarea) return;

        const pElement = target;
        const inputDeEdicion = document.createElement('input');
        inputDeEdicion.type = 'text';
        inputDeEdicion.value = tarea.nombre;
        inputDeEdicion.className = 'edit-task-input';
        
        pElement.replaceWith(inputDeEdicion);
        inputDeEdicion.focus();
        inputDeEdicion.select();
        
        const finishEditing = (save) => {
            const currentInput = document.querySelector('.edit-task-input');
            if (currentInput) {
                finalizarEdicionRapida(currentInput, taskId, save);
            }
        };

        inputDeEdicion.addEventListener('blur', () => finishEditing(true));
        inputDeEdicion.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.target.blur();
            else if (e.key === 'Escape') finishEditing(false);
        });
    });
    
    lista.addEventListener('keyup', (event) => {
        if (event.key === 'Enter' && event.target.classList.contains('add-subtask-input')) {
            const parentId = parseInt(event.target.dataset.parentId);
            addSubtask(event.target, parentId);
        }
    });

    contextMenu.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const action = button.dataset.action;
        const taskId = contextMenuTaskId;
        closeContextMenu();
        
        if (action === 'edit') openEditModal(taskId);
        else if (action === 'delete') tareaEliminada(taskId);
        else if (action === 'copy') copiarTareaAlPortapapeles(taskId);
        else if (action === 'toggleSubtasks') {
            const li = document.getElementById(`elemento-${taskId}`);
            if (!li) return;
            const container = li.querySelector('.task-extra-container');
            if (!container) return;
            container.classList.toggle('show');
            if (container.classList.contains('show')) {
                renderExtraContent(taskId);
            }
        }
    });

    closeModalBtn.addEventListener('click', closeEditModal);
    modalOverlay.addEventListener('click', closeEditModal);
    saveTaskBtn.addEventListener('click', saveTaskChanges);

    document.addEventListener('click', (event) => {
        if (!contextMenu.contains(event.target) && !event.target.closest('.task-menu-trigger')) {
            closeContextMenu();
        }
    });
    
    searchInput.addEventListener('input', (e) => { searchTerm = e.target.value; renderTasks(); });
    filterButtons.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            if (document.querySelector('.filter-btn.active')) {
                document.querySelector('.filter-btn.active').classList.remove('active');
            }
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
    
    themeToggleSwitch.addEventListener('change', (e) => { settings.theme = e.target.checked ? 'dark' : 'light'; saveSettings(); applySettings(); });
    taskColorSelector.addEventListener('change', (e) => { settings.taskColor = e.target.value; saveSettings(); applySettings(); });
    fontSizeSlider.addEventListener('input', (e) => { settings.fontSize = e.target.value; document.documentElement.style.setProperty('--task-font-size', `${settings.fontSize}rem`); });
    fontSizeSlider.addEventListener('change', saveSettings);
    animationsToggleSwitch.addEventListener('change', (e) => { settings.animations = e.target.checked; saveSettings(); applySettings(); });
    confirmationsToggleSwitch.addEventListener('change', (e) => { settings.confirmations = e.target.checked; saveSettings(); });
    soundsToggleSwitch.addEventListener('change', (e) => { settings.sounds = e.target.checked; saveSettings(); });
    
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        botonGrabarVoz.addEventListener('click', () => {
            try { recognition.start(); } catch(e) { console.error("Error al iniciar reconocimiento:", e); }
        });
        recognition.onstart = () => { botonGrabarVoz.disabled = true; botonGrabarVoz.classList.add('escuchando'); };
        recognition.onend = () => { botonGrabarVoz.disabled = false; botonGrabarVoz.classList.remove('escuchando'); };
        recognition.onerror = (event) => console.error('Error en el reconocimiento de voz:', event.error);
        recognition.onresult = (event) => { procesarYAnadirTarea(event.results[0][0].transcript.trim()); };
    } else {
        console.warn("API de Reconocimiento de Voz no compatible.");
        if(botonGrabarVoz) botonGrabarVoz.style.display = 'none';
    }

    inicializarApp();
});