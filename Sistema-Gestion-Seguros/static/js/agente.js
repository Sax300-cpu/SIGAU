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

document.addEventListener('DOMContentLoaded', () => {
  // ---------- 1) Referencias al DOM ----------
  const tablaClientesBody     = document.querySelector('#tabla-clientes tbody');
  const btnNuevoContrato      = document.getElementById('btn-nuevo-contrato');
  const searchInput           = document.getElementById('search-client');
  const btnSearch             = document.getElementById('btn-search');

  // Elementos del Modal de Contratación (NUEVOS IDs)
  const modal                 = document.getElementById('modal-contratar-agente');
  const modalOverlay          = modal ? modal.querySelector('.modal-overlay') : null;
  const btnCancelar           = document.getElementById('btn-cancelar');
  const formContratoAgente    = document.getElementById('form-contratar-agente');

  const inputClientId         = document.getElementById('input-client-id');
  const inputClientName       = document.getElementById('input-client-name');
  const btnSeleccionarCliente = document.getElementById('btn-seleccionar-cliente');
  const selectSeguro          = document.getElementById('select-seguro');
  const detallesSeguroDiv     = document.getElementById('detalles-seguro');
  const inputPrima            = document.getElementById('input-prima');
  const selectFrecuencia      = document.getElementById('select-frecuencia');

  // Configuración de beneficiarios - Versión mejorada
  const beneficiariosContainer = document.getElementById('beneficiarios-container');
  const btnAgregar = document.getElementById('btn-agregar-beneficiario');

  if (btnAgregar && beneficiariosContainer) {
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
    btnAgregar.addEventListener('click', () => {
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
        btnSeleccionar.classList.add('btn-blue');
        btnSeleccionar.setAttribute('data-id', cliente.id); // IMPORTANTE
        btnSeleccionar.addEventListener('click', () => {
          // Al seleccionar, rellenar los campos y mostrar el modal
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
  if (btnSeleccionarCliente) {
    btnSeleccionarCliente.addEventListener('click', () => {
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
  const formContratoMejorado = document.getElementById('form-contratar-agente');
  const selectClienteMejorado = document.getElementById('select-cliente');
  const selectSeguroMejorado = document.getElementById('select-seguro');
  const inputPrimaMejorado = document.getElementById('input-prima');
  const selectFrecuenciaMejorado = document.getElementById('select-frecuencia');
  const beneficiariosContainerMejorado = document.getElementById('beneficiarios-container');
  const btnAgregarBeneficiarioMejorado = document.querySelector('#btn-agregar-beneficiario');
  const inputDocumentosMejorado = document.getElementById('input-documentos');
  const detallesSeguroDivMejorado = document.getElementById('detalles-seguro');

  // Solo ejecuta la lógica si el formulario mejorado existe
  if (formContratoMejorado && selectClienteMejorado && selectSeguroMejorado && inputPrimaMejorado && selectFrecuenciaMejorado && beneficiariosContainerMejorado && btnAgregarBeneficiarioMejorado && inputDocumentosMejorado && detallesSeguroDivMejorado) {

    // Cargar clientes y seguros al iniciar
    cargarClientesMejorado();
    cargarSegurosMejorado();

    // Función para cargar clientes
    async function cargarClientesMejorado() {
      try {
        const response = await fetch('/clients');
        const clientes = await response.json();
        selectClienteMejorado.innerHTML = '<option value="">--Seleccione Cliente--</option>';
        clientes.forEach(cliente => {
          const option = document.createElement('option');
          option.value = cliente.id;
          option.textContent = `${cliente.name} (${cliente.email})`;
          selectClienteMejorado.appendChild(option);
        });
      } catch (error) {
        console.error('Error al cargar clientes:', error);
      }
    }

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

    // Validar formulario antes de enviar
    formContratoMejorado.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Validar beneficiarios
      const beneficiarios = Array.from(document.querySelectorAll('.beneficiario-item'));
      const totalPorcentaje = beneficiarios.reduce((total, item) => {
        return total + parseFloat(item.querySelector('[name="beneficiario_porcentaje"]').value || 0);
      }, 0);
      
      if (beneficiarios.length > 0 && Math.abs(totalPorcentaje - 100) > 0.01) {
        showNotification('error', 'La suma de porcentajes debe ser exactamente 100%');
        return;
      }

      // Crear FormData
      const formData = new FormData();
      formData.append('client_id', selectClienteMejorado.value);
      formData.append('policy_id', selectSeguroMejorado.value);
      formData.append('premium_amount', inputPrimaMejorado.value);
      formData.append('payment_frequency', selectFrecuenciaMejorado.value);
      
      // Agregar beneficiarios
      beneficiarios.forEach((item, index) => {
        formData.append(`beneficiarios[${index}][name]`, item.querySelector('[name="beneficiario_nombre"]').value);
        formData.append(`beneficiarios[${index}][relationship]`, item.querySelector('[name="beneficiario_relacion"]').value);
        formData.append(`beneficiarios[${index}][percentage]`, item.querySelector('[name="beneficiario_porcentaje"]').value);
      });

      // Enviar al servidor
      try {
        const response = await fetch('/contracts', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        if (response.ok) {
          showNotification('success', 'Contrato creado exitosamente!');
          formContratoMejorado.reset();
          beneficiariosContainerMejorado.innerHTML = '';
          modal.classList.add('hidden');
        } else {
          showNotification('error', result.error || 'Error al crear contrato');
        }
      } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error de conexión con el servidor');
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
