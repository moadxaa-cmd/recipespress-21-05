<?php
/**
 * RecipePress Blog AI - N8N Automation & Publishing Endpoint
 *
 * This script provides a secure API endpoint for N8N (or other services)
 * to generate recipe content via the Gemini API and then directly publish
 * it to a target WordPress site using the RecipePress Connector plugin.
 *
 * --- SETUP ---
 * 1. Place this file on a public PHP server (e.g., as `api.php`).
 * 2. Set the following environment variable on your server for security:
 *    - GEMINI_API_KEY: Your Google AI Gemini API key.
 *
 * --- N8N USAGE ---
 * 1.  Use the "HTTP Request" node in N8N with the POST method.
 * 2.  Set the URL to this script's location (e.g., https://your-server.com/api.php).
 * 3.  Set "Body Content Type" to "JSON" and provide a JSON object in the "Body".
 * 4.  The node will output the response from your WordPress site (e.g., success message and post URL).
 *
 * --- JSON BODY PARAMETERS ---
 * {
 *   "type_of_article": "seo_article" | "article&recipe" | "intro&recipe", (Default: "article&recipe")
 *   "keyword": "Keyword for generation (if recipe_text is empty)",
 *   "recipe_text": "Your ingredients/instructions to format",
 *   "category": "Optional category for the post",
 *   "feature_image_base64": "base64-encoded string for the main image",
 *   "image_base64": "base64-encoded string for a secondary/instructional image",
 *   "external_links": [{ "name": "Product Name", "link": "https://product.url" }], (Optional array of external links)
 *   "schema_markup": "faq&recipecard" | "faq" | "none", (Default: "faq&recipecard")
 *   "post_status": "publish" | "draft", (Default: "publish")
 *   "site_url": "REQUIRED: Your WordPress site URL (e.g., 'https://myblog.com')",
 *   "site_token": "REQUIRED: The Site Token from your RecipePress Connector plugin",
 *   "gemini_api_key": "Optionally override the server's Gemini key (NOT RECOMMENDED)",
 *   "language": "English" | "French" | "Spanish" | "German" (Default: "English")
 * }
 */

// --- HEADERS ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

// --- CONFIGURATION ---
$defaultGeminiApiKey = getenv('GEMINI_API_KEY') ?: '';

// --- FUNCTIONS ---

function send_error($statusCode, $message) {
    http_response_code($statusCode);
    echo json_encode(['error' => $message]);
    exit;
}

function fetchWordPressCategories($siteUrl, $siteToken) {
    $cleanedUrl = rtrim($siteUrl, '/');
    $endpoint = "{$cleanedUrl}/wp-json/recipepress-ai/v1/categories"; 
    
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [ 
        CURLOPT_RETURNTRANSFER => true, 
        CURLOPT_HTTPHEADER => ["Authorization: Bearer {$siteToken}"], 
        CURLOPT_TIMEOUT => 15 
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response && $httpCode === 200) {
        $data = json_decode($response, true);
        $categories = [];
        if (is_array($data)) {
            foreach ($data as $cat) {
                if (isset($cat['name']) && isset($cat['id'])) {
                    $categories[] = ['id' => $cat['id'], 'name' => $cat['name']];
                }
            }
        }
        return $categories;
    }
    return [];
}

