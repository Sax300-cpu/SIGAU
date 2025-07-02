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

    // === HISTORIAL DE REEMBOLSOS CON ACORDEÓN ===
    async function renderizarHistorialReembolsosAcordeon() {
      const historialContainer = document.getElementById('historial-reembolsos');
      if (!historialContainer) return;
      historialContainer.innerHTML = '<div style="color:#888; text-align:center; padding:20px;">Cargando reembolsos...</div>';
      try {
        const resp = await fetch('/refunds');
        if (!resp.ok) throw new Error('Error al cargar reembolsos');
        const reembolsos = await resp.json();
        if (!Array.isArray(reembolsos) || reembolsos.length === 0) {
          historialContainer.innerHTML = '<div style="color:#888; text-align:center; padding:20px;">No tienes solicitudes de reembolso registradas.</div>';
          return;
        }
        historialContainer.innerHTML = '';
        reembolsos.forEach((r, idx) => {
          const card = document.createElement('div');
          card.className = 'reembolso-card';
          card.style = 'border:1.5px solid #e3e8f0; border-radius:10px; margin-bottom:16px; background:#fff; box-shadow:0 2px 8px rgba(30,42,60,0.06);';
          card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 20px;cursor:pointer;">
              <div>
                <b>${r.policy_name || ''}</b><br>
              </div>
              <div>
                <span style="background:#f5f5f5;color:#1976d2;padding:4px 12px;border-radius:20px;font-size:0.95em;">${r.status || ''}</span>
                <button class="btn-ver-detalle-reembolso" data-id="${r.refund_id}" style="margin-left:18px;background:#1976d2;color:#fff;border:none;border-radius:4px;padding:7px 16px;font-size:0.97em;cursor:pointer;">Ver detalle</button>
              </div>
            </div>
            <div class="panel-detalle-reembolso" id="panel-detalle-reembolso-${r.refund_id}" style="display:none;padding:18px 24px 10px 24px;border-top:1px solid #e3e8f0;background:#f9f9fb;">
              <div style="color:#888;">Cargando detalle...</div>
            </div>
          `;
          historialContainer.appendChild(card);
        });
        // Lógica acordeón: solo uno abierto a la vez
        let abiertoId = null;
        document.querySelectorAll('.btn-ver-detalle-reembolso').forEach(btn => {
          btn.addEventListener('click', async function() {
            const refundId = btn.getAttribute('data-id');
            // Cerrar el panel abierto si hay
            if (abiertoId && abiertoId !== refundId) {
              const panelAbierto = document.getElementById('panel-detalle-reembolso-' + abiertoId);
              if (panelAbierto) panelAbierto.style.display = 'none';
            }
            const panel = document.getElementById('panel-detalle-reembolso-' + refundId);
            if (!panel) return;
            if (panel.style.display === 'block') {
              panel.style.display = 'none';
              abiertoId = null;
              return;
            }
            panel.style.display = 'block';
            abiertoId = refundId;
            // Cargar detalle y documentos
            panel.innerHTML = '<div style="color:#888;">Cargando detalle...</div>';
            try {
              // Buscar info de reembolso
              const r = reembolsos.find(x => x.refund_id == refundId);
              let html = `<div style='margin-bottom:10px;'><b>Póliza:</b> ${r.policy_name || ''}</div>`;
              html += `<div><b>Monto solicitado:</b> $${parseFloat(r.amount).toFixed(2)}</div>`;
              html += `<div><b>Motivo:</b> ${r.refund_type_other || r.refund_type || ''}</div>`;
              html += `<div><b>Descripción:</b> ${r.event_description || ''}</div>`;
              // Estado traducido y color
              let estado = r.status || '';
              let estadoColor = '#888';
              let estadoTexto = 'Pendiente';
              if (estado === 'approved') { estadoColor = '#388e3c'; estadoTexto = 'Aprobado'; }
              else if (estado === 'rejected') { estadoColor = '#d32f2f'; estadoTexto = 'Rechazado'; }
              else if (estado === 'pending') { estadoColor = '#f57c00'; estadoTexto = 'Pendiente'; }
              else { estadoTexto = estado; }
              html += `<div><b>Estado:</b> <span style='color:${estadoColor};font-weight:500;'>${estadoTexto}</span></div>`;
              // Documentos
              html += `<div style='margin-top:14px;'><b>Documentos subidos:</b><div id='docs-reembolso-${refundId}' style='margin-top:6px;'></div></div>`;
              panel.innerHTML = html;
              // Cargar documentos
              const respDocs = await fetch(`/refunds/${refundId}/documents`);
              if (respDocs.ok) {
                const docs = await respDocs.json();
                const docsDiv = document.getElementById('docs-reembolso-' + refundId);
                if (docsDiv) {
                  if (Array.isArray(docs) && docs.length > 0) {
                    docsDiv.innerHTML = '<ul style="padding-left:18px;">' + docs.map(d => {
                      let color = '#888', texto = 'Pendiente';
                      if (d.status === 'aprobado') { color = '#388e3c'; texto = 'Aprobado'; }
                      else if (d.status === 'rechazado') { color = '#d32f2f'; texto = 'Rechazado'; }
                      else if (d.status === 'pendiente' || d.status === 'pending') { color = '#f57c00'; texto = 'Pendiente'; }
                      else { texto = d.status; }
                      let comentario = d.review_comment ? `<div style='color:#d32f2f;font-size:0.97em;margin-top:2px;'>Motivo: ${d.review_comment}</div>` : '';
                      return `<li><a href="${d.url}" target="_blank">${d.filename}</a> <span style="color:${color};font-size:0.95em;font-weight:500;">[${texto}]</span>${comentario}</li>`;
                    }).join('') + '</ul>';
                  } else {
                    docsDiv.innerHTML = '<span style="color:#888;">No hay documentos subidos.</span>';
                  }
                }
              }
            } catch (err) {
              panel.innerHTML = '<div style="color:#d32f2f;">Error al cargar detalle.</div>';
            }
          });
        });
      } catch (err) {
        historialContainer.innerHTML = '<div style="color:#d32f2f; text-align:center; padding:20px;">No se pudo conectar con el servidor de reembolsos. Intenta más tarde.</div>';
      }
    }

    // Llamar al cargar la página y tras enviar un reembolso
    renderizarHistorialReembolsosAcordeon();
    window.cargarHistorialReembolsos = renderizarHistorialReembolsosAcordeon;

    // Asegurar que el select de tipo de reembolso se limpie y rellene correctamente
    const selectPoliza = document.getElementById('policy_id');
    const selectTipoReembolso = document.getElementById('refund_type');
    if (selectPoliza && selectTipoReembolso) {
      selectPoliza.addEventListener('change', function() {
        const selected = this.options[this.selectedIndex];
        const category = selected.dataset.category;
        selectTipoReembolso.innerHTML = '<option value="">Seleccione una opción</option>';
        if (category === 'vida') {
          selectTipoReembolso.innerHTML += `
            <option value="fallecimiento">Beneficio por Fallecimiento (Vida)</option>
            <option value="discapacidad">Indemnización por Discapacidad (Vida)</option>
            <option value="otros">Otros (especificar)</option>
          `;
        } else if (category === 'salud') {
          selectTipoReembolso.innerHTML += `
            <option value="gastos_medicos">Gastos Médicos (Salud)</option>
            <option value="discapacidad">Indemnización por Discapacidad (Salud)</option>
            <option value="otros">Otros (especificar)</option>
          `;
        }
      });
    }

    const btnNuevoReembolso = document.getElementById('btn-nuevo-reembolso');
    const panelFormReembolso = document.getElementById('panel-form-reembolso');
    if (btnNuevoReembolso && panelFormReembolso) {
      btnNuevoReembolso.addEventListener('click', async function() {
        if (panelFormReembolso.style.display === 'none' || panelFormReembolso.style.display === '') {
          panelFormReembolso.style.display = 'block';
          btnNuevoReembolso.disabled = true;
          // Cargar pólizas activas al mostrar el formulario
          const selectPoliza = document.getElementById('policy_id');
          if (selectPoliza) {
            selectPoliza.innerHTML = '<option value="">Seleccione una póliza</option>';
            try {
              const res = await fetch('/api/polizas_activas');
              if (res.ok) {
                const polizas = await res.json();
                polizas.forEach(p => {
                  const opt = document.createElement('option');
                  opt.value = p.id;
                  opt.textContent = `${p.name} (${p.category})`;
                  opt.dataset.category = p.category;
                  selectPoliza.appendChild(opt);
                });
              }
            } catch (e) {
              // No hacer nada, el select queda vacío
            }
          }
        }
      });
      // Al enviar el formulario, ocultar el panel y habilitar el botón
      const formNuevoReembolso = document.getElementById('form-nuevo-reembolso');
      if (formNuevoReembolso) {
        formNuevoReembolso.addEventListener('submit', async function(e) {
          e.preventDefault();
          const btn = document.getElementById('btn-enviar-nuevo-reembolso') || formNuevoReembolso.querySelector('button[type="submit"]');
          if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
          try {
            // Validar archivo
            const inputArchivo = document.getElementById('documento-reembolso');
            if (!inputArchivo || !inputArchivo.files || inputArchivo.files.length !== 1) {
              alert('Debes seleccionar un archivo PDF.');
              if (btn) { btn.disabled = false; btn.textContent = 'Enviar Solicitud'; }
              return;
            }
            const archivo = inputArchivo.files[0];
            if (archivo.type !== 'application/pdf') {
              alert('Solo se permite subir archivos PDF.');
              if (btn) { btn.disabled = false; btn.textContent = 'Enviar Solicitud'; }
              return;
            }
            if (archivo.size > 5 * 1024 * 1024) {
              alert('El archivo supera el tamaño máximo de 5MB.');
              if (btn) { btn.disabled = false; btn.textContent = 'Enviar Solicitud'; }
              return;
            }
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
            // 2. Subir documento PDF
            const fd = new FormData();
            fd.append('documentos', archivo);
            const respDocs = await fetch(`/refunds/${refund_id}/upload_docs`, {
              method: 'POST',
              body: fd
            });
            if (!respDocs.ok) {
              const errMsg = await respDocs.text();
              throw new Error('Error subiendo documento: ' + errMsg);
            }
            // 3. Mostrar modal de éxito y resetear
            panelFormReembolso.style.display = 'none';
            btnNuevoReembolso.disabled = false;
            formNuevoReembolso.reset();
            document.getElementById('modal-exito-nuevo-reembolso').classList.remove('hidden');
            setTimeout(()=>{
              document.getElementById('modal-exito-nuevo-reembolso').classList.add('hidden');
              renderizarHistorialReembolsosAcordeon && renderizarHistorialReembolsosAcordeon();
            }, 2000);
          } catch (err) {
            alert('Error al enviar la solicitud: ' + (err.message || err));
          } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Enviar Solicitud'; }
          }
        });
      }
    }
});
