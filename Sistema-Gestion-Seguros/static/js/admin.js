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
  const modalConfirm = document.getElementById('modal');
  const userModal    = document.getElementById('user-modal');

  const userForm          = document.getElementById('user-form');
  const btnNewUser        = document.getElementById('btn-new-user');
  const spanCloseUser     = document.getElementById('close-user-modal');
  const backToSelection   = document.getElementById('back-to-selection');
  const userTypeSelection = document.getElementById('user-type-selection');
  const clientFields      = document.getElementById('client-fields');
  let editId = null;  // Guarda el ID cuando estemos en modo “Edición” de Usuario


  // ==========================
  //  NAVEGACIÓN ENTRE SECCIONES
  // ==========================
  document.addEventListener('DOMContentLoaded', () => {
  // … declaración de btns, sections, titleEl, etc. …

    function showSection(name) {
    btns.forEach(b => b.classList.toggle('active', b.dataset.content === name));
    titleEl.textContent = sectNames[name] || '';
    sections.forEach(s => s.classList.toggle('active', s.id === name + '-content'));

    if (name === 'usuarios') loadUsers();
    if (name === 'seguros') loadPolicies();
  }

  btns.forEach(b => b.onclick = () => showSection(b.dataset.content));
  showSection('roles'); // Si quieres que por defecto se abra Roles al cargar la página
  // (o podrías forzar showSection('seguros') si quieres que se vea automáticamente seguros)
});

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

      // Botones Eliminar
      document.querySelectorAll('.btn-delete').forEach(b => {
        b.onclick = () => showModal(
          '¿Eliminar este usuario?',
          async () => {
            await fetch(`/users/${b.dataset.id}`, { method: 'DELETE' });
            loadUsers();
          }
        );
      });

      // Botones Editar
      document.querySelectorAll('.btn-edit').forEach(b => {
        b.onclick = () => openUserModal('Editar Usuario', b.dataset.id);
      });

    } catch (e) {
      console.error('Error fetch /users:', e);
    }
  }

  // ==========================
  //  MODAL “Crear / Editar Usuario” – 2 PASOS
  // ==========================
  function openUserModal(title, id = null) {
    document.getElementById('user-modal-title').textContent = title;
    userForm.reset();
    editId = id;

    if (!id) {
      // Modo “Crear”
      userTypeSelection.classList.add('active');
      userForm.classList.remove('active');
      clientFields.classList.add('hidden');
    } else {
      // Modo “Editar”
      userTypeSelection.classList.remove('active');
      userForm.classList.add('active');
      clientFields.classList.add('hidden');

      fetch(`/users/${id}`)
        .then(res => res.json())
        .then(u => {
          document.getElementById('u-username').value = u.username;
          document.getElementById('u-email').value    = u.email;
          document.getElementById('u-role').value     = u.role_id;

          if (u.role_id === 3) {
            clientFields.classList.remove('hidden');
            if (u.first_name) document.getElementById('u-first-name').value = u.first_name;
            if (u.last_name)  document.getElementById('u-last-name').value  = u.last_name;
            if (u.dob)        document.getElementById('u-dob').value        = u.dob;
            if (u.phone)      document.getElementById('u-phone').value      = u.phone;
            if (u.address)    document.getElementById('u-address').value    = u.address;
          }
        })
        .catch(err => console.error('Error cargando usuario para editar:', err));
    }
    userModal.classList.remove('hidden');
  }

  // Selección de tipo de usuario en paso 1
  document.querySelectorAll('.user-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const userType = this.dataset.type;
      userTypeSelection.classList.remove('active');
      userForm.classList.add('active');
      if (userType === 'client') {
        clientFields.classList.remove('hidden');
        document.getElementById('u-role').value = 3;
      } else if (userType === 'agent') {
        clientFields.classList.add('hidden');
        document.getElementById('u-role').value = 2;
      } else {
        clientFields.classList.add('hidden');
        document.getElementById('u-role').value = 1;
      }
    });
  });

  backToSelection.addEventListener('click', () => {
    userForm.classList.remove('active');
    userTypeSelection.classList.add('active');
    userForm.reset();
    clientFields.classList.add('hidden');
    editId = null;
  });

  spanCloseUser.addEventListener('click', () => {
    userModal.classList.add('hidden');
    resetUserModal();
  });
  userModal.addEventListener('click', (e) => {
    if (e.target === userModal) {
      userModal.classList.add('hidden');
      resetUserModal();
    }
  });
  function resetUserModal() {
    userTypeSelection.classList.add('active');
    userForm.classList.remove('active');
    clientFields.classList.add('hidden');
    userForm.reset();
    editId = null;
  }

  // Submit del formulario de usuario
  userForm.onsubmit = async e => {
    e.preventDefault();
    const username = userForm.username.value.trim();
    const email    = userForm.email.value.trim().toLowerCase();
    const password = userForm.password.value;
    const role_id  = +userForm.role_id.value;

    if (!username || username.length > 30) {
      return alert('Usuario: 1–30 caracteres.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return alert('Email inválido.');
    }
    const pwdRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!pwdRe.test(password)) {
      return alert(
        'La contraseña debe tener al menos 8 caracteres,\nincluyendo minúscula, mayúscula y número.'
      );
    }

    let extraData = {};
    if (role_id === 3) {
      extraData = {
        first_name: document.getElementById('u-first-name').value.trim(),
        last_name:  document.getElementById('u-last-name').value.trim(),
        dob:        document.getElementById('u-dob').value,
        phone:      document.getElementById('u-phone').value.trim(),
        address:    document.getElementById('u-address').value.trim()
      };
      if (!extraData.first_name || !extraData.last_name || !extraData.dob) {
        return alert('Para cliente, Nombre, Apellido y Fecha de Nacimiento son obligatorios.');
      }
    }

    const data = { username, email, password, role_id, ...extraData };
    const url = editId ? `/users/${editId}` : '/users';
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
        resetUserModal();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión.');
    }
  };

  btnNewUser.onclick = () => openUserModal('Crear Usuario');

  // ==========================
  //  MODAL GENÉRICO (Eliminar / Confirmar)
  // ==========================
  function showModal(msg, onOk) {
    document.getElementById('modal-message').textContent = msg;
    modalConfirm.classList.remove('hidden');
    document.getElementById('modal-confirm').onclick = () => {
      onOk();
      modalConfirm.classList.add('hidden');
    };
    document.getElementById('modal-cancel').onclick = () => {
      modalConfirm.classList.add('hidden');
    };
  }

  const insuranceModal    = document.getElementById('insurance-modal');
  const insuranceForm     = document.getElementById('insurance-form');
  const insurancesTbody   = document.getElementById('insurances-tbody');
  let editInsuranceId     = null;
  // ==========================
  //  GESTIÓN DE SEGUROS (policies)
  // ==========================
  // 1) Cargar todas las pólizas
