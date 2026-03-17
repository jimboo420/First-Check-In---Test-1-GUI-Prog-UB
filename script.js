class SearchComponent {
  constructor(inputSelector, listSelector) {
    this.input = document.querySelector(inputSelector);
    this.list = document.querySelector(listSelector);
    this.template = document.getElementById('movie-template');
    
    this.cache = new Map(); 
    
    this.timerId = null; 
    this.apiKey = '28487f78ee09a45ef3ca72bdf4957ccd'; 
    
    this.init();
  }

  init() {
    this.input.addEventListener('input', (e) => this.handleInput(e.target.value));
  }

  handleInput(query) {
    if (!query.trim()) {
      this.list.innerHTML = '';
      return;
    }

    if (this.timerId) {
      clearTimeout(this.timerId);
    }

    this.timerId = setTimeout(() => {
      this.fetchResults(query);
    }, 300);
  }

  async fetchResults(query) {
    if (this.cache.has(query)) {
      console.log('Cache hit!', query);
      this.renderResults(this.cache.get(query));
      return;
    }

    this.setLoading(true);

    try {
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(query)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      const results = data.results || [];

      // Save to Cache
      this.cache.set(query, results);

      this.renderResults(results);
    } catch (error) {
      console.error('Fetch failed:', error);
      this.list.innerHTML = '<li>Error loading results.</li>';
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(isLoading) {
    this.input.parentElement.setAttribute('data-loading', isLoading);
  }

  renderResults(movies) {
    this.list.innerHTML = '';
    
    if (movies.length === 0) {
      this.list.innerHTML = '<li>No results found.</li>';
      return;
    }

    movies.forEach(movie => {
      const li = document.createElement('li');
      li.textContent = movie.title; 
      this.list.appendChild(li);
    });
  }
}

const app = new SearchComponent('#search-input', '#results-list');