/**
 * admin.js
 * -----------------------------------
 * Lógica combinada para:
 *   - Navegación entre secciones (Roles / Usuarios / Seguros)
 *   - Carga de usuarios en la tabla
 *   - Modal de Confirmación (Eliminar)
 *   - Modal de 2 pasos "Crear / Editar Usuario"
 *   - Gestión de Seguros (policies)
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================
  //  VARIABLES GLOBALES
  // ==========================
  const btns       = document.querySelectorAll('.menu-btn');
  const sections   = document.querySelectorAll('.content-section');
  const titleEl    = document.getElementById('content-title');
  const roleMap    = { 1: 'Admin', 2: 'Agente', 3: 'Cliente' };
  const sectNames  = {
    usuarios: 'Administración de Usuarios',
    seguros:  'Gestión de Seguros'
  };

  // Plantillas de cobertura por tipo de seguro
  const coverageTemplates = {
    'Vida': [
      'Indemnización por fallecimiento hasta suma asegurada',
      'Indemnización por invalidez total y permanente',
      'Gastos funerarios',
      'Enfermedades graves'
    ],
    'Salud': [
      'Gastos médicos mayores: hospitalización, cirugías y medicamentos',
      'Consultas médicas y especialistas',
      'Exámenes de laboratorio y diagnóstico',
      'Atención dental básica'
    ],
    'Automovil': [
      'Responsabilidad civil, colisión y robo total',
      'Daños materiales a terceros',
      'Gastos médicos a ocupantes',
      'Asistencia vial las 24 horas'
    ],
    'Hogar': [
      'Daños por incendio, robo y responsabilidad civil familiar',
      'Desastres naturales',
      'Daños por agua',
      'Contenido del hogar'
    ],
    'Viaje': [
      'Asistencia médica en el extranjero y pérdida de equipaje',
      'Cancelación de viaje',
      'Pérdida de documentos',
      'Traslado sanitario'
    ],
    'Empresarial': [
      'Daños a bienes, responsabilidad civil y lucro cesante',
      'Interrupción de negocio',
      'Responsabilidad civil profesional',
      'Ciberriesgos'
    ]
  };
  // ==========================
  //  MODALES USUARIO
  // ==========================
  const modalConfirm     = document.getElementById('modal');
  
  // Modal Crear Usuario
  const createUserModal        = document.getElementById('create-user-modal');
  const createUserForm         = document.getElementById('create-user-form');
  const createUserTypeSelection= document.getElementById('create-user-type-selection');
  const createClientFields     = document.getElementById('create-client-fields');
  
  // Modal Editar Usuario
  const editUserModal          = document.getElementById('edit-user-modal');
  const editUserForm           = document.getElementById('edit-user-form');
  const editClientFields       = document.getElementById('edit-client-fields');
  
  const btnNewUser       = document.getElementById('btn-new-user');
  const spanCloseCreateUser    = document.getElementById('close-create-user-modal');
  const spanCloseEditUser      = document.getElementById('close-edit-user-modal');
  const backToCreateSelection  = document.getElementById('back-to-create-selection');
  const cancelEditUser         = document.getElementById('cancel-edit-user');

  // ==========================
  //  MODAL SEGUROS
  // ==========================
  // Modal Crear Seguro
  const createInsuranceModal = document.getElementById('create-insurance-modal');
  const createInsuranceForm = document.getElementById('create-insurance-form');
  const btnNewInsurance = document.getElementById('btn-new-insurance');
  const spanCloseCreateInsurance = document.getElementById('close-create-insurance-modal');
  const cancelCreateInsurance = document.getElementById('cancel-create-insurance');

  // Modal Editar Seguro
  const editInsuranceModal = document.getElementById('edit-insurance-modal');
  const editInsuranceForm = document.getElementById('edit-insurance-form');
  const spanCloseEditInsurance = document.getElementById('close-edit-insurance-modal');
  const cancelEditInsurance = document.getElementById('cancel-edit-insurance');

  const insurancesTbody = document.getElementById('insurances-tbody');

  // ==========================
  //  NAVEGACIÓN ENTRE SECCIONES
  // ==========================
  function showSection(name) {
    // Activa/desactiva botón de menú y la sección correspondiente
    btns.forEach(b => b.classList.toggle('active', b.dataset.content === name));
    titleEl.textContent = sectNames[name] || '';
    sections.forEach(s => s.classList.toggle('active', s.id === name + '-content'));

    if (name === 'usuarios') loadUsers();
    if (name === 'seguros') {
      loadPolicies();
      // Reasignar evento click al botón Crear Seguro
      const btnNewInsurance = document.getElementById('btn-new-insurance');
      if (btnNewInsurance) {
        btnNewInsurance.onclick = () => {
          openCreateInsuranceModal();
        };
      }
    }
  }

  btns.forEach(b => b.onclick = () => showSection(b.dataset.content));
  showSection('usuarios');  // Inicia mostrando "Administración de Usuarios"

  // ==========================
  //  CARGAR USUARIOS EN LA TABLA
  // ==========================
  async function loadUsers() {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';
    try {
      const res = await fetch('/users');
      if (!res.ok) throw new Error(res.status);
      const list = await res.json();

      list.forEach((u, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>${u.username}</td>
          <td>${u.email}</td>
          <td>${roleMap[u.role_id] || u.role_id}</td>
          <td>
            <button class="icon-btn btn-edit" data-id="${u.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="icon-btn btn-delete" data-id="${u.id}">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>`;
        tbody.appendChild(tr);
      });

      // Listeners "Editar Usuario"
      document.querySelectorAll('.btn-edit').forEach(b => {
        b.onclick = () => openEditUserModal(b.dataset.id);
      });

      // Listeners "Eliminar Usuario" (modal genérico)
      document.querySelectorAll('.btn-delete').forEach(b => {
        b.onclick = () => showModal(
          '¿Eliminar este usuario?',
          async () => {
            await deleteUser(b.dataset.id);
          }
        );
      });
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  // ==========================
  //  ABRIR MODAL CREAR USUARIO
  // ==========================
  function openCreateUserModal() {
    createUserForm.reset();
    createUserTypeSelection.classList.add('active');
    createUserForm.classList.remove('active');
    createClientFields.style.display = 'none';
    document.getElementById('create-u-password').setAttribute('required', 'true');
    createUserModal.classList.remove('hidden');
  }

  // ==========================
  //  ABRIR MODAL EDITAR USUARIO
  // ==========================
  function openEditUserModal(id) {
    editUserForm.reset();
    document.getElementById('edit-u-id').value = id;

    // Obtener datos del usuario
    fetch(`/users/${id}`)
        .then(res => {
            if (!res.ok) {
                throw new Error('Error al cargar el usuario');
            }
            return res.json();
        })
        .then(user => {
            // Cargar datos básicos
            document.getElementById('edit-u-role').value = user.role_id;
            document.getElementById('edit-u-username').value = user.username;
            document.getElementById('edit-u-email').value = user.email;
            document.getElementById('edit-u-password').removeAttribute('required');

            if (user.role_id === 3) {
                // Cliente: mostrar campos adicionales
                editClientFields.style.display = 'block';
                const fullNameField = document.getElementById('edit-u-full-name');
                if (fullNameField) {
                  const nombreCompleto = [user.first_name, user.last_name].filter(Boolean).join(' ');
                  fullNameField.value = nombreCompleto;
                }
                document.getElementById('edit-u-dob').value = user.dob || '';
                document.getElementById('edit-u-phone').value = user.phone || '';
                document.getElementById('edit-u-address').value = user.address || '';
                if (fullNameField) fullNameField.setAttribute('required', 'true');
                document.getElementById('edit-u-dob').setAttribute('required', 'true');
            } else {
                // Admin o Agente
                editClientFields.style.display = 'none';
                const fullNameField = document.getElementById('edit-u-full-name');
                if (fullNameField) fullNameField.removeAttribute('required');
                document.getElementById('edit-u-dob').removeAttribute('required');
            }
        })
        .catch(err => {
            console.error('Error cargando usuario para editar:', err);
            showNotification('error', 'Error', 'No se pudo cargar los datos del usuario');
        });

    editUserModal.classList.remove('hidden');
  }

  // ==========================
  //  EVENTOS DEL MODAL USUARIO
  // ==========================
  // 1) "Crear Usuario" abre el modal
  btnNewUser.onclick = () => openCreateUserModal();

  // 2) "X" cierra el modal
  spanCloseCreateUser.onclick = () => {
    createUserModal.classList.add('hidden');
    createUserForm.reset();
    createUserForm.classList.remove('active');
    createUserTypeSelection.classList.add('active');
  };

  // 3) Selección de tipo de usuario
  document.querySelectorAll('.user-type-btn').forEach(b => {
    b.onclick = () => {
      const tipo = b.dataset.type;
      createUserTypeSelection.classList.remove('active');
      createUserForm.classList.add('active');

      // Manejo seguro de campos de cliente
      const fullNameField = document.getElementById('create-u-full-name');
      const dobField = document.getElementById('create-u-dob');
      if (tipo === 'client') {
        createClientFields.style.display = 'block';
        document.getElementById('create-u-role').value = 3;
        if (fullNameField) fullNameField.setAttribute('required', 'true');
        if (dobField) dobField.setAttribute('required', 'true');
      } else {
        createClientFields.style.display = 'none';
        document.getElementById('create-u-role').value = tipo === 'admin' ? 1 : 2;
        if (fullNameField) fullNameField.removeAttribute('required');
        if (dobField) dobField.removeAttribute('required');
      }
    };
  });

  // 4) "Volver" en el modal de crear usuario (regresa a selección de tipo)
  backToCreateSelection.onclick = () => {
    createUserForm.classList.remove('active');
    createUserTypeSelection.classList.add('active');
    createUserForm.reset();
  };

  // ==========================
  //  EVENTOS DEL MODAL EDITAR USUARIO
  // ==========================
  // 1) "X" cierra el modal de editar
  spanCloseEditUser.onclick = () => {
    editUserModal.classList.add('hidden');
    editUserForm.reset();
  };

  // 2) "Cancelar" en el modal de editar
  cancelEditUser.onclick = () => {
    editUserModal.classList.add('hidden');
    editUserForm.reset();
  };

  // 3) Envío del formulario de editar usuario
  editUserForm.onsubmit = async e => {
    e.preventDefault();
    const userId = document.getElementById('edit-u-id').value;
    const username = editUserForm.username.value.trim();
    const email = editUserForm.email.value.trim();
    const password = editUserForm.password.value.trim();
    const roleId = parseInt(editUserForm.role_id.value, 10);

    // Validar usuario
    const usernameValidation = validarUsuario(username);
    if (!usernameValidation.valid) {
      editUserForm.username.setCustomValidity(usernameValidation.message);
      editUserForm.username.reportValidity();
      return;
    }

    // Validar email (usando validación nativa del navegador)
    if (!editUserForm.email.checkValidity()) {
      editUserForm.email.reportValidity();
      return;
    }

    // Solo validar/enviar campos de cliente si es cliente
    let data = { username, email, role_id: roleId };
    if (password) data.password = password;
    if (roleId === 3) {
      const fullName = editUserForm.full_name.value.trim();
      const dob = editUserForm.dob.value;
      if (!fullName) {
        editUserForm.full_name.setCustomValidity('El nombre completo es obligatorio para clientes');
        editUserForm.full_name.reportValidity();
        return;
      }
      if (!dob) {
        editUserForm.dob.setCustomValidity('La fecha de nacimiento es obligatoria para clientes');
        editUserForm.dob.reportValidity();
        return;
      }
      // Separar nombre completo en nombre y apellido
      const nameParts = fullName.split(' ');
      data.first_name = nameParts[0] || '';
      data.last_name = nameParts.slice(1).join(' ') || '';
      data.dob = dob;
      data.phone = editUserForm.phone.value.trim();
      data.address = editUserForm.address.value.trim();
    }
    
    try {
      const res = await fetch(`/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        showNotification('success', 'Éxito', 'Usuario actualizado correctamente.');
        loadUsers();
        editUserModal.classList.add('hidden');
        editUserForm.reset();
      } else {
        const err = await res.json();
        // Si el error es por usuario duplicado, mostrar tooltip nativo
        if (err.error && err.error.includes('Duplicate entry') && err.error.includes('users.username')) {
          editUserForm.username.setCustomValidity('Este nombre de usuario ya está en uso.');
          editUserForm.username.reportValidity();
          return;
        }
        showNotification('error', 'Error', err.error || 'Error al actualizar el usuario.');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('error', 'Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };

  // Función para validar nombres (solo letras, sin espacios ni caracteres especiales)
  function validarNombre(nombre) {
    if (!nombre || nombre.trim() === '') {
      return false;
    }
    // Regex: solo letras (incluye acentos), sin espacios ni caracteres especiales
    const regex = /^[a-zA-Z\u00C0-\u00FF]+$/;
    return regex.test(nombre.trim());
  }

  // Función para validar el formato del usuario
  function validarUsuario(value) {
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!value) {
      return { valid: false, message: 'El usuario es obligatorio.' };
    }
    if (!regex.test(value)) {
      return { valid: false, message: 'El usuario solo puede contener letras, números y guion bajo, sin espacios ni caracteres especiales.' };
    }
    return { valid: true };
  }

  // Función para validar nombre completo (para clientes)
  function validarNombreCompleto(value) {
    const regex = /^[a-zA-ZÁÉÍÓÚáéíóúÑñ\s]+$/;
    if (!value) {
      return { valid: false, message: 'El nombre completo es obligatorio.' };
    }
    if (!regex.test(value)) {
      return { valid: false, message: 'El nombre completo solo puede contener letras y espacios.' };
    }
    return { valid: true };
  }

  // Validación en tiempo real para el campo usuario (Crear)
  createUserForm.username.addEventListener('input', function(e) {
    const value = e.target.value.trim();
    const validation = validarUsuario(value);
    
    if (!validation.valid) {
      // Remover caracteres no permitidos
      const cleanValue = value.replace(/[^a-zA-Z0-9_]/g, '');
      e.target.value = cleanValue;
    }
  });

  // Validación en tiempo real para nombre completo (Cliente - Crear)
  createUserForm.full_name.addEventListener('input', function(e) {
    const value = e.target.value.trim();
    const validation = validarNombreCompleto(value);
    
    if (!validation.valid) {
      // Remover caracteres no permitidos
      const cleanValue = value.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ\s]/g, '');
      e.target.value = cleanValue;
    }
  });

  // Validación en tiempo real para el campo usuario (Editar)
  editUserForm.username.addEventListener('input', function(e) {
    const value = e.target.value.trim();
    const validation = validarUsuario(value);
    
    if (!validation.valid) {
      // Remover caracteres no permitidos
      const cleanValue = value.replace(/[^a-zA-Z0-9_]/g, '');
      e.target.value = cleanValue;
    }
  });

  // Validación en tiempo real para nombre completo (Cliente - Editar)
  editUserForm.full_name.addEventListener('input', function(e) {
    const value = e.target.value.trim();
    const validation = validarNombreCompleto(value);
    
    if (!validation.valid) {
      // Remover caracteres no permitidos
      const cleanValue = value.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ\s]/g, '');
      e.target.value = cleanValue;
    }
  });

  // Función para mostrar notificación
  function showNotification(type, title, message) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <h3>${title}</h3>
      <p>${message}</p>
    `;
    document.body.appendChild(notification);
    
    // Remover la notificación después de 3 segundos
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // 6) Funciones genéricas de confirmación (Eliminar)
  function showModal(message, onConfirm) {
    document.getElementById('modal-title').textContent = 'Confirmación';
    document.getElementById('modal-message').textContent = message;
    modalConfirm.classList.remove('hidden');

    const btnOk     = document.getElementById('modal-confirm');
    const btnCancel = document.getElementById('modal-cancel');

    btnOk.onclick = () => {
      onConfirm();
      modalConfirm.classList.add('hidden');
    };
    btnCancel.onclick = () => modalConfirm.classList.add('hidden');
  }

  // ==========================
  //  GESTIÓN DE SEGUROS (policies)
  // ==========================
  // 1) Cargar todas las pólizas
  async function loadPolicies() {
    insurancesTbody.innerHTML = '';
    try {
      const res = await fetch('/policies');
      if (!res.ok) throw new Error(res.status);
      const list = await res.json();

      list.forEach((policy, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>${policy.name}</td>
          <td>${policy.type_name}</td>
          <td>
            <button
              class="btn btn-secondary btn-sm btn-detail"
              data-field="cobertura"
              data-text="${policy.coverage_details.replace(/"/g, '&quot;')}"
            >
              Ver
            </button>
          </td>
          <td>
            <button
              class="btn btn-secondary btn-sm btn-detail"
              data-field="beneficios"
              data-text="${policy.benefits ? policy.benefits.replace(/"/g, '&quot;') : ''}"
            >
              Ver
            </button>
          </td>
          <td>$${policy.premium_amount.toFixed(2)}</td>
          <td>${policy.payment_frequency}</td>
          <td>$${policy.insured_amount ? Number(policy.insured_amount).toLocaleString('es-MX', {minimumFractionDigits: 2}) : '0.00'}</td>
          <td>${policy.payment_method || '-'}</td>
          <td>
            <button class="icon-btn btn-edit-insurance" data-id="${policy.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="icon-btn btn-delete-insurance" data-id="${policy.id}">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>`;
        insurancesTbody.appendChild(tr);
      });

      // 2) Listeners "Editar Seguro"
      document.querySelectorAll('.btn-edit-insurance').forEach(b => {
        b.onclick = () => openEditInsuranceModal(b.dataset.id);
      });

      // 3) Listeners "Eliminar Seguro"
      document.querySelectorAll('.btn-delete-insurance').forEach(b => {
        b.onclick = () => showModal(
          '¿Eliminar esta póliza?',
          async () => {
            await fetch(`/policies/${b.dataset.id}`, { method: 'DELETE' });
            loadPolicies();
          }
        );
      });

      // 4) Listeners "Mostrar Detalle" (Cobertura / Beneficios)
      document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.onclick = () => {
          const field = btn.dataset.field;        // "cobertura" o "beneficios"
          const text  = btn.dataset.text || '';   // texto completo
          const title = field === 'cobertura'
            ? 'Detalle de Cobertura'
            : 'Detalle de Beneficios';

          document.getElementById('detail-modal-title').textContent = title;
          document.getElementById('detail-modal-text').textContent  = text;
          document.getElementById('detail-modal').classList.remove('hidden');
        };
      });
    } catch (error) {
      console.error('Error loading policies:', error);
    }
  }

  // 5) Abrir modal Crear Seguro
  function openCreateInsuranceModal() {
    createInsuranceForm.reset();
    
    // Limpiar el select de cobertura
    const coverageSelect = document.getElementById('create-i-coverage');
    coverageSelect.innerHTML = '<option value="">Seleccione una cobertura</option>';

    // Disparar el change para cargar coberturas si hay tipo seleccionado
    document.getElementById('create-i-type').dispatchEvent(new Event('change'));

    createInsuranceModal.classList.remove('hidden');
  }

  // 6) Abrir modal Editar Seguro
  function openEditInsuranceModal(id) {
    editInsuranceForm.reset();
    document.getElementById('edit-i-id').value = id;

    // Limpiar el select de cobertura
    const coverageSelect = document.getElementById('edit-i-coverage');
    coverageSelect.innerHTML = '<option value="">Seleccione una cobertura</option>';

    // Disparar el change para cargar coberturas si hay tipo seleccionado
    document.getElementById('edit-i-type').dispatchEvent(new Event('change'));

    // Modo edición: obtengo la póliza de /policies/:id
    fetch(`/policies/${id}`)
      .then(res => res.json())
      .then(data => {
        document.getElementById('edit-i-name').value = data.name;
        document.getElementById('edit-i-type').value = data.type_id;
        document.getElementById('edit-i-type').dispatchEvent(new Event('change'));
        document.getElementById('edit-i-coverage').value = data.coverage_details;
        document.getElementById('edit-i-benefits').value = data.benefits;
        document.getElementById('edit-i-cost').value = data.premium_amount;
        document.getElementById('edit-i-payment').value = data.payment_frequency;
        document.getElementById('edit-i-insured-amount').value = data.insured_amount || '';
        document.getElementById('edit-i-payment-method').value = data.payment_method || 'Tarjeta';
      })
      .catch(err => console.error('Error cargando póliza para editar:', err));

    editInsuranceModal.classList.remove('hidden');
  }

  // 7) Event listeners para modales de seguros
  // Crear Seguro
  spanCloseCreateInsurance.onclick = () => {
    createInsuranceModal.classList.add('hidden');
  };
  cancelCreateInsurance.onclick = () => {
    createInsuranceModal.classList.add('hidden');
  };

  // Editar Seguro
  spanCloseEditInsurance.onclick = () => {
    editInsuranceModal.classList.add('hidden');
  };
  cancelEditInsurance.onclick = () => {
    editInsuranceModal.classList.add('hidden');
  };

  // 8) Listeners del formulario de seguros
  const createTypeSelect = document.getElementById('create-i-type');
  const editTypeSelect = document.getElementById('edit-i-type');
  const createBenefitsTextarea = document.getElementById('create-i-benefits');
  const editBenefitsTextarea = document.getElementById('edit-i-benefits');

  // Mapeo dinámico de id a nombre de tipo de póliza
  function getTypeIdToCoverageKey() {
    const map = {};
    const options = createTypeSelect.querySelectorAll('option');
    options.forEach(opt => {
      if (opt.value) map[opt.value] = opt.text.trim();
    });
    return map;
  }

  // Función para actualizar coberturas
  function updateCoverages(typeSelect, coverageSelectId) {
    const selectedId = typeSelect.value;
    const typeIdToCoverageKey = getTypeIdToCoverageKey();
    const key = typeIdToCoverageKey[selectedId];
    const coverageSelect = document.getElementById(coverageSelectId);
    coverageSelect.innerHTML = '<option value="">Seleccione una cobertura</option>';
    if (coverageTemplates[key]) {
      coverageTemplates[key].forEach(coverage => {
        const option = document.createElement('option');
        option.value = coverage;
        option.textContent = coverage;
        coverageSelect.appendChild(option);
      });
    }
  }

  // Listener para actualizar coberturas cuando cambia el tipo de póliza (Crear)
  createTypeSelect.addEventListener('change', function() {
    updateCoverages(this, 'create-i-coverage');
  });

  // Listener para actualizar coberturas cuando cambia el tipo de póliza (Editar)
  editTypeSelect.addEventListener('change', function() {
    updateCoverages(this, 'edit-i-coverage');
  });

  // 9) Submit del formulario Crear Seguro
  createInsuranceForm.onsubmit = async e => {
    e.preventDefault();

    const name      = createInsuranceForm.name.value.trim();
    const type_id   = parseInt(document.getElementById('create-i-type').value);
    const coverage  = createInsuranceForm.coverage_id.value.trim();
    const benefits  = document.getElementById('create-i-benefits').value.trim();
    const cost      = parseFloat(createInsuranceForm.cost.value);
    const payment   = createInsuranceForm.payment.value;
    const insured_amount = parseFloat(document.getElementById('create-i-insured-amount').value);
    const payment_method = document.getElementById('create-i-payment-method').value;

    // -------------- Validaciones adicionales --------------
    // 1) Nombre no puede estar vacío (o espacios) y sólo letras y espacios
    const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
    if (!name) {
      return alert('El nombre del seguro es obligatorio.');
    }
    if (!nameRegex.test(name)) {
      return alert('El nombre del seguro no puede contener números ni caracteres especiales.');
    }

    // 2) Cobertura y Beneficios no pueden ser sólo espacios
    if (!coverage) {
      return alert('Ingrese la cobertura de la póliza.');
    }
    if (!benefits) {
      return alert('Ingrese los beneficios de la póliza.');
    }

    // 3) Costo válido
    if (isNaN(cost) || cost <= 0) {
      return alert('Ingrese un costo válido mayor a cero.');
    }

    // 4) Tipo de póliza
    if (!type_id) {
      return alert('Seleccione un tipo de póliza.');
    }

    // -------------------------------------------------------

    const data = {
      name:              name,
      type_id:           type_id,
      coverage:          coverage,
      benefits:          benefits,
      premium_amount:    cost,
      payment_frequency: payment,
      insured_amount:    insured_amount,
      payment_method:    payment_method
    };

    try {
      const response = await fetch('/policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear la póliza');
      }

      // Cerrar modal y recargar tabla
      createInsuranceModal.classList.add('hidden');
      loadPolicies();
    } catch (error) {
      alert(error.message);
    }
  };

  // 10) Submit del formulario Editar Seguro
  editInsuranceForm.onsubmit = async e => {
    e.preventDefault();

    const id        = document.getElementById('edit-i-id').value;
    const name      = editInsuranceForm.name.value.trim();
    const type_id   = parseInt(document.getElementById('edit-i-type').value);
    const coverage  = editInsuranceForm.coverage_id.value.trim();
    const benefits  = document.getElementById('edit-i-benefits').value.trim();
    const cost      = parseFloat(editInsuranceForm.cost.value);
    const payment   = editInsuranceForm.payment.value;
    const insured_amount = parseFloat(document.getElementById('edit-i-insured-amount').value);
    const payment_method = document.getElementById('edit-i-payment-method').value;

    // -------------- Validaciones adicionales --------------
    // 1) Nombre no puede estar vacío (o espacios) y sólo letras y espacios
    const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
    if (!name) {
      return alert('El nombre del seguro es obligatorio.');
    }
    if (!nameRegex.test(name)) {
      return alert('El nombre del seguro no puede contener números ni caracteres especiales.');
    }

    // 2) Cobertura y Beneficios no pueden ser sólo espacios
    if (!coverage) {
      return alert('Ingrese la cobertura de la póliza.');
    }
    if (!benefits) {
      return alert('Ingrese los beneficios de la póliza.');
    }

    // 3) Costo válido
    if (isNaN(cost) || cost <= 0) {
      return alert('Ingrese un costo válido mayor a cero.');
    }

    // 4) Tipo de póliza
    if (!type_id) {
      return alert('Seleccione un tipo de póliza.');
    }

    // -------------------------------------------------------

    const data = {
      name:              name,
      type_id:           type_id,
      coverage:          coverage,
      benefits:          benefits,
      premium_amount:    cost,
      payment_frequency: payment,
      insured_amount:    insured_amount,
      payment_method:    payment_method
    };

    try {
      const response = await fetch(`/policies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar la póliza');
      }

      // Cerrar modal y recargar tabla
      editInsuranceModal.classList.add('hidden');
      loadPolicies();
    } catch (error) {
      alert(error.message);
    }
  };

  // 11) Cerrar el modal de detalles (Cobertura/Beneficios)
  document.getElementById('close-detail-modal').onclick = () => {
    document.getElementById('detail-modal').classList.add('hidden');
  };
  document.getElementById('detail-modal-overlay').onclick = () => {
    document.getElementById('detail-modal').classList.add('hidden');
  };

  // 12) Finalmente, cargamos la primera vez las pólizas
  loadPolicies();

  // Filtrar tipos de póliza para mostrar solo Vida y Salud en ambos modales
  if (createTypeSelect) {
    Array.from(createTypeSelect.options).forEach(opt => {
      if (opt.value && !['Vida', 'Salud'].includes(opt.text.trim())) {
        opt.style.display = 'none';
      }
    });
  }
  if (editTypeSelect) {
    Array.from(editTypeSelect.options).forEach(opt => {
      if (opt.value && !['Vida', 'Salud'].includes(opt.text.trim())) {
        opt.style.display = 'none';
      }
    });
  }

  // Función para eliminar usuario
  async function deleteUser(id) {
    try {
      const res = await fetch(`/users/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        // Mostrar notificación de éxito
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
          <h3>Éxito</h3>
          <p>Usuario eliminado correctamente.</p>
        `;
        document.body.appendChild(notification);
        
        // Remover la notificación después de 3 segundos
        setTimeout(() => {
          notification.remove();
        }, 3000);
        
        loadUsers();
      } else {
        const err = await res.json();
        showNotification('error', 'Error', err.error || 'Error al eliminar el usuario.');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('error', 'Error de conexión', 'No se pudo conectar con el servidor.');
    }
  }

  // 5) Envío del formulario de crear usuario
  createUserForm.onsubmit = async e => {
    e.preventDefault();
    const username = createUserForm.username.value.trim();
    const email = createUserForm.email.value.trim();
    const password = createUserForm.password.value.trim();
    const roleId = parseInt(createUserForm.role_id.value, 10);

    // Validar usuario
    const usernameValidation = validarUsuario(username);
    if (!usernameValidation.valid) {
      createUserForm.username.setCustomValidity(usernameValidation.message);
      createUserForm.username.reportValidity();
      return;
    }

    // Validar email (usando validación nativa del navegador)
    if (!createUserForm.email.checkValidity()) {
      createUserForm.email.reportValidity();
      return;
    }

    // Validar password si es nuevo usuario
    if (!password) {
      createUserForm.password.setCustomValidity('La contraseña es obligatoria para nuevos usuarios');
      createUserForm.password.reportValidity();
      return;
    }

    // Solo validar/enviar campos de cliente si es cliente
    let data = { username, email, role_id: roleId };
    if (password) data.password = password;
    if (roleId === 3) {
      const fullName = createUserForm.full_name.value.trim();
      const dob = createUserForm.dob.value;
      if (!fullName) {
        createUserForm.full_name.setCustomValidity('El nombre completo es obligatorio para clientes');
        createUserForm.full_name.reportValidity();
        return;
      }
      if (!dob) {
        createUserForm.dob.setCustomValidity('La fecha de nacimiento es obligatoria para clientes');
        createUserForm.dob.reportValidity();
        return;
      }
      // Separar nombre completo en nombre y apellido
      const nameParts = fullName.split(' ');
      data.first_name = nameParts[0] || '';
      data.last_name = nameParts.slice(1).join(' ') || '';
      data.dob = dob;
      data.phone = createUserForm.phone.value.trim();
      data.address = createUserForm.address.value.trim();
    }
    
    try {
      const res = await fetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        showNotification('success', 'Éxito', 'Usuario creado correctamente.');
        loadUsers();
        createUserModal.classList.add('hidden');
        createUserForm.reset();
      } else {
        const err = await res.json();
        // Si el error es por usuario duplicado, mostrar tooltip nativo
        if (err.error && err.error.includes('Duplicate entry') && err.error.includes('users.username')) {
          createUserForm.username.setCustomValidity('Este nombre de usuario ya está en uso.');
          createUserForm.username.reportValidity();
          return;
        }
        showNotification('error', 'Error', err.error || 'Error al crear el usuario.');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('error', 'Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };
});
