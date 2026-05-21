import type { WordPressSite, GeneratedPost, WordPressPost, PublishStatus, WordPressCategory, NewCategoryData } from '../types';
import { addLog } from './loggingService';

const POSTS_PER_PAGE = 20; // Reduced from 250 to 20 to prevent Server Error 500 on shared hosting

/**
 * cleans the WordPress URL by removing trailing slashes, /wp-admin, and /wp-login.php
 */
export const cleanWordPressUrl = (url: string): string => {
    let cleaned = url.trim();
    // Remove /wp-admin and anything following it (case insensitive)
    cleaned = cleaned.replace(/\/wp-admin.*$/i, '');
    // Remove /wp-login.php and anything following it
    cleaned = cleaned.replace(/\/wp-login\.php.*$/i, '');
    // Remove trailing slashes
    return cleaned.replace(/\/+$/, '');
};

async function apiFetch(url: string, options: RequestInit) {
    const logData: {
        endpoint: string;
        method: string;
        requestPayload?: any;
    } = {
        endpoint: new URL(url).pathname,
        method: options.method || 'GET',
        requestPayload: options.body ? JSON.parse(options.body as string) : undefined
    };

    try {
        const response = await fetch(url, options);
        // Try to parse JSON, if fails, get text for error message
        const text = await response.text();
        let responseBody;
        try {
            responseBody = JSON.parse(text);
        } catch (e) {
            // If it's 500 and not JSON, it's likely a PHP fatal error page
            if (!response.ok) {
                 throw new Error(`Server Error (${response.status}): The WordPress site returned a non-JSON response. This usually means a plugin conflict or server timeout. Try reducing the 'Per Page' limit or check server logs.`);
            }
            responseBody = { message: 'Received non-JSON response from server.', raw: text.substring(0, 200) };
        }

        if (!response.ok) {
            const errorPrefix = responseBody.message || 'An unknown API error occurred';
            const errorMessage = `Request failed (Status ${response.status}): ${errorPrefix}`;
            addLog({ ...logData, status: response.status, error: errorMessage, response: responseBody });
            throw new Error(errorMessage);
        }
        
        addLog({ ...logData, status: response.status, response: responseBody });
        return responseBody;

    } catch (error) {
        if (error instanceof Error) {
             if (error.message.includes('Failed to fetch')) {
                 const errorMessage = `A network or CORS error occurred. Please check your Site URL (ensure it is NOT a wp-admin link) and .htaccess configuration.`;
                 addLog({ ...logData, error: errorMessage });
                 throw new Error(errorMessage);
             }
        }
        // Rethrow other errors (like from the response.ok check), which are already logged.
        throw error;
    }
}

async function fetchWithHeaders(url: string, options: RequestInit) {
  const logData:any = {
    endpoint: new URL(url).pathname,
    method: options.method || 'GET',
    requestPayload: options.body ? JSON.parse(options.body as string) : undefined
  };
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch(e) {
        if (!res.ok) {
             throw new Error(`Server Error (${res.status}): The WordPress site returned a non-JSON response.`);
        }
        body = { message: 'Received non-JSON response.', raw: text.substring(0, 100) };
    }

    const headers: Record<string,string> = {};
    res.headers.forEach((v,k) => headers[k.toLowerCase()] = v);
    if (!res.ok) {
      const errorPrefix = (body && body.message) ? body.message : 'An unknown API error occurred';
      const errMsg = `Request failed (Status ${res.status}): ${errorPrefix}`;
      addLog({ ...logData, status: res.status, error: errMsg, response: body, headers });
      throw new Error(errMsg);
    }
    addLog({ ...logData, status: res.status, response: body, headers });
    return { body, headers };
  } catch (err) {
    if (err instanceof Error && err.message.includes('Failed to fetch')) {
      const msg = `A network or CORS error occurred. Please check your Site URL (ensure it is NOT a wp-admin link) and .htaccess configuration.`;
      addLog({ ...logData, error: msg });
      throw new Error(msg);
    }
    throw err;
  }
}

