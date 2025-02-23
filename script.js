const lyricsDisplay = document.getElementById('lyrics-display');
const userGuess = document.getElementById('user-guess');
const submitGuess = document.getElementById('submit-guess');
const feedback = document.getElementById('feedback');
const genreSelect = document.getElementById('genre');
const wordFilter = document.getElementById('word-filter');
const applyFilters = document.getElementById('apply-filters');
const controlsContainer = document.getElementById('controls-container');
const fullLyricsElement = document.getElementById('full-lyrics');
const lyricsContent = document.getElementById('lyrics-content');
const filterStatus = document.getElementById('filter-status');
const resetFiltersButton = document.createElement('button');
resetFiltersButton.textContent = 'Deshacer filtros';
resetFiltersButton.id = 'reset-filters-button';
resetFiltersButton.style.display = 'none';
controlsContainer.appendChild(resetFiltersButton);
const switchModeButton = document.createElement('button');
switchModeButton.textContent = 'Cambiar a modo de rellenar letra';
switchModeButton.id = 'switch-mode-button';
controlsContainer.appendChild(switchModeButton);
const revealButton = document.createElement('button');
revealButton.textContent = 'Revelar respuestas';
revealButton.id = 'reveal-button';
revealButton.style.display = 'none';
controlsContainer.appendChild(revealButton);

