/*
  Search Service – Google Programmable Search API wrapper
  ---------------------------------------------------
  Provides a simple function `search(query)` that returns an array of
  up‑to‑3 results (title, snippet, link).  The API key and Custom Search Engine ID
  are taken from environment variables:
    - GOOGLE_SEARCH_API_KEY – API key for the Custom Search JSON API
    - GOOGLE_SEARCH_CX      – Search engine identifier (cx)
  If the variables are missing, the service returns an empty array and logs a
  warning.  The function is async and can be used from any backend module.
*/

const fetch = require('node-fetch');

const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const CX = process.env.GOOGLE_SEARCH_CX; // Custom Search Engine ID

/**
 * Perform a web search using Google Custom Search JSON API.
 * @param {string} query - The user query.
 * @param {number} maxResults - Maximum number of results (default 3).
 * @returns {Promise<Array<{title:string, snippet:string, link:string}>>}
 */
async function search(query, maxResults = 3) {
  if (!API_KEY || !CX) {
    console.warn('[SearchService] Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX – web search disabled.');
    return [];
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.append('key', API_KEY);
  url.searchParams.append('cx', CX);
  url.searchParams.append('q', query);
  url.searchParams.append('num', maxResults.toString());

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`[SearchService] HTTP ${res.status} – ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    if (!data.items) return [];
    return data.items.map(item => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
    }));
  } catch (err) {
    console.error('[SearchService] Unexpected error:', err.message);
    return [];
  }
}

module.exports = { search };