export async function verifyConnection(site: WordPressSite): Promise<{ success: boolean; message: string }> {
  const baseUrl = cleanWordPressUrl(site.url);
  const endpoint = `${baseUrl}/wp-json/recipepress-ai/v1/verify-connection`;
  try {
    const data = await apiFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_token: site.siteToken }),
    });
    return { success: true, message: data.message };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'An unknown verification error occurred.' };
  }
}

export async function getPosts(site: WordPressSite): Promise<WordPressPost[]> {
  const baseUrl = cleanWordPressUrl(site.url);
  const allPosts: WordPressPost[] = [];
  let page = 1;
  const perPage = POSTS_PER_PAGE;
  const maxPages = 2000; // safety cap

  while (true) {
    const endpoint = `${baseUrl}/wp-json/recipepress-ai/v1/posts?page=${page}&per_page=${perPage}`;
    try {
      const { body: responseBody, headers } = await fetchWithHeaders(endpoint, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${site.siteToken}` }
      });

      // Resolve the batch for this page (support multiple shapes)
      let batch: any[] = [];
      if (Array.isArray(responseBody)) {
        // treat array as a page's batch (do NOT early-return)
        batch = responseBody;
      } else if (responseBody && Array.isArray(responseBody.posts)) {
        batch = responseBody.posts;
      } else if (responseBody && Array.isArray(responseBody.data)) {
        batch = responseBody.data;
      } else {
        const arr = responseBody ? Object.values(responseBody).find(v => Array.isArray(v)) : undefined;
        if (arr) batch = arr as any[];
      }

      if (!Array.isArray(batch)) {
        console.error('Invalid response structure for getPosts:', responseBody);
        throw new Error('Failed to fetch posts: unrecognized response format. Please ensure the plugin is updated or returns posts in a supported shape.');
      }
      
      // If we receive an empty batch of posts, it means we've reached the end.
      // This is the most reliable stop condition and prevents infinite loops.
      if (batch.length === 0) {
        break;
      }

      allPosts.push(...(batch as WordPressPost[]));

      // Pagination stop conditions: prefer header, then body, then batch length heuristic
      const totalPagesHeader = headers['x-wp-totalpages'] || headers['x-wp-total-pages'];
      const totalPagesFromHeader = totalPagesHeader ? parseInt(totalPagesHeader, 10) : NaN;
      const totalPagesFromBody = (responseBody && typeof responseBody.total_pages !== 'undefined') ? Number(responseBody.total_pages) : NaN;

      if (!isNaN(totalPagesFromHeader)) {
        if (page >= totalPagesFromHeader) break;
      } else if (!isNaN(totalPagesFromBody)) {
        if (page >= totalPagesFromBody) break;
      } else {
        // if batch is smaller than perPage -> last page
        if (batch.length < perPage) break;
      }

      page++;
      if (page > maxPages) throw new Error('Exceeded maximum page limit while fetching posts.');
    } catch (error) {
      console.error(`Failed to fetch page ${page} for site ${site.name}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch page ${page} for site ${site.url}: ${errorMessage}`);
    }
  }

  return allPosts;
}

export async function fetchSitemapPosts(site: WordPressSite): Promise<{ title: string; link: string }[]> {
    const baseUrl = cleanWordPressUrl(site.url);
    // Try to fetch post-sitemap.xml which is standard for Yoast/RankMath
    const sitemapUrl = `${baseUrl}/post-sitemap.xml`;
    
    try {
        const response = await fetch(sitemapUrl);
        if (!response.ok) {
            // If post-sitemap fails, try generic sitemap.xml
            const fallbackResponse = await fetch(`${baseUrl}/sitemap.xml`);
            if(!fallbackResponse.ok) {
                 throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
            }
            // Note: Parsing nested sitemaps recursively is out of scope for this simple fix, 
            // but fetching the main index might give us something if it lists posts directly.
            // For now, we assume standard post-sitemap structure or flat sitemap.
        }
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const urls = Array.from(xmlDoc.getElementsByTagName("url"));
        const posts = urls.map(urlNode => {
            const loc = urlNode.getElementsByTagName("loc")[0]?.textContent || "";
            if (!loc) return null;

            // Heuristic to extract a title from the slug since sitemaps often lack <title>
            // e.g., https://site.com/my-great-recipe/ -> "My Great Recipe"
            const slug = loc.split('/').filter(Boolean).pop() || "";
            // Replace hyphens with spaces and capitalize words
            const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            return {
                title: title, 
                link: loc
            };
        }).filter((p): p is { title: string; link: string } => p !== null && p.title.length > 3); // Basic filter for valid-looking titles
        
        return posts;
    } catch (error) {
        console.warn("Sitemap fetch failed. This is often due to CORS on the WordPress site. Internal linking will rely only on API results.", error);
        return [];
    }
}

export async function fetchCategories(site: WordPressSite): Promise<{ id: number; name: string }[]> {
    const baseUrl = cleanWordPressUrl(site.url);
    const endpoint = `${baseUrl}/wp-json/recipepress-ai/v1/categories`;
    try {
        const data = await apiFetch(endpoint, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${site.siteToken}` },
        });
        if (Array.isArray(data)) {
            return data.filter((c: any) => c.id && c.name).map((c: any) => ({ id: Number(c.id), name: String(c.name) }));
        }
        return [];
    } catch (error) {
        console.warn('Failed to fetch categories from site:', error);
        return [];
    }
}