function detectCategory($apiKey, $keyword, $recipeText, $categories) {
    if (empty($categories)) return [];

    $categoriesList = "";
    foreach ($categories as $cat) {
        $categoriesList .= "- {$cat['name']} (ID: {$cat['id']})\n";
    }

    $prompt = <<<EOD
Analyze the following recipe details and choose the best matching categories from the provided list.

Recipe Keyword/Title: "{$keyword}"
Recipe Excerpt: "{$recipeText}"

Available Categories:
{$categoriesList}

Your task is to identify the best fit. 
IMPORTANT SEO REQUIREMENT:
- You must select ONLY ONE category.
- Always choose the MOST SPECIFIC subcategory available (e.g., choose "Chocolate Cake" instead of "Desserts").
- Do NOT select parent categories if a specific child category fits.
- Do NOT select "All Recipes" or generic categories if something better exists.

Respond with a single JSON object containing an array with EXACTLY ONE numeric ID.
Example format: { "categoryIds": [123] }
EOD;

    $schema = [
        'type' => 'OBJECT',
        'properties' => [
            'categoryIds' => ['type' => 'ARRAY', 'items' => ['type' => 'INTEGER']]
        ],
        'required' => ['categoryIds']
    ];

    $model = 'gemini-3-flash-preview';
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
    $data = [
        'contents' => [['parts' => [['text' => $prompt]]]],
        'generationConfig' => ['responseMimeType' => 'application/json', 'responseSchema' => $schema]
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [ CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($data), CURLOPT_TIMEOUT => 60 ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response && $httpCode === 200) {
        $json = json_decode($response, true);
        $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
        $result = json_decode($text, true);
        return $result['categoryIds'] ?? [];
    }
    return [];
}

function fetchWordPressPosts($siteUrl, $siteToken) {
    $cleanedUrl = rtrim($siteUrl, '/');
    $endpoint = "{$cleanedUrl}/wp-json/recipepress-ai/v1/posts?per_page=20";
    
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [ 
        CURLOPT_RETURNTRANSFER => true, 
        CURLOPT_HTTPHEADER => ["Authorization: Bearer {$siteToken}"], 
        CURLOPT_TIMEOUT => 30 
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response && $httpCode === 200) {
        $data = json_decode($response, true);
        $posts = [];
        // Handle different response structures (array of posts or object with posts key)
        $rawPosts = isset($data['posts']) ? $data['posts'] : (is_array($data) ? $data : []);
        
        foreach ($rawPosts as $p) {
            if (isset($p['title']) && isset($p['link'])) {
                $posts[] = "- Title: \"{$p['title']}\", URL: \"{$p['link']}\"";
            }
        }
        return implode("\n", $posts);
    }
    return "";
}

function callGeminiApi($apiKey, $prompt, $includeFaq = false) {
    if (empty($apiKey)) throw new Exception("Gemini API Key is missing.");

    $model = 'gemini-3-flash-preview';
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

    // Detailed Nutrition Schema
    $nutritionSchema = [
        'type' => 'OBJECT',
        'properties' => [
            'servingSize' => ['type' => 'STRING'],
            'calories' => ['type' => 'STRING'],
            'sugarContent' => ['type' => 'STRING'],
            'sodiumContent' => ['type' => 'STRING'],
            'fatContent' => ['type' => 'STRING'],
            'saturatedFatContent' => ['type' => 'STRING'],
            'unsaturatedFatContent' => ['type' => 'STRING'],
            'transFatContent' => ['type' => 'STRING'],
            'carbohydrateContent' => ['type' => 'STRING'],
            'fiberContent' => ['type' => 'STRING'],
            'proteinContent' => ['type' => 'STRING'],
            'cholesterolContent' => ['type' => 'STRING'],
        ],
        'description' => 'Detailed nutrition information. Fill with realistic estimates.'
    ];

    // Aggregate Rating Schema
    $ratingSchema = [
        'type' => 'OBJECT',
        'properties' => [
            'ratingValue' => ['type' => 'STRING'],
            'ratingCount' => ['type' => 'INTEGER'],
        ],
        'description' => 'Aggregate rating for the recipe.'
    ];

    $schema = [ 'type' => 'OBJECT', 'properties' => [
            'post_title' => ['type' => 'STRING'], 'seo_title' => ['type' => 'STRING'],
            'meta_description' => ['type' => 'STRING'], 'excerpt' => ['type' => 'STRING'],
            'slug' => ['type' => 'STRING'],
            'post_content' => ['type' => 'STRING', 'description' => 'A well-written blog post in HTML format.'],
            'recipe_data' => [ 'type' => 'OBJECT', 'properties' => [
                    'name' => ['type' => 'STRING'], 'description' => ['type' => 'STRING'],
                    'prep_time' => ['type' => 'STRING'], 'cook_time' => ['type' => 'STRING'],
                    'total_time' => ['type' => 'STRING'], 'yield' => ['type' => 'STRING'],
                    'keywords' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                    'cuisine' => ['type' => 'STRING'], 'category' => ['type' => 'STRING'],
                    'ingredients' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                    'instructions' => [
                        'type' => 'ARRAY', 
                        'items' => [
                            'type' => 'STRING',
                            'description' => "A single, clear step in the recipe instructions. Each step must start with '<b>Step X:</b>' (or the equivalent in the requested language, e.g., '<b>Étape X:</b>'), where X is the step number."
                        ]
                    ],
                    'notes' => ['type' => 'STRING'], 'image_alt' => ['type' => 'STRING'],
                    'image_title' => ['type' => 'STRING'], 'image_description' => ['type' => 'STRING'],
                    'nutrition' => $nutritionSchema,
                    'aggregateRating' => $ratingSchema
                ], 'required' => ['name', 'description', 'prep_time', 'cook_time', 'yield', 'ingredients', 'instructions', 'image_alt', 'nutrition']
            ]
        ], 'required' => ['post_title', 'post_content', 'recipe_data']
    ];

    if ($includeFaq) {
        $schema['properties']['faqSchema'] = [ 'type' => 'OBJECT', 'properties' => [
                '@context' => ['type' => 'STRING'], '@type' => ['type' => 'STRING'],
                'mainEntity' => [ 'type' => 'ARRAY', 'items' => [ 'type' => 'OBJECT', 'properties' => [
                    '@type' => ['type' => 'STRING'], 'name' => ['type' => 'STRING'],
                    'acceptedAnswer' => [ 'type' => 'OBJECT', 'properties' => [
                        '@type' => ['type' => 'STRING'], 'text' => ['type' => 'STRING']
                    ], 'required' => ['@type', 'text']]
                ], 'required' => ['@type', 'name', 'acceptedAnswer']]]
        ]];
        $schema['required'][] = 'faqSchema';
    }

    $data = [
        'contents' => [['parts' => [['text' => $prompt]]]],
        'generationConfig' => ['responseMimeType' => 'application/json', 'responseSchema' => $schema]
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [ CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($data), CURLOPT_TIMEOUT => 180 ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $httpCode >= 400) throw new Exception("Gemini API error (HTTP {$httpCode}): {$response}");
    $responseData = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) throw new Exception("Failed to decode Gemini API JSON response.");
    $text = $responseData['candidates'][0]['content']['parts'][0]['text'] ?? null;
    if (!$text) throw new Exception("Could not extract text from Gemini API response.");
    $resultData = json_decode($text, true);
    if (json_last_error() !== JSON_ERROR_NONE) throw new Exception("Failed to decode JSON content from Gemini. Raw text: " . $text);

    $usageMetadata = $responseData['usageMetadata'] ?? [];

    return [
        'content' => $resultData,
        'usage' => $usageMetadata
    ];
}

function publishToWordPress($siteUrl, $siteToken, $postData) {
    $cleanedUrl = rtrim($siteUrl, '/');
    $endpoint = "{$cleanedUrl}/wp-json/recipepress-ai/v1/import";

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [ CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($postData), CURLOPT_TIMEOUT => 180 ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) throw new Exception("cURL Error publishing to WordPress.");
    $responseData = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) throw new Exception("Failed to decode WordPress response. HTTP Code: {$httpCode}. Response: " . substr($response, 0, 500));
    if ($httpCode >= 400) throw new Exception("WordPress API error (HTTP {$httpCode}): " . ($responseData['message'] ?? 'Unknown error.'));
    return $responseData;
}


