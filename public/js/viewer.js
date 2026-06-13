let map;

window.onload = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  if (!id) {
    document.getElementById('loading').innerHTML = 'Error: Identificador de mapa no detectado.';
    return;
  }

  try {
    const res = await fetch(`/api/mapas/${id}`);
    const data = await res.json();
    
    if (data.success) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('content').style.display = 'block';
      mostrarMapa(data.map);
    } else {
      document.getElementById('loading').innerHTML = 'Error: Mapa no encontrado en los registros.';
    }
  } catch (err) {
    document.getElementById('loading').innerHTML = 'Error de comunicacion con el servidor principal.';
  }
};

function mostrarMapa(mapData) {
  document.getElementById('authorName').textContent = `Autor del Mapa: ${mapData.author}`;
  document.title = `MapArt - Evaluación de ${mapData.author}`;

  const places = mapData.places || [];
  
  map = L.map('map').setView(places.length ? [places[0].lat, places[0].lng] : [19.4326, -99.1332], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  const placesDiv = document.getElementById('placesList');
  
  places.forEach((p, index) => {
    const icon = L.divIcon({
      html: `<div style="background:#c8861a;color:#fff;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid #1a1209;"><span style="transform:rotate(45deg)">${index+1}</span></div>`,
      className: '', iconSize: [30, 30], iconAnchor: [15, 30]
    });
    const marker = L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(`<b>${p.name}</b>`);
    
    marker.on('click', () => {
      document.getElementById('card-' + p.id).scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    const card = document.createElement('div');
    card.className = 'place-card';
    card.id = 'card-' + p.id;
    card.innerHTML = `
      <div class="place-header">
        <div class="place-num">${index+1}</div>
        <div class="place-title">${p.name}</div>
      </div>
      <div class="place-body">
        <button class="compare-btn" onclick="abrirComparador('${p.realImg}', '${p.ilusImg}')">
          Activar Comparador de Capas
        </button>
        <div class="images-row">
          <div class="img-box">
            <img src="${p.ilusImg}" onclick="verImagen(this.src)" title="Clic para maximizar">
            <p>ILUSTRACION</p>
          </div>
          <div class="img-box">
            <img src="${p.realImg}" onclick="verImagen(this.src)" title="Clic para maximizar">
            <p>FOTO REAL</p>
          </div>
        </div>
      </div>
    `;
    placesDiv.appendChild(card);
  });

  if (places.length > 1) {
    const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
  }
}

function verImagen(src) {
  if (!src) return;
  document.getElementById('imgFullTarget').src = src;
  document.getElementById('modalImgFull').classList.add('on');
}

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
