// Info date
const dateNumber = document.getElementById('dateNumber');
const dateText = document.getElementById('dateText');
const dateMonth = document.getElementById('dateMonth');
const dateYear = document.getElementById('dateYear');

// Tasks Container
const tasksContainer = document.getElementById('tasksContainer');
const errorContainer = document.getElementById('errorContainer');

const setDate = () => {
    const date = new Date();
    dateNumber.textContent = date.toLocaleString('es', { day: 'numeric' });
    dateText.textContent = date.toLocaleString('es', { weekday: 'long' });
    dateMonth.textContent = date.toLocaleString('es', { month: 'short' });
    dateYear.textContent = date.toLocaleString('es', { year: 'numeric' });
};

const saveTasks = tasks => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
};

const getSavedTasks = () => {
    const tasks = localStorage.getItem('tasks');
    return tasks ? JSON.parse(tasks) : [];
};

const addNewTask = event => {
    event.preventDefault();
    const { taskText } = event.target;
    const value = taskText.value.trim();

    if (!value) {
        errorContainer.textContent = 'La tarea no puede estar vacía';
        errorContainer.style.display = 'block';
        return;
    }

    errorContainer.style.display = 'none';
    const task = { text: value, done: false };
    const tasks = getSavedTasks();
    tasks.push(task); // Añadir al final de la lista
    saveTasks(tasks);

    renderTasks(tasks);
    event.target.reset();
};

const changeTaskState = index => {
    const tasks = getSavedTasks();
    tasks[index].done = !tasks[index].done;
    saveTasks(tasks);
    renderTasks(tasks);
};

const deleteTask = index => {
    const tasks = getSavedTasks();
    tasks.splice(index, 1);
    saveTasks(tasks);
    renderTasks(tasks);
};

const renderTasks = tasks => {
    tasksContainer.innerHTML = '';
    tasks.forEach((task, index) => {
        const taskElement = document.createElement('div');
        taskElement.className = `task roundBorder ${task.done ? 'done' : ''}`;
        
        const taskText = document.createElement('div');
        taskText.className = 'task-text';
        taskText.textContent = task.text;
        taskText.addEventListener('click', () => changeTaskState(index));

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'X';
        deleteButton.addEventListener('click', () => deleteTask(index));

        taskElement.append(taskText, deleteButton);
        tasksContainer.append(taskElement); // Añadir al final del contenedor
    });
};

const order = () => {
    const tasks = getSavedTasks();
    const done = tasks.filter(task => task.done);
    const toDo = tasks.filter(task => !task.done);
    return [...toDo, ...done];
};

const renderOrderedTasks = () => {
    const orderedTasks = order();
    renderTasks(orderedTasks);
};

setDate();
renderTasks(getSavedTasks());
