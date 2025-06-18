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
    // Eliminar posible puntuación al final para mejorar la coincidencia
    const palabraLimpia = palabra.replace(/[.,!?]$/, '');
    const mapaNumeros = {
        'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4',
        'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9',
        'diez': '10', 'once': '11', 'doce': '12', 'trece': '13', 'catorce': '14',
        'quince': '15', 'dieciséis': '16', 'diecisiete': '17', 'dieciocho': '18',
        'diecinueve': '19', 'veinte': '20'
        // Puedes expandir esta lista si necesitas más números
    };
    const numero = mapaNumeros[palabraLimpia];
    if (numero !== undefined) {
        // Re-añadir la puntuación si existía y la palabra original terminaba con ella
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
    element.parentNode.parentNode.removeChild(element.parentNode);

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

lista.addEventListener('click', function (event) {
    const element = event.target;
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
    LIST = LIST.filter(item => !item.eliminado);
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
                            alert(`No se encontró la tarea número ${idParaBuscar} para ${tipoComando}.`);
                            tareaProcesadaPorComandoDeAccion = true;
                            return true;
                        }
                    } else {
                        console.log(`Número '${numeroPalabraODigito}' no válido para ${tipoComando}.`);
                        alert(`El número '${numeroPalabraODigito}' no es válido para ${tipoComando}.`);
                        tareaProcesadaPorComandoDeAccion = true;
                        return true;
                    }
                }
            }
            return false;
        }

        if (procesarComandoAccion("eliminar", prefijosComandos.eliminar)) {
            // Acción manejada
        } else if (procesarComandoAccion("completar", prefijosComandos.completar)) {
            // Acción manejada
        }

        if (!tareaProcesadaPorComandoDeAccion) {
            let nombreTareaParaAnadir;
            const prefijosAgregar = ["agregar tarea ", "añadir tarea ", "nueva tarea "];
            let textoBaseParaNombre = rawSpeechResult; // Usar el texto original con su capitalización

            for (const prefijo of prefijosAgregar) {
                if (speechResultLower.startsWith(prefijo)) {
                    textoBaseParaNombre = rawSpeechResult.substring(prefijo.length).trim();
                    break; 
                }
            }
            
            // --- INICIO DE LA MODIFICACIÓN CLAVE ---
            if (textoBaseParaNombre) {
                const palabrasOriginales = textoBaseParaNombre.split(' ');
                const palabrasProcesadas = palabrasOriginales.map(palabraOriginal => {
                    // Intentar convertir la versión en minúsculas de la palabra,
                    // pero mantenemos la palabraOriginal por si no se convierte,
                    // para conservar mayúsculas/minúsculas.
                    const numeroConvertido = palabraANumero(palabraOriginal); // palabraANumero ya hace toLowerCase()
                    
                    // Si se convirtió, usar el dígito. Si no, usar la palabra original.
                    return numeroConvertido !== null ? numeroConvertido : palabraOriginal;
                });
                nombreTareaParaAnadir = palabrasProcesadas.join(' ');
                console.log(`Nombre de tarea procesado palabra por palabra: "${textoBaseParaNombre}" -> "${nombreTareaParaAnadir}"`);
            } else {
                // Esto podría pasar si el comando fue solo "agregar tarea" sin nada más.
                nombreTareaParaAnadir = ""; 
                console.log("No se proporcionó texto para el nombre de la tarea después del prefijo, o el texto reconocido estaba vacío.");
            }
            // --- FIN DE LA MODIFICACIÓN CLAVE ---
            
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
        botonGrabarVoz.disabled = false;
        botonGrabarVoz.classList.remove('escuchando');
        botonGrabarVoz.querySelector('i').className = 'fas fa-microphone';
        console.log("Evento 'onend' del reconocimiento de voz (detenido o finalizado).");
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
    };

    recognition.onnomatch = () => {
        console.log("No hubo coincidencia en el reconocimiento.");
    };

} else {
    console.warn("La API de Reconocimiento de Voz no es compatible con este navegador.");
    alert("Tu navegador no soporta el reconocimiento de voz. Considera usar Chrome o Edge.");
    if(botonGrabarVoz) botonGrabarVoz.style.display = 'none';
}