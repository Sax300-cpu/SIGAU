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
    roles:    'Gestión de Roles',
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
  const userModal        = document.getElementById('user-modal');
  const userForm         = document.getElementById('user-form');
  const btnNewUser       = document.getElementById('btn-new-user');
  const spanCloseUser    = document.getElementById('close-user-modal');
  const backToSelection  = document.getElementById('back-to-selection');
  const userTypeSelection= document.getElementById('user-type-selection');
  const clientFields     = document.getElementById('client-fields');
  let editId = null; // ID del usuario a editar

  // ==========================
  //  MODAL SEGUROS
  // ==========================
  const insuranceModal   = document.getElementById('insurance-modal');
  const insuranceForm    = document.getElementById('insurance-form');
  const insurancesTbody  = document.getElementById('insurances-tbody');
  let editInsuranceId    = null; // ID de la póliza a editar

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
          openInsuranceModal('Crear Seguro');
        };
      }
    }
  }

  btns.forEach(b => b.onclick = () => showSection(b.dataset.content));
  showSection('roles');  // Inicia mostrando "Gestión de Roles"

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
        b.onclick = () => openUserModal('Editar Usuario', b.dataset.id);
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
  //  ABRIR MODAL CREAR / EDITAR USUARIO
  // ==========================
  // En la función openUserModal
  function openUserModal(title, id = null) {
    document.getElementById('user-modal-title').textContent = title;
    userForm.reset();
    editId = id;

    if (id) {
        // Modo edición: obtengo datos del usuario
        fetch(`/users/${id}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Error al cargar el usuario');
                }
                return res.json();
            })
            .then(user => {
                // Ocultar selección de tipo y mostrar formulario directamente
                userTypeSelection.classList.remove('active');
                userForm.classList.add('active');

                // Cargar datos básicos
                document.getElementById('u-role').value = user.role_id;
                document.getElementById('u-username').value = user.username;
                document.getElementById('u-email').value = user.email;
                document.getElementById('u-password').removeAttribute('required'); // La contraseña es opcional en edición

                if (user.role_id === 3) {
                    // Cliente: mostrar campos adicionales
                    clientFields.style.display = 'block';
                    const fullNameField = document.getElementById('u-full-name');
                    if (fullNameField) {
                      const nombreCompleto = [user.first_name, user.last_name].filter(Boolean).join(' ');
                      fullNameField.value = nombreCompleto;
                    }
                    document.getElementById('u-dob').value = user.dob || '';
                    document.getElementById('u-phone').value = user.phone || '';
                    document.getElementById('u-address').value = user.address || '';
                    if (fullNameField) fullNameField.setAttribute('required', 'true');
                    document.getElementById('u-dob').setAttribute('required', 'true');
                } else {
                    // Admin o Agente
                    clientFields.style.display = 'none';
                    const fullNameField = document.getElementById('u-full-name');
                    if (fullNameField) fullNameField.removeAttribute('required');
                    document.getElementById('u-dob').removeAttribute('required');
                }
            })
            .catch(err => {
                console.error('Error cargando usuario para editar:', err);
                showNotification('error', 'Error', 'No se pudo cargar los datos del usuario');
            });
    } else {
        // Modo creación: mostrar selección de tipo
        userTypeSelection.classList.add('active');
        userForm.classList.remove('active');
        clientFields.style.display = 'none';
        document.getElementById('u-password').setAttribute('required', 'true'); // La contraseña es requerida en creación
    }
    userModal.classList.remove('hidden');
}

// ==========================
//  EVENTOS DEL MODAL USUARIO
// ==========================
// 1) "Crear Usuario" abre el modal
btnNewUser.onclick = () => openUserModal('Crear Usuario');

// 2) "X" cierra el modal
spanCloseUser.onclick = () => {
  userModal.classList.add('hidden');
  editId = null;
  userForm.reset();
  userForm.classList.remove('active');
  userTypeSelection.classList.add('active');
};

// 3) Selección de tipo de usuario
document.querySelectorAll('.user-type-btn').forEach(b => {
  b.onclick = () => {
    const tipo = b.dataset.type;
    userTypeSelection.classList.remove('active');
    userForm.classList.add('active');

    // Manejo seguro de campos de cliente
    const fullNameField = document.getElementById('u-full-name');
    const dobField = document.getElementById('u-dob');
    if (tipo === 'client') {
      clientFields.style.display = 'block';
      document.getElementById('u-role').value = 3;
      if (fullNameField) fullNameField.setAttribute('required', 'true');
      if (dobField) dobField.setAttribute('required', 'true');
    } else {
      clientFields.style.display = 'none';
      document.getElementById('u-role').value = tipo === 'admin' ? 1 : 2;
      if (fullNameField) fullNameField.removeAttribute('required');
      if (dobField) dobField.removeAttribute('required');
    }
  };
});

// 4) "Volver" en el modal de usuario (regresa a selección de tipo)
document.getElementById('back-to-selection').onclick = () => {
  userForm.classList.remove('active');
  userTypeSelection.classList.add('active');
  editId = null;
  userForm.reset();
};

// 5) Envío del formulario de usuario (Crear o Editar)
userForm.onsubmit = async e => {
  e.preventDefault();
  const username = userForm.username.value.trim();
  const email = userForm.email.value.trim();
  const password = userForm.password.value.trim();
  const roleId = parseInt(userForm.role_id.value, 10);

  // Validar usuario
  const usernameValidation = validarUsuario(username);
  if (!usernameValidation.valid) {
    userForm.username.setCustomValidity(usernameValidation.message);
    userForm.username.reportValidity();
    return;
  }

  // Validar email (usando validación nativa del navegador)
  if (!userForm.email.checkValidity()) {
    userForm.email.reportValidity();
    return;
  }

  // Validar password si es nuevo usuario
  if (!editId && !password) {
    userForm.password.setCustomValidity('La contraseña es obligatoria para nuevos usuarios');
    userForm.password.reportValidity();
    return;
  }

  // Solo validar/enviar campos de cliente si es cliente
  let data = { username, email, role_id: roleId };
  if (password) data.password = password;
  if (roleId === 3) {
    const fullName = userForm.full_name.value.trim();
    const dob = userForm.dob.value;
    if (!fullName) {
      userForm.full_name.setCustomValidity('El nombre completo es obligatorio para clientes');
      userForm.full_name.reportValidity();
      return;
    }
    if (!dob) {
      userForm.dob.setCustomValidity('La fecha de nacimiento es obligatoria para clientes');
      userForm.dob.reportValidity();
      return;
    }
    // Separar nombre completo en nombre y apellido
    const nameParts = fullName.split(' ');
    data.first_name = nameParts[0] || '';
    data.last_name = nameParts.slice(1).join(' ') || '';
    data.dob = dob;
    data.phone = userForm.phone.value.trim();
    data.address = userForm.address.value.trim();
  }
  
  const url = editId ? `/users/${editId}` : '/users';
  const method = editId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      showNotification('success', 'Éxito', editId ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
      loadUsers();
      userModal.classList.add('hidden');
      editId = null;
      userForm.reset();
    } else {
      const err = await res.json();
      // Si el error es por usuario duplicado, mostrar tooltip nativo
      if (err.error && err.error.includes('Duplicate entry') && err.error.includes('users.username')) {
        userForm.username.setCustomValidity('Este nombre de usuario ya está en uso.');
        userForm.username.reportValidity();
        return;
      }
      showNotification('error', 'Error', err.error || 'Error al guardar el usuario.');
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

// Validación en tiempo real para el campo usuario
userForm.username.addEventListener('input', function(e) {
  const value = e.target.value.trim();
  const validation = validarUsuario(value);
  
  if (!validation.valid) {
    // Remover caracteres no permitidos
    const cleanValue = value.replace(/[^a-zA-Z0-9_]/g, '');
    e.target.value = cleanValue;
  }
  
  e.target.setCustomValidity(validation.valid ? '' : validation.message);
  e.target.reportValidity();
});

// Validación en tiempo real para los campos de nombre
userForm.first_name.addEventListener('input', function(e) {
  const value = e.target.value.trim();
  if (value && !validarNombre(value)) {
    e.target.setCustomValidity('Solo se permiten letras, sin espacios ni caracteres especiales');
  } else {
    e.target.setCustomValidity('');
  }
  e.target.reportValidity();
});

userForm.last_name.addEventListener('input', function(e) {
  const value = e.target.value.trim();
  if (value && !validarNombre(value)) {
    e.target.setCustomValidity('Solo se permiten letras, sin espacios ni caracteres especiales');
  } else {
    e.target.setCustomValidity('');
  }
  e.target.reportValidity();
});

// Validación en tiempo real para nombre completo (Cliente)
userForm.full_name.addEventListener('input', function(e) {
  const value = e.target.value.trim();
  const validation = validarNombreCompleto(value);
  e.target.setCustomValidity(validation.valid ? '' : validation.message);
  e.target.reportValidity();
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
              class="btn-detail"
              data-field="cobertura"
              data-text="${policy.coverage_details.replace(/"/g, '&quot;')}"
            >
              <i class="fas fa-info-circle"></i>
            </button>
          </td>
          <td>
            <button
              class="btn-detail"
              data-field="beneficios"
              data-text="${policy.benefits ? policy.benefits.replace(/"/g, '&quot;') : ''}"
            >
              <i class="fas fa-info-circle"></i>
            </button>
          </td>
          <td>$${policy.premium_amount.toFixed(2)}</td>
          <td>${policy.payment_frequency}</td>
          <td>${policy.status === 'active' ? 'Activo' : 'Inactivo'}</td>
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
        b.onclick = () => openInsuranceModal('Editar Seguro', b.dataset.id);
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

  // 5) Abrir modal Crear / Editar póliza
  function openInsuranceModal(title, id = null) {
    document.getElementById('insurance-modal-title').textContent = title;
    insuranceForm.reset();
    editInsuranceId = id;

    // Limpiar el select de cobertura
    const coverageSelect = document.getElementById('i-coverage');
    coverageSelect.innerHTML = '<option value="">Seleccione una cobertura</option>';

    if (id) {
      // Modo edición: obtengo la póliza de /policies/:id
      fetch(`/policies/${id}`)
        .then(res => res.json())
        .then(data => {
          document.getElementById('i-name').value = data.name;
          document.getElementById('i-type').value = data.type_id;
          // Disparamos el change para rellenar las coberturas
          document.getElementById('i-type').dispatchEvent(new Event('change'));
          // Fijamos la cobertura actual del seguro
          document.getElementById('i-coverage').value = data.coverage_details;
          // Cargamos el valor real de beneficios
          document.getElementById('i-benefits').value = data.benefits;
          document.getElementById('i-cost').value = data.premium_amount;
          document.getElementById('i-payment').value = data.payment_frequency;
          document.getElementById('i-status').value = (data.status === 'active' ? '1' : '0');
        })
        .catch(err => console.error('Error cargando póliza para editar:', err));
    }

    insuranceModal.classList.remove('hidden');
  }

  // 6) "Crear Seguro" abre el modal
  document.getElementById('btn-new-insurance').onclick = () => {
    openInsuranceModal('Crear Seguro');
  };

  // 7) "Cancelar" en el modal cierra y resetea
  document.getElementById('cancel-insurance').onclick = () => {
    insuranceModal.classList.add('hidden');
    editInsuranceId = null;
  };

  // 8) Listeners del formulario de seguros
  const typeSelect = document.getElementById('i-type');
  const benefitsTextarea = document.getElementById('i-benefits');

  // Listener para actualizar coberturas cuando cambia el tipo de póliza
  typeSelect.addEventListener('change', function() {
    const selectedType = this.options[this.selectedIndex].text;
    const coverageSelect = document.getElementById('i-coverage');
    
    // Limpiar opciones actuales
    coverageSelect.innerHTML = '<option value="">Seleccione una cobertura</option>';
    
    // Añadir opciones según el tipo seleccionado
    if (coverageTemplates[selectedType]) {
      coverageTemplates[selectedType].forEach(coverage => {
        const option = document.createElement('option');
        option.value = coverage;
        option.textContent = coverage;
        coverageSelect.appendChild(option);
      });
    }
  });

  // 9) Submit del formulario (Crear o Editar)
  insuranceForm.onsubmit = async e => {
    e.preventDefault();

    const name      = insuranceForm.name.value.trim();
    const type_id   = parseInt(document.getElementById('i-type').value);
    const coverage  = insuranceForm.coverage_id.value.trim();
    const benefits  = document.getElementById('i-benefits').value.trim();
    const cost      = parseFloat(insuranceForm.cost.value);
    const payment   = insuranceForm.payment.value;
    const status    = insuranceForm.status.value === '1'; // true → 'active'

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
      status:            status ? 'active' : 'inactive'
    };

    try {
      const url = editInsuranceId ? `/policies/${editInsuranceId}` : '/policies';
      const method = editInsuranceId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar la póliza');
      }

      // Cerrar modal y recargar tabla
      document.getElementById('insurance-modal').classList.add('hidden');
      loadPolicies();
    } catch (error) {
      alert(error.message);
    }
  };

  // 10) Cerrar el modal de detalles (Cobertura/Beneficios)
  document.getElementById('close-detail-modal').onclick = () => {
    document.getElementById('detail-modal').classList.add('hidden');
  };
  document.getElementById('detail-modal-overlay').onclick = () => {
    document.getElementById('detail-modal').classList.add('hidden');
  };

  // 11) Finalmente, cargamos la primera vez las pólizas
  loadPolicies();

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
});