// --- MAIN LOGIC ---

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') send_error(405, 'Method not allowed.');

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) send_error(400, 'Invalid JSON in request body.');

$p = [];
foreach ($input as $key => $value) { $p[str_replace(' ', '_', strtolower($key))] = $value; }

$keyword = trim($p['keyword'] ?? '');
$recipeText = trim($p['recipe_text'] ?? '');
$articleTypeRaw = trim($p['type_of_article'] ?? 'article&recipe');
$category = trim($p['category'] ?? $p['categorie'] ?? '');
$featureImgBase64 = $p['feature_image_base64'] ?? '';
$instructionImgBase64 = $p['image_base64'] ?? '';
$externalLinks = $p['external_links'] ?? [];
$schemaMarkup = trim($p['schema_markup'] ?? $p['shemamarkup'] ?? 'faq&recipecard');
$postStatus = in_array(trim($p['post_status'] ?? 'publish'), ['publish', 'draft']) ? trim($p['post_status'] ?? 'publish') : 'publish';
$siteUrl = trim($p['site_url'] ?? '');
$siteToken = trim($p['site_token'] ?? '');
$geminiApiKey = trim($p['gemini_api_key'] ?? $defaultGeminiApiKey);
$languageRaw = trim($p['language'] ?? 'English');

$language = 'English';
switch (strtolower($languageRaw)) {
    case 'french': case 'francais': case 'français': $language = 'French'; break;
    case 'spanish': case 'espanol': case 'español': case 'spain': $language = 'Spanish'; break;
    case 'german': case 'deutsch': case 'allemand': $language = 'German'; break;
    default: $language = 'English'; break;
}
$languageInstruction = "You MUST write the entire article and all fields in {$language}.";

