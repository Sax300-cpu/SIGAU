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

  // ---------- 2) Navegación entre secciones ----------
  const inicioLink = document.getElementById('inicio-link');
  const reembolsosLink = document.getElementById('reembolsos-link');
  const reportesLink = document.getElementById('reportes-link');
  const inicioSection = document.getElementById('inicio-section');
  const reembolsosSection = document.getElementById('reembolsos-section');
  const reportesSection = document.getElementById('reportes-section');

  // Función para ocultar todas las secciones
  function ocultarTodasLasSecciones() {
    document.querySelectorAll('.content-section').forEach(section => {
      section.style.display = 'none';
    });
  }

  // Función para actualizar menú activo
  function actualizarMenuActivo(linkActivo) {
    document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
    if (linkActivo && linkActivo.parentElement) {
      linkActivo.parentElement.classList.add('active');
    }
  }

  // Event listeners para navegación
  if (inicioLink && inicioSection) {
    inicioLink.addEventListener('click', function(e) {
      e.preventDefault();
      ocultarTodasLasSecciones();
      inicioSection.style.display = 'block';
      actualizarMenuActivo(inicioLink);
    });
  }

  if (reembolsosLink && reembolsosSection) {
    reembolsosLink.addEventListener('click', function(e) {
      e.preventDefault();
      ocultarTodasLasSecciones();
      reembolsosSection.style.display = 'block';
      actualizarMenuActivo(reembolsosLink);
      cargarReembolsos();
    });
  } else {
    console.error('DEBUG: No se encontraron elementos de navegación de reembolsos');
    console.log('reembolsosLink:', !!reembolsosLink);
    console.log('reembolsosSection:', !!reembolsosSection);
  }

  if (reportesLink && reportesSection) {
    reportesLink.addEventListener('click', function(e) {
      e.preventDefault();
      ocultarTodasLasSecciones();
      reportesSection.style.display = 'block';
      actualizarMenuActivo(reportesLink);
    });
  }

  if (btnAgregarBeneficiario && beneficiariosContainer) {
    // Función para crear HTML de beneficiario
    const crearBeneficiarioHTML = (index) => `
        <div class="beneficiario-item">
            <div class="beneficiarios-grid">
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" name="beneficiarios[${index}][name]" required>
                </div>
                <div class="form-group">
                    <label>Apellido</label>
                    <input type="text" name="beneficiarios[${index}][last_name]" required>
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
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="text" name="beneficiarios[${index}][phone]" required>
                </div>
                <div class="form-group">
                    <label>Cédula</label>
                    <input type="text" name="beneficiarios[${index}][identification_number]" required>
                </div>
                <div class="form-group">
                    <label>Dirección</label>
                    <input type="text" name="beneficiarios[${index}][address]" required>
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
        // Nombre
        const tdName = document.createElement('td');
        tdName.textContent = cliente.name;
        // Correo Electrónico
        const tdEmail = document.createElement('td');
        tdEmail.textContent = cliente.email;
        // Información del Cliente (botón Ver)
        const tdInfo = document.createElement('td');
        const btnInfo = document.createElement('button');
        btnInfo.innerHTML = '<i class="fa-solid fa-eye" style="margin-right:6px;"></i>Ver';
        btnInfo.className = 'btn-ver-info btn-info-cliente';
        btnInfo.onclick = () => mostrarInformacionCliente(cliente.id);
        tdInfo.appendChild(btnInfo);
        // Contratación (botón Nuevo Contrato)
        const tdContrato = document.createElement('td');
        const btnContrato = document.createElement('button');
        btnContrato.textContent = 'Nuevo Contrato';
        btnContrato.className = 'btn-nuevo-contrato btn-nuevo-contrato';
        btnContrato.onclick = () => mostrarModalConfirmacion('¿Desea iniciar una contratación de seguro?', () => {
          document.getElementById('input-client-id').value = cliente.id;
          document.getElementById('input-client-name').value = `${cliente.name} (${cliente.email})`;
          if (modal) modal.classList.remove('hidden');
        });
        tdContrato.appendChild(btnContrato);
        // Documentos (botón con ícono)
        const tdDocs = document.createElement('td');
        const btnDocs = document.createElement('button');
        btnDocs.className = 'btn-docs-cliente btn-docs-cliente';
        btnDocs.title = 'Ver documentos del contrato';
        btnDocs.innerHTML = '<i class="fa-solid fa-file icon-doc"></i>';
        btnDocs.onclick = () => verDocumentosContrato(cliente.id);
        tdDocs.appendChild(btnDocs);
        // Estado (igual que ahora)
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
        // Acciones (dropdown)
        const tdAcciones = document.createElement('td');
        tdAcciones.style.textAlign = 'center';
        const accionesSelect = document.createElement('select');
        accionesSelect.className = 'acciones-dropdown';
        accionesSelect.innerHTML = `
          <option value="">Elegir...</option>
          <option value="editar">Editar Cliente</option>
          <option value="desactivar">Desactivar</option>
        `;
        accionesSelect.addEventListener('change', function() {
          if (this.value === 'editar') {
            mostrarModalConfirmacion('¿Desea editar los datos del Cliente?', () => {
              abrirModalEditarCliente(cliente.id);
            });
          } else if (this.value === 'desactivar') {
            mostrarModalConfirmacion('¿Desea desactivar este cliente?', () => {
              alert('Funcionalidad de desactivación por implementar.');
            });
          }
          this.value = '';
        });
        tdAcciones.appendChild(accionesSelect);
        // Agregar todas las celdas en el orden correcto
        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdEstado);
        tr.appendChild(tdInfo);
        tr.appendChild(tdContrato);
        tr.appendChild(tdDocs);
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
      // Limpiar beneficiarios
      if (beneficiariosContainer) beneficiariosContainer.innerHTML = '';
      const totalSpan = document.getElementById('total-beneficiarios-porcentaje');
      if (totalSpan) totalSpan.textContent = '0';
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
      // Mostrar/ocultar beneficiarios o contacto de emergencia según tipo de seguro
      if (tipo === 'Vida') {
        beneficiariosContainer.style.display = '';
        btnAgregarBeneficiario.style.display = '';
        contactoEmergenciaDiv.style.display = 'none';
      } else if (tipo === 'Salud') {
        beneficiariosContainer.style.display = 'none';
        btnAgregarBeneficiario.style.display = 'none';
        contactoEmergenciaDiv.style.display = '';
      } else {
        beneficiariosContainer.style.display = 'none';
        btnAgregarBeneficiario.style.display = 'none';
        contactoEmergenciaDiv.style.display = 'none';
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
          <option value="mostrar">Mostrar datos adicionales del Cliente</option>
          <option value="ver_documentos">Ver documentos del contrato</option>
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
          } else if (this.value === 'ver_documentos') {
            verDocumentosContrato(cliente.id);
          } else if (this.value === 'editar') {
            mostrarModalConfirmacion('¿Desea editar los datos del Cliente?', () => {
              abrirModalEditarCliente(cliente.id);
            });
          }
          this.value = '';
        });
        tdAcciones.appendChild(accionesSelect);
        // --- Fin columna Acciones ---
        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdEstado);
        tr.appendChild(tdInfo);
        tr.appendChild(tdContrato);
        tr.appendChild(tdDocs);
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
  const inputDocumentosMejorado = document.getElementById('input-documentos');
  const detallesSeguroDivMejorado = document.getElementById('detalles-seguro');

  // Solo ejecuta la lógica si el formulario mejorado existe
  if (formContratoMejorado 
      && inputClientIdMejorado 
      && selectSeguro          // ya definido arriba como #select-seguro
      && inputPrima            // #input-prima
      && selectFrecuencia      // #select-frecuencia
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

        // Obtener tipo de seguro seleccionado
        const tipoSeguro = tipoSeguroSelect ? tipoSeguroSelect.value : '';

        // Validar y agregar beneficiarios o contacto de emergencia
        if (tipoSeguro === 'Salud') {
            // Validar contacto de emergencia
            const nombre = document.getElementById('emergencia-nombre').value.trim();
            const relacion = document.getElementById('emergencia-relacion').value.trim();
            const telefono = document.getElementById('emergencia-telefono').value.trim();
            if (!nombre || !relacion || !telefono) {
                showNotification('error', 'Debe ingresar todos los datos del contacto de emergencia');
                return;
            }
            // Agregar a campos extra
            formData.append('emergencia_nombre', nombre);
            formData.append('emergencia_relacion', relacion);
            formData.append('emergencia_telefono', telefono);
        } else {
            // Agregar beneficiarios (lógica actual)
            const beneficiarios = [];
            document.querySelectorAll('.beneficiario-item').forEach((item, index) => {
                beneficiarios.push({
                    name: item.querySelector('[name^="beneficiarios["]').value,
                    last_name: item.querySelector('[name^="beneficiarios["][name$="[last_name]"]').value,
                    relationship: item.querySelector('[name$="[relationship]"]').value,
                    percentage: item.querySelector('[name$="[percentage]"]').value,
                    phone: item.querySelector('[name$="[phone]"]').value,
                    identification_number: item.querySelector('[name$="[identification_number]"]').value,
                    address: item.querySelector('[name$="[address]"]').value
                });
            });
            if (beneficiarios.length === 0) {
                showNotification('error', 'Debe agregar al menos un beneficiario');
                return;
            }
            const totalPercentage = beneficiarios.reduce((sum, b) => sum + parseFloat(b.percentage), 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                showNotification('error', 'La suma de porcentajes debe ser exactamente 100%');
                return;
            }
            beneficiarios.forEach((b, i) => {
                formData.append(`beneficiarios[${i}][name]`, b.name);
                formData.append(`beneficiarios[${i}][last_name]`, b.last_name);
                formData.append(`beneficiarios[${i}][relationship]`, b.relationship);
                formData.append(`beneficiarios[${i}][percentage]`, b.percentage);
                formData.append(`beneficiarios[${i}][phone]`, b.phone);
                formData.append(`beneficiarios[${i}][identification_number]`, b.identification_number);
                formData.append(`beneficiarios[${i}][address]`, b.address);
            });
        }

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

            // Mostrar modal de éxito en vez de notificación flotante
            mostrarModalExitoContrato();
            
            // Resetear formulario
            formContratoMejorado.reset();
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
            <h3>Información adicional del cliente</h3>
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
          'embarazada': '¿Está embarazada?',
          'sexo_salud': 'Sexo'
        };
        // Orden deseado de los campos
        const extraOrder = [
          'estado_civil', 'sexo', 'nacionalidad', 'ocupacion', 'altura', 'peso',
          'enfermedades_cronicas', 'fuma_alcohol', 'medicamentos', 'hospitalizado', 'cirugias',
          'alergias_conocidas', 'enfermedades_previas', 'hospitalizado_salud', 'tratamiento_actual', 'embarazada',
          'sexo_salud'
        ];
        data.forEach(contrato => {
          detalleDiv.innerHTML += `<h4 style='margin-bottom:8px;'>Su seguro:</h4>`;
          // Ordenar las claves de extra_data según extraOrder
          let orderedKeys = [];
          let extraDataKeys = contrato.extra_data ? Object.keys(contrato.extra_data) : [];
          extraOrder.forEach(key => {
            if (extraDataKeys.includes(key)) orderedKeys.push(key);
          });
          // Agregar cualquier campo no listado al final, excepto los de emergencia
          extraDataKeys.forEach(key => {
            if (!orderedKeys.includes(key) && !['emergencia_nombre','emergencia_relacion','emergencia_telefono'].includes(key)) orderedKeys.push(key);
          });

          // Contacto de emergencia
          const emergenciaNombre = contrato.extra_data['emergencia_nombre'];
          const emergenciaRelacion = contrato.extra_data['emergencia_relacion'];
          const emergenciaTelefono = contrato.extra_data['emergencia_telefono'];

          let contactoEmergenciaHTML = '';
          if (emergenciaNombre || emergenciaRelacion || emergenciaTelefono) {
            contactoEmergenciaHTML = `<li><b>Contacto de Emergencia:</b><br>
              <ul style='margin-top:2px;margin-bottom:2px;'>
                ${emergenciaNombre ? `<li><b>Nombre:</b> ${emergenciaNombre}</li>` : ''}
                ${emergenciaRelacion ? `<li><b>Relación:</b> ${emergenciaRelacion}</li>` : ''}
                ${emergenciaTelefono ? `<li><b>Teléfono:</b> ${emergenciaTelefono}</li>` : ''}
              </ul>
            </li>`;
          }

          // Mostrar beneficiarios solo si es seguro de Vida (type_id === 1)
          let beneficiariosHTML = '';
          if (contrato.type_id === 1 && contrato.beneficiaries.length > 0) {
            beneficiariosHTML = `
              <ul class="info-datos-adicionales-list" style="margin-bottom:8px;">
                ${contrato.beneficiaries.map(b => `
                  <li>
                    <b>Nombre:</b> ${b.name || ''} <b>Apellido:</b> ${b.last_name || ''}<br>
                    <b>Relación:</b> ${b.relationship || ''} <b>Porcentaje:</b> ${b.percentage || ''}%<br>
                    <b>Teléfono:</b> ${b.phone || ''} <b>Cédula:</b> ${b.identification_number || ''}<br>
                    <b>Dirección:</b> ${b.address || ''}
                  </li>
                `).join('')}
              </ul>
            `;
          }

          // Datos adicionales en formato tarjeta elegante
          let datosAdicionalesHTML = '';
          if (contrato.extra_data && orderedKeys.length > 0) {
            datosAdicionalesHTML = `<div class="info-datos-adicionales-card">` +
              orderedKeys.map(k => {
                const label = extraLabels[k] || k.replace(/_/g,' ');
                return `<div class="info-dato-adicional-item"><span class="label">${label}:</span> <span class="valor">${contrato.extra_data[k]}</span></div>`;
              }).join('') +
              `</div>`;
          }

          // Tarjeta de información del seguro
          let seguroHTML = `<div class="info-card" style="margin-top:0;">
            <div><span class="label"><strong>Póliza:</strong></span> <span class="valor">${contrato.policy_name}</span></div>
            <div><span class="label"><strong>Prima:</strong></span> <span class="valor">$${contrato.premium_amount}</span></div>
            <div><span class="label"><strong>Frecuencia:</strong></span> <span class="valor">${contrato.payment_frequency}</span></div>
            <div><span class="label"><strong>Estado:</strong></span> <span class="valor">${contrato.status}</span></div>
          </div>`;

          // Tarjeta de beneficiarios
          let beneficiariosCardHTML = '';
          if (beneficiariosHTML) {
            beneficiariosCardHTML = `<div class="info-card"><strong>Beneficiarios:</strong>${beneficiariosHTML}</div>`;
          }

          // Tarjeta de datos adicionales (si hay datos)
          let datosAdicionalesCardHTML = '';
          if (datosAdicionalesHTML) {
            datosAdicionalesCardHTML = `<div class="info-datos-adicionales-card">${datosAdicionalesHTML}</div>`;
          }

          // Tarjeta de contacto de emergencia (si existe)
          let contactoEmergenciaCardHTML = '';
          if (emergenciaNombre || emergenciaRelacion || emergenciaTelefono) {
            contactoEmergenciaCardHTML = `<div class="info-card-emergencia">
              <div class="label" style="font-weight:700;margin-bottom:6px;">Contacto de Emergencia:</div>
              ${emergenciaNombre ? `<div class="info-dato-adicional-item"><span class="label">Nombre:</span><span class="valor">${emergenciaNombre}</span></div>` : ''}
              ${emergenciaRelacion ? `<div class="info-dato-adicional-item"><span class="label">Relación:</span><span class="valor">${emergenciaRelacion}</span></div>` : ''}
              ${emergenciaTelefono ? `<div class="info-dato-adicional-item"><span class="label">Teléfono:</span><span class="valor">${emergenciaTelefono}</span></div>` : ''}
            </div>`;
          }

          detalleDiv.innerHTML += `
            <div>
              ${seguroHTML}
              ${beneficiariosCardHTML}
              <div><strong>Datos adicionales:</strong></div>
              ${datosAdicionalesCardHTML || '<div style="margin-top:6px;">No hay datos adicionales</div>'}
              ${contactoEmergenciaCardHTML}
            </div>
          `;
        });
      }
      modal.classList.remove('hidden');
      
      // Mostrar el modal
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      
      // Asignar eventos de cierre usando onclick para evitar duplicados
      const btnCerrar = modal.querySelector('#btn-cerrar-info-cliente');
      const modalOverlay = modal.querySelector('.modal-overlay');
      
      if (btnCerrar) {
        btnCerrar.onclick = function() {
          modal.classList.add('hidden');
          modal.style.display = 'none';
        };
      }
      
      if (modalOverlay) {
        modalOverlay.onclick = function() {
          modal.classList.add('hidden');
          modal.style.display = 'none';
        };
      }
      
    } catch (err) {
      alert('Error al mostrar información del cliente: ' + err.message);
    }
  }

  // Crear el bloque de contacto de emergencia
  const contactoEmergenciaDiv = document.createElement('div');
  contactoEmergenciaDiv.id = 'contacto-emergencia-container';
  contactoEmergenciaDiv.style.display = 'none';
  contactoEmergenciaDiv.innerHTML = `
    <h4>Contacto de Emergencia</h4>
    <div class="form-group"><label>Nombre</label><input type="text" id="emergencia-nombre" name="emergencia_nombre"></div>
    <div class="form-group"><label>Relación</label><input type="text" id="emergencia-relacion" name="emergencia_relacion"></div>
    <div class="form-group"><label>Teléfono</label><input type="text" id="emergencia-telefono" name="emergencia_telefono"></div>
  `;
  // Insertar el bloque de contacto de emergencia después de beneficiariosContainer
  if (beneficiariosContainer && beneficiariosContainer.parentNode) {
    beneficiariosContainer.parentNode.insertBefore(contactoEmergenciaDiv, beneficiariosContainer.nextSibling);
  }

  // Función para ver documentos del contrato de un cliente
  function verDocumentosContrato(clienteId) {
    // Buscar o crear el modal
    let modal = document.getElementById('modal-documentos-contrato');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-documentos-contrato';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content" style="max-width:700px;">
          <h3>Documentos del contrato</h3>
          <div id="documentos-contrato-detalle">
            <p>Cargando documentos...</p>
          </div>
          <button id="btn-cerrar-documentos-contrato" class="close-btn">Cerrar</button>
        </div>
      `;
      document.body.appendChild(modal);
    }
    // Mostrar el modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    // Asignar eventos de cierre
    const btnCerrar = modal.querySelector('#btn-cerrar-documentos-contrato');
    const modalOverlay = modal.querySelector('.modal-overlay');
    if (btnCerrar) btnCerrar.onclick = () => { modal.classList.add('hidden'); modal.style.display = 'none'; };
    if (modalOverlay) modalOverlay.onclick = () => { modal.classList.add('hidden'); modal.style.display = 'none'; };

    // Cargar contratos y documentos del cliente
    const detalleDiv = modal.querySelector('#documentos-contrato-detalle');
    detalleDiv.innerHTML = '<p>Cargando documentos...</p>';
    fetch(`/clients/${clienteId}/contracts`)
      .then(resp => resp.json())
      .then(contratos => {
        if (!Array.isArray(contratos) || contratos.length === 0) {
          detalleDiv.innerHTML = '<p>Este cliente no tiene contratos registrados.</p>';
          return;
        }
        let html = '';
        contratos.forEach(contrato => {
          // Separar documento_firmado.pdf y otros archivos
          let docs = (contrato.documents || []).slice();
          const firmado = docs.find(d => d.filename === 'documento_firmado.pdf');
          const otros = docs.filter(d => d.filename !== 'documento_firmado.pdf');
          html += `<div class="doc-section" style="margin-bottom:18px;">
            <strong>Póliza:</strong> ${contrato.policy_name}<br>
            <strong>Estado:</strong> ${contrato.status}<br>
            <strong>Documento firmado:</strong>
            <table class="doc-table doc-table-signed">
              <thead class="doc-table-header">
                <tr>
                  <th>Archivo</th>
                  <th>Subido por</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
            `;
            if (firmado) {
              html += `<tr class="doc-signed-highlight">
                <td><a href="/contracts/${contrato.contract_id}/docs/${encodeURIComponent(firmado.filename)}" target="_blank" class="doc-download-link">${firmado.filename}</a></td>
                <td>${firmado.uploaded_by ? firmado.uploaded_by.charAt(0).toUpperCase() + firmado.uploaded_by.slice(1) : '-'}</td>
                <td>${firmado.status ? firmado.status.charAt(0).toUpperCase() + firmado.status.slice(1) : '-'}</td>
                <td>
                  ${firmado.uploaded_by === 'cliente' && firmado.status === 'pendiente' ?
                    `<button class="btn-small doc-action-btn doc-approve" data-docid="${firmado.id}" data-contrato="${contrato.contract_id}">Aprobar</button>
                     <button class="btn-small doc-action-btn doc-reject" data-docid="${firmado.id}" data-contrato="${contrato.contract_id}">Rechazar</button>`
                    : ''}
                </td>
              </tr>`;
            } else {
              html += `<tr><td colspan="4" style="text-align:center;color:#888;">No hay documento firmado</td></tr>`;
            }
            html += '</tbody></table>';
            // Otros archivos
            html += `<strong>Otros archivos:</strong>
              <table class="doc-table doc-table-other">
                <thead class="doc-table-header">
                  <tr>
                    <th>Archivo</th>
                    <th>Subido por</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
            `;
            if (otros.length === 0) {
              html += `<tr><td colspan="3" style="text-align:center;color:#888;">No hay otros archivos</td></tr>`;
            } else {
              otros.forEach(doc => {
                html += `<tr>
                  <td><a href="/contracts/${contrato.contract_id}/docs/${encodeURIComponent(doc.filename)}" target="_blank" class="doc-download-link">${doc.filename}</a></td>
                  <td>${doc.uploaded_by ? doc.uploaded_by.charAt(0).toUpperCase() + doc.uploaded_by.slice(1) : '-'}</td>
                  <td><a href="/contracts/${contrato.contract_id}/docs/${encodeURIComponent(doc.filename)}" target="_blank" class="btn-small doc-action-btn doc-download-link">Descargar</a></td>
                </tr>`;
              });
            }
            html += '</tbody></table></div>';
        });
        detalleDiv.innerHTML = html;
        // Aquí luego implementaremos la lógica de aprobar/rechazar
      })
      .catch(err => {
        detalleDiv.innerHTML = '<p style="color:red;">Error al cargar documentos.</p>';
      });
  }

  // === MODAL ELEGANTE PARA MOTIVO DE RECHAZO ===
  function mostrarModalMotivoRechazo(onConfirm, onCancel) {
    const modalExistente = document.getElementById('modal-motivo-rechazo');
    if (modalExistente) modalExistente.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-motivo-rechazo';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content" style="max-width:400px;text-align:center;">
        <h3>Motivo del rechazo</h3>
        <textarea id="input-motivo-rechazo" rows="4" style="width:90%;margin:12px auto;resize:vertical;" placeholder="Escriba el motivo para el cliente"></textarea>
        <div style="margin-top:18px;display:flex;justify-content:center;gap:16px;">
          <button id="btn-cancelar-motivo-rechazo" class="btn-cancel">Cancelar</button>
          <button id="btn-confirmar-motivo-rechazo" class="btn-save">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('btn-cancelar-motivo-rechazo').onclick = function() {
      modal.remove();
      if (typeof onCancel === 'function') onCancel();
    };
    document.getElementById('btn-confirmar-motivo-rechazo').onclick = function() {
      const motivo = document.getElementById('input-motivo-rechazo').value.trim();
      if (!motivo) {
        alert('Debe ingresar un motivo para el rechazo.');
        return;
      }
      modal.remove();
      if (typeof onConfirm === 'function') onConfirm(motivo);
    };
    modal.querySelector('.modal-overlay').onclick = function() {
      modal.remove();
      if (typeof onCancel === 'function') onCancel();
    };
  }

  // Delegación de eventos para los botones de aprobar/rechazar documento en el modal de documentos del contrato
  // Esto se coloca al final del DOMContentLoaded o fuera para asegurar que siempre esté activo

  document.body.addEventListener('click', async function(e) {
    if (e.target.classList.contains('doc-approve') || e.target.classList.contains('doc-reject')) {
      const docId = e.target.getAttribute('data-docid');
      const contratoId = e.target.getAttribute('data-contrato');
      const accion = e.target.classList.contains('doc-approve') ? 'aprobado' : 'rechazado';

      if (accion === 'rechazado') {
        mostrarModalMotivoRechazo(async function(comentario) {
          try {
            const resp = await fetch(`/documents/${docId}/review`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: accion,
                comment: comentario
              })
            });

            if (resp.ok) {
              showNotification('success', 'Documento rechazado correctamente.');
              if (typeof verDocumentosContrato === 'function') {
                verDocumentosContrato(contratoId);
              }
            } else {
              showNotification('error', 'Error al procesar la acción.');
            }
          } catch (err) {
            showNotification('error', 'Error de red o del servidor.');
          }
        });
        return; // Importante: para que no siga el flujo normal
      }
      // ... lógica de aprobación sigue igual ...
      try {
        const resp = await fetch(`/documents/${docId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: accion,
            comment: ''
          })
        });

        if (resp.ok) {
          showNotification('success', 'Documento aprobado correctamente.');
          if (typeof verDocumentosContrato === 'function') {
            verDocumentosContrato(contratoId);
          }
        } else {
          showNotification('error', 'Error al procesar la acción.');
        }
      } catch (err) {
        showNotification('error', 'Error de red o del servidor.');
      }
    }
  });

  // ==========================
  //  GESTIÓN DE REEMBOLSOS
  // ==========================
  
  // Referencias a elementos de reembolsos
  const tablaReembolsosBody = document.querySelector('#tabla-reembolsos tbody');
  const btnRefrescarReembolsos = document.getElementById('btn-refrescar-reembolsos');
  const modalProcesarReembolso = document.getElementById('modal-procesar-reembolso');
  const btnCancelarReembolso = document.getElementById('btn-cancelar-reembolso');
  const btnProcesarReembolso = document.getElementById('btn-procesar-reembolso');

  // Verificar que los elementos necesarios estén disponibles
  console.log('DEBUG: Elementos de reembolsos encontrados:');
  console.log('- tablaReembolsosBody:', !!tablaReembolsosBody);
  console.log('- btnRefrescarReembolsos:', !!btnRefrescarReembolsos);
  console.log('- modalProcesarReembolso:', !!modalProcesarReembolso);
  console.log('- btnCancelarReembolso:', !!btnCancelarReembolso);
  console.log('- btnProcesarReembolso:', !!btnProcesarReembolso);

  // Función de prueba para verificar comunicación con backend
  async function probarConexionBackend() {
    try {
      const resp = await fetch('/refunds');
      console.log('DEBUG: Respuesta del backend /refunds:', resp.status, resp.statusText);
      
      if (resp.ok) {
        const data = await resp.json();
        console.log('DEBUG: Reembolsos obtenidos:', data.length);
      } else {
        console.error('DEBUG: Error en /refunds:', resp.status);
      }
    } catch (err) {
      console.error('DEBUG: Error de conexión:', err);
    }
  }

  // Función de prueba para verificar datos en la tabla refunds
  async function probarDatosRefunds() {
    try {
      const resp = await fetch('/test-refunds');
      console.log('DEBUG: Respuesta de test-refunds:', resp.status, resp.statusText);
      
      if (resp.ok) {
        const data = await resp.json();
        console.log('DEBUG: Estructura de tabla refunds:', data.columns);
        console.log('DEBUG: Total reembolsos en BD:', data.total_refunds);
      } else {
        console.error('DEBUG: Error en test-refunds:', resp.status);
      }
    } catch (err) {
      console.error('DEBUG: Error de conexión en test-refunds:', err);
    }
  }

  // Función para verificar información de la sesión
  async function verificarSesion() {
    try {
      const resp = await fetch('/session-info');
      console.log('DEBUG: Respuesta de session-info:', resp.status, resp.statusText);
      
      if (resp.ok) {
        const data = await resp.json();
        console.log('DEBUG: Usuario autenticado:', data.is_authenticated, 'Rol:', data.role_id);
      } else {
        console.error('DEBUG: Error en session-info:', resp.status);
      }
    } catch (err) {
      console.error('DEBUG: Error de conexión en session-info:', err);
    }
  }

  // Llamar las funciones de prueba al cargar la página
  probarConexionBackend();
  probarDatosRefunds();
  verificarSesion();

  // Bandera para evitar múltiples llamadas simultáneas
  let cargandoReembolsos = false;

  // Función para cargar reembolsos
  async function cargarReembolsos() {
    // Evitar múltiples llamadas simultáneas
    if (cargandoReembolsos) {
      return;
    }
    
    cargandoReembolsos = true;
    
    try {
      const resp = await fetch('/refunds');
      
      if (!resp.ok) throw new Error('Error al obtener lista de reembolsos');
      const reembolsos = await resp.json();
      
      // Limpiar completamente la tabla antes de agregar nuevos elementos
      tablaReembolsosBody.innerHTML = '';
      
      if (reembolsos.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px; color: #666;">No hay solicitudes de reembolso pendientes</td>';
        tablaReembolsosBody.appendChild(tr);
        return;
      }
      
      // Agrupar reembolsos por client_id y obtener solo el más reciente de cada cliente
      const reembolsosUnicos = {};
      reembolsos.forEach(reembolso => {
        const clientId = reembolso.client_id;
        if (!reembolsosUnicos[clientId] || 
            new Date(reembolso.request_date) > new Date(reembolsosUnicos[clientId].request_date)) {
          reembolsosUnicos[clientId] = reembolso;
        }
      });
      
      // Convertir a array y ordenar por fecha de solicitud (más reciente primero)
      const reembolsosFiltrados = Object.values(reembolsosUnicos)
        .sort((a, b) => new Date(b.request_date) - new Date(a.request_date));
      
      reembolsosFiltrados.forEach(reembolso => {
        const tr = document.createElement('tr');
        
        // Mapear motivos a español
        const motivosMap = {
          'cambio_circunstancias': 'Cambio en circunstancias',
          'insatisfaccion_servicio': 'Insatisfacción con servicio',
          'problemas_economicos': 'Problemas económicos',
          'encontre_mejor_opcion': 'Encontró mejor opción',
          'duplicacion_cobertura': 'Duplicación de cobertura',
          'otro': 'Otro motivo',
          'cancelation': 'Cancelación',
          'overpayment': 'Pago excesivo',
          'adjustment': 'Ajuste',
          'other': 'Otro'
        };
        
        const motivo = motivosMap[reembolso.reason] || reembolso.reason;
        const fecha = new Date(reembolso.request_date).toLocaleDateString('es-ES');
        const monto = parseFloat(reembolso.amount).toFixed(2);
        
        // Estado con badge
        const estadoBadge = `<span class="status-badge status-${reembolso.status}">${reembolso.status}</span>`;
        
        // Botón para ver razones
        const botonRazones = reembolso.reason_description 
          ? `<button class="btn-ver-razones" data-refund-id="${reembolso.refund_id}" data-reason="${reembolso.reason}" data-description="${reembolso.reason_description}">Ver Razones</button>`
          : '<span style="color: #666;">Sin razones</span>';
        
        // Botón de procesar solo si está pendiente
        const botonProcesar = reembolso.status === 'pending' 
          ? `<button class="btn-process" data-refund-id="${reembolso.refund_id}">Procesar</button>`
          : '<span style="color: #666;">Procesado</span>';
        
        tr.innerHTML = `
          <td>${reembolso.client_name || 'Cliente'}</td>
          <td>${reembolso.client_email || 'N/A'}</td>
          <td>Seguro General</td>
          <td>$${monto}</td>
          <td>${fecha}</td>
          <td>${estadoBadge}</td>
          <td>
            ${botonRazones}
            <br><br>
            ${botonProcesar}
          </td>
        `;
        
        tablaReembolsosBody.appendChild(tr);
      });
      
      // Agregar event listeners a los botones de procesar
      document.querySelectorAll('.btn-process').forEach(btn => {
        btn.addEventListener('click', () => {
          const refundId = btn.getAttribute('data-refund-id');
          mostrarModalProcesarReembolso(refundId, reembolsosFiltrados);
        });
      });
      
      // Agregar event listeners a los botones de ver razones
      document.querySelectorAll('.btn-ver-razones').forEach(btn => {
        btn.addEventListener('click', () => {
          const refundId = btn.getAttribute('data-refund-id');
          const reason = btn.getAttribute('data-reason');
          const description = btn.getAttribute('data-description');
          mostrarModalRazones(refundId, reason, description);
        });
      });
      
    } catch (err) {
      console.error('Error al cargar reembolsos:', err);
      showNotification('error', 'Error al cargar la lista de reembolsos');
      
      // Mostrar mensaje de error en la tabla
      tablaReembolsosBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px; color: #dc3545;">
            <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
            Error al cargar los reembolsos. Intente nuevamente.
          </td>
        </tr>
      `;
    } finally {
      // Resetear la bandera al finalizar
      cargandoReembolsos = false;
    }
  }

  // Función para mostrar modal de razones
  function mostrarModalRazones(refundId, reason, description) {
    const motivosMap = {
      'cambio_circunstancias': 'Cambio en circunstancias',
      'insatisfaccion_servicio': 'Insatisfacción con servicio',
      'problemas_economicos': 'Problemas económicos',
      'encontre_mejor_opcion': 'Encontró mejor opción',
      'duplicacion_cobertura': 'Duplicación de cobertura',
      'otro': 'Otro motivo',
      'cancelation': 'Cancelación',
      'overpayment': 'Pago excesivo',
      'adjustment': 'Ajuste',
      'other': 'Otro'
    };
    
    const motivoTraducido = motivosMap[reason] || reason;
    
    // Crear modal dinámico
    const modalHTML = `
      <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; justify-content: center; align-items: center;">
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; color: #333;">Razones del Reembolso</h3>
            <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
          </div>
          
          <div style="margin-bottom: 15px;">
            <strong>Motivo:</strong>
            <p style="margin: 5px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">${motivoTraducido}</p>
          </div>
          
          <div style="margin-bottom: 15px;">
            <strong>Descripción:</strong>
            <p style="margin: 5px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; white-space: pre-wrap;">${description || 'No se proporcionó descripción adicional'}</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <button onclick="this.closest('.modal-overlay').remove()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Cerrar</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // Función para mostrar modal de procesar reembolso
  function mostrarModalProcesarReembolso(refundId, reembolsos) {
    const reembolso = reembolsos.find(r => r.refund_id == refundId);
    if (!reembolso) return;
    
    // Llenar información en el modal con los campos disponibles
    document.getElementById('detalle-cliente-reembolso').textContent = reembolso.client_name || 'Cliente';
    document.getElementById('detalle-tipo-seguro-reembolso').textContent = 'Seguro General';
    document.getElementById('detalle-contrato-reembolso').textContent = reembolso.client_id;
    document.getElementById('detalle-monto-reembolso').textContent = parseFloat(reembolso.amount).toFixed(2);
    document.getElementById('detalle-fecha-reembolso').textContent = new Date(reembolso.request_date).toLocaleDateString('es-ES');
    
    // Mapear motivo a español
    const motivosMap = {
      'cambio_circunstancias': 'Cambio en circunstancias',
      'insatisfaccion_servicio': 'Insatisfacción con servicio',
      'problemas_economicos': 'Problemas económicos',
      'encontre_mejor_opcion': 'Encontró mejor opción',
      'duplicacion_cobertura': 'Duplicación de cobertura',
      'otro': 'Otro motivo',
      'cancelation': 'Cancelación',
      'overpayment': 'Pago excesivo',
      'adjustment': 'Ajuste',
      'other': 'Otro'
    };
    
    const motivoTraducido = motivosMap[reembolso.reason] || reembolso.reason;
    document.getElementById('detalle-motivo-reembolso').textContent = motivoTraducido;
    document.getElementById('detalle-razones-cliente').textContent = reembolso.reason_description || 'No se proporcionaron razones específicas';
    
    // Mostrar modal
    modalProcesarReembolso.classList.remove('hidden');
    
    // Guardar refund_id para el procesamiento
    modalProcesarReembolso.setAttribute('data-refund-id', refundId);
  }

  // Event listeners para el modal de procesar reembolso
  if (btnCancelarReembolso) {
    btnCancelarReembolso.addEventListener('click', () => {
      modalProcesarReembolso.classList.add('hidden');
      // Restaurar texto original del botón
      if (btnProcesarReembolso) {
        btnProcesarReembolso.textContent = 'Procesar';
      }
    });
  }

  // Event listener para cambiar el texto del botón según el estado seleccionado
  const estadoReembolsoSelect = document.getElementById('estado-reembolso');
  if (estadoReembolsoSelect && btnProcesarReembolso) {
    estadoReembolsoSelect.addEventListener('change', () => {
      const estadoSeleccionado = estadoReembolsoSelect.value;
      if (estadoSeleccionado === 'rejected') {
        btnProcesarReembolso.textContent = 'Rechazar';
      } else {
        btnProcesarReembolso.textContent = 'Procesar';
      }
    });
  }

  if (btnProcesarReembolso) {
    btnProcesarReembolso.addEventListener('click', async () => {
      const refundId = modalProcesarReembolso.getAttribute('data-refund-id');
      const estado = document.getElementById('estado-reembolso').value;
      const notas = document.getElementById('notas-reembolso').value;
      
      if (!estado) {
        showNotification('error', 'Debe seleccionar un estado');
        return;
      }
      
      try {
        const resp = await fetch(`/refunds/${refundId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: estado,
            notes: notas
          })
        });
        
        if (resp.ok) {
          const data = await resp.json();
          showNotification('success', data.message);
          modalProcesarReembolso.classList.add('hidden');
          
          // Limpiar formulario
          document.getElementById('estado-reembolso').value = '';
          document.getElementById('notas-reembolso').value = '';
          
          // Recargar lista de reembolsos
          cargarReembolsos();
        } else {
          const error = await resp.json();
          showNotification('error', error.error || 'Error al procesar el reembolso');
        }
      } catch (err) {
        console.error('Error:', err);
        showNotification('error', 'Error de conexión');
      }
    });
  }

  // Botón refrescar reembolsos
  if (btnRefrescarReembolsos) {
    btnRefrescarReembolsos.addEventListener('click', cargarReembolsos);
  }

  // Cerrar modal con overlay
  if (modalProcesarReembolso) {
    const overlay = modalProcesarReembolso.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        modalProcesarReembolso.classList.add('hidden');
      });
    }
  }

  // === LÓGICA PARA EDITAR CLIENTE ===
  const modalEditarCliente = document.getElementById('modal-editar-cliente');
  const formEditarCliente = document.getElementById('form-editar-cliente');
  const btnCancelarEditarCliente = document.getElementById('btn-cancelar-editar-cliente');
  const contratoSelectGroup = document.getElementById('edit-contrato-select-group');
  const contratoSelect = document.getElementById('edit-contrato-select');

  let contratosClienteGlobal = [];
  let userIdClienteGlobal = null;

  // Función para renderizar los datos adicionales de un contrato
  function renderDatosAdicionalesContrato(contrato) {
    const datosAdicionalesDiv = document.getElementById('edit-datos-adicionales');
    datosAdicionalesDiv.innerHTML = '';
    if (contrato && contrato.extra_data) {
      Object.entries(contrato.extra_data).forEach(([key, value]) => {
        datosAdicionalesDiv.innerHTML += `
          <div class="form-group">
            <label for="edit-extra-${key}">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
            <input type="text" id="edit-extra-${key}" name="extra_${key}" value="${value || ''}">
          </div>
        `;
      });
    }
  }

  // Detectar si el usuario es agente (rol_id == 2)
  function esAgente() {
    // Puedes obtener el rol de la sesión si lo tienes en una variable global o en un atributo del body
    // Aquí asumimos que hay una variable global window.rolUsuario o similar
    return window.rolUsuario === 2;
  }

  // Función para abrir el modal de edición y cargar datos
  async function abrirModalEditarCliente(clienteId) {
    try {
      // 1. Obtener datos del cliente
      const respCliente = await fetch(`/clients/${clienteId}`);
      if (!respCliente.ok) throw new Error('No se pudo obtener los datos del cliente');
      const cliente = await respCliente.json();
      // Obtener user_id del cliente
      userIdClienteGlobal = cliente.user_id || clienteId;
      // 2. Obtener contratos del cliente
      const respContratos = await fetch(`/clients/${clienteId}/contracts`);
      if (!respContratos.ok) throw new Error('No se pudo obtener los contratos del cliente');
      const contratos = await respContratos.json();
      contratosClienteGlobal = contratos; // Guardar global para el select
      const tieneContrato = Array.isArray(contratos) && contratos.length > 0;
      // 3. Rellenar campos
      document.getElementById('edit-client-id').value = cliente.id;
      document.getElementById('edit-username').value = cliente.username || '';
      document.getElementById('edit-email').value = cliente.email || '';
      document.getElementById('edit-password').value = '';
      document.getElementById('edit-phone').value = cliente.phone || '';
      document.getElementById('edit-address').value = cliente.address || '';
      document.getElementById('edit-fullname').value = (cliente.first_name || '') + (cliente.last_name ? ' ' + cliente.last_name : '');
      document.getElementById('edit-dob').value = cliente.dob || '';
      // --- NUEVO: Si es agente, deshabilitar todos los campos excepto extra_data ---
      const esAgenteActual = esAgente();
      [
        'edit-username', 'edit-email', 'edit-password', 'edit-phone', 'edit-address', 'edit-fullname', 'edit-dob'
      ].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.disabled = esAgenteActual;
      });
      // 4. Select de contratos y datos adicionales (igual que antes)
      if (tieneContrato && contratos.length > 1) {
        contratoSelectGroup.style.display = '';
        contratoSelect.innerHTML = '';
        contratos.forEach((contrato, idx) => {
          const option = document.createElement('option');
          option.value = contrato.contract_id;
          option.textContent = `${contrato.policy_name} (${contrato.status})`;
          contratoSelect.appendChild(option);
        });
        renderDatosAdicionalesContrato(contratos[0]);
        contratoSelect.onchange = function() {
          const selectedId = this.value;
          const contrato = contratosClienteGlobal.find(c => c.contract_id == selectedId);
          renderDatosAdicionalesContrato(contrato);
        };
      } else if (tieneContrato && contratos.length === 1) {
        contratoSelectGroup.style.display = 'none';
        renderDatosAdicionalesContrato(contratos[0]);
      } else {
        contratoSelectGroup.style.display = 'none';
        document.getElementById('edit-datos-adicionales').innerHTML = '';
      }
      modalEditarCliente.classList.remove('hidden');
    } catch (err) {
      alert('Error al cargar datos del cliente: ' + err.message);
    }
  }

  // Evento para cancelar edición
  if (btnCancelarEditarCliente && modalEditarCliente) {
    btnCancelarEditarCliente.onclick = () => {
      modalEditarCliente.classList.add('hidden');
      formEditarCliente.reset();
    };
  }

  // Evento para guardar cambios
  if (formEditarCliente) {
    formEditarCliente.onsubmit = async function(e) {
      e.preventDefault();
      const clienteId = document.getElementById('edit-client-id').value;
      const esAgenteActual = esAgente();
      // Si es agente, solo actualizar extra_data del contrato seleccionado
      if (esAgenteActual) {
        try {
          const contratosResp = await fetch(`/clients/${clienteId}/contracts`);
          const contratos = await contratosResp.json();
          if (Array.isArray(contratos) && contratos.length > 0) {
            let contratoId = contratos[0].contract_id;
            if (contratos.length > 1 && contratoSelect && contratoSelect.value) {
              contratoId = contratoSelect.value;
            }
            const extraData = {};
            const datosAdicionalesDiv = document.getElementById('edit-datos-adicionales');
            datosAdicionalesDiv.querySelectorAll('input[name^="extra_"]').forEach(input => {
              const key = input.name.replace('extra_', '');
              extraData[key] = input.value;
            });
            await fetch(`/contracts/${contratoId}/extra_data`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(extraData)
            });
          }
          modalEditarCliente.classList.add('hidden');
          formEditarCliente.reset();
          cargarClientes();
          mostrarModalExitoEdicionCliente();
        } catch (err) {
          alert('Error al guardar cambios: ' + err.message);
        }
        return;
      }
      // Si es admin, lógica anterior (editar todo)
      const data = {
        username: document.getElementById('edit-username').value.trim(),
        email: document.getElementById('edit-email').value.trim(),
        password: document.getElementById('edit-password').value.trim(),
        phone: document.getElementById('edit-phone').value.trim(),
        address: document.getElementById('edit-address').value.trim(),
      };
      if (!document.getElementById('edit-fullname').disabled) {
        const fullName = document.getElementById('edit-fullname').value.trim();
        const nameParts = fullName.split(' ');
        data.first_name = nameParts[0] || '';
        data.last_name = nameParts.slice(1).join(' ') || '';
        data.dob = document.getElementById('edit-dob').value;
      }
      try {
        const resp = await fetch(`/users/${userIdClienteGlobal}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!resp.ok) throw new Error('Error al guardar cambios');
        // Si hay datos adicionales y contrato, actualizarlos SOLO del contrato seleccionado
        const contratosResp = await fetch(`/clients/${clienteId}/contracts`);
        const contratos = await contratosResp.json();
        if (Array.isArray(contratos) && contratos.length > 0) {
          let contratoId = contratos[0].contract_id;
          if (contratos.length > 1 && contratoSelect && contratoSelect.value) {
            contratoId = contratoSelect.value;
          }
          const extraData = {};
          const datosAdicionalesDiv = document.getElementById('edit-datos-adicionales');
          datosAdicionalesDiv.querySelectorAll('input[name^="extra_"]').forEach(input => {
            const key = input.name.replace('extra_', '');
            extraData[key] = input.value;
          });
          await fetch(`/contracts/${contratoId}/extra_data`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(extraData)
          });
        }
        modalEditarCliente.classList.add('hidden');
        formEditarCliente.reset();
        cargarClientes();
        mostrarModalExitoEdicionCliente();
      } catch (err) {
        alert('Error al guardar cambios: ' + err.message);
      }
    };
  }

  // Modal de éxito para edición
  function mostrarModalExitoEdicionCliente() {
    const modalExistente = document.getElementById('modal-exito-editar-cliente');
    if (modalExistente) modalExistente.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-exito-editar-cliente';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content" style="max-width:350px;text-align:center; border-radius:16px; padding:32px 24px 28px 24px;">
        <h3 style="color:#1976d2; margin-bottom:28px; font-size:1.25em; font-weight:700; letter-spacing:0.5px;">Cliente editado exitosamente</h3>
        <button id="btn-cerrar-exito-editar-cliente" class="close-btn" style="background:#1976d2;color:#fff;border:none;border-radius:6px;padding:10px 32px;font-size:1.08em;font-weight:500;cursor:pointer;transition:background 0.18s;">Cerrar</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    document.getElementById('btn-cerrar-exito-editar-cliente').onclick = function() {
      modal.classList.add('hidden');
      modal.remove();
    };
    const overlay = modal.querySelector('.modal-overlay');
    if (overlay) overlay.onclick = function() {
      modal.classList.add('hidden');
      modal.remove();
    };
  }

  // Integrar con el botón de acciones
  // Reemplaza el alert de 'Funcionalidad de edición por implementar.' por abrirModalEditarCliente(cliente.id)
  // ... existing code ...
});