async function loadPolicies() {
  // Primero limpio el <tbody>
  insurancesTbody.innerHTML = '';
  try {
    const res = await fetch('/policies');
    if (!res.ok) throw new Error(res.status);
    const list = await res.json();

    // Por cada póliza, creo un <tr> con sus 9 <td> en el mismo orden de tu <thead>
    list.forEach((policy) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${policy.id}</td>
        <td>${policy.name}</td>
        <td>${policy.type_name}</td>
        <td title="${policy.coverage_details}">
          ${policy.coverage_details.length > 30
            ? policy.coverage_details.substring(0, 30) + '…'
            : policy.coverage_details
          }
        </td>
        <td title="${policy.benefits}">
          ${policy.benefits.length > 30
            ? policy.benefits.substring(0, 30) + '…'
            : policy.benefits
          }
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

    // 2) Adjuntar listeners de “Editar” (secciones que acaban de inyectarse)
    document.querySelectorAll('.btn-edit-insurance').forEach(b => {
      b.onclick = () => openInsuranceModal('Editar Seguro', b.dataset.id);
    });
    // 3) Adjuntar listeners de “Eliminar” (modal de confirmación genérico)
    document.querySelectorAll('.btn-delete-insurance').forEach(b => {
      b.onclick = () => showModal(
        '¿Eliminar esta póliza?',
        async () => {
          await fetch(`/policies/${b.dataset.id}`, { method: 'DELETE' });
          loadPolicies();
        }
      );
    });

  } catch (error) {
    console.error('Error loading policies:', error);
  }
}

// 4) Abrir modal Crear / Editar póliza
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

// 5) “Crear Seguro” abre el modal en modo “Crear”
document.getElementById('btn-new-insurance').onclick = () =>
  openInsuranceModal('Crear Seguro');

// 6) “Cancelar” en el modal cierra y resetea
document.getElementById('cancel-insurance').onclick = () => {
  insuranceModal.classList.add('hidden');
  editInsuranceId = null;
};

// 7) Submit del formulario (Crear o Editar)
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

// 8) Finalmente, justo después de definir todo, cargo las pólizas
loadPolicies();