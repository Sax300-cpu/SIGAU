document.addEventListener('DOMContentLoaded', function() {
    // === (1) Lógica para resaltar la opción activa de la barra lateral ===
    const sidebarItems = document.querySelectorAll('.sidebar nav ul li');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // === (6) Notificaciones (ahora con modal de lista) ===
    document.querySelector('.notification').addEventListener('click', function() {
        const modalListaNotif = document.getElementById('modal-lista-notificaciones');
        modalListaNotif.classList.remove('hidden');
        const btnCloseNotifModal = document.getElementById('btn-close-notif-modal');
        if (btnCloseNotifModal) {
          btnCloseNotifModal.onclick = function() {
            modalListaNotif.classList.add('hidden');
          };
        }
    });

    // === (7) "Ver detalles" de pólizas existentes ===
    document.querySelectorAll('.btn-details').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.insurance-card');
            alert(`Mostrando detalles de: ${card.querySelector('h3').textContent}`);
        });
    });

    // === (MODAL COMPLETAR DOCUMENTOS) ===
    // --- MODAL COMPLETAR DOCUMENTOS ---
    const modalCompletar = document.getElementById('modal-completar');
    if (modalCompletar) {
        const overlay = modalCompletar.querySelector('.modal-overlay');
        const btnClose = document.getElementById('btn-close-modal');
        const inputCid = document.getElementById('input-contract-id');
        const formDocs = document.getElementById('form-completar');
        const btnCancelarCompletar = modalCompletar.querySelector('#btn-cancelar');
        const btnGuardarCompletar = modalCompletar.querySelector('#btn-guardar');
        const signaturePadCanvas = document.getElementById('signature-pad');
        let signature = null;
        // Esperar a que SignaturePad esté disponible (por el defer)
        function initSignaturePad() {
          if (window.SignaturePad && signaturePadCanvas) {
            signature = new SignaturePad(signaturePadCanvas);
          } else {
            setTimeout(initSignaturePad, 100);
          }
        }
        initSignaturePad();

        // --- CONTROL DE BLOQUEO SI YA EXISTE DOCUMENTO FIRMADO ---
        // Función para bloquear el botón si ya existe documento firmado
        async function controlarBotonCompletarDocs() {
          const btnsCompletar = document.querySelectorAll('.btn-completar-docs');
          
          // Procesar botones en lotes para mejorar performance
          const batchSize = 3;
          for (let i = 0; i < btnsCompletar.length; i += batchSize) {
            const batch = Array.from(btnsCompletar).slice(i, i + batchSize);
            
            // Procesar lote en paralelo
            const promises = batch.map(async (btn) => {
              const id = btn.dataset.contractId;
              if (!id) return;
              
              try {
                const res = await fetch(`/contracts/${id}`);
                const data = await res.json();
                const firmado = (data.documents || []).find(doc => doc.filename === 'documento_firmado.pdf');
                let existeFirmado = !!firmado;
                let esRechazado = firmado && firmado.status === 'rechazado';
                
                return { btn, existeFirmado, esRechazado };
              } catch (error) {
                console.error('Error checking contract:', id, error);
                return { btn, existeFirmado: false, esRechazado: false };
              }
            });
            
            // Esperar a que se complete el lote
            const results = await Promise.all(promises);
            
            // Actualizar UI para el lote
            results.forEach(({ btn, existeFirmado, esRechazado }) => {
              if (!btn) return;
              
              if (existeFirmado && !esRechazado) {
                // Solo si está firmado y NO rechazado, deshabilita el botón
                btn.textContent = 'Pendiente de confirmación';
                btn.classList.add('disabled');
                btn.disabled = true;
                btn.style.cursor = 'not-allowed';
                btn.title = 'Ya enviaste tus documentos, espera confirmación del agente.';
              } else {
                // Si está rechazado o no hay firmado, permite subir
                btn.textContent = esRechazado ? 'Volver a subir' : 'Completar documentos';
                btn.classList.remove('disabled');
                btn.disabled = false;
                btn.style.cursor = '';
                btn.title = '';
              }
            });
            
            // Pequeña pausa entre lotes para no sobrecargar el navegador
            if (i + batchSize < btnsCompletar.length) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
        }
        // Llamar al cargar la página
        controlarBotonCompletarDocs();

        // Abrir modal al click en cualquier "Completar documentos"
        document.querySelectorAll('.btn-completar-docs').forEach(btn => {
          // Debounce para evitar múltiples clicks
          let isProcessing = false;
          
          btn.addEventListener('click', async () => {
            // Prevenir múltiples clicks
            if (isProcessing) return;
            isProcessing = true;
            
            try {
              // Si el botón está deshabilitado, no hacer nada
              if (btn.disabled || btn.classList.contains('disabled')) {
                // Opcional: mostrar un modal o notificación
                const modalNotificacion = document.getElementById('modal-notificacion');
                const notificacionTitulo = document.getElementById('notificacion-titulo');
                const notificacionMensaje = document.getElementById('notificacion-mensaje');
                const btnCerrarNotificacion = document.getElementById('btn-cerrar-notificacion');
                notificacionTitulo.textContent = 'Pendiente de confirmación';
                notificacionMensaje.textContent = 'Ya enviaste tus documentos, espera confirmación del agente.';
                modalNotificacion.classList.remove('hidden');
                btnCerrarNotificacion.onclick = function() {
                  modalNotificacion.classList.add('hidden');
                };
                return;
              }
              
              const id = btn.dataset.contractId;
              if (!id) {
                console.error('No contract ID found');
                return;
              }
              
              // Mostrar indicador de carga
              const originalText = btn.textContent;
              btn.textContent = 'Cargando...';
              btn.disabled = true;
              
              const res = await fetch(`/contracts/${id}`);
              if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
              }
              
              const data = await res.json();
              
              // Actualizar elementos del modal de manera eficiente
              const elements = {
                'detalle-cliente': data.client_name ?? '-',
                'detalle-seguro': data.policy_name ?? '-',
                'detalle-prima': (data.premium_amount !== undefined && data.premium_amount !== null) ? `$${data.premium_amount}` : '-',
                'detalle-frecuencia': data.payment_frequency ?? '-',
                'detalle-estado': data.status ?? '-'
              };
              
              Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
              });
              
              // Actualizar documentos
              const detalleDocumentos = document.getElementById('detalle-documentos');
              if (detalleDocumentos) {
                detalleDocumentos.innerHTML = (data.documents && data.documents.length)
                  ? data.documents.map(d=>`<a href="${d.url||'#'}" target="_blank">${d.filename||d.path||''}</a>`).join(', ')
                  : '<span style="color:#888">Ninguno</span>';
              }
              
              inputCid.value = id;
              if (signature) signature.clear();
              modalCompletar.classList.remove('hidden');
              
            } catch (error) {
              console.error('Error loading contract data:', error);
              alert('Error al cargar los datos del contrato. Por favor, intente nuevamente.');
            } finally {
              // Restaurar botón
              btn.textContent = originalText;
              btn.disabled = false;
              isProcessing = false;
            }
          });
        });
        // Cerrar modal con botón cancelar
        if (btnCancelarCompletar) {
          btnCancelarCompletar.addEventListener('click', () => {
            modalCompletar.classList.add('hidden');
          });
        }
        // Cerrar modal con la X o el overlay
        [overlay, btnClose].forEach(el => el && el.addEventListener('click', () => {
          modalCompletar.classList.add('hidden');
        }));
        // Borrar firma
        const btnClearSign = document.getElementById('btn-clear-sign');
        if (btnClearSign) {
          btnClearSign.addEventListener('click', function() {
            if (signature) signature.clear();
          });
        }
        // Enviar documentos + firma
        if (formDocs) {
          let submitPending = null; // Para guardar el evento submit pendiente

          formDocs.addEventListener('submit', async e => {
            e.preventDefault();

            // Mostrar modal de confirmación
            submitPending = async () => {
              const fd = new FormData(formDocs);
              if (signature && !signature.isEmpty()) {
                // Convertir la firma a dataURL y luego a Blob
                const dataURL = signature.toDataURL('image/png');
                function dataURLtoBlob(dataurl) {
                  var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
                    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
                  while(n--){
                    u8arr[n] = bstr.charCodeAt(n);
                  }
                  return new Blob([u8arr], {type:mime});
                }
                const blob = dataURLtoBlob(dataURL);
                fd.append('signature', blob, 'firma.png');
              }
              const resp = await fetch('/contracts/' + inputCid.value + '/upload_docs', {
                method: 'POST',
                body: fd
              });
              if (resp.ok) {
                // Mostrar modal de notificación elegante
                const modalNotificacion = document.getElementById('modal-notificacion');
                const notificacionTitulo = document.getElementById('notificacion-titulo');
                const notificacionMensaje = document.getElementById('notificacion-mensaje');
                const btnCerrarNotificacion = document.getElementById('btn-cerrar-notificacion');
                notificacionTitulo.textContent = '¡Éxito!';
                notificacionMensaje.textContent = 'Documentos guardados 🎉';
                modalNotificacion.classList.remove('hidden');
                btnCerrarNotificacion.onclick = function() {
                  modalNotificacion.classList.add('hidden');
                };
                modalCompletar.classList.add('hidden');
                // Cambiar el estado visual del botón a 'Activo'
                const btnStatus = document.querySelector('.status-toggle-btn[data-contract-id="' + inputCid.value + '"]');
                if (btnStatus) {
                  btnStatus.textContent = 'Activo';
                  btnStatus.classList.add('active');
                  btnStatus.classList.remove('pending');
                  btnStatus.setAttribute('data-status', 'active');
                }
                // location.reload(); // Quitar recarga para mantener el estado visual
              } else {
                alert('Error guardando documentos');
              }
            };

            document.getElementById('modal-confirmacion-envio').classList.remove('hidden');
          });

          // Botones del modal
          document.getElementById('btn-cancelar-envio').onclick = function() {
            document.getElementById('modal-confirmacion-envio').classList.add('hidden');
            submitPending = null;
          };
          document.getElementById('btn-confirmar-envio').onclick = async function() {
            document.getElementById('modal-confirmacion-envio').classList.add('hidden');
            if (submitPending) {
              await submitPending();
              submitPending = null;
            }
          };
        }
      }
    
    // === (8) Botón de cambio de estado (Activo/Pendiente) ===
    document.querySelectorAll('.status-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const current = btn.getAttribute('data-status');
            // Cambia visualmente el estado (no afecta backend)
            if (current === 'active') {
                btn.textContent = 'Pendiente';
                btn.classList.remove('active');
                btn.setAttribute('data-status', 'pending');
            } else {
                btn.textContent = 'Activo';
                btn.classList.add('active');
                btn.setAttribute('data-status', 'active');
            }
        });
    });

    // === (9) Botón "Ver motivo" para documentos rechazados ===
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-ver-motivo') || e.target.closest('.btn-ver-motivo')) {
            const btn = e.target.classList.contains('btn-ver-motivo') ? e.target : e.target.closest('.btn-ver-motivo');
            const motivo = btn.getAttribute('data-motivo');
            const contractId = btn.getAttribute('data-contract-id');
            
            // Mostrar el motivo en el modal
            document.getElementById('motivo-rechazo-text').textContent = motivo;
            document.getElementById('modal-motivo-rechazo').classList.remove('hidden');
        }
        
        // Cerrar modal de motivo con botón X
        if (e.target.id === 'btn-close-motivo-modal') {
            document.getElementById('modal-motivo-rechazo').classList.add('hidden');
        }
        
        // Cerrar modal de motivo con botón "Entendido"
        if (e.target.id === 'btn-cerrar-motivo-rechazo') {
            document.getElementById('modal-motivo-rechazo').classList.add('hidden');
        }
    });
    
    // Cerrar modal de motivo con overlay
    const modalMotivoRechazo = document.getElementById('modal-motivo-rechazo');
    if (modalMotivoRechazo) {
        const overlay = modalMotivoRechazo.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                modalMotivoRechazo.classList.add('hidden');
            });
        }
    }

    // Refuerzo de manejo de errores y logs al cargar historial de reembolsos
    async function cargarHistorialReembolsos() {
      console.log('Iniciando carga de historial de reembolsos...');
      try {
        const response = await fetch('/refunds');
        if (!response.ok) {
          throw new Error('Error al cargar reembolsos');
        }
        const reembolsos = await response.json();
        console.log('Reembolsos cargados del servidor:', reembolsos);
        const historialContainer = document.getElementById('historial-reembolsos');
        // Siempre actualizar los botones, independientemente de si hay reembolsos o no
        console.log('Actualizando botones con los reembolsos cargados...');
        actualizarBotonesReembolso(reembolsos);
        if (!Array.isArray(reembolsos) || reembolsos.length === 0) {
          historialContainer.innerHTML = '<div style="color:#888; text-align:center; padding:20px;">No tienes solicitudes de reembolso registradas.</div>';
          return;
        }
        // ...código original de renderizado backend...
      } catch (err) {
        console.error('Error al cargar historial de reembolsos:', err);
        const historialContainer = document.getElementById('historial-reembolsos');
        historialContainer.innerHTML = '<div style="color:#dc3545; text-align:center; padding:20px;">No se pudo conectar con el servidor de reembolsos. Intenta más tarde.</div>';
      }
    }

    // === NUEVA LÓGICA DE ENVÍO DE REEMBOLSO ===
    const formNuevoReembolso = document.getElementById('form-nuevo-reembolso');
    if (formNuevoReembolso) {
      let submitPendingReembolso = null;
      formNuevoReembolso.addEventListener('submit', function(e) {
        e.preventDefault();
        // Guardar la función de envío pendiente
        submitPendingReembolso = async function() {
          const btn = document.getElementById('btn-enviar-nuevo-reembolso');
          if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
          try {
            // 1. Crear la solicitud de reembolso (sin documentos)
            const datos = new FormData(formNuevoReembolso);
            const payload = {
              policy_id: parseInt(datos.get('policy_id'), 10),
              refund_type: datos.get('refund_type'),
              refund_type_other: datos.get('refund_type_other'),
              event_description: datos.get('event_description'),
              event_date: datos.get('event_date'),
              amount: datos.get('amount')
            };
            if (!payload.policy_id) throw new Error('Debes seleccionar una póliza');
            const resp = await fetch('/refunds', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (!resp.ok) throw new Error('Error creando solicitud de reembolso');
            const refund = await resp.json();
            const refund_id = refund.id || refund.refund_id || refund.refundId;
            if (!refund_id) throw new Error('No se obtuvo el ID del reembolso');
            // 2. Subir documentos
            const files = document.getElementById('documentos').files;
            if (files.length > 0) {
              const fd = new FormData();
              for (let i = 0; i < files.length; i++) {
                fd.append('documentos', files[i]);
              }
              const respDocs = await fetch(`/refunds/${refund_id}/upload_docs`, {
                method: 'POST',
                body: fd
              });
              if (!respDocs.ok) {
                const errMsg = await respDocs.text();
                throw new Error('Error subiendo documentos: ' + errMsg);
              }
            }
            // 3. Mostrar modal de éxito y resetear
            document.getElementById('modal-nuevo-reembolso').classList.add('hidden');
            document.getElementById('modal-exito-nuevo-reembolso').classList.remove('hidden');
            formNuevoReembolso.reset();
            setTimeout(()=>{
              document.getElementById('modal-exito-nuevo-reembolso').classList.add('hidden');
              cargarHistorialReembolsos && cargarHistorialReembolsos();
            }, 2000);
          } catch (err) {
            alert('Error al enviar la solicitud: ' + (err.message || err));
          } finally {
            const btn = document.getElementById('btn-enviar-nuevo-reembolso');
            if (btn) { btn.disabled = false; btn.textContent = 'Enviar Solicitud'; }
          }
        };
        // Mostrar el modal de confirmación
        document.getElementById('modal-confirmar-envio-reembolso').classList.remove('hidden');
      });
      // Botones del modal de confirmación
      document.getElementById('btn-cancelar-envio-reembolso').onclick = function() {
        document.getElementById('modal-confirmar-envio-reembolso').classList.add('hidden');
        submitPendingReembolso = null;
      };
      document.getElementById('btn-cerrar-modal-confirmar-envio').onclick = function() {
        document.getElementById('modal-confirmar-envio-reembolso').classList.add('hidden');
        submitPendingReembolso = null;
      };
      document.getElementById('btn-confirmar-envio-reembolso').onclick = async function() {
        document.getElementById('modal-confirmar-envio-reembolso').classList.add('hidden');
        if (submitPendingReembolso) {
          await submitPendingReembolso();
          submitPendingReembolso = null;
        }
      };
    }
});
