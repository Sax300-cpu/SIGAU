// Define primero la función de actualización
function actualizarTotalPorcentajeBeneficiarios() {
    const beneficiarios = document.querySelectorAll('.beneficiario-item');
    let total = 0;
    
    beneficiarios.forEach(item => {
        const input = item.querySelector('[name="beneficiario_porcentaje"]');
        if (input) {
            const porcentaje = parseFloat(input.value) || 0;
            total += porcentaje;
        }
    });
    
    const totalSpan = document.getElementById('total-beneficiarios-porcentaje');
    if (totalSpan) {
        totalSpan.textContent = total;
    }
}

// Confirma que tu JS se está cargando
console.log('agente.js cargado');

document.addEventListener('DOMContentLoaded', () => {
  // ---------- 1) Referencias al DOM ----------
  const tablaClientesBody     = document.querySelector('#tabla-clientes tbody');
  const btnNuevoContrato      = document.getElementById('btn-nuevo-contrato');
  const searchInput           = document.getElementById('search-client');
  const btnSearch             = document.getElementById('btn-search');

  // Elementos del Modal de Contratación
  const modal                 = document.getElementById('modal-contratar-agente');
  const modalOverlay          = modal ? modal.querySelector('.modal-overlay') : null;
  const btnCancelar           = document.getElementById('btn-cancelar');
  const formContratoMejorado  = document.getElementById('form-contratar-agente');
  const inputClientId         = document.getElementById('input-client-id');
  const inputClientName       = document.getElementById('input-client-name');
  const selectSeguro          = document.getElementById('select-seguro');
  const detallesSeguroDiv     = document.getElementById('detalles-seguro');
  const inputPrima            = document.getElementById('input-prima');
  const selectFrecuencia      = document.getElementById('select-frecuencia');
  const beneficiariosContainer = document.getElementById('beneficiarios-container');
  const btnAgregarBeneficiario = document.getElementById('btn-agregar-beneficiario');

  if (btnAgregarBeneficiario && beneficiariosContainer) {
    // Función para crear un nuevo beneficiario
    const crearBeneficiarioHTML = () => `
        <div class="beneficiario-item" style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 5px;">
            <div class="form-row">
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" name="beneficiario_nombre" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Relación</label>
                    <select name="beneficiario_relacion" class="form-control" required>
                        <option value="">Seleccione relación</option>
                        <option value="Cónyuge">Cónyuge</option>
                        <option value="Hijo/a">Hijo/a</option>
                        <option value="Padre/Madre">Padre/Madre</option>
                        <option value="Hermano/a">Hermano/a</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Porcentaje (%)</label>
                    <input type="number" name="beneficiario_porcentaje" class="form-control" 
                           min="1" max="100" required oninput="actualizarTotalPorcentajeBeneficiarios()">
                </div>
                <div class="form-group" style="display: flex; align-items: flex-end;">
                    <button type="button" class="btn btn-danger" 
                            onclick="this.closest('.beneficiario-item').remove(); actualizarTotalPorcentajeBeneficiarios()">
                        <i class="fas fa-times"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>
    `;

    // Evento para agregar beneficiario
    btnAgregarBeneficiario.addEventListener('click', () => {
        beneficiariosContainer.insertAdjacentHTML('beforeend', crearBeneficiarioHTML());
        actualizarTotalPorcentajeBeneficiarios();
    });

    // Inicializar si hay beneficiarios precargados
    actualizarTotalPorcentajeBeneficiarios();
  } else {
    console.error('No se encontraron los elementos necesarios para beneficiarios');
  }

  let clientesCache = [];

  // ---------- 2) Cargar la lista de clientes desde el backend ----------
  async function cargarClientes() {
    try {
      const resp = await fetch('/clients');
      if (!resp.ok) throw new Error('Error al obtener lista de clientes');
      const clientes = await resp.json();
      clientesCache = clientes;
      tablaClientesBody.innerHTML = '';
      clientes.forEach(cliente => {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        tdName.textContent = cliente.name;
        const tdEmail = document.createElement('td');
        tdEmail.textContent = cliente.email;
        const tdAcciones = document.createElement('td');
        const btnSeleccionar = document.createElement('button');
        btnSeleccionar.textContent = 'Seleccionar';
        btnSeleccionar.classList.add('btn-blue', 'select-client-btn');
        btnSeleccionar.setAttribute('data-client-id', cliente.id);
        tdAcciones.appendChild(btnSeleccionar);
        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdAcciones);
        tablaClientesBody.appendChild(tr);
      });

      // Agregar los event listeners a los botones de selección
      document.querySelectorAll('.select-client-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const clientId = btn.getAttribute('data-client-id');
          const clientName = btn.closest('tr').querySelector('td:first-child').textContent;
          const clientEmail = btn.closest('tr').querySelector('td:nth-child(2)').textContent;
          
          document.getElementById('input-client-id').value = clientId;
          document.getElementById('input-client-name').value = `${clientName} (${clientEmail})`;
          if (modal) modal.classList.remove('hidden');
        });
      });
    } catch (err) {
      console.error(err);
      alert('No se pudo cargar la lista de clientes.');
    }
  }
  cargarClientes();

  // ---------- 3) Botón Nuevo Contrato ----------
  if (btnNuevoContrato) {
    btnNuevoContrato.addEventListener('click', async () => {
      // Limpiar el formulario
      inputClientId.value = '';
      inputClientName.value = '';
      selectSeguro.innerHTML = '<option value="">--Seleccione un Seguro--</option>';
      detallesSeguroDiv.innerHTML = '';
      inputPrima.value = '';
      selectFrecuencia.value = '';
      // Mostrar el modal
      if (modal) modal.classList.remove('hidden');
    });
  }

  // ---------- 4) Botón Seleccionar Cliente ----------
  if (btnAgregarBeneficiario) {
    btnAgregarBeneficiario.addEventListener('click', () => {
      // Hacer scroll a la tabla de clientes
      window.scrollTo({ top: tablaClientesBody.offsetTop, behavior: 'smooth' });
    });
  }

  // ---------- 5) Cargar seguros disponibles al enfocar el select ----------
  async function cargarSeguros() {
    try {
      const resp = await fetch('/policies');
      if (!resp.ok) throw new Error('Error al cargar seguros');
      
      const seguros = await resp.json();
      selectSeguro.innerHTML = '<option value="">--Seleccione un Seguro--</option>';
      
      seguros.forEach(seg => {
        const option = document.createElement('option');
        option.value = seg.id;
        option.textContent = `${seg.name} (${seg.type_name}) - $${seg.premium_amount.toFixed(2)}`;
        option.setAttribute('data-type', seg.type_name);
        selectSeguro.appendChild(option);
      });
    } catch (err) {
      console.error(err);
      selectSeguro.innerHTML = '<option value="">No se pudieron cargar los seguros</option>';
    }
  }
  if (selectSeguro) {
    selectSeguro.addEventListener('focus', cargarSeguros);
  }

  // ---------- 6) Mostrar detalles del seguro seleccionado ----------
  if (selectSeguro) {
    selectSeguro.addEventListener('change', async () => {
      const seguroId = selectSeguro.value;
      
      // Asignar el ID del seguro al input hidden
      document.getElementById('input-policy-id').value = seguroId;
      
      if (!seguroId) {
        detallesSeguroDiv.innerHTML = '';
        return;
      }
      
      try {
        const resp = await fetch(`/policies/${seguroId}`);
        if (!resp.ok) throw new Error('Error al obtener detalles del seguro');
        
        const seguro = await resp.json();
        
        if (!seguro) {
          detallesSeguroDiv.innerHTML = '<p style="color:red;">No se encontraron detalles.</p>';
        } else {
          detallesSeguroDiv.innerHTML = `
            <h3>${seguro.name}</h3>
            <p><strong>Tipo:</strong> ${seguro.type_name}</p>
            <p><strong>Cobertura:</strong> ${seguro.coverage_details || 'No especificada'}</p>
            <p><strong>Beneficios:</strong> ${seguro.benefits || 'No especificados'}</p>
            <p><strong>Prima Base:</strong> $${seguro.premium_amount.toFixed(2)}</p>
            <p><strong>Frecuencia sugerida:</strong> ${seguro.payment_frequency}</p>
          `;
          
          // Actualizar campos editables
          inputPrima.value = seguro.premium_amount;
          selectFrecuencia.value = seguro.payment_frequency;
        }
      } catch (err) {
        console.error(err);
        detallesSeguroDiv.innerHTML = '<p style="color:red;">Error al cargar detalles del seguro.</p>';
      }
      
      // Asegurarse que los botones sigan visibles
      document.querySelector('.form-buttons').style.display = 'flex';
    });
  }

  // ---------- 7) Cerrar modal ----------
  if (modalOverlay) {
    modalOverlay.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }
  if (btnCancelar) {
    btnCancelar.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // ---------- 8) Búsqueda local sobre los clientes cargados en cache ----------
  if (btnSearch) {
    btnSearch.addEventListener('click', () => {
      const texto = searchInput.value.trim().toLowerCase();
      if (!texto) {
        cargarClientes();
        return;
      }
      const filtrados = clientesCache.filter(c => {
        return c.name.toLowerCase().includes(texto) ||
               c.email.toLowerCase().includes(texto);
      });
      tablaClientesBody.innerHTML = '';
      filtrados.forEach(cliente => {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        tdName.textContent = cliente.name;
        const tdEmail = document.createElement('td');
        tdEmail.textContent = cliente.email;
        const tdAcciones = document.createElement('td');
        const btnSeleccionar = document.createElement('button');
        btnSeleccionar.textContent = 'Seleccionar';
        btnSeleccionar.classList.add('btn-blue');
        btnSeleccionar.setAttribute('data-id', cliente.id);
        btnSeleccionar.addEventListener('click', () => {
          inputClientId.value = cliente.id;
          inputClientName.value = `${cliente.name} (${cliente.email})`;
          if (modal) modal.classList.remove('hidden');
        });
        tdAcciones.appendChild(btnSeleccionar);
        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdAcciones);
        tablaClientesBody.appendChild(tr);
      });
    });
  }

  // --- Lógica para el Formulario Mejorado ---
  const inputClientIdMejorado = document.getElementById('input-client-id');
  const selectSeguroMejorado = document.getElementById('select-seguro');
  const inputPrimaMejorado = document.getElementById('input-prima');
  const selectFrecuenciaMejorado = document.getElementById('select-frecuencia');
  const beneficiariosContainerMejorado = document.getElementById('beneficiarios-container');
  const btnAgregarBeneficiarioMejorado = document.querySelector('#btn-agregar-beneficiario');
  const inputDocumentosMejorado = document.getElementById('input-documentos');
  const detallesSeguroDivMejorado = document.getElementById('detalles-seguro');

  // Solo ejecuta la lógica si el formulario mejorado existe
  if (formContratoMejorado 
      && inputClientIdMejorado 
      && selectSeguro          // ya definido arriba como #select-seguro
      && inputPrima            // #input-prima
      && selectFrecuencia      // #select-frecuencia
      && beneficiariosContainer // #beneficiarios-container
      && btnAgregarBeneficiario  // #btn-agregar-beneficiario
      && inputDocumentosMejorado  // #input-documentos
      && detallesSeguroDiv) {  // #detalles-seguro

    // Cargar seguros al iniciar
    cargarSegurosMejorado();

    // Función para cargar seguros disponibles
    async function cargarSegurosMejorado() {
      try {
        const response = await fetch('/policies?status=active');
        const seguros = await response.json();
        selectSeguroMejorado.innerHTML = '<option value="">--Seleccione un Seguro--</option>';
        seguros.forEach(seguro => {
          const option = document.createElement('option');
          option.value = seguro.id;
          option.textContent = `${seguro.name} (${seguro.type_name}) - $${seguro.premium_amount}`;
          selectSeguroMejorado.appendChild(option);
        });
      } catch (error) {
        console.error('Error al cargar seguros:', error);
      }
    }

    // Cuando se selecciona un seguro, cargar sus detalles
    selectSeguroMejorado.addEventListener('change', async () => {
      const seguroId = selectSeguroMejorado.value;
      if (!seguroId) {
        detallesSeguroDivMejorado.innerHTML = '';
        return;
      }
      try {
        const response = await fetch(`/policies/${seguroId}`);
        const seguro = await response.json();
        detallesSeguroDivMejorado.innerHTML = `
          <h4>Detalles del Seguro</h4>
          <p><strong>Tipo:</strong> ${seguro.type_name}</p>
          <p><strong>Cobertura:</strong> ${seguro.coverage_details || 'No especificada'}</p>
          <p><strong>Beneficios:</strong> ${seguro.benefits || 'No especificados'}</p>
          <p><strong>Prima Base:</strong> $${seguro.premium_amount.toFixed(2)}</p>
        `;
        // Establecer valores por defecto
        inputPrimaMejorado.value = seguro.premium_amount;
        selectFrecuenciaMejorado.value = seguro.payment_frequency;
      } catch (error) {
        console.error('Error al cargar detalles del seguro:', error);
      }
    });

    // Agregar beneficiario
    btnAgregarBeneficiarioMejorado.addEventListener('click', () => {
        const beneficiarioDiv = document.createElement('div');
        beneficiarioDiv.className = 'beneficiario-item';
        beneficiarioDiv.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" name="beneficiario_nombre" required>
                </div>
                <div class="form-group">
                    <label>Relación</label>
                    <select name="beneficiario_relacion" required>
                        <option value="">Seleccione relación</option>
                        <option value="Cónyuge">Cónyuge</option>
                        <option value="Hijo/a">Hijo/a</option>
                        <option value="Padre/Madre">Padre/Madre</option>
                        <option value="Hermano/a">Hermano/a</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Porcentaje (%)</label>
                    <input type="number" name="beneficiario_porcentaje" min="1" max="100" required 
                           oninput="actualizarTotalPorcentajeBeneficiarios()">
                </div>
                <button type="button" class="btn-remove" onclick="this.parentElement.parentElement.remove(); actualizarTotalPorcentajeBeneficiarios()">
                    ×
                </button>
            </div>
        `;
        beneficiariosContainerMejorado.appendChild(beneficiarioDiv);
        actualizarTotalPorcentajeBeneficiarios();
    });

    // Evento submit del formulario (único manejador)
    formContratoMejorado.addEventListener('submit', async e => {
        e.preventDefault();
        console.log("Iniciando envío del formulario...");
        
        const formData = new FormData(formContratoMejorado);
        
        // Agregar campos manualmente para asegurar que se incluyan
        formData.append('client_id', inputClientIdMejorado.value);
        formData.append('policy_id', selectSeguroMejorado.value);
        formData.append('premium_amount', inputPrimaMejorado.value);
        formData.append('payment_frequency', selectFrecuenciaMejorado.value);

        // Mostrar datos que se enviarán (solo para depuración)
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }

        // Validar beneficiarios
        const beneficiarios = Array.from(document.querySelectorAll('.beneficiario-item'));
        const totalPorcentaje = beneficiarios.reduce((total, item) => {
            const input = item.querySelector('[name="beneficiario_porcentaje"]');
            return total + parseFloat(input ? input.value : 0);
        }, 0);
        
        if (beneficiarios.length > 0 && Math.round(totalPorcentaje) !== 100) {
            showNotification('error', 'La suma de porcentajes debe ser exactamente 100%');
            return;
        }

        // Agregar beneficiarios
        beneficiarios.forEach((item, index) => {
            formData.append(`beneficiarios[${index}][name]`, item.querySelector('[name="beneficiario_nombre"]').value);
            formData.append(`beneficiarios[${index}][relationship]`, item.querySelector('[name="beneficiario_relacion"]').value);
            formData.append(`beneficiarios[${index}][percentage]`, item.querySelector('[name="beneficiario_porcentaje"]').value);
        });

        // Mostrar loader
        const submitBtn = document.getElementById('btn-guardar');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            console.log("Enviando datos al servidor...");
            const response = await fetch('/contracts', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('input[name="csrf_token"]').value
                }
            });

            console.log("Respuesta recibida:", response);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error del servidor:", errorData);
                throw new Error(errorData.error || 'Error al guardar contrato');
            }

            const result = await response.json();
            console.log("Resultado exitoso:", result);

            showNotification('success', 
                `Contrato creado exitosamente!<br>
                 Beneficiarios: ${result.beneficiarios_count}<br>
                 Documentos: ${result.documentos_count}`);
            
            // Resetear formulario
            formContratoMejorado.reset();
            beneficiariosContainerMejorado.innerHTML = '';
            document.getElementById('total-beneficiarios-porcentaje').textContent = '0';
            modal.classList.add('hidden');
            
        } catch (error) {
            console.error("Error completo:", error);
            showNotification('error', error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Guardar Contrato';
        }
    });
  }

  // --- Integración de selección de cliente con el formulario mejorado (mejor experiencia visual) ---
  const tableContainer = document.querySelector('.table-container');
  if (tablaClientesBody) {
    tablaClientesBody.addEventListener('click', (e) => {
      if (e.target && e.target.tagName === 'BUTTON' && e.target.textContent.includes('Seleccionar')) {
        const tr = e.target.closest('tr');
        const nombre = tr.children[0].textContent;
        const email = tr.children[1].textContent;
        const clientId = e.target.getAttribute('data-id');
        if (inputClientName && inputClientId) {
          inputClientName.value = `${nombre} (${email})`;
          inputClientId.value = clientId;
        }
        if (modal) modal.classList.remove('hidden');
        if (tableContainer) tableContainer.style.display = 'none';
      }
    });
  }

  // Botón Cancelar del formulario mejorado
  if (btnCancelar && modal) {
    btnCancelar.addEventListener('click', () => {
      modal.classList.add('hidden');
      if (tableContainer) tableContainer.style.display = '';
    });
  }

  // Función para mostrar notificaciones
  function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<p>${message}</p>`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
});