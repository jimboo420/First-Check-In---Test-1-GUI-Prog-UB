const API_KEY = '28487f78ee09a45ef3ca72bdf4957ccd';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

let activeIndex = -1;
let selectedMovie = null;
const cache = new Map();
let debounceTimer = null;
let controller = null;

const searchInput = document.getElementById('search-input');
const resultList = document.getElementById('result-list');
const resultHeader = document.getElementById('results-header');
const statusBar = document.getElementById('status-bar');
const detailEmpty = document.getElementById('detail-empty');
const detailContent = document.getElementById('detail-content');
const template = document.getElementById('result-template');
const searchWrap = searchInput.closest('[data-loading]');

function buildHighlightedTitle(title, query) {
  const container = document.createElement('span');
  if (!query) {
    container.textContent = title;
    return container;
  }
  
  const idx = title.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) {
    container.textContent = title;
    return container;
  }

  const before = document.createTextNode(title.slice(0, idx));
  const match = document.createElement('span');
  match.className = 'highlight';
  match.textContent = title.slice(idx, idx + query.length);
  const after = document.createTextNode(title.slice(idx + query.length));

  container.appendChild(before);
  container.appendChild(match);
  container.appendChild(after);
  return container;
}

async function fetchJSON(url) {
  const separator = url.includes('?') ? '&' : '?';
  const urlWithKey = `${url}${separator}api_key=${API_KEY}`;
  
  const response = await fetch(urlWithKey);
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

function getImageUrl(path, size = 'w500') {
  return path ? `${IMG_BASE}/${size}${path}` : null;
}

function renderResults(movies, query) {
  const frag = new DocumentFragment();
  
  if (movies.length === 0) {
    resultList.innerHTML = '';
    resultHeader.textContent = 'NO RESULTS';
    return;
  }

  movies.forEach((movie, i) => {
    const clone = template.content.cloneNode(true);
    const item = clone.querySelector('.result-item');
    const titleEl = clone.querySelector('.result-title');
    const meta = clone.querySelector('.result-meta');
    const rating = clone.querySelector('.result-rating');
    const posterContainer = clone.querySelector('.result-poster-placeholder');

    titleEl.appendChild(buildHighlightedTitle(movie.title, query));
    
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    meta.textContent = `${year}`;
    rating.textContent = `★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}`;

    if (posterContainer) {
      if (movie.poster_path) {
        const img = document.createElement('img');
        img.className = 'result-poster';
        img.src = getImageUrl(movie.poster_path, 'w92');
        img.alt = movie.title;
        img.onerror = function() {
          this.style.display = 'none';
          posterContainer.textContent = '🎬';
        };
        posterContainer.innerHTML = '';
        posterContainer.appendChild(img);
      } else {
        posterContainer.textContent = '🎬';
      }
    }

    item.dataset.idx = i;
    item.addEventListener('click', () => selectMovie(i, movies));
    item.addEventListener('keydown', e => { 
      if (e.key === 'Enter') selectMovie(i, movies); 
    });

    frag.appendChild(clone);
  });

  resultList.innerHTML = '';
  resultList.appendChild(frag);
  resultHeader.textContent = `${movies.length} RESULT${movies.length !== 1 ? 'S' : ''}`;
}

function setActive(idx) {
  activeIndex = idx;
  const items = document.querySelectorAll('.result-item');
  items.forEach((el, i) => {
    el.classList.toggle('active', i === idx);
    if (i === idx) el.scrollIntoView({ block: 'nearest' });
  });
}

function selectMovie(idx, currentList) {
  const movie = currentList[idx];
  if (!movie) return;
  
  setActive(idx);
  selectedMovie = movie;
  loadMovieDetails(movie);
}

async function loadMovieDetails(movie) {
  detailEmpty.style.display = 'none';
  detailContent.classList.remove('visible');
  void detailContent.offsetWidth;
  detailContent.classList.add('visible');

  document.getElementById('detail-backdrop-wrap').innerHTML = '';
  document.getElementById('detail-poster-wrap').innerHTML = '';
  document.getElementById('detail-cast').innerHTML = '';
  document.getElementById('detail-trailer').innerHTML = '';
  document.getElementById('detail-badges').innerHTML = '';
  document.getElementById('detail-tagline').textContent = '';

  const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
  document.getElementById('detail-title').textContent = movie.title;
  document.getElementById('detail-overview').textContent = movie.overview || "No overview available.";
  
  const yearBadge = document.createElement('span');
  yearBadge.className = 'badge accent';
  yearBadge.textContent = year;
  document.getElementById('detail-badges').appendChild(yearBadge);

  const bdWrap = document.getElementById('detail-backdrop-wrap');
  if (movie.backdrop_path) {
    const img = document.createElement('img');
    img.className = 'detail-backdrop';
    img.src = getImageUrl(movie.backdrop_path, 'w1280');
    bdWrap.appendChild(img);
  } else {
    bdWrap.innerHTML = '<div class="detail-backdrop-placeholder"></div>';
  }

  const posterWrap = document.getElementById('detail-poster-wrap');
  if (movie.poster_path) {
    const img = document.createElement('img');
    img.className = 'detail-poster';
    img.src = getImageUrl(movie.poster_path, 'w500');
    posterWrap.appendChild(img);
  } else {
    posterWrap.innerHTML = '<div class="detail-poster-placeholder"></div>';
  }

  try {
    const [creditsData, videosData] = await Promise.all([
      fetchJSON(`${BASE_URL}/movie/${movie.id}/credits?language=en-US`),
      fetchJSON(`${BASE_URL}/movie/${movie.id}/videos?language=en-US`)
    ]);

    const castGrid = document.getElementById('detail-cast');
    const cast = creditsData.cast ? creditsData.cast.slice(0, 6) : [];
    
    if (cast.length > 0) {
      cast.forEach(actor => {
        const item = document.createElement('div');
        item.className = 'cast-item';
        
        const avatar = document.createElement('div');
        avatar.className = 'cast-avatar';
        if (actor.profile_path) {
          const img = document.createElement('img');
          img.src = getImageUrl(actor.profile_path, 'w185');
          avatar.appendChild(img);
        } else {
          avatar.textContent = actor.name.charAt(0);
        }

        const name = document.createElement('div');
        name.className = 'cast-name';
        name.textContent = actor.name;

        const char = document.createElement('div');
        char.className = 'cast-char';
        char.textContent = actor.character;

        item.appendChild(avatar);
        item.appendChild(name);
        item.appendChild(char);
        castGrid.appendChild(item);
      });
    } else {
      castGrid.innerHTML = '<p class="trailer-failed">No cast information available.</p>';
    }

    const trailerEl = document.getElementById('detail-trailer');
    const youtubeTrailer = videosData.results 
      ? videosData.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') 
      : null;

    if (youtubeTrailer) {
      const btn = document.createElement('button');
      btn.className = 'trailer-btn';
      btn.textContent = '▶ Watch Trailer';
      btn.onclick = () => window.open(`https://www.youtube.com/watch?v=${youtubeTrailer.key}`, '_blank');
      trailerEl.appendChild(btn);
    } else {
      trailerEl.innerHTML = '<p class="trailer-failed">Trailer unavailable.</p>';
    }

  } catch (error) {
    console.error("Failed to load details:", error);
    document.getElementById('detail-cast').innerHTML = '<p class="trailer-failed">Failed to load cast.</p>';
    document.getElementById('detail-trailer').innerHTML = '<p class="trailer-failed">Failed to load trailer.</p>';
  }
}

async function performSearch(query) {
  searchWrap.dataset.loading = 'true';
  statusBar.textContent = 'FETCHING…';

  if (controller) controller.abort();
  controller = new AbortController();

  try {
    if (cache.has(query)) {
      const cachedResults = cache.get(query);
      renderResults(cachedResults, query);
      searchWrap.dataset.loading = 'false';
      statusBar.textContent = `${cachedResults.length} RESULTS · CACHE HIT`;
      return;
    }

    const url = `${BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
    const data = await fetchJSON(url);
    
    const results = data.results || [];
    
    cache.set(query, results);
    
    renderResults(results, query);
    searchWrap.dataset.loading = 'false';
    statusBar.textContent = `${results.length} RESULTS · NETWORK`;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Search aborted');
      return;
    }
    console.error('Search failed:', error);
    searchWrap.dataset.loading = 'false';
    statusBar.textContent = 'ERROR FETCHING DATA';
    resultList.innerHTML = '';
  }
}

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = searchInput.value.trim();
  
  if (!q) {
    resultList.innerHTML = '';
    resultHeader.textContent = 'RESULTS';
    statusBar.textContent = 'READY';
    detailEmpty.style.display = 'flex';
    detailContent.classList.remove('visible');
    return;
  }

  debounceTimer = setTimeout(() => performSearch(q), 300);
});

searchInput.addEventListener('keydown', e => {
  const items = document.querySelectorAll('.result-item');
  if (items.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
    setActive(next);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
    setActive(prev);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeIndex >= 0) {
      const q = searchInput.value.trim();
      const list = cache.get(q) || []; 
      if(list.length > 0) selectMovie(activeIndex, list);
    }
  } else if (e.key === 'Escape') {
    searchInput.value = '';
    resultList.innerHTML = '';
    statusBar.textContent = 'CLEARED';
  }
});