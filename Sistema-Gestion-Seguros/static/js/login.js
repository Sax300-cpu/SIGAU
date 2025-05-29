// assets/js/login.js
document
  .getElementById('loginForm')
  .addEventListener('submit', async e => {
    e.preventDefault();

    const form  = e.target;
    const data  = new FormData(form);

    // Lanza la petición POST a /login
    const res = await fetch(form.action, {
      method: form.method, // "post"
      body: data
    });

    if (res.redirected) {
      // Si el servidor redirige (login OK), vamos a esa URL
      window.location = res.url;
    } else {
      // Si vuelve 200 con la plantilla de login (con flash de error),
      // recargamos el body para mostrarlo
      document.body.innerHTML = await res.text();
    }
  });
