/**
 * Pinterest Research Service
 * Uses a pool of Pinterest accounts (session cookies) to query
 * Pinterest's internal API for keyword research and pin annotations.
 * Auto-rotates accounts if one gets banned or rate-limited.
 */

import fs from 'fs';
import path from 'path';


// ─── Types ────────────────────────────────────────────────────────────────────

export interface PinterestResearchAccount {
  id: string;
  label: string;           // friendly name e.g. "Account #1"
  cookie: string;          // full cookie string from browser
  csrfToken: string;       // x-csrftoken header value
  status: 'active' | 'banned' | 'rate_limited';
  addedAt: string;
  lastUsedAt: string | null;
  failCount: number;
}

export interface KeywordResult {
  keyword: string;
  relatedTerms: string[];
  guides: string[];
  rawData: any;
}

export interface PinAnnotation {
  pinId: string;
  title: string;
  description: string;
  annotations: string[];   // visual_annotation — the hidden interest tags
  interests: string[];
  dominantColor: string;
  createdAt: string;
}

// ─── Account Pool Storage ─────────────────────────────────────────────────────
// Stored in a local JSON file (swap for a real DB later)

const ACCOUNTS_FILE = path.join(process.cwd(), 'data', 'pinterest-accounts.json');

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function loadAccounts(): PinterestResearchAccount[] {
  ensureDataDir();
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: PinterestResearchAccount[]): void {
  ensureDataDir();
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

export function addAccount(label: string, cookie: string, csrfToken: string): PinterestResearchAccount {
  const accounts = loadAccounts();
  const newAccount: PinterestResearchAccount = {
    id: crypto.randomUUID(),
    label,
    cookie,
    csrfToken,
    status: 'active',
    addedAt: new Date().toISOString(),
    lastUsedAt: null,
    failCount: 0,
  };
  accounts.push(newAccount);
  saveAccounts(accounts);
  return newAccount;
}

export function removeAccount(id: string): void {
  const accounts = loadAccounts().filter(a => a.id !== id);
  saveAccounts(accounts);
}

export function updateAccountStatus(id: string, status: PinterestResearchAccount['status']): void {
  const accounts = loadAccounts();
  const acc = accounts.find(a => a.id === id);
  if (acc) {
    acc.status = status;
    saveAccounts(accounts);
  }
}

// ─── Account Rotation ─────────────────────────────────────────────────────────

function getActiveAccount(): PinterestResearchAccount | null {
  const accounts = loadAccounts();
  const active = accounts.filter(a => a.status === 'active');
  if (active.length === 0) return null;
  // Pick the one used least recently
  return active.sort((a, b) => {
    if (!a.lastUsedAt) return -1;
    if (!b.lastUsedAt) return 1;
    return new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime();
  })[0];
}

function markAccountUsed(id: string) {
  const accounts = loadAccounts();
  const acc = accounts.find(a => a.id === id);
  if (acc) {
    acc.lastUsedAt = new Date().toISOString();
    saveAccounts(accounts);
  }
}

function handleAccountFailure(id: string) {
  const accounts = loadAccounts();
  const acc = accounts.find(a => a.id === id);
  if (acc) {
    acc.failCount = (acc.failCount || 0) + 1;
    // After 3 consecutive failures, mark as banned
    if (acc.failCount >= 3) {
      acc.status = 'banned';
      console.warn(`[PinterestResearch] Account "${acc.label}" marked as banned after ${acc.failCount} failures`);
    }
    saveAccounts(accounts);
  }
}

export interface PinterestUserProfile {
  username: string;
  fullName: string;
  bio: string;
  imageUrl: string;
  followerCount: number;
  profileViews: number;
  pinCount: number;
  boardCount: number;
  isVerified: boolean;
  websiteUrl: string;
}

export interface PinSearchResult {
  pinId: string;
  title: string;
  description: string;
  imageUrl: string;
  domain: string;
  createdAt: string;
  repinCount: number;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  isRepin: boolean;
  hasRecipe: boolean;
  pinner: {
    username: string;
    fullName: string;
    imageUrl: string;
  };
}

export interface PinterestBoardInfo {
  boardId: string;
  name: string;
  url: string;
  description: string;
  followerCount: number;
  pinCount: number;
  collaboratorCount: number;
}

function resetAccountFailCount(id: string) {
  const accounts = loadAccounts();
  const acc = accounts.find(a => a.id === id);
  if (acc) {
    acc.failCount = 0;
    saveAccounts(accounts);
  }
}

// ─── Pinterest Internal API Calls ─────────────────────────────────────────────

const BASE_HEADERS = {
  'x-requested-with': 'XMLHttpRequest',
  'x-app-version': 'e4c5ab4',
  'x-pinterest-pws-handler': 'www/search/pins.js',
  'accept': 'application/json, text/javascript, */*; q=0.01',
  'accept-language': 'en-US,en;q=0.9',
  'accept-encoding': 'gzip, deflate, br',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'referer': 'https://www.pinterest.com/',
  'origin': 'https://www.pinterest.com',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
};

// ─── Pinterest Internal API Calls ─────────────────────────────────────────────
async function makeRequest(url: string, account: PinterestResearchAccount): Promise<any> {
  console.log('### INSIDE makeRequest ###'); const { gotScraping } = await import('got-scraping');
  const response = await gotScraping({
    url,
    headers: {
      ...BASE_HEADERS,
      'cookie': account.cookie,
      'x-csrftoken': account.csrfToken,
    },
    headerGeneratorOptions: {
      browsers: ['chrome'],
      operatingSystems: ['windows'],
      devices: ['desktop'],
    },
    followRedirect: true,
    throwHttpErrors: false,
  });

  const finalUrl = response.url || '';
  if (finalUrl.includes('/login') || finalUrl.includes('/auth/')) {
    throw new Error('AUTH_FAILED');
  }

  if (response.statusCode === 401 || response.statusCode === 403) {
    throw new Error('AUTH_FAILED');
  }
  if (response.statusCode === 429) {
    throw new Error('RATE_LIMITED');
  }
  if (response.statusCode >= 400) {
    throw new Error(`HTTP_ERROR_${response.statusCode}`);
  }

  const contentType = (typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : '') || '';
  if (contentType.includes('text/html')) {
    throw new Error('PINTEREST_RETURNED_HTML');
  }

  const text = typeof response.body === 'string' ? response.body : response.body?.toString() || '';

  if (!text || text.trim() === '') {
    throw new Error('EMPTY_RESPONSE');
  }

  const trimmed = text.trim().toLowerCase();
  if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
    throw new Error('PINTEREST_RETURNED_HTML');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('INVALID_JSON_RESPONSE');
  }
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

function isRetryableError(msg: string): boolean {
  return msg === 'AUTH_FAILED' || msg === 'RATE_LIMITED';
}

function handleError(id: string, msg: string) {
  handleAccountFailure(id);
  if (msg === 'AUTH_FAILED') updateAccountStatus(id, 'banned');
  else if (msg === 'RATE_LIMITED') updateAccountStatus(id, 'rate_limited');
}

// ─── Keyword Research ─────────────────────────────────────────────────────────

export async function searchPinterestKeywords(query: string): Promise<KeywordResult> {
  const account = getActiveAccount();
  if (!account) throw new Error('NO_ACTIVE_ACCOUNTS');

  const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?` + new URLSearchParams({
    source_url: `/search/pins/?q=${encodeURIComponent(query)}&rs=typed`,
    data: JSON.stringify({
      options: {
        query,
        scope: 'pins',
        auto_correction_disabled: false,
        top_pin_id: '',
        filters: {},
        source_module_id: null,
      },
      context: {}
    }),
    _: Date.now().toString(),
  });

  try {
    markAccountUsed(account.id);
    const data = await makeRequest(url, account);
    resetAccountFailCount(account.id);

    const resourceData = data?.resource_response?.data;
    const results = resourceData?.results || [];
    const guides = resourceData?.guides || [];

    // Extract related search terms from the guides/suggestions
    const relatedTerms: string[] = guides
      .map((g: any) => g?.name || g?.term || '')
      .filter(Boolean)
      .slice(0, 20);

    return {
      keyword: query,
      relatedTerms,
      guides: guides.map((g: any) => g?.name || g?.term || '').filter(Boolean),
      rawData: resourceData,
    };

  } catch (err: any) {
    handleError(account.id, err.message);
    if (isRetryableError(err.message)) return searchPinterestKeywords(query);
    throw err;
  }
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(username: string): Promise<PinterestUserProfile> {
  const account = getActiveAccount();
  if (!account) throw new Error('NO_ACTIVE_ACCOUNTS');

  const url = `https://www.pinterest.com/resource/UserResource/get/?` + new URLSearchParams({
    source_url: `/${username}/`,
    data: JSON.stringify({
      options: { username, field_set_key: 'profile' },
      context: {}
    }),
    _: Date.now().toString(),
  });

  try {
    markAccountUsed(account.id);
    const data = await makeRequest(url, account);
    resetAccountFailCount(account.id);

    const user = data?.resource_response?.data;
    if (!user) throw new Error('USER_NOT_FOUND');

    return {
      username: user.username || username,
      fullName: user.full_name || '',
      bio: user.about || '',
      imageUrl: user.image_xlarge_url || user.image_large_url || '',
      followerCount: user.follower_count || 0,
      profileViews: user.profile_views || 0,
      pinCount: user.pin_count || 0,
      boardCount: user.board_count || 0,
      isVerified: user.is_verified_merchant || user.verified_identity?.verified || false,
      websiteUrl: user.website_url || user.domain_url || '',
    };
  } catch (err: any) {
    handleError(account.id, err.message);
    if (isRetryableError(err.message)) return getUserProfile(username);
    throw err;
  }
}

