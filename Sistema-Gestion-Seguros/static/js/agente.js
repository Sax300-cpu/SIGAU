document.addEventListener('DOMContentLoaded', () => {
  // ---------- 1) Referencias al DOM ----------
  const tablaClientesBody     = document.querySelector('#tabla-clientes tbody');
  const btnNuevoContrato      = document.getElementById('btn-nuevo-contrato');
  const searchInput           = document.getElementById('search-client');
  const btnSearch             = document.getElementById('btn-search');

  // Elementos del Modal de Contratación
  const modal                 = document.getElementById('modal-contratar-agente');
  const modalOverlay          = modal.querySelector('.modal-overlay');
  const btnCancelarAgente     = document.getElementById('btn-cancelar-agente');
  const formContratoAgente    = document.getElementById('form-contratar-agente');

  const inputClientId         = document.getElementById('input-client-id');
  const inputClientName       = document.getElementById('input-client-name');
  const selectTipoPoliza      = document.getElementById('select-tipo-poliza');
  const detallesPolizaDiv     = document.getElementById('detalles-poliza-agente');
  const inputCoberturaAgente  = document.getElementById('input-cobertura-agente');
  const inputBeneficiosAgente = document.getElementById('input-beneficios-agente');
  const inputPrimaAgente      = document.getElementById('input-prima-agente');
  const selectFrecuenciaAgente= document.getElementById('select-frecuencia-agente');

  let clientesCache = []; // Guarda la lista completa para búsquedas locales

  // ---------- 2) Cargar la lista de clientes desde el backend ----------
  async function cargarClientes() {
    try {
      const resp = await fetch('/clients');
      if (!resp.ok) throw new Error('Error al obtener lista de clientes');
      const clientes = await resp.json(); // Array de { id, name, email }

      clientesCache = clientes; // Guardamos en cache para búsquedas

      // Limpiar tabla antes de inyectar
      tablaClientesBody.innerHTML = '';

      clientes.forEach(cliente => {
        const tr = document.createElement('tr');

        // Nombre
        const tdName = document.createElement('td');
        tdName.textContent = cliente.name;

        // Email
        const tdEmail = document.createElement('td');
        tdEmail.textContent = cliente.email;

        // Acciones: botón “Seleccionar”
        const tdAcciones = document.createElement('td');
        const btnSeleccionar = document.createElement('button');
        btnSeleccionar.textContent = 'Seleccionar';
        btnSeleccionar.classList.add('btn-blue');
        btnSeleccionar.addEventListener('click', () => {
          abrirModalParaCliente(cliente);
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

  // Llamamos a cargarClientes() apenas cargue la página
  cargarClientes();

  // ---------- 3) Función para abrir modal y precargar datos del Cliente ----------
  function abrirModalParaCliente(cliente) {
    // 3.1) Poner en los campos ocultos y de solo lectura
    inputClientId.value = cliente.id;
    inputClientName.value = cliente.name + ' (' + cliente.email + ')';

    // 3.2) Limpiar resto de campos del modal
    selectTipoPoliza.value = '';
    detallesPolizaDiv.innerHTML = '';
    inputCoberturaAgente.value = '';
    inputBeneficiosAgente.value = '';
    inputPrimaAgente.value = '';
    selectFrecuenciaAgente.value = '';

    // 3.3) Mostrar modal (quitamos “hidden”)
    modal.classList.remove('hidden');
  }

  // ---------- 4) Cerrar modal si clic en overlay o “Cancelar” ----------
  modalOverlay.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  btnCancelarAgente.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // ---------- 5) Al cambiar el “Tipo de Póliza” → cargar detalles desde /policy_types ----------
  selectTipoPoliza.addEventListener('change', async () => {
    const tipoSeleccionado = selectTipoPoliza.value; // Ej: "Seguro de Salud"
    if (!tipoSeleccionado) {
      detallesPolizaDiv.innerHTML = '';
      return;
    }

    // Normalizar para buscar en policy_types: quitar "Seguro de " si existe
    let sinPrefijo = tipoSeleccionado;
    if (tipoSeleccionado.startsWith('Seguro de ')) {
      sinPrefijo = tipoSeleccionado.replace('Seguro de ', '').trim();
    }

    try {
      const resp = await fetch('/policy_types');
      if (!resp.ok) throw new Error('Error al obtener catálogo de pólizas');
      const lista = await resp.json(); // Array de objetos { name, description, cost, payment_frequency, status }

      const policyInfo = lista.find(p =>
        p.name === sinPrefijo || p.name.includes(sinPrefijo)
      );
      if (!policyInfo) {
        detallesPolizaDiv.innerHTML = `<p style="color: red;">No existe información de “${tipoSeleccionado}”.</p>`;
      } else {
        detallesPolizaDiv.innerHTML = `
          <h3>Detalles de ${policyInfo.name}</h3>
          <p><strong>Descripción:</strong> ${policyInfo.description}</p>
          <p><strong>Costo base:</strong> $${policyInfo.cost.toFixed(2)}</p>
          <p><strong>Frecuencia sugerida:</strong> ${policyInfo.payment_frequency}</p>
          <p><strong>Estado:</strong> ${policyInfo.status}</p>
        `;
        // Preseleccionar frecuencia sugerida
        selectFrecuenciaAgente.value = policyInfo.payment_frequency;
      }
    } catch (err) {
      console.error(err);
      detallesPolizaDiv.innerHTML = `<p style="color: red;">Error al cargar detalles.</p>`;
    }
  });

  // ---------- 6) Al enviar el formulario, hacer POST /policies ----------
  formContratoAgente.addEventListener('submit', async (event) => {
    event.preventDefault();

    const clientId       = inputClientId.value;                     // ID del cliente seleccionado
    const tipoPolizaRaw  = selectTipoPoliza.value;                  // Ej: "Seguro de Salud"
    const cobertura      = inputCoberturaAgente.value.trim();
    const beneficios     = inputBeneficiosAgente.value.trim();
    const prima          = inputPrimaAgente.value;
    const frecuencia     = selectFrecuenciaAgente.value;

    // Validaciones
    if (!clientId) {
      return alert('Debe seleccionar un cliente antes de continuar.');
    }
    if (!tipoPolizaRaw) {
      return alert('Seleccione un tipo de póliza.');
    }
    if (!cobertura || !beneficios || !prima || !frecuencia) {
      return alert('Complete todos los campos del formulario.');
    }

    // Construir el payload JSON para enviar al backend
    const payload = {
      name: tipoPolizaRaw + " - " + new Date().getTime(),
      type_name: tipoPolizaRaw,
      client_id: parseInt(clientId),
      coverage: cobertura,
      benefits: beneficios,
      premium_amount: prima,
      payment_frequency: frecuencia,
      status: 'active'
    };

    try {
      const resp = await fetch('/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const data = await resp.json();
        alert('Póliza creada con éxito (ID = ' + data.id + ').');
        modal.classList.add('hidden');
      } else if (resp.status === 400) {
        const errJSON = await resp.json();
        alert('Error al crear póliza: ' + (errJSON.error || JSON.stringify(errJSON)));
      } else {
        alert('No tienes permisos o ocurrió un problema.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al intentar guardar la póliza.');
    }
  });

  // ---------- 7) Botón “Nuevo Contrato” abre modal con lista de clientes (puede reutilizar lógica) ----------
  btnNuevoContrato.addEventListener('click', () => {
    // Opción: reusar la primera fila de la tabla o simplemente focusear input de búsqueda
    // En este ejemplo, vamos a poner focus en el input de búsqueda
    searchInput.focus();
  });

  // ---------- 8) Búsqueda local sobre los clientes cargados en cache ----------
  btnSearch.addEventListener('click', () => {
    const texto = searchInput.value.trim().toLowerCase();
    if (!texto) {
      // Si el campo está vacío, recargar toda la lista
      cargarClientes();
      return;
    }
    // Filtrar solo los que coincidan
    const filtrados = clientesCache.filter(c => {
      return c.name.toLowerCase().includes(texto) ||
             c.email.toLowerCase().includes(texto);
    });
    // Inyectar el resultado filtrado en la tabla
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
      btnSeleccionar.addEventListener('click', () => {
        abrirModalParaCliente(cliente);
      });
      tdAcciones.appendChild(btnSeleccionar);
      tr.appendChild(tdName);
      tr.appendChild(tdEmail);
      tr.appendChild(tdAcciones);
      tablaClientesBody.appendChild(tr);
    });
  });
});
