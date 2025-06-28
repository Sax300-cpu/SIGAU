// Define primero la función de actualización
function actualizarTotalPorcentajeBeneficiarios() {
    const beneficiarios = document.querySelectorAll('.beneficiario-item');
    let total = 0;
    
    beneficiarios.forEach(item => {
        const input = item.querySelector('input[name^="beneficiarios"][name$="[percentage]"]');
        if (input && input.value) {
            total += parseFloat(input.value) || 0;
        }
    });

    // Actualizar el span con el total
    const totalSpan = document.getElementById('total-beneficiarios-porcentaje');
    if (totalSpan) {
        totalSpan.textContent = Math.round(total);
        
        // Cambiar color según si suma 100% o no
        if (Math.round(total) === 100) {
            totalSpan.style.color = 'green';
        } else {
            totalSpan.style.color = 'red';
        }
    }

    // Validar y mostrar mensaje si es necesario
    const submitBtn = document.getElementById('btn-guardar');
    if (submitBtn) {
        if (beneficiarios.length > 0 && Math.round(total) !== 100) {
            submitBtn.disabled = true;
            submitBtn.title = 'La suma de porcentajes debe ser exactamente 100%';
        } else {
            submitBtn.disabled = false;
            submitBtn.title = '';
        }
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
    // Función para crear HTML de beneficiario
    const crearBeneficiarioHTML = (index) => `
        <div class="beneficiario-item">
            <div class="form-row">
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" name="beneficiarios[${index}][name]" required>
                </div>
                <div class="form-group">
                    <label>Relación</label>
                    <select name="beneficiarios[${index}][relationship]" required>
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
                    <input type="number" name="beneficiarios[${index}][percentage]" 
                           min="1" max="100" required oninput="actualizarTotalPorcentajeBeneficiarios()">
                </div>
                <button type="button" onclick="this.closest('.beneficiario-item').remove(); actualizarTotalPorcentajeBeneficiarios()">
                    ×
                </button>
            </div>
        </div>
    `;

    // Evento para agregar beneficiario
    btnAgregarBeneficiario.addEventListener('click', () => {
        const index = document.querySelectorAll('.beneficiario-item').length;
        beneficiariosContainer.insertAdjacentHTML('beforeend', crearBeneficiarioHTML(index));
        actualizarTotalPorcentajeBeneficiarios();
    });

    // Inicializar si hay beneficiarios precargados
    actualizarTotalPorcentajeBeneficiarios();

    // Manejo de eliminación de beneficiarios (delegado)
    beneficiariosContainer.addEventListener('click', e => {
      if (e.target.classList.contains('btn-remove')) {
        e.target.closest('.beneficiario-item').remove();
        actualizarTotalPorcentajeBeneficiarios();
      }
    });
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
        // --- Columna Estado con dropdown ---
        const tdEstado = document.createElement('td');
        tdEstado.style.textAlign = 'center';
        const selectEstado = document.createElement('select');
        selectEstado.className = 'estado-dropdown custom-estado';
        selectEstado.setAttribute('data-contract-id', cliente.id);
        const estados = [
          { value: 'active', label: 'Activo' },
          { value: 'inactive', label: 'Inactivo' }
        ];
        estados.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          if ((cliente.status === 'active' && opt.value === 'active') || (cliente.status !== 'active' && opt.value === 'inactive')) option.selected = true;
          option.style.color = opt.value === 'active' ? '#2ecc71' : '#e74c3c';
          selectEstado.appendChild(option);
        });
        // Aplicar color al select según valor
        function actualizarColorEstado(sel) {
          if (sel.value === 'active') {
            sel.style.background = '#eafaf1';
            sel.style.color = '#27ae60';
            sel.style.borderColor = '#27ae60';
          } else {
            sel.style.background = '#fdeaea';
            sel.style.color = '#c0392b';
            sel.style.borderColor = '#c0392b';
          }
        }
        actualizarColorEstado(selectEstado);
        selectEstado.addEventListener('change', function() {
          actualizarColorEstado(this);
        });
        tdEstado.appendChild(selectEstado);
        // --- Fin columna Estado ---
        // --- Columna Acciones con dropdown tipo select ---
        const tdAcciones = document.createElement('td');
        tdAcciones.style.textAlign = 'center';
        const accionesSelect = document.createElement('select');
        accionesSelect.className = 'acciones-dropdown';
        accionesSelect.innerHTML = `
          <option value="">Elegir...</option>
          <option value="contratar">Contratar Seguro</option>
          <option value="mostrar">Mostrar información de cliente</option>
          <option value="editar">Editar Cliente</option>
        `;
        accionesSelect.addEventListener('change', function() {
          if (this.value === 'contratar') {
            mostrarModalConfirmacion('¿Desea iniciar una contratación de seguro?', () => {
              document.getElementById('input-client-id').value = cliente.id;
              document.getElementById('input-client-name').value = `${cliente.name} (${cliente.email})`;
              if (modal) modal.classList.remove('hidden');
            });
          } else if (this.value === 'mostrar') {
            mostrarInformacionCliente(cliente.id);
          } else if (this.value === 'editar') {
            mostrarModalConfirmacion('¿Desea editar los datos del Cliente?', () => {
              alert('Funcionalidad de edición por implementar.');
            });
          }
          this.value = '';
        });
        tdAcciones.appendChild(accionesSelect);
        // --- Fin columna Acciones ---
        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdEstado);
        tr.appendChild(tdAcciones);
        tablaClientesBody.appendChild(tr);
      });

      // Lógica para mostrar/ocultar el menú desplegable de acciones
      tablaClientesBody.querySelectorAll('.btn-dropdown').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          // Cerrar otros dropdowns
          document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
          // Abrir este
          this.parentElement.classList.toggle('show');
        });
      });
      // Cerrar el dropdown si se hace clic fuera
      document.addEventListener('click', function(e) {
        document.querySelectorAll('.dropdown').forEach(d => {
          if (!d.contains(e.target)) d.classList.remove('show');
        });
      });

      // Listeners para acciones del dropdown
      tablaClientesBody.querySelectorAll('.accion-contratar').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          mostrarModalConfirmacion('¿Desea iniciar una contratación de seguro?', () => {
            document.getElementById('input-client-id').value = btn.getAttribute('data-id');
            document.getElementById('input-client-name').value = `${btn.getAttribute('data-name')} (${btn.getAttribute('data-email')})`;
            if (modal) modal.classList.remove('hidden');
          });
        });
      });
      tablaClientesBody.querySelectorAll('.accion-editar').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          mostrarModalConfirmacion('¿Desea editar los datos del Cliente?', () => {
            // Aquí puedes poner la lógica real de edición
            alert('Funcionalidad de edición por implementar.');
          });
        });
      });

      // Función para mostrar modal elegante de confirmación con callback
      function mostrarModalConfirmacion(mensaje, onConfirm) {
        let modal = document.getElementById('modal-confirmacion-accion');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'modal-confirmacion-accion';
          modal.className = 'modal hidden';
          modal.innerHTML = `
            <div class="modal-content" style="max-width:400px;text-align:center;">
              <h3>Confirmación</h3>
              <p id="modal-confirmacion-mensaje">${mensaje}</p>
              <div style="margin-top:18px;display:flex;justify-content:center;gap:16px;">
                <button id="btn-cancelar-modal" style="background:#e3e8f0;color:#1e2a3c;border:1px solid #b0b8c1;border-radius:4px;padding:7px 18px;font-size:1rem;cursor:pointer;">Cancelar</button>
                <button id="btn-confirmar-modal" style="background:#1976d2;color:#fff;border:none;border-radius:4px;padding:7px 18px;font-size:1rem;font-weight:500;cursor:pointer;">Confirmar</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);
        } else {
          document.getElementById('modal-confirmacion-mensaje').textContent = mensaje;
        }
        modal.classList.remove('hidden');
        document.getElementById('btn-cancelar-modal').onclick = () => modal.classList.add('hidden');
        document.getElementById('btn-confirmar-modal').onclick = () => {
          modal.classList.add('hidden');
          if (typeof onConfirm === 'function') onConfirm();
        };
      }

      // --- Event listener para el dropdown de estado ---
      document.querySelectorAll('.estado-dropdown').forEach(selectEstado => {
        selectEstado.addEventListener('change', async function() {
          const contractId = this.getAttribute('data-contract-id');
          const newStatus = this.value;
          this.disabled = true;
          const resp = await fetch(`/contracts/${contractId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
          });
          if (resp.ok) {
            cargarClientes();
          } else {
            alert('Error al cambiar el estado.');
            this.disabled = false;
          }
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

  let segurosDisponibles = [];

  // Cargar todos los seguros al inicio
  async function cargarSeguros() {
    const resp = await fetch('/policies');
    segurosDisponibles = await resp.json();
  }
  cargarSeguros();

  const tipoSeguroSelect = document.getElementById('tipo-seguro');
  const camposAdicionalesDiv = document.getElementById('campos-adicionales');

  if (tipoSeguroSelect && selectSeguro) {
    tipoSeguroSelect.addEventListener('change', function() {
      const tipo = this.value;
      selectSeguro.innerHTML = '<option value="">--Seleccione un Seguro--</option>';
      segurosDisponibles
        .filter(seg => seg.type_name === tipo)
        .forEach(seg => {
          const option = document.createElement('option');
          option.value = seg.id;
          option.textContent = `${seg.name} - $${seg.premium_amount.toFixed(2)}`;
          selectSeguro.appendChild(option);
        });
      // Mostrar campos adicionales según el tipo
      if (camposAdicionalesDiv) {
        if (tipo === 'Vida') {
          camposAdicionalesDiv.innerHTML = `
            <div class="form-group"><label>Estado civil</label><input type="text" name="estado_civil" required></div>
            <div class="form-group"><label>Sexo</label>
              <select name="sexo" required>
                <option value="">Seleccione</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>
            <div class="form-group"><label>Ocupación</label><input type="text" name="ocupacion" required></div>
            <div class="form-group"><label>Nacionalidad</label><input type="text" name="nacionalidad" required></div>
            <div class="form-group"><label>Altura (cm)</label><input type="number" name="altura" required></div>
            <div class="form-group"><label>Peso (kg)</label><input type="number" name="peso" required></div>
            <div class="form-group"><label>¿Tiene enfermedades crónicas?</label><input type="text" name="enfermedades_cronicas"></div>
            <div class="form-group"><label>¿Fuma o consume alcohol?</label><input type="text" name="fuma_alcohol"></div>
            <div class="form-group"><label>¿Toma medicamentos actualmente?</label><input type="text" name="medicamentos"></div>
            <div class="form-group"><label>¿Ha sido hospitalizado recientemente?</label><input type="text" name="hospitalizado"></div>
            <div class="form-group"><label>¿Ha tenido cirugías importantes?</label><input type="text" name="cirugias"></div>
          `;
        } else if (tipo === 'Salud') {
          camposAdicionalesDiv.innerHTML = `
            <div class="form-group"><label>Alergias conocidas</label><input type="text" name="alergias_conocidas"></div>
            <div class="form-group"><label>Sexo</label>
              <select name="sexo_salud" id="sexo-salud-select" required>
                <option value="">Seleccione</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>
            <div class="form-group"><label>Enfermedades previas o actuales</label><input type="text" name="enfermedades_previas"></div>
            <div class="form-group"><label>¿Ha sido hospitalizado recientemente? (fecha, motivo)</label><input type="text" name="hospitalizado_salud"></div>
            <div class="form-group"><label>¿Está en tratamiento médico actualmente?</label><input type="text" name="tratamiento_actual"></div>
            <div class="form-group" id="campo-embarazo" style="display:none;">
              <label>¿Está embarazada?</label>
              <select name="embarazada">
                <option value="">Seleccione</option>
                <option value="No">No</option>
                <option value="Sí">Sí</option>
              </select>
            </div>
          `;
          // Lógica para mostrar el campo embarazo solo si es femenino
          setTimeout(() => {
            const sexoSalud = document.getElementById('sexo-salud-select');
            const campoEmbarazo = document.getElementById('campo-embarazo');
            if (sexoSalud && campoEmbarazo) {
              sexoSalud.addEventListener('change', function() {
                if (this.value === 'Femenino') {
                  campoEmbarazo.style.display = '';
                } else {
                  campoEmbarazo.style.display = 'none';
                }
              });
            }
          }, 100);
        } else {
          camposAdicionalesDiv.innerHTML = '';
        }
      }
    });
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
        let seguro;
        try {
            seguro = await resp.json();
        } catch (jsonErr) {
            detallesSeguroDiv.innerHTML = '<p style="color:red;">Error al procesar la respuesta del servidor. Intente de nuevo o contacte al administrador.</p>';
            console.error('Respuesta no es JSON válida:', jsonErr);
            return;
        }
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
        // --- Columna Estado con dropdown ---
        const tdEstado = document.createElement('td');
        tdEstado.style.textAlign = 'center';
        const selectEstado = document.createElement('select');
        selectEstado.className = 'estado-dropdown custom-estado';
        selectEstado.setAttribute('data-contract-id', cliente.id);
        const estados = [
          { value: 'active', label: 'Activo' },
          { value: 'inactive', label: 'Inactivo' }
        ];
        estados.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          if ((cliente.status === 'active' && opt.value === 'active') || (cliente.status !== 'active' && opt.value === 'inactive')) option.selected = true;
          option.style.color = opt.value === 'active' ? '#2ecc71' : '#e74c3c';
          selectEstado.appendChild(option);
        });
        // Aplicar color al select según valor
        function actualizarColorEstado(sel) {
          if (sel.value === 'active') {
            sel.style.background = '#eafaf1';
            sel.style.color = '#27ae60';
            sel.style.borderColor = '#27ae60';
          } else {
            sel.style.background = '#fdeaea';
            sel.style.color = '#c0392b';
            sel.style.borderColor = '#c0392b';
          }
        }
        actualizarColorEstado(selectEstado);
        selectEstado.addEventListener('change', function() {
          actualizarColorEstado(this);
        });
        tdEstado.appendChild(selectEstado);
        // --- Fin columna Estado ---
        // --- Columna Acciones con dropdown tipo select ---
        const tdAcciones = document.createElement('td');
        tdAcciones.style.textAlign = 'center';
        const accionesSelect = document.createElement('select');
        accionesSelect.className = 'acciones-dropdown';
        accionesSelect.innerHTML = `
          <option value="">Elegir...</option>
          <option value="contratar">Contratar Seguro</option>
          <option value="mostrar">Mostrar información de cliente</option>
          <option value="editar">Editar Cliente</option>
        `;
        accionesSelect.addEventListener('change', function() {
          if (this.value === 'contratar') {
            mostrarModalConfirmacion('¿Desea iniciar una contratación de seguro?', () => {
              document.getElementById('input-client-id').value = cliente.id;
              document.getElementById('input-client-name').value = `${cliente.name} (${cliente.email})`;
              if (modal) modal.classList.remove('hidden');
            });
          } else if (this.value === 'mostrar') {
            mostrarInformacionCliente(cliente.id);
          } else if (this.value === 'editar') {
            mostrarModalConfirmacion('¿Desea editar los datos del Cliente?', () => {
              alert('Funcionalidad de edición por implementar.');
            });
          }
          this.value = '';
        });
        tdAcciones.appendChild(accionesSelect);
        // --- Fin columna Acciones ---
        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdEstado);
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

        // Crear objeto con los datos básicos
        const contractData = {
            client_id: inputClientIdMejorado.value,
            policy_id: selectSeguroMejorado.value,
            premium_amount: inputPrimaMejorado.value,
            payment_frequency: selectFrecuenciaMejorado.value
        };

        // Depuración: Mostrar los datos básicos
        console.log('Datos básicos del contrato:', contractData);

        // Crear FormData y agregar los campos básicos
        const formData = new FormData();
        Object.entries(contractData).forEach(([key, value]) => {
            formData.append(key, value);
        });

        // Agregar beneficiarios
        const beneficiarios = [];
        document.querySelectorAll('.beneficiario-item').forEach((item, index) => {
            beneficiarios.push({
                name: item.querySelector('[name^="beneficiarios["]').value,
                relationship: item.querySelector('[name$="[relationship]"]').value,
                percentage: item.querySelector('[name$="[percentage]"]').value
            });
        });

        // Validar beneficiarios
        if (beneficiarios.length === 0) {
            showNotification('error', 'Debe agregar al menos un beneficiario');
            return;
        }

        // Validar porcentaje de beneficiarios (suma = 100%)
        const totalPercentage = beneficiarios.reduce((sum, b) => sum + parseFloat(b.percentage), 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
            showNotification('error', 'La suma de porcentajes debe ser exactamente 100%');
            return;
        }

        // Agregar beneficiarios al FormData
        beneficiarios.forEach((b, i) => {
            formData.append(`beneficiarios[${i}][name]`, b.name);
            formData.append(`beneficiarios[${i}][relationship]`, b.relationship);
            formData.append(`beneficiarios[${i}][percentage]`, b.percentage);
        });

        // Agregar archivos si existen
        const documentosInput = document.getElementById('input-documentos');
        if (documentosInput && documentosInput.files.length > 0) {
            for (let i = 0; i < documentosInput.files.length; i++) {
                formData.append('documents', documentosInput.files[i]);
            }
        }

        // === AGREGAR CAMPOS EXTRA (datos adicionales según tipo de seguro) ===
        const camposExtra = document.querySelectorAll('#campos-adicionales [name]');
        camposExtra.forEach(input => {
            formData.append(input.name, input.value);
        });
        // === FIN CAMPOS EXTRA ===

        // Verificar que los campos requeridos están presentes
        const requiredFields = ['client_id', 'policy_id', 'premium_amount', 'payment_frequency'];
        for (const field of requiredFields) {
            if (!formData.get(field)) {
                showNotification('error', `El campo ${field} es requerido`);
                throw new Error(`Campo requerido faltante: ${field}`);
            }
        }

        // Depuración: Mostrar todos los datos del FormData
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }

        // Enviar los datos
        try {
            const response = await fetch('/contracts', {
                method: 'POST',
                body: formData
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
            // Restaurar la lista de clientes
            if (tableContainer) tableContainer.style.display = '';

        } catch (err) {
            console.error('Error:', err);
            showNotification('error', err.message);
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
        const clientId = e.target.getAttribute('data-id') || e.target.getAttribute('data-client-id');
        if (inputClientName && inputClientId) {
          inputClientName.value = `${nombre} (${email})`;
          inputClientId.value = clientId;
        }
        // --- Para el formulario mejorado ---
        if (inputClientIdMejorado) {
          inputClientIdMejorado.value = clientId;
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

  // --- NUEVO CLIENTE (AGENTE) ---
  const btnNuevoCliente = document.getElementById('btn-nuevo-cliente');
  const modalNuevoCliente = document.getElementById('modal-nuevo-cliente');
  const formNuevoCliente = document.getElementById('form-nuevo-cliente');
  const btnCancelarNC = document.getElementById('btn-cancelar-nc');

  if (btnNuevoCliente && modalNuevoCliente && formNuevoCliente && btnCancelarNC) {
    btnNuevoCliente.onclick = () => {
      formNuevoCliente.reset();
      modalNuevoCliente.classList.remove('hidden');
    };
    btnCancelarNC.onclick = () => {
      modalNuevoCliente.classList.add('hidden');
    };
    formNuevoCliente.onsubmit = async e => {
      e.preventDefault();
      // Separar nombre completo en first_name y last_name
      const fullName = formNuevoCliente.full_name.value.trim();
      const nameParts = fullName.split(' ');
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';
      const data = {
        username: formNuevoCliente.username.value.trim(),
        email: formNuevoCliente.email.value.trim(),
        password: formNuevoCliente.password.value,
        first_name,
        last_name,
        dob: formNuevoCliente.dob.value,
        phone: formNuevoCliente.phone.value.trim(),
        address: formNuevoCliente.address.value.trim()
      };
      // Validación básica
      if (!data.username || !data.email || !data.password || !fullName || !data.dob || !data.phone || !data.address) {
        alert('Todos los campos son obligatorios.');
        return;
      }
      const resp = await fetch('/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (resp.ok) {
        modalNuevoCliente.classList.add('hidden');
        cargarClientes();
        // Notificación elegante
        const modalNotif = document.getElementById('modal-notificacion-cliente');
        const notifTitulo = document.getElementById('notificacion-cliente-titulo');
        const notifMensaje = document.getElementById('notificacion-cliente-mensaje');
        const btnCerrarNotif = document.getElementById('btn-cerrar-notificacion-cliente');
        notifTitulo.textContent = '¡Éxito!';
        notifMensaje.textContent = 'Cliente creado correctamente.';
        modalNotif.classList.remove('hidden');
        btnCerrarNotif.onclick = function() {
          modalNotif.classList.add('hidden');
        };
      } else {
        const err = await resp.json();
        // Notificación elegante de error
        const modalNotif = document.getElementById('modal-notificacion-cliente');
        const notifTitulo = document.getElementById('notificacion-cliente-titulo');
        const notifMensaje = document.getElementById('notificacion-cliente-mensaje');
        const btnCerrarNotif = document.getElementById('btn-cerrar-notificacion-cliente');
        notifTitulo.textContent = 'Error';
        notifMensaje.textContent = err.error || 'Error al crear cliente.';
        modalNotif.classList.remove('hidden');
        btnCerrarNotif.onclick = function() {
          modalNotif.classList.add('hidden');
        };
      }
    };
  }

  // --- MODAL PARA MOSTRAR INFORMACIÓN COMPLETA DEL CLIENTE Y SUS CONTRATOS ---
  async function mostrarInformacionCliente(clientId) {
    try {
      // Traer contratos del cliente
      const resp = await fetch(`/clients/${clientId}/contracts`);
      if (!resp.ok) throw new Error('No se pudo obtener la información del cliente');
      const data = await resp.json();
      // Crear modal si no existe
      let modal = document.getElementById('modal-info-cliente');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-info-cliente';
        modal.className = 'modal';
        modal.innerHTML = `
          <div class="modal-overlay"></div>
          <div class="modal-content">
            <button id="btn-cerrar-info-cliente-x" class="close-x" title="Cerrar">&times;</button>
            <h3>Información completa del cliente</h3>
            <div id="info-cliente-detalle"></div>
            <button id="btn-cerrar-info-cliente" class="close-btn">Cerrar</button>
          </div>
        `;
        document.body.appendChild(modal);
      }
      // Llenar datos
      const detalleDiv = modal.querySelector('#info-cliente-detalle');
      detalleDiv.innerHTML = '';
      if (data.length === 0) {
        detalleDiv.innerHTML = '<p>Este cliente no tiene contratos registrados.</p>';
      } else {
        // Mapeo de claves a textos amigables
        const extraLabels = {
          'estado_civil': 'Estado civil',
          'sexo': 'Sexo',
          'nacionalidad': 'Nacionalidad',
          'ocupacion': 'Ocupación',
          'altura': 'Altura (cm)',
          'peso': 'Peso (kg)',
          'enfermedades_cronicas': '¿Tiene enfermedades crónicas?',
          'fuma_alcohol': '¿Fuma o consume alcohol?',
          'medicamentos': '¿Toma medicamentos actualmente?',
          'hospitalizado': '¿Ha sido hospitalizado recientemente?',
          'cirugias': '¿Ha tenido cirugías importantes?',
          'alergias_conocidas': 'Alergias conocidas',
          'enfermedades_previas': 'Enfermedades previas o actuales',
          'hospitalizado_salud': '¿Ha sido hospitalizado recientemente? (fecha, motivo)',
          'tratamiento_actual': '¿Está en tratamiento médico actualmente?',
          'embarazada': '¿Está embarazada?'
        };
        // Orden deseado de los campos
        const extraOrder = [
          'estado_civil', 'sexo', 'nacionalidad', 'ocupacion', 'altura', 'peso',
          'enfermedades_cronicas', 'fuma_alcohol', 'medicamentos', 'hospitalizado', 'cirugias',
          'alergias_conocidas', 'enfermedades_previas', 'hospitalizado_salud', 'tratamiento_actual', 'embarazada'
        ];
        data.forEach(contrato => {
          // Ordenar las claves de extra_data según extraOrder
          let orderedKeys = [];
          let extraDataKeys = contrato.extra_data ? Object.keys(contrato.extra_data) : [];
          extraOrder.forEach(key => {
            if (extraDataKeys.includes(key)) orderedKeys.push(key);
          });
          // Agregar cualquier campo no listado al final
          extraDataKeys.forEach(key => {
            if (!orderedKeys.includes(key)) orderedKeys.push(key);
          });
          detalleDiv.innerHTML += `
            <div style="border-bottom:1px solid #ccc;margin-bottom:10px;padding-bottom:10px;">
              <strong>Póliza:</strong> ${contrato.policy_name}<br>
              <strong>Prima:</strong> $${contrato.premium_amount}<br>
              <strong>Frecuencia:</strong> ${contrato.payment_frequency}<br>
              <strong>Estado:</strong> ${contrato.status}<br>
              <strong>Beneficiarios:</strong> <ul>${contrato.beneficiaries.map(b=>`<li>${b.name} (${b.relationship}) - ${b.percentage}%</li>`).join('')}</ul>
              <strong>Datos adicionales:</strong>
              <ul>
                ${
                  contrato.extra_data && orderedKeys.length > 0
                    ? orderedKeys.map(k => {
                        const label = extraLabels[k] || k.replace(/_/g,' ');
                        return `<li><b>${label}:</b> ${contrato.extra_data[k]}</li>`;
                      }).join('')
                    : '<li>No hay datos adicionales</li>'
                }
              </ul>
            </div>
          `;
        });
      }
      modal.classList.remove('hidden');
      
      // Mostrar el modal
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      
      // Asignar eventos de cierre usando onclick para evitar duplicados
      const btnCerrarX = modal.querySelector('#btn-cerrar-info-cliente-x');
      const btnCerrar = modal.querySelector('#btn-cerrar-info-cliente');
      const modalOverlay = modal.querySelector('.modal-overlay');
      
      console.log('Modal creado:', modal);
      console.log('Botón X encontrado:', btnCerrarX);
      console.log('Botón Cerrar encontrado:', btnCerrar);
      
      if (btnCerrarX) {
        btnCerrarX.onclick = function() {
          console.log('Botón X clickeado');
          modal.classList.add('hidden');
          modal.style.display = 'none';
        };
      }
      
      if (btnCerrar) {
        btnCerrar.onclick = function() {
          console.log('Botón Cerrar clickeado');
          modal.classList.add('hidden');
          modal.style.display = 'none';
        };
      }
      
      if (modalOverlay) {
        modalOverlay.onclick = function() {
          console.log('Overlay clickeado');
          modal.classList.add('hidden');
          modal.style.display = 'none';
        };
      }
      
    } catch (err) {
      alert('Error al mostrar información del cliente: ' + err.message);
    }
  }
});