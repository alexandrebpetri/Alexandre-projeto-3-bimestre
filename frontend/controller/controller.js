import { Game } from './table.js';

export let games = [];

export function loadGamesFromAPI() {
    return fetch('http://127.0.0.1:3000/games')
//  return fetch('https://jurassic-hub-api.onrender.com/games') // Altere a URL se estiver em produção
    .then(response => {
      if (!response.ok) {
        throw new Error('Erro ao carregar os jogos da API');
      }
      return response.json();
    })
    .then(data => {
      games = data.map(item => new Game(item));
    })
    .catch(error => {
      console.error('Erro ao carregar os jogos:', error);
    });
}