document.addEventListener('DOMContentLoaded', () => {
  const lastFmApiKey = 'c02461157b7f2bb67aa1771a5eb40f33';

  let currentLyrics = '';
  let currentSongTitle = '';
  let currentArtist = '';
  let guessesLeft = 10;
  let displayedLines = new Set();
  let filtersApplied = false;
  let selectedGenre = '';
  let fillInTheBlanksMode = false;

  async function fetchRandomTopSong() {
    try {
      let response;
      if (!filtersApplied) {
        //Carga sin filtro
        response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${lastFmApiKey}&format=json&limit=500`);
      } else {
        //Carga con filtro
        response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${selectedGenre}&api_key=${lastFmApiKey}&format=json`);
      }
      
      const data = await response.json();
      const tracks = data.tracks.track;
      console.log('Listado canciones:', tracks);
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      console.log('Canción obtenida:', randomTrack);
      return { artist: randomTrack.artist.name, title: randomTrack.name };
    } catch (error) {
      console.error('Error pillando canción:', error);
      return null;
    }
  }  

  async function fetchLyrics(artist, title) {
    try {
      const response = await fetch(`https://api.lyrics.ovh/v1/${artist}/${title}`);
      const data = await response.json();
      console.log('Letra obtenida:', data.lyrics);
      return data.lyrics;
    } catch (error) {
      console.log('Error pillando letra');
      return null;
    }
  }

  async function fetchRandomLyrics() {
    let retries = 0;
    const maxRetries = 5;
    let song = null;
    let lyrics = null;

    while (retries < maxRetries) {
      song = await fetchRandomTopSong();
      if (song) {
        currentSongTitle = song.title;
        currentArtist = song.artist;
        lyrics = await fetchLyrics(song.artist, song.title);
        if (lyrics) {
          currentLyrics = lyrics;
          displayedLines.clear();

          if (fillInTheBlanksMode) {
            lyricsDisplay.innerHTML = getBlanksLine(currentLyrics);
          } else {
            lyricsDisplay.textContent = getRandomLine(currentLyrics);
          }

          fullLyricsElement.style.display = 'none';
          return;
        }
      }
      retries++;
      console.log(`Reintentando (${retries}/${maxRetries})`);
    }
    lyricsDisplay.textContent = 'No se ha podido cargar canción.';
  }

  function getRandomLine(lyrics) {
    const lines = lyrics.split('\n').filter(line => line.trim() !== '');
    let line;
    do {
      line = lines[Math.floor(Math.random() * lines.length)];
    } while (displayedLines.has(line) && displayedLines.size < lines.length);
    displayedLines.add(line);
    return line;
  }

  function getBlanksLine(lyrics) {
    const lines = lyrics.split('\n').filter(line => line.trim() !== '');
    let line;
    do {
      line = lines[Math.floor(Math.random() * lines.length)];
    } while (displayedLines.has(line) && displayedLines.size < lines.length);
    displayedLines.add(line);

    const words = line.split(/\s+/);
    let replacedCount = 0;

    for (let i = 0; i < words.length; i++) {
      if (words[i].length >= 4 && !words[i].match(/[^a-zA-Z]/) && !words[i - 1]?.includes('<input')) {
        words[i] = `<input type="text" class="blank-input" size="${words[i].length}" data-answer="${words[i].toLowerCase()}" placeholder="${'_'.repeat(words[i].length)}">`;
        replacedCount++;
      }

      if (replacedCount === 1) break;
    }

    return words.join(' ');
  }

  function checkGuess() {
    if (fillInTheBlanksMode) {
      const inputs = document.querySelectorAll('.blank-input');
      let allCorrect = true;
  
      inputs.forEach(input => {
        const userAnswer = input.value.trim().toLowerCase();
        const correctAnswer = input.getAttribute('data-answer');
  
        if (userAnswer === correctAnswer) {
          input.style.backgroundColor = '#d4edda';
        } else {
          input.style.backgroundColor = '#f8d7da';
          allCorrect = false;
        }
      });
  
      if (allCorrect) {
        feedback.textContent = '¡¡Correcto!! Completaste la letra.';
        showRestartButton();
        showFullLyrics();
      } else {
        guessesLeft--;
        feedback.textContent = `Incorrecto. Te quedan ${guessesLeft} intentos.`;
        if (guessesLeft === 0) {
          feedback.textContent = `¡Game over! La canción era "${currentSongTitle}" de "${currentArtist}".`;
          showRestartButton();
          showFullLyrics();
        }
      }
    } else {
      const guess = userGuess.value.trim().toLowerCase();
      if (guess === currentSongTitle.toLowerCase()) {
        feedback.textContent = '¡¡Correcto!! Adivinaste la canción.';
        showRestartButton();
        showFullLyrics();
      } else {
        guessesLeft--;
        feedback.textContent = `Incorrecto. Te quedan ${guessesLeft} intentos.`;
        if (guessesLeft === 0) {
          feedback.textContent = `Game over! La canción era "${currentSongTitle}" de "${currentArtist}".`;
          showRestartButton();
          showFullLyrics();
        } else {
          lyricsDisplay.textContent = getRandomLine(currentLyrics);
        }
      }
      userGuess.value = '';
    }
  }

  applyFilters.addEventListener('click', () => {
    filtersApplied = true;
    selectedGenre = genreSelect.value;

    filterStatus.textContent = `Filters aplicados: Género - ${selectedGenre}`;
    filterStatus.style.display = 'block';

    guessesLeft = 10;
    feedback.textContent = '';
    fetchRandomLyrics();
    resetFiltersButton.style.display = 'inline-block';
  });

  resetFiltersButton.addEventListener('click', () => {
    filtersApplied = false;
    guessesLeft = 10;
    feedback.textContent = '';
    filterStatus.textContent = '';
    filterStatus.style.display = 'none';

    fetchRandomLyrics();

    resetFiltersButton.style.display = 'none';
  });

  switchModeButton.addEventListener('click', () => {
    fillInTheBlanksMode = !fillInTheBlanksMode;

    switchModeButton.textContent = fillInTheBlanksMode ? 'Cambiar a modo de adivinar la canción' : 'Cambiar a modo de rellenar letra';

    guessesLeft = 10;
    feedback.textContent = '';
    userGuess.value = '';
    displayedLines.clear();

    fetchRandomLyrics();
  });

  function showRestartButton() {
    submitGuess.style.display = 'none';
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Reiniciar juego';
    restartButton.addEventListener('click', () => {
      guessesLeft = 10;
      feedback.textContent = '';
      userGuess.value = '';
      fetchRandomLyrics();
      restartButton.remove();
      submitGuess.style.display = 'inline-block';
      fullLyricsElement.style.display = 'none';
      revealButton.style.display = 'none';
    });
    controlsContainer.appendChild(restartButton);

    if (fillInTheBlanksMode) {
      revealButton.style.display = 'inline-block';
    }

    if (filtersApplied) {
      resetFiltersButton.style.display = 'inline-block';
    }
  }

  revealButton.addEventListener('click', () => {
    const inputs = document.querySelectorAll('.blank-input');
    inputs.forEach(input => {
      input.value = input.getAttribute('data-answer');
      input.style.backgroundColor = '#d4edda';
    });
    revealButton.style.display = 'none';
  });

  function showFullLyrics() {
    lyricsContent.textContent = currentLyrics;
    fullLyricsElement.style.display = 'block';
  }

  submitGuess.addEventListener('click', checkGuess);
  applyFilters.addEventListener('click', fetchRandomLyrics);
  fetchRandomLyrics();
});


