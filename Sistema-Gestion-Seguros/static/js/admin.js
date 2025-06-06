/**
 * admin.js
 * -----------------------------------
 * Lógica combinada para:
 *   - Navegación entre secciones (Roles / Usuarios / Seguros)
 *   - Carga de usuarios en la tabla
 *   - Modal de Confirmación (Eliminar)
 *   - Modal de 2 pasos “Crear / Editar Usuario”
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
    if (name === 'seguros') loadPolicies();
  }

  btns.forEach(b => b.onclick = () => showSection(b.dataset.content));
  showSection('roles');  // Inicia mostrando “Gestión de Roles”

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
            await fetch(`/users/${b.dataset.id}`, { method: 'DELETE' });
            loadUsers();
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
  function openUserModal(title, id = null) {
    document.getElementById('user-modal-title').textContent = title;
    userForm.reset();
    userTypeSelection.classList.add('active');
    userForm.classList.remove('active');
    clientFields.style.display = 'none';
    editId = id;
    userForm.scrollTop = 0;

    if (id) {
      // Modo edición: obtengo datos del usuario
      fetch(`/users/${id}`)
        .then(res => res.json())
        .then(user => {
          // Rellenar campos según el tipo
          const role = user.role_id;
          document.getElementById('u-role').value = role;
          document.getElementById('u-username').value = user.username;
          document.getElementById('u-email').value = user.email;
          // Para no mostrar contraseña, dejo password en blanco

          if (role === 3) {
            // Cliente: mostrar campos adicionales
            userTypeSelection.classList.remove('active');
            userForm.classList.add('active');
            clientFields.style.display = 'block';
            document.getElementById('u-first-name').value = user.first_name || '';
            document.getElementById('u-last-name').value  = user.last_name  || '';
            document.getElementById('u-dob').value        = user.dob        || '';
            document.getElementById('u-phone').value      = user.phone      || '';
            document.getElementById('u-address').value    = user.address    || '';
          } else {
            userTypeSelection.classList.remove('active');
            userForm.classList.add('active');
            clientFields.style.display = 'none';
          }
        })
        .catch(err => console.error('Error cargando usuario para editar:', err));
    }

    userModal.classList.remove('hidden');
  }

  // ==========================
  //  EVENTOS DEL MODAL USUARIO
  // ==========================
  // 1) “Crear Usuario” abre el modal
  btnNewUser.onclick = () => openUserModal('Crear Usuario');

  // 2) “X” cierra el modal
  spanCloseUser.onclick = () => {
    userModal.classList.add('hidden');
    editId = null;
  };

  // 3) Selección de tipo de usuario
  document.querySelectorAll('.user-type-btn').forEach(b => {
    b.onclick = () => {
      const tipo = b.dataset.type;
      userTypeSelection.classList.remove('active');
      userForm.classList.add('active');

      if (tipo === 'client') {
        clientFields.style.display = 'block';
        document.getElementById('u-role').value = 3;
      } else {
        clientFields.style.display = 'none';
        document.getElementById('u-role').value = tipo === 'admin' ? 1 : 2;
      }
    };
  });

  // 4) “Volver” en el modal de usuario (regresa a selección de tipo)
  backToSelection.onclick = () => {
    userForm.classList.remove('active');
    userTypeSelection.classList.add('active');
    editId = null;
  };

  // 5) Envío del formulario de usuario (Crear o Editar)
  userForm.onsubmit = async e => {
    e.preventDefault();
    const username = userForm.username.value.trim();
    const email    = userForm.email.value.trim();
    const password = userForm.password.value.trim();
    const roleId   = userForm.role_id.value;

    if (!username || !email || (!password && !editId)) {
      return alert('Complete todos los campos obligatorios.');
    }

    const data = { username, email };
    if (password) data.password = password;
    data.role_id = parseInt(roleId, 10);

    if (data.role_id === 3) {
      data.first_name = userForm.first_name.value.trim();
      data.last_name  = userForm.last_name.value.trim();
      data.dob        = userForm.dob.value;
      data.phone      = userForm.phone.value.trim();
      data.address    = userForm.address.value.trim();
    }

    const url    = editId ? `/users/${editId}` : '/users';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        loadUsers();
        userModal.classList.add('hidden');
        editId = null;
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar el usuario.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión.');
    }
  };

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
              data-text="${policy.benefits.replace(/"/g, '&quot;')}"
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

      // 2) Listeners “Editar Seguro”
      document.querySelectorAll('.btn-edit-insurance').forEach(b => {
        b.onclick = () => openInsuranceModal('Editar Seguro', b.dataset.id);
      });

      // 3) Listeners “Eliminar Seguro”
      document.querySelectorAll('.btn-delete-insurance').forEach(b => {
        b.onclick = () => showModal(
          '¿Eliminar esta póliza?',
          async () => {
            await fetch(`/policies/${b.dataset.id}`, { method: 'DELETE' });
            loadPolicies();
          }
        );
      });

      // 4) Listeners “Mostrar Detalle” (Cobertura / Beneficios)
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

    if (id) {
      // Modo edición: obtengo la póliza de /policies/:id
      fetch(`/policies/${id}`)
        .then(res => res.json())
        .then(policy => {
          document.getElementById('i-name').value     = policy.name;
          document.getElementById('i-type').value     = policy.type_name;
          document.getElementById('i-coverage').value = policy.coverage_details;
          document.getElementById('i-benefits').value = policy.benefits;
          document.getElementById('i-cost').value     = policy.premium_amount;
          document.getElementById('i-payment').value  = policy.payment_frequency;
          document.getElementById('i-status').value   = (policy.status === 'active' ? '1' : '0');
        })
        .catch(err => console.error('Error cargando póliza para editar:', err));
    }

    insuranceModal.classList.remove('hidden');
  }

  // 6) “Crear Seguro” abre el modal
  document.getElementById('btn-new-insurance').onclick = () =>
    openInsuranceModal('Crear Seguro');

  // 7) “Cancelar” en el modal cierra y resetea
  document.getElementById('cancel-insurance').onclick = () => {
    insuranceModal.classList.add('hidden');
    editInsuranceId = null;
  };

  // 8) Submit del formulario (Crear o Editar)
  insuranceForm.onsubmit = async e => {
    e.preventDefault();

    const name      = insuranceForm.name.value.trim();
    const type      = insuranceForm.type.value;
    const coverage  = insuranceForm.coverage.value.trim();
    const benefits  = insuranceForm.benefits.value.trim();
    const cost      = parseFloat(insuranceForm.cost.value);
    const payment   = insuranceForm.payment.value;
    const status    = insuranceForm.status.value === '1'; // true → 'active'

    if (!name)       return alert('El nombre del seguro es obligatorio.');
    if (!type)       return alert('Seleccione un tipo de póliza.');
    if (!coverage)   return alert('Ingrese la cobertura de la póliza.');
    if (!benefits)   return alert('Ingrese los beneficios de la póliza.');
    if (isNaN(cost) || cost <= 0) return alert('Ingrese un costo válido mayor a cero.');

    const data = {
      name:              name,
      type_name:         type,
      coverage:          coverage,
      benefits:          benefits,
      premium_amount:    cost,
      payment_frequency: payment,
      status:            status ? 'active' : 'inactive'
    };
    const url    = editInsuranceId ? `/policies/${editInsuranceId}` : '/policies';
    const method = editInsuranceId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        loadPolicies();
        insuranceModal.classList.add('hidden');
        editInsuranceId = null;
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar la póliza.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión.');
    }
  };

  // 9) Cerrar el modal de detalles (Cobertura/Beneficios)
  document.getElementById('close-detail-modal').onclick = () => {
    document.getElementById('detail-modal').classList.add('hidden');
  };
  document.getElementById('detail-modal-overlay').onclick = () => {
    document.getElementById('detail-modal').classList.add('hidden');
  };

  // 10) Finalmente, cargamos la primera vez las pólizas
  loadPolicies();
});