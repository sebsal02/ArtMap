let map, marker, selectedCoord = null;
let places = [];
let imgRealData = '', imgIlusData = '';

// Sistema de Token Unico e Intransferible
function getOrGenerateToken() {
  let token = localStorage.getItem('mapArtUserToken');
  if (!token) {
    // Generar un UUID simple para el dispositivo
    token = 'usr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2);
    localStorage.setItem('mapArtUserToken', token);
  }
  return token;
}
const userToken = getOrGenerateToken();

window.onload = () => {
  // Cargar borrador local si existe
  const draft = localStorage.getItem('mapArtDraftPlaces');
  if (draft) {
    try {
      places = JSON.parse(draft);
    } catch(e) {}
  }

  map = L.map('map').setView([19.4326, -99.1332], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  map.on('click', (e) => {
    selectedCoord = e.latlng;
    document.getElementById('coordInfo').innerHTML = `Seleccion: Lat ${e.latlng.lat.toFixed(4)}, Lng ${e.latlng.lng.toFixed(4)}`;
    
    if (marker) map.removeLayer(marker);
    marker = L.circleMarker(e.latlng, { radius: 10, color: '#c8861a', weight: 3, fillColor: '#fff', fillOpacity: 0.9 }).addTo(map);
  });

  if (places.length > 0) {
    dibujarMarcadoresGuardados();
    actualizarLista();
  }
};

function cambiarTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  document.querySelector(`.tab[onclick="cambiarTab('${tab}')"]`).classList.add('on');
  document.getElementById(`tab-${tab}`).classList.add('on');
  
  if(tab === 'historial') {
    cargarHistorialMapas();
  }
}

function resizeImage(file, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      const MAX = 500; 

      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round((h *= MAX / w)); w = MAX; }
        else { w = Math.round((w *= MAX / h)); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function previewImg(e, prevId) {
  const file = e.target.files[0];
  if (!file) return;
  resizeImage(file, (dataUrl) => {
    const img = document.getElementById(prevId);
    img.src = dataUrl;
    img.style.display = 'block';
    if (prevId === 'pvReal') imgRealData = dataUrl;
    if (prevId === 'pvIlus') imgIlusData = dataUrl;
    
    // Limpiar el valor para permitir subir la misma imagen si el usuario la borro
    e.target.value = '';
  });
}

function verImagen(src) {
  if (!src) return;
  document.getElementById('imgFullTarget').src = src;
  document.getElementById('modalImgFull').classList.add('on');
}

function agregarLugar() {
  const name = document.getElementById('pNombre').value.trim();
  if (!selectedCoord) return toast('Seleccione un lugar en el mapa.', true);
  if (!name) return toast('El nombre del lugar es obligatorio.', true);
  if (!imgRealData || !imgIlusData) return toast('Ambas imagenes son requeridas.', true);

  const place = {
    id: Date.now().toString(),
    name,
    lat: selectedCoord.lat,
    lng: selectedCoord.lng,
    realImg: imgRealData,
    ilusImg: imgIlusData
  };

  places.push(place);
  guardarBorrador();
  
  L.marker([place.lat, place.lng]).addTo(map).bindPopup(`<b>${place.name}</b>`);
  
  document.getElementById('pNombre').value = '';
  document.getElementById('pvReal').style.display = 'none';
  document.getElementById('pvIlus').style.display = 'none';
  document.getElementById('coordInfo').innerHTML = 'Esperando seleccion en el mapa...';
  imgRealData = '';
  imgIlusData = '';
  if (marker) map.removeLayer(marker);
  selectedCoord = null;
  
  actualizarLista();
  toast('Lugar registrado con exito.');
  cambiarTab('lista');
}

function guardarBorrador() {
  localStorage.setItem('mapArtDraftPlaces', JSON.stringify(places));
}

function dibujarMarcadoresGuardados() {
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker && !layer.options.radius) { map.removeLayer(layer); }
  });
  places.forEach(p => L.marker([p.lat, p.lng]).addTo(map).bindPopup(`<b>${p.name}</b>`));
}

function actualizarLista() {
  const div = document.getElementById('listaLugares');
  if (places.length === 0) {
    div.innerHTML = 'No hay lugares registrados.';
    return;
  }
  div.innerHTML = places.map((p, i) => `
    <div class="pt-card" style="cursor:pointer;" onclick="map.flyTo([${p.lat}, ${p.lng}], 16)">
      <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
        <div class="pt-nm">${i+1}. ${p.name}</div>
        <button class="btn btn-danger" onclick="event.stopPropagation(); borrarLugar('${p.id}')" style="width:auto;">Eliminar</button>
      </div>
      <div style="display:flex; gap:10px; width:100%;">
        <div style="flex:1; text-align:center;">
          <img src="${p.ilusImg}" style="width:100%; aspect-ratio:4/3; object-fit:cover; border-radius:5px; border:1px solid #ddd;" onclick="event.stopPropagation(); verImagen(this.src)" title="Clic para ampliar">
          <span style="font-size:0.75rem; color:#666; font-weight:bold;">Ilustracion</span>
        </div>
        <div style="flex:1; text-align:center;">
          <img src="${p.realImg}" style="width:100%; aspect-ratio:4/3; object-fit:cover; border-radius:5px; border:1px solid #ddd;" onclick="event.stopPropagation(); verImagen(this.src)" title="Clic para ampliar">
          <span style="font-size:0.75rem; color:#666; font-weight:bold;">Foto Real</span>
        </div>
      </div>
      <button onclick="event.stopPropagation(); abrirComparador('${p.realImg}', '${p.ilusImg}')" style="margin-top:5px; width:100%; background:var(--ink); color:#fff; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer;">Abrir Visor Comparativo</button>
    </div>
  `).join('');
}