if (empty($siteUrl) || empty($siteToken)) send_error(400, 'Missing required parameters: "site_url" and "site_token" must be provided.');
if (empty($keyword) && empty($recipeText)) send_error(400, 'Missing required parameter: either "keyword" or "recipe_text" must be provided.');

// Normalize article type for prompt logic
$articleType = str_replace(['&', ' '], ['_and_', ''], $articleTypeRaw);
$generationTypeForPlugin = 'full';
if ($articleType === 'seo_article' || $articleType === 'seoarticle') $generationTypeForPlugin = 'seo-article';
if ($articleType === 'intro_and_recipe' || $articleType === 'shortarticle') $generationTypeForPlugin = 'intro';

$includeFaq = (strpos($schemaMarkup, 'faq') !== false);
$faqInstruction = $includeFaq ? "You MUST also generate a valid 'faqSchema' object." : "You MUST NOT generate a 'faqSchema' object.";
$siteContext = "The post is for the website: {$siteUrl}.";

// Fetch available categories and build context
// Fetch available categories and detect best match (Multi-Category Support)
$availableCategories = [];
$detectedCategoryIds = [];
$detectedCategoryName = ""; // Primary category name for Schema

if (empty($category)) { // Only auto-detect if user didn't force a category
    try {
        $availableCategories = fetchWordPressCategories($siteUrl, $siteToken);
        if (!empty($availableCategories)) {
            $detectedCategoryIds = detectCategory($geminiApiKey, $keyword, $recipeText, $availableCategories);
            
            // Resolve the primary category name (use the last one detected as it's likely more specific, or the first one?)
            // Usually, Gemini might return [ParentID, ChildID]. The Child is more specific.
            // Let's pick the one with the longest name or just the last one in the list if sorted by specificness?
            // Safer: Pick the last ID returned as the "Primary" for Schema, assuming prompt order.
            // Even better: Iterate and find the name for the last ID.
            
            if (!empty($detectedCategoryIds)) {
                // FORCE SINGLE CATEGORY: Take the last one (assumed most specific due to prompt instructions or Gemini logic)
                $primaryId = end($detectedCategoryIds);
                $detectedCategoryIds = [ $primaryId ]; // Overwrite array to contain ONLY this one ID

                foreach ($availableCategories as $cat) {
                    if ($cat['id'] == $primaryId) {
                        $detectedCategoryName = $cat['name'];
                        break;
                    }
                }
            }
        }
    } catch (Exception $e) {
        error_log("Category detection failed: " . $e->getMessage());
    }
} else {
    $detectedCategoryName = $category; // Use user provided category
}

$categoryContext = "";
if (!empty($detectedCategoryName)) {
    $categoryContext = "The recipe category is '{$detectedCategoryName}'. You MUST set `recipe_data.category` to exactly '{$detectedCategoryName}'.";
} else {
    $categoryContext = "Assign the most appropriate category for this recipe.";
}

$externalLinksCount = is_array($externalLinks) ? count($externalLinks) : 0;
$linkingInstruction = "All external links MUST use `target=\"_blank\"`. Affiliate/commercial links MUST use `rel=\"nofollow\"`.";
$externalLinksContext = '';
if (!empty($externalLinks) && is_array($externalLinks)) {
    $externalLinksContext .= "You have been provided with a list of external links/products. You MUST intelligently incorporate {$externalLinksCount} of these into the article's content where they make sense. The available links are:\n";
    foreach ($externalLinks as $link) {
        if (isset($link['name']) && isset($link['link'])) {
            $externalLinksContext .= "- Product: \"{$link['name']}\", URL: \"{$link['link']}\"\n";
        }
    }
} else {
    $externalLinksContext = "You MUST NOT add any external links.";
}