// ─── User Pins (paginated) ───────────────────────────────────────────────────

export async function getUserPins(
  username: string,
  bookmark?: string
): Promise<{ pins: PinSearchResult[]; bookmark: string | null }> {
  const account = getActiveAccount();
  if (!account) throw new Error('NO_ACTIVE_ACCOUNTS');

  const options: any = { username, field_set_key: 'grid_item' };
  if (bookmark) options.bookmarks = [bookmark];

  const url = `https://www.pinterest.com/resource/UserPinsResource/get/?` + new URLSearchParams({
    source_url: `/${username}/pins/`,
    data: JSON.stringify({ options, context: {} }),
    _: Date.now().toString(),
  });

  try {
    markAccountUsed(account.id);
    const data = await makeRequest(url, account);
    resetAccountFailCount(account.id);

    const results = data?.resource_response?.data || [];
    const nextBookmark = data?.resource_response?.bookmark || null;

    const pins: PinSearchResult[] = results.map((pin: any) => ({
      pinId: pin.id || '',
      title: pin.title || pin.grid_title || '',
      description: pin.description || '',
      imageUrl: pin.images?.orig?.url || pin.images?.['236x']?.url || '',
      domain: pin.domain || '',
      createdAt: pin.created_at || '',
      repinCount: pin.repin_count || 0,
      reactionCount: pin.reaction_counts?.total || 0,
      commentCount: pin.comment_count || 0,
      shareCount: pin.share_count || 0,
      isRepin: pin.is_repin || false,
      hasRecipe: !!(pin.rich_summary?.type_name === 'recipe'),
      pinner: {
        username: pin.pinner?.username || username,
        fullName: pin.pinner?.full_name || '',
        imageUrl: pin.pinner?.image_small_url || '',
      },
    }));

    return { pins, bookmark: nextBookmark === '-end-' ? null : nextBookmark };
  } catch (err: any) {
    handleError(account.id, err.message);
    if (isRetryableError(err.message)) return getUserPins(username, bookmark);
    throw err;
  }
}

// ─── User Boards ──────────────────────────────────────────────────────────────

export async function getUserBoards(username: string): Promise<PinterestBoardInfo[]> {
  const account = getActiveAccount();
  if (!account) throw new Error('NO_ACTIVE_ACCOUNTS');

  const url = `https://www.pinterest.com/resource/BoardsResource/get/?` + new URLSearchParams({
    source_url: `/${username}/boards/`,
    data: JSON.stringify({
      options: { username, field_set_key: 'detailed', sort: 'custom' },
      context: {}
    }),
    _: Date.now().toString(),
  });

  try {
    markAccountUsed(account.id);
    const data = await makeRequest(url, account);
    resetAccountFailCount(account.id);

    const boards = data?.resource_response?.data || [];
    return boards.map((b: any) => ({
      id: b.id || '',
      name: b.name || '',
      description: b.description || '',
      pinCount: b.pin_count || 0,
      imageUrl: b.image_cover_url || b.images?.['60x60']?.url || '',
      url: b.url || `/${username}/${b.slug}/`,
    }));
  } catch (err: any) {
    handleError(account.id, err.message);
    if (isRetryableError(err.message)) return getUserBoards(username);
    throw err;
  }
}


export async function getPinterestKeywordSuggestions(query: string): Promise<string[]> {
  const account = getActiveAccount();
  if (!account) throw new Error('NO_ACTIVE_ACCOUNTS');

  const url = 'https://www.pinterest.com/resource/SearchAutocompletionsResource/get/?' + new URLSearchParams({
    source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
    data: JSON.stringify({
      options: { term: query, scope: 'pins', in_search_bar: true },
      context: {},
    }),
    _: Date.now().toString(),
  });

  try {
    markAccountUsed(account.id);
    const data = await makeRequest(url, account);
    resetAccountFailCount(account.id);
    const completions = data?.resource_response?.data?.auto_completions || [];
    return completions.map((s: any) => s?.term || '').filter(Boolean);
  } catch (err: any) {
    handleError(account.id, err.message);
    if (isRetryableError(err.message)) return getPinterestKeywordSuggestions(query);
    throw err;
  }
}

export async function getPinAnnotations(pinId: string): Promise<any> {
  const account = getActiveAccount();
  if (!account) throw new Error('NO_ACTIVE_ACCOUNTS');

  const url = 'https://www.pinterest.com/resource/PinResource/get/?' + new URLSearchParams({
    source_url: `/pin/${pinId}/`,
    data: JSON.stringify({
      options: { id: pinId, field_set_key: 'detailed', fetch_visual_search: true },
      context: {},
    }),
    _: Date.now().toString(),
  });

  try {
    markAccountUsed(account.id);
    const data = await makeRequest(url, account);
    resetAccountFailCount(account.id);

    const pin = data?.resource_response?.data;
    if (!pin) throw new Error('PIN_NOT_FOUND');

    const annotations: string[] = (pin?.pin_join?.visual_annotation || [])
      .map((a: any) => a?.term || a?.display_name || a)
      .filter((a: any) => typeof a === 'string' && a.length > 0);

    const interests: string[] = (pin?.interest_tags || [])
      .map((t: any) => t?.name || t?.display_name || '')
      .filter(Boolean);

    return {
      pinId,
      title: pin?.title || '',
      description: pin?.description || '',
      annotations,
      interests,
      dominantColor: pin?.dominant_color || '',
      createdAt: pin?.created_at || '',
    };
  } catch (err: any) {
    handleError(account.id, err.message);
    if (isRetryableError(err.message)) return getPinAnnotations(pinId);
    throw err;
  }
}

export async function getPinterestTrending(): Promise<string[]> {
  const account = getActiveAccount();
  if (!account) throw new Error('NO_ACTIVE_ACCOUNTS');

  const url = 'https://www.pinterest.com/resource/TrendingSearchesResource/get/?' + new URLSearchParams({
    data: JSON.stringify({
      options: { region: 'US', trend_type: 'monthly' },
      context: {}
    }),
    _: Date.now().toString(),
  });

  try {
    markAccountUsed(account.id);
    const data = await makeRequest(url, account);
    resetAccountFailCount(account.id);
    const trends = data?.resource_response?.data?.trends || [];
    return trends.map((t: any) => t?.term || '').filter(Boolean);
  } catch (err: any) {
    handleError(account.id, err.message);
    if (isRetryableError(err.message)) return getPinterestTrending();
    throw err;
  }
}

export async function searchPinsDetailed(
  query: string,
  filters?: { minRepins?: number; domain?: string },
  bookmark?: string,
): Promise<{ pins: any[]; bookmark: string | null }> {
  console.log('==> searchPinsDetailed called with query:', query);
  const account = getActiveAccount();
  if (!account) throw new Error('NO_ACTIVE_ACCOUNTS');

  const options: any = {
    query,
    scope: 'pins',
    auto_correction_disabled: false,
    top_pin_id: '',
    filters: {},
    source_module_id: null,
    page_size: 25,
  };
  if (bookmark) options.bookmarks = [bookmark];

  const url = 'https://www.pinterest.com/resource/BaseSearchResource/get/?' + new URLSearchParams({
    source_url: `/search/pins/?q=${encodeURIComponent(query)}&rs=typed`,
    data: JSON.stringify({ options, context: {} }),
    _: Date.now().toString(),
  });

  try {
    markAccountUsed(account.id);
    const data = await makeRequest(url, account);
    console.log('PIN SEARCH DATA =>', JSON.stringify(data).substring(0, 300));
    resetAccountFailCount(account.id);

    const results: any[] = data?.resource_response?.data?.results || [];
    const nextBookmark: string | null = data?.resource_response?.bookmark || null;

    let pins: any[] = results
      .filter((r: any) => r?.id)
      .map((pin: any) => {
        let totalReactions = 0;
        if (pin.reaction_counts) {
          totalReactions = typeof pin.reaction_counts === 'number'
            ? pin.reaction_counts
            : Object.values(pin.reaction_counts as Record<string, number>)
                .reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
        }
        return {
          pinId: pin.id,
          title: pin.title || pin.grid_title || '',
          description: pin.description || '',
          imageUrl: pin.images?.orig?.url || pin.images?.['736x']?.url || pin.images?.['236x']?.url || '',
          domain: pin.domain || '',
          createdAt: pin.created_at || '',
          repinCount: pin.repin_count || 0,
          reactionCount: totalReactions,
          commentCount: pin.comment_count || 0,
          shareCount: pin.share_count || 0,
          isRepin: pin.is_repin || false,
          hasRecipe: !!(pin.rich_summary?.type_name === 'recipe' || pin.recipe_annotations),
          pinner: {
            username: pin.pinner?.username || '',
            fullName: pin.pinner?.full_name || '',
            imageUrl: pin.pinner?.image_small_url || '',
          },
        };
      });

    if (filters?.minRepins) pins = pins.filter(p => p.repinCount >= filters.minRepins);
    if (filters?.domain) pins = pins.filter(p => p.domain.toLowerCase().includes(filters.domain.toLowerCase()));

    return { pins, bookmark: nextBookmark === '-end-' ? null : nextBookmark };
  } catch (err: any) {
    handleError(account.id, err.message);
    if (isRetryableError(err.message)) return searchPinsDetailed(query, filters, bookmark);
    throw err;
  }
}