function borrarLugar(id) {
  places = places.filter(p => p.id !== id);
  guardarBorrador();
  dibujarMarcadoresGuardados();
  actualizarLista();
}

function toast(msg, isErr=false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + (isErr ? 'err on' : 'on');
  setTimeout(() => t.classList.remove('on'), 3000);
}

async function cargarHistorialMapas() {
  const div = document.getElementById('listaHistorial');
  div.innerHTML = 'Consultando base de datos...';
  
  if (window.location.protocol === 'file:' || (window.location.hostname === '127.0.0.1' && window.location.port !== '3000')) {
    div.innerHTML = '<span style="color:var(--rust); font-weight:bold;">Para consultar el historial, el servidor debe estar activo en puerto 3000.</span>';
    return;
  }

  try {
    const res = await fetch(`/api/mis-mapas/${userToken}`);
    const data = await res.json();
    
    if (data.success && data.mapas.length > 0) {
      div.innerHTML = data.mapas.map(m => `
        <div style="border:1px solid #ccc; padding:12px; border-radius:8px; background:#fff;">
          <div style="font-weight:bold;">Autor: ${m.author}</div>
          <div style="font-size:0.8rem; color:#666;">Lugares: ${m.placesCount} | Creado: ${new Date(m.createdAt).toLocaleDateString()}</div>
          <a href="viewer.html?id=${m.id}" target="_blank" style="display:inline-block; margin-top:8px; color:var(--ochre); font-weight:bold; text-decoration:none;">Abrir Mapa</a>
        </div>
      `).join('');
    } else {
      div.innerHTML = 'Aun no tienes mapas guardados en el servidor.';
    }
  } catch(e) {
    div.innerHTML = 'Error de conexion con el servidor.';
  }
}

async function generarQR() {
  const authorName = document.getElementById('alumnoNombre').value.trim();
  if (places.length === 0) return toast('Agregue lugares al mapa antes de continuar.', true);
  if (!authorName) return toast('El nombre del autor es obligatorio.', true);

  const btn = document.getElementById('btnGenerar');
  btn.innerHTML = 'Procesando datos seguros...';
  btn.disabled = true;

  try {
    if (window.location.protocol === 'file:' || (window.location.hostname === '127.0.0.1' && window.location.port !== '3000')) {
      toast('Error de entorno: Ejecute Node.js localmente o implemente en servidor.', true);
      btn.innerHTML = 'Guardar en Servidor y Generar QR';
      btn.disabled = false;
      return;
    }

    const res = await fetch('/api/mapas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: authorName, places, userToken })
    });
    
    const data = await res.json();
    if (data.success) {
      const urlBase = window.location.origin;
      const finalUrl = `${urlBase}/viewer.html?id=${data.mapId}`;
      
      document.getElementById('qrResult').style.display = 'block';
      const canvas = document.getElementById('qrCanvas');
      canvas.innerHTML = '';
      
      new QRCode(canvas, {
        text: finalUrl,
        width: 200,
        height: 200,
        colorDark: '#1a1209',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
      });

      const link = document.getElementById('qrLink');
      link.href = finalUrl;
      link.textContent = finalUrl;
      
      toast('Transaccion exitosa. QR listo.');
    } else {
      toast('Respuesta rechazada por servidor: ' + (data.error || 'Error.'), true);
    }
  } catch (err) {
    console.error(err);
    toast('Error critico de conexion.', true);
  } finally {
    btn.innerHTML = 'Guardar en Servidor y Generar QR';
    btn.disabled = false;
  }
}

// Control del Slider
let dragOn = false;

function abrirComparador(realSrc, ilusSrc) {
  document.getElementById('sIlus').src = ilusSrc; 
  document.getElementById('sReal').src = realSrc; 
  document.getElementById('modalCmp').classList.add('on');
  setSliderPos(0.5); 
}

function setSliderPos(ratio) {
  const p = Math.min(Math.max(ratio, 0.05), 0.95); 
  document.getElementById('sReal').style.clipPath = `inset(0 ${(1-p)*100}% 0 0)`;
  document.getElementById('sLine').style.left = (p*100) + '%';
  document.getElementById('sHandle').style.left = (p*100) + '%';
}

setTimeout(() => {
  const sliderBox = document.getElementById('sBox');
  if(sliderBox) {
    function moveDrag(e) {
      const rect = sliderBox.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      setSliderPos(x / rect.width);
    }

    sliderBox.addEventListener('mousedown', (e) => { dragOn = true; moveDrag(e); e.preventDefault(); });
    sliderBox.addEventListener('touchstart', (e) => { dragOn = true; moveDrag(e); }, {passive:false});

    document.addEventListener('mousemove', (e) => { if(dragOn) moveDrag(e); });
    document.addEventListener('touchmove', (e) => { if(dragOn) moveDrag(e); }, {passive:false});

    document.addEventListener('mouseup', () => dragOn = false);
    document.addEventListener('touchend', () => dragOn = false);
  }
}, 500);