// FETCH INTERNAL LINKS (New Logic)
$internalLinksList = "";
if ($generationTypeForPlugin !== 'intro') {
    try {
        $internalLinksList = fetchWordPressPosts($siteUrl, $siteToken);
    } catch (Exception $e) {
        error_log("Failed to fetch internal links: " . $e->getMessage());
    }
}

$internalLinkInstruction = "";
if (!empty($internalLinksList)) {
    $internalLinkInstruction = "- **Internal Links:** You MUST insert exactly 2 internal links. Use the provided list of available posts. List of available posts:\n{$internalLinksList}";
} else {
    $internalLinkInstruction = "- **Internal Links:** You MUST NOT add any internal links as none were provided.";
}


$prompt = '';
if ($generationTypeForPlugin === 'seo-article') {
    $prompt = <<<EOD
You are an expert SEO Recipe Article Writer.
Goal: Write a comprehensive, SEO-optimized recipe article (OVER 2000 WORDS) in {$language} following a strict structure.

**Primary Keyword / Recipe Concept:** "{$keyword}"

**Content Structure (You MUST use HTML tags <h2>, <h3>, <p>, <ol>, <ul>, <table>):**
1.  **Introduction (H2):** 150-200 words. Hook the reader immediately with short story. **MANDATORY:** The first sentence must contain "{$keyword}".
2.  **Why You’ll Love It (H2):** 100-150 words.
3.  **Ingredients (H2):** ≤200 words. (Include a sub-section for Notes/Substitutions as H3).
4.  **Equipment (H2):** ≤70 words.
5.  **Instructions (H2):** ≤400 words. Use HTML <ol> for steps.
6.  **Pro Tips (H2):** ≤130 words.
7.  **Serving, Storage & Variations (H2):** ≤150 words.
8.  **Nutrition Information (H2):** Create a clean HTML table for nutrition facts from the `recipe_data.nutrition` object, including Calories, Protein, Carbs, Fat, and an estimate disclaimer.
9.  **Conclusion (H2):** ≤100 words.


**CRITICAL NOTE:** Do NOT include an H1 tag in the HTML `post_content`. The `post_title` is for the H1. Do NOT generate an FAQ section in the HTML body; use the `faqSchema` object.

**SEO Focus:**
-   **SEO Title Rule:** The `seo_title` JSON field **MUST** start with "{$keyword}" and **MUST contain a number**.
-   **First Sentence Rule:** The content's first sentence **MUST** contain "{$keyword}".
-   **Keyword Density:** Use "{$keyword}" approximately **15-20 times**.
-   **Meta Description:** Create a compelling, SEO-optimized meta description (around 155 characters).
-   **Slug:** Short, focus keyword only.
-   **Short Paragraphs:** 2-3 sentences max.
-   **FAQ Schema:** A valid "FAQPage" JSON-LD object with 3-4 relevant questions and answers.

**Linking Requirements:**
{$internalLinkInstruction}
- **External Links:** {$externalLinksContext}
- {$linkingInstruction}

{$siteContext}
{$categoryContext}
{$faqInstruction}
{$languageInstruction}

TASK: Generate a complete blog post as a single, valid JSON object that strictly follows the schema.
EOD;

} elseif ($generationTypeForPlugin === 'intro') {
    $source = !empty($recipeText) ? "based on the following text: \"{$recipeText}\"" : "for the keyword: \"{$keyword}\".";
    $prompt = <<<EOD
Create a recipe post {$source}.
Generate a short, engaging, 2-paragraph introduction for 'post_content' in {$language}. Structure the recipe perfectly into the `recipe_data` object, completing any missing information.
{$siteContext} {$categoryContext}
{$languageInstruction}
Generate all required SEO fields: `seo_title` (must start with keyword and contain a number), `meta_description`, `slug`, and image metadata.
{$faqInstruction}
{$linkingInstruction} {$externalLinksContext}

CRITICAL: The entire output must be a single, valid JSON object following the schema.
EOD;

} else { // 'full' (article&recipe)
    $prompt = <<<EOD
You are an expert food blogger and SEO specialist AI. Your mission is to write a warm, engaging, and personal-story-driven recipe blog post of approximately 1500 WORDS in {$language}.

**Primary Keyword / Recipe Concept:** "{$keyword}"

**Article Structure (You MUST use HTML tags <h2>, <h3>, <p>, <ul>, <li>, <table>):**
1.  **Engaging short Introduction:** A personal, relatable story of at least ≤150 words.
2.  **Why This Recipe is a Must-Try (H2):** A bulleted list of 3-4 key points.
3.  **Key Ingredient Notes (H2):** Discuss 2-3 important ingredients.
4.  **Step-by-Step Guide with Pro Tips (H2):** A descriptive walkthrough of the recipe process.
5.  **Variations & Serving Suggestions (H2):** Creative ideas for adapting the recipe.
6.  **Nutrition Information (H2):** Create a clean HTML table for nutrition facts from the `recipe_data.nutrition` object.
7.  **Conclusion:** A short, friendly wrap-up.

**CRITICAL NOTE:** Do NOT include an H1 tag in the HTML `post_content`. Do NOT generate an FAQ section in the HTML body; use the `faqSchema` object.

**SEO & Linking Rules:**
-   **SEO Title:** The `seo_title` field **MUST** differ from the `post_title`, start with "{$keyword}", and **MUST contain a number**.
-   **First Sentence:** The article's first sentence **MUST** contain "{$keyword}" naturally.
-   **Slug:** Short, focus keyword only.
-   **Meta Description:** Create a compelling, SEO-optimized meta description (around 155 characters).
-   **Keyword Density:** Use "{$keyword}" about 1.5% of the time (approx. 20-25 times).
-   **FAQ Schema:** A valid "FAQPage" JSON-LD object with 3-4 relevant questions and answers.

-   **Linking:**
    {$internalLinkInstruction}
    - **External Links:** {$externalLinksContext}
    - {$linkingInstruction}

{$siteContext}
{$categoryContext}
{$faqInstruction}
{$languageInstruction}

TASK: Generate a complete blog post as a single, valid JSON object that strictly follows the schema.
EOD;
}

try {
    $geminiResponse = callGeminiApi($geminiApiKey, $prompt, $includeFaq);
    $geminiResult = $geminiResponse['content'];
    $usageData = $geminiResponse['usage'] ?? [];

    if (!empty($featureImgBase64)) $geminiResult['recipe_data']['image'] = $featureImgBase64;
    if (!empty($instructionImgBase64)) $geminiResult['recipe_data']['instruction_image'] = $instructionImgBase64;
    
    // Prepare payload for WordPress
    // Pass detected category IDs if available (supports multi-category assignment)
    $finalPayload = array_merge($geminiResult, [
        'site_token' => $siteToken,
        'target_post' => 0, // Always create a new post
        'post_status' => $postStatus,
        'generation_type' => $generationTypeForPlugin,
        'focus_keyword' => $keyword ?: ($geminiResult['post_title'] ?? '')
    ]);

    if (!empty($detectedCategoryIds)) {
        $finalPayload['categories'] = $detectedCategoryIds;
    }

    $wpResult = publishToWordPress($siteUrl, $siteToken, $finalPayload);

    // Calculate Costs (Gemini 2.5 Flash Pricing Estimation - Adjust as needed)
    // Pricing assumptions per 1M tokens: Input $0.15, Output $0.60 (Example rates)
    $inputTokens = $usageData['promptTokenCount'] ?? 0;
    $outputTokens = $usageData['candidatesTokenCount'] ?? 0;
    $totalTokens = $usageData['totalTokenCount'] ?? 0;
    
    // Cost calculation
    $costInput = ($inputTokens / 1000000) * 0.50;
    $costOutput = ($outputTokens / 1000000) * 3.00;
    $totalCost = $costInput + $costOutput;

    // Append usage and cost info to the final response
    if (is_array($wpResult)) { // Ensure wpResult is an array before appending
        $wpResult[] = [
            "model_used" => "gemini-3-flash-preview",
            "tokens_input" => $inputTokens,
            "tokens_output" => $outputTokens,
            "tokens_total" => $totalTokens,
            "tool_used" => "None",
            "cost_estimate" => "~$" . number_format($totalCost, 5)
        ];
    }

    http_response_code(200);
    echo json_encode($wpResult);
} catch (Exception $e) {
    error_log("N8N API Error: " . $e->getMessage());
    send_error(500, 'An error occurred. Check server logs for details. Message: ' . $e->getMessage());
}


?>