export async function getPostContent(site: WordPressSite, postId: number): Promise<{ content: string, title: string }> {
    const baseUrl = cleanWordPressUrl(site.url);
    const endpoint = `${baseUrl}/wp-json/recipepress-ai/v1/post/${postId}`;
     return apiFetch(endpoint, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${site.siteToken}`,
        },
    });
}

export async function importRecipe(site: WordPressSite, targetPostId: number, postData: GeneratedPost, status: 'publish' | 'draft' = 'publish', generationType: 'full' | 'intro' | 'seo-article'): Promise<{ success: boolean; message: string; post_id: number; post_url: string; }> {
    const baseUrl = cleanWordPressUrl(site.url);
    const endpoint = `${baseUrl}/wp-json/recipepress-ai/v1/import`;

    try {
        const payload: any = {
            site_token: site.siteToken,
            target_post: targetPostId,
            post_status: status,
            generation_type: generationType,
            focus_keyword: postData.focus_keyword,
            meta_description: postData.meta_description,
            slug: postData.slug,
            ...postData,
        };

        if (postData.categories && postData.categories.length > 0) {
            payload.categories = postData.categories;
        }

        const responseData = await apiFetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        if (responseData.success) {
            return responseData;
        }

        throw new Error("Import failed: WordPress response did not indicate success.");
    
    } catch (error) {
        console.error(`Failed to import recipe to ${site.name}:`, error);
        if (error instanceof Error) {
            if (error.message.includes('A network or CORS error occurred')) {
                 throw new Error(`Could not connect to "${site.name}". ${error.message} Please use the 'Test Connection' button.`);
            }
            throw error;
        }
        throw new Error(`An unknown error occurred while importing the recipe to "${site.name}".`);
    }
}

export async function getCategories(site: WordPressSite): Promise<WordPressCategory[]> {
    const baseUrl = cleanWordPressUrl(site.url);
    const endpoint = `${baseUrl}/wp-json/wp/v2/categories?per_page=100`;
    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${site.siteToken}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            console.error(`Fetch categories failed with status ${response.status}`);
            return [];
        }
        return await response.json();
    } catch(e) {
        console.error("Failed to fetch categories", e);
        return [];
    }
}

export async function createCategory(site: WordPressSite, data: NewCategoryData): Promise<WordPressCategory> {
    const baseUrl = cleanWordPressUrl(site.url);
    const endpoint = `${baseUrl}/wp-json/wp/v2/categories`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${site.siteToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        let msg = 'Failed to create category';
        try {
            const err = await response.json();
            msg = err.message || msg;
        } catch {}
        throw new Error(msg);
    }
    return await response.json();
}

export async function updatePostCategory(site: WordPressSite, postId: number | string, categoryId: number): Promise<any> {
    const baseUrl = cleanWordPressUrl(site.url);
    const endpoint = `${baseUrl}/wp-json/wp/v2/posts/${postId}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${site.siteToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            categories: [categoryId]
        }),
    });
    if (!response.ok) {
        let msg = 'Failed to update category';
        try {
            const err = await response.json();
            msg = err.message || msg;
        } catch {}
        throw new Error(msg);
    }
    return await response.json();
}