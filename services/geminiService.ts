
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { GeneratedPost, ArticleAgentSettings, ImageConfiguration, RecipeData, AdminSettings } from '../types';

// A helper function to safely parse JSON, stripping markdown backticks
function safeJsonParse(jsonString: string, context: string): any {
    // Sometimes the model wraps the JSON in markdown backticks, with or without `json`
    const cleanedString = jsonString.trim().replace(/^```(json)?\s*/, '').replace(/\s*```$/, '').trim();
    try {
        return JSON.parse(cleanedString);
    } catch (e) {
        console.error(`JSON parsing error in ${context}:`, e);
        console.error("Malformed JSON string received from AI:", cleanedString);
        throw new Error(`AI returned malformed JSON for ${context}. Please try again. The raw response was logged to the console.`);
    }
}

async function extractTitleFromText(apiKey: string, text: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analyze the following recipe text and determine the most appropriate and SEO-friendly title for it. Respond with ONLY the title and nothing else.\n\nTEXT:\n${text}`;
    
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
    });

    return response.text.trim().replace(/^"|"$/g, ''); // Also remove quotes just in case
}


// Schemas define the expected JSON structure from the AI model.

const nutritionDataSchema = {
    type: Type.OBJECT,
    properties: {
        servingSize: { type: Type.STRING, description: "The serving size, e.g., '1 slice' or '1 cup'." },
        calories: { type: Type.STRING, description: "Calories per serving, e.g., '250 kcal'." },
        sugarContent: { type: Type.STRING, description: "Sugar content per serving, e.g., '10g'." },
        sodiumContent: { type: Type.STRING, description: "Sodium content per serving, e.g., '300mg'." },
        fatContent: { type: Type.STRING, description: "Total fat content per serving, e.g., '15g'." },
        saturatedFatContent: { type: Type.STRING, description: "Saturated fat content per serving, e.g., '5g'." },
        unsaturatedFatContent: { type: Type.STRING, description: "Unsaturated fat content per serving, e.g., '8g'." },
        transFatContent: { type: Type.STRING, description: "Trans fat content per serving, e.g., '0g'." },
        carbohydrateContent: { type: Type.STRING, description: "Carbohydrates per serving, e.g., '30g'." },
        fiberContent: { type: Type.STRING, description: "Fiber content per serving, e.g., '4g'." },
        proteinContent: { type: Type.STRING, description: "Protein content per serving, e.g., '12g'." },
        cholesterolContent: { type: Type.STRING, description: "Cholesterol content per serving, e.g., '60mg'." },
    },
    description: "Detailed nutrition information. The AI must fill out as many of these fields as possible with realistic estimates.",
};

const aggregateRatingSchema = {
    type: Type.OBJECT,
    properties: {
        ratingValue: { type: Type.STRING, description: "The average rating value, e.g., '4.8'." },
        ratingCount: { type: Type.INTEGER, description: "The total number of ratings, e.g., 75." },
    },
    description: "The aggregate rating for the recipe. The AI should generate plausible, realistic values."
};

const recipeDataSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "The name of the recipe itself." },
        description: { type: Type.STRING, description: "A brief, one-sentence summary of the recipe." },
        prep_time: { type: Type.STRING, description: "Preparation time as a simple string (e.g., '15 minutes')." },
        cook_time: { type: Type.STRING, description: "Cooking time as a simple string (e.g., '25 minutes')." },
        total_time: { type: Type.STRING, description: "Total time as a simple string (e.g., '40 minutes')." },
        yield: { type: Type.STRING, description: "The number of servings the recipe yields (e.g., '4-6 servings' or '12 cookies')." },
        keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 3-5 relevant keywords for SEO." },
        cuisine: { type: Type.STRING, description: "The cuisine type (e.g., 'Italian', 'Mexican')." },
        category: { type: Type.STRING, description: "The recipe category (e.g., 'Main Course', 'Dessert')." },
        method: { type: Type.STRING, description: "The cooking method, e.g., 'Baking', 'Grilling'." },
        diet: { type: Type.STRING, description: "The diet type, e.g., 'Vegetarian', 'Gluten-Free'." },
        nutrition: nutritionDataSchema,
        aggregateRating: aggregateRatingSchema,
        ingredients: { type: Type.ARRAY, items: { type: Type.STRING, description: "A single ingredient, including amount and name (e.g., '2 cups all-purpose flour')." } },
        instructions: { type: Type.ARRAY, items: { type: Type.STRING, description: "A single, clear step in the recipe instructions. Each step must start with 'Step X:' in bold (using HTML bold tags), where X is the step number (e.g., '<b>Step 1:</b> Mix the flour...')." } },
        notes: { type: Type.STRING, description: "Optional notes, tips, or variations for the recipe." },
        image_alt: { type: Type.STRING, description: "SEO-optimized alt text for the featured image, incorporating the focus keyword." },
        image_title: { type: Type.STRING, description: "A descriptive, SEO-friendly title for the featured image file." },
        image_description: { type: Type.STRING, description: "A short paragraph describing the image for the media library." },
    },
    required: ["name", "description", "prep_time", "cook_time", "total_time", "yield", "keywords", "cuisine", "category", "ingredients", "instructions", "image_alt", "image_title", "image_description", "nutrition"],
};

// Base schema for a simple post with just an intro
const recipeWithIntroSchema = {
    type: Type.OBJECT,
    properties: {
        post_title: { type: Type.STRING },
        seo_title: { type: Type.STRING, description: "Optimized SEO title. MUST contain a number." },
        meta_description: { type: Type.STRING },
        excerpt: { type: Type.STRING },
        slug: { type: Type.STRING },
        post_content: { type: Type.STRING },
        recipe_data: recipeDataSchema,
    },
    required: ["post_title", "seo_title", "meta_description", "excerpt", "slug", "post_content", "recipe_data"],
};

// Schema for the FAQPage JSON-LD object.
const faqPageSchema = {
    type: Type.OBJECT,
    description: "A valid 'FAQPage' JSON-LD object with 3-4 relevant questions and answers about the recipe. This must follow the structure provided in the example.",
    properties: {
        '@context': { type: Type.STRING, description: "Should be 'https://schema.org'" },
        '@type': { type: Type.STRING, description: "Should be 'FAQPage'" },
        mainEntity: {
            type: Type.ARRAY,
            description: "An array of Question objects.",
            items: {
                type: Type.OBJECT,
                properties: {
                    '@type': { type: Type.STRING, description: "Should be 'Question'" },
                    name: { type: Type.STRING, description: "The question text." },
                    acceptedAnswer: {
                        type: Type.OBJECT,
                        properties: {
                            '@type': { type: Type.STRING, description: "Should be 'Answer'" },
                            text: { type: Type.STRING, description: "The answer text." }
                        },
                        required: ['@type', 'text']
                    }
                },
                required: ['@type', 'name', 'acceptedAnswer']
            }
        }
    },
    required: ['@context', '@type', 'mainEntity']
};

const orchestratorSchema = {
    type: Type.OBJECT,
    properties: {
        post_title: { type: Type.STRING, description: "A catchy, emotional, high-click-through-rate title for the H1 tag (e.g. 'The Best Soft & Chewy Chocolate Chip Cookies')." },
        seo_title: { type: Type.STRING, description: "The SEO title for search engines (60 chars max). **CRITICAL: Must start with the Primary Keyword AND contain a number.** Format: 'Keyword: Number + Hook - BrandName' (e.g. 'Apple Pie: 3 Secrets for Flaky Crust')." },
        meta_description: { type: Type.STRING, description: "A compelling, SEO-optimized meta description (approx 155 characters)." },
        slug: { type: Type.STRING, description: "A clean, SEO-friendly URL slug." },
        excerpt: { type: Type.STRING, description: "A short summary (excerpt) of the post to be displayed in archive pages." },
        faqSchema: faqPageSchema,
        post_content: { type: Type.STRING, description: "The full blog post in PURE HTML format (paragraphs, H2s, H3s, lists), including strategically placed internal and external links as specified in the rules." },
        recipe_data: recipeDataSchema,
    },
    required: ["post_title", "seo_title", "meta_description", "slug", "excerpt", "faqSchema", "post_content", "recipe_data"],
};


export async function generateImage(apiKey: string, prompt: string, inputImage?: { imageBytes: string, mimeType: string }): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    
    // The 'image' parameter for variation is not supported in the 'imagen-4.0-generate-001' model's generateImages method.
    // The variation will be guided by the text prompt only. We ignore the inputImage parameter.
    const request = {
        model: 'imagen-4.0-generate-001',
        prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
    };

    const response = await ai.models.generateImages(request);
    
    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Image generation failed to return an image.");
    }
    return response.generatedImages[0].image.imageBytes;
}


// Handles the main logic for all generation types
// Mirrors the PHP api.php language normalization switch/case
function normalizeLanguage(raw: string): string {
    switch (raw.toLowerCase().trim()) {
        case 'french': case 'francais': case 'français': return 'French';
        case 'spanish': case 'espanol': case 'español': case 'spain': return 'Spanish';
        case 'german': case 'deutsch': case 'allemand': return 'German';
        default: return 'English';
    }
}

// Mirrors PHP api.php detectCategory() — uses Gemini to pick the best WP category
async function detectCategory(
    apiKey: string,
    keyword: string,
    recipeText: string,
    categories: { id: number; name: string }[]
): Promise<number[]> {
    if (!categories.length) return [];
    const ai = new GoogleGenAI({ apiKey });
    const categoriesList = categories.map(c => `- ${c.name} (ID: ${c.id})`).join('\n');
    const prompt = `Analyze the following recipe details and choose the best matching category from the provided list.

Recipe Keyword/Title: "${keyword}"
Recipe Excerpt: "${recipeText.substring(0, 300)}"

Available Categories:
${categoriesList}

IMPORTANT SEO REQUIREMENT:
- You must select ONLY ONE category.
- Always choose the MOST SPECIFIC subcategory available.
- Do NOT select parent categories if a specific child category fits.
- Do NOT select "All Recipes" or generic categories if something more specific exists.

Respond with a single JSON object: { "categoryIds": [numericId] }`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        const parsed = safeJsonParse(response.text, 'detectCategory');
        return Array.isArray(parsed?.categoryIds) ? parsed.categoryIds : [];
    } catch (e) {
        console.warn('detectCategory Gemini call failed:', e);
        return [];
    }
}

async function handleGeneration(
    apiKey: string,
    params: {
        primaryKeyword: string;
        generationType: 'full' | 'intro' | 'seo-article';
        source: { type: 'text'; value: string } | { type: 'content'; value: { title: string, content: string }};
        settings: ArticleAgentSettings;
        adminSettings: AdminSettings;
        imageConfig: ImageConfiguration;
        existingPosts?: { title: string, link: string }[];
        imageStrategy?: 'keep' | 'regenerate';
        language?: string;
        siteCategories?: { id: number; name: string }[];
        siteUrl?: string;
    }
): Promise<GeneratedPost> {
    
    let { primaryKeyword, generationType, source, settings, adminSettings, imageConfig, existingPosts, imageStrategy = 'regenerate', language, siteCategories, siteUrl } = params;

    // Normalize language exactly like the PHP api.php does
    const normalizedLanguage = normalizeLanguage(language || settings.language || 'English');

    if (generationType !== 'intro' && source.type === 'text' && !primaryKeyword) {
        primaryKeyword = await extractTitleFromText(apiKey, source.value);
        if (!primaryKeyword) {
            throw new Error("Could not determine a title from the provided text. Please try again or provide a keyword.");
        }
    }

    // Auto-detect category from WordPress site categories (mirrors PHP detectCategory())
    let detectedCategoryIds: number[] = [];
    let detectedCategoryName = '';
    if (siteCategories && siteCategories.length > 0) {
        try {
            const sourceText = source.type === 'text' ? source.value : '';
            detectedCategoryIds = await detectCategory(apiKey, primaryKeyword, sourceText, siteCategories);
            if (detectedCategoryIds.length > 0) {
                const primaryId = detectedCategoryIds[detectedCategoryIds.length - 1];
                detectedCategoryIds = [primaryId];
                const match = siteCategories.find(c => c.id === primaryId);
                if (match) detectedCategoryName = match.name;
            }
        } catch (e) {
            console.warn('Category detection failed:', e);
        }
    }

    const categoryContext = detectedCategoryName
        ? `The recipe category is '${detectedCategoryName}'. You MUST set \`recipe_data.category\` to exactly '${detectedCategoryName}'.`
        : 'Assign the most appropriate category for this recipe.';

    const siteContext = siteUrl ? `The post is for the website: ${siteUrl}.` : '';

    // 1. Generate the text content (article or intro)
    let generatedPost: GeneratedPost;
    if (generationType === 'full' || generationType === 'seo-article') {
        generatedPost = await generateArticleAndRecipe(
            apiKey, 
            primaryKeyword, 
            settings, 
            adminSettings,
            existingPosts || [], 
            imageStrategy,
            source.type === 'content' ? source.value.content : (source.type === 'text' ? source.value : undefined),
            generationType,
            normalizedLanguage,
            categoryContext,
            siteContext
        );
    } else {
        generatedPost = await generateRecipeWithIntro(apiKey, source, primaryKeyword, normalizedLanguage, categoryContext, siteContext);
    }
    
    // 2. Handle the image generation/assignment
    let imageBase64: string | undefined;
    let instructionImageBase64: string | undefined;
    
    if (imageStrategy === 'regenerate' && generatedPost.recipe_data && generatedPost.recipe_data.name) {
        switch (imageConfig.option) {
            case 'generate':
                const imagePrompt = `Photorealistic food photography of ${generatedPost.recipe_data.name}, ${generatedPost.recipe_data.cuisine || ''} style, beautifully plated, bright lighting, high detail, delicious looking.`;
                try {
                    imageBase64 = await generateImage(apiKey, imagePrompt);
                } catch(e) { console.error("Failed to generate featured image", e); }

                const instructionPrompt = `A different angle of the finished dish: ${generatedPost.recipe_data.name}. This could be a close-up on a slice, a view from above, or showing a serving in a different setting. It should be photorealistic, beautifully lit, and look delicious. This image must be a different composition from the main featured image.`;
                try {
                    instructionImageBase64 = await generateImage(apiKey, instructionPrompt);
                } catch (e) {
                    console.warn("Failed to generate instruction image", e);
                }
                break;
            case 'variation':
                if (imageConfig.uploadedImage) {
                    const variationPrompt = `Generate a new, unique, high-quality photograph inspired by an image of ${generatedPost.recipe_data.name}. Maintain a similar style but create a different composition.`;
                    imageBase64 = await generateImage(apiKey, variationPrompt, {
                        imageBytes: imageConfig.uploadedImage.base64,
                        mimeType: imageConfig.uploadedImage.mimeType,
                    });
                }
                break;
            case 'upload':
                if (imageConfig.uploadedImage) {
                    imageBase64 = imageConfig.uploadedImage.base64;
                }
                break;
        }
    } else if (imageStrategy === 'regenerate') {
        console.warn("Recipe name is missing from the generated content. Skipping image generation.");
    }

    if (imageBase64) {
        generatedPost.recipe_data.image = imageBase64;
    }
    if (instructionImageBase64) {
        generatedPost.recipe_data.instruction_image = instructionImageBase64;
    }

    // 3. Assign focus keyword (use title as fallback if keyword is missing, e.g., from text)
    generatedPost.focus_keyword = primaryKeyword || generatedPost.post_title;

    // 4. Attach detected category IDs so importRecipe can send them to WordPress
    if (detectedCategoryIds.length > 0) {
        generatedPost.categories = detectedCategoryIds;
    }
    
    return generatedPost;
}

export { handleGeneration };




async function agentOrchestrator(
    apiKey: string, 
    primaryKeyword: string, 
    settings: ArticleAgentSettings, 
    adminSettings: AdminSettings,
    existingPosts: { title: string, link: string }[],
    imageStrategy: 'keep' | 'regenerate', 
    originalContent?: string,
    mode: 'full' | 'seo-article' = 'full',
    language: string = 'English',
    categoryContext: string = 'Assign the most appropriate category for this recipe.',
    siteContext: string = ''
): Promise<any> {

    const ai = new GoogleGenAI({ apiKey });

    let knowledgeBase = '';
    if (settings.knowledgeFiles && settings.knowledgeFiles.length > 0) {
        knowledgeBase = "Use the following knowledge base to inform your writing:\n" + settings.knowledgeFiles.map(f => `--- KNOWLEDGE FILE: ${f.name} ---\n${f.content}`).join('\n\n');
    }

    let contentPromptExtension = '';
    const imageMap: { [key: string]: string } = {};

    // This block handles both creating from text and updating an existing post.
    if (originalContent) {
        // A simple heuristic to differentiate a full HTML post from simple recipe text.
        // If it's a full post, it's an update task. Otherwise, it's a create-from-text task.
        const isUpdateTask = /<p>|<h[1-6]>/i.test(originalContent);

        if (isUpdateTask) {
            // === THIS IS THE NEW LOGIC FOR UPDATING A POST ===
            let contentForPrompt = originalContent;
            let imageInstruction = "You will also generate a new featured image for this post.";

            if (imageStrategy === 'keep') {
                let imageCounter = 0;
                contentForPrompt = originalContent.replace(/<img[^>]*>/g, (match) => {
                    const placeholder = `[IMAGE_PLACEHOLDER_${imageCounter}]`;
                    imageMap[placeholder] = match;
                    imageCounter++;
                    return placeholder;
                });
                imageInstruction = `The content may contain special placeholders like [IMAGE_PLACEHOLDER_0]. If they exist, you **MUST** preserve them exactly as they appear and in their original positions. Do not add, remove, or alter these placeholders.`;
            }

            contentPromptExtension = `
                **IMPORTANT REGENERATION TASK:**
                You are to generate a completely new article. The previous version of the article is provided below for context, but you should not copy its prose.

                **Your Process:**
                1.  **Analyze and Extract:** Read the 'Old Article Content' below. Your ONLY goal in this step is to identify and extract the core recipe components: the main keyword/title, the full list of ingredients, and the step-by-step instructions.
                2.  **Generate a NEW Article:** Using ONLY the extracted core recipe from Step 1 as your starting point, write a **completely new and original blog post**. You MUST NOT rewrite, rephrase, or use the prose from the 'Old Article Content'. The new article must be unique and follow all my persona and linking rules.
                3.  **Handle Images:** ${imageInstruction}
                4.  **Create New Components:** You **MUST** generate a brand new, complete, and well-structured **'recipe_data' object** based on the extracted recipe. You must also generate a new **'faqSchema' object**.

                **Old Article Content:**
                ---
                ${contentForPrompt}
                ---
            `;
        } else {
            // === THIS IS THE EXISTING LOGIC FOR CREATING FROM TEXT (UNCHANGED) ===
            contentPromptExtension = `
                **IMPORTANT TASK:**
                You are creating a new article based on the following recipe text. Expand on this text to create a full blog post.
                **Special Instruction for Ingredients:** If the ingredients list has quantities on separate lines from the descriptions (e.g., a line with '2' followed by a line with 'cups of flour'), you MUST combine them into a single ingredient string like '2 cups of flour'.
                
                **Original Text:**
                ---
                ${originalContent}
                ---
            `;
        }
    }
    
     // Determine internal linking strategy
    const hasInternalLinks = existingPosts.length > 0 && settings.internalLinks > 0;
    const internalLinksRequirement = hasInternalLinks 
        ? `- **Internal Links:** You MUST insert exactly ${settings.internalLinks} internal links. Use the provided list of available posts.`
        : `- **Internal Links:** 0. You MUST NOT add any internal links.`;
        
    const internalLinkingContext = hasInternalLinks
        ? `You MUST choose from this list for internal links. Select the most relevant posts and use the post's title as the anchor text. List of available posts: \n${existingPosts.map(p => `- Title: "${p.title}", URL: "${p.link}"`).join('\n')}`
        : `No internal links have been provided. The requirement to add ${settings.internalLinks} internal links is overridden. You MUST NOT add any internal links to the article.`;

    const userAffiliateLinks = settings.affiliateLinks?.map(l => `- Product: "${l.productName}", URL: "${l.url}"`).join('\n') || '';
    
    const affiliateLinksContext = (adminSettings.affiliateSettings.textSnippets?.trim() || userAffiliateLinks)
        ? `If relevant, you may use these affiliate links. They count towards your external link total. 
           ${userAffiliateLinks ? `\n**User Provided Product Links (Prioritize these):**\n${userAffiliateLinks}\n` : ''}
           ${adminSettings.affiliateSettings.textSnippets?.trim() ? `\n**Global/Admin Links:**\n${adminSettings.affiliateSettings.textSnippets}` : ''}`
        : 'None provided.';

    const languageInstruction = `You MUST write the entire article and all fields in ${language}.`;
    const externalLinksCount = settings.externalLinks;
    const linkingInstruction = `All external links MUST use \`target="_blank"\`. Affiliate/commercial links MUST use \`rel="nofollow"\`.`;
    const externalLinksContext = (userAffiliateLinks || adminSettings.affiliateSettings.textSnippets?.trim())
        ? `You MUST intelligently incorporate ${externalLinksCount} external links into the article where they make sense.\n${userAffiliateLinks ? `User Provided Links:\n${userAffiliateLinks}\n` : ''}${adminSettings.affiliateSettings.textSnippets?.trim() ? `Global Links:\n${adminSettings.affiliateSettings.textSnippets}` : ''}`
        : `You MUST NOT add any external links.`;


    let mainPrompt = '';

    if (mode === 'seo-article') {
        mainPrompt = `You are an expert SEO Recipe Article Writer.
Goal: Write a comprehensive, SEO-optimized recipe article (OVER 2000 WORDS) in ${language} following a strict structure.

**Primary Keyword / Recipe Concept:** "${primaryKeyword}"

**Content Structure (You MUST use HTML tags <h2>, <h3>, <p>, <ol>, <ul>, <table>):**
1.  **Introduction (H2):** 150-200 words. Hook the reader immediately with short story. **MANDATORY:** The first sentence must contain "${primaryKeyword}".
2.  **Why You'll Love It (H2):** 100-150 words.
3.  **Ingredients (H2):** ≤200 words. (Include a sub-section for Notes/Substitutions as H3).
4.  **Equipment (H2):** ≤70 words.
5.  **Instructions (H2):** ≤400 words. Use HTML <ol> for steps.
6.  **Pro Tips (H2):** ≤130 words.
7.  **Serving, Storage & Variations (H2):** ≤150 words.
8.  **Nutrition Information (H2):** Create a clean HTML table for nutrition facts from the \`recipe_data.nutrition\` object, including Calories, Protein, Carbs, Fat, and an estimate disclaimer.
9.  **Conclusion (H2):** ≤100 words.

**CRITICAL NOTE:** Do NOT include an H1 tag in the HTML \`post_content\`. The \`post_title\` is for the H1. Do NOT generate an FAQ section in the HTML body; use the \`faqSchema\` object.

**SEO Focus:**
-   **SEO Title Rule:** The \`seo_title\` JSON field **MUST** start with "${primaryKeyword}" and **MUST contain a number**.
-   **First Sentence Rule:** The content's first sentence **MUST** contain "${primaryKeyword}".
-   **Keyword Density:** Use "${primaryKeyword}" approximately **15-20 times**.
-   **Meta Description:** Create a compelling, SEO-optimized meta description (around 155 characters).
-   **Slug:** Short, focus keyword only.
-   **Short Paragraphs:** 2-3 sentences max.

**Linking Requirements:**
${internalLinksRequirement}
- **External Links:** ${externalLinksContext}
- **Available Internal Links:** ${internalLinkingContext}
- ${linkingInstruction}

${siteContext}
${categoryContext}
${languageInstruction}`;
    } else {
        // Default 'full' mode — matches PHP api.php's article&recipe prompt exactly
        const personaNote = settings.mainPrompt?.trim()
            ? `**Your Writing Style (optional guidance):** ${settings.mainPrompt}\n\n`
            : '';
        mainPrompt = `You are an expert food blogger and SEO specialist AI. Your mission is to write a warm, engaging, and personal-story-driven recipe blog post of approximately 1500 WORDS in ${language}.

**Primary Keyword / Recipe Concept:** "${primaryKeyword}"

${personaNote}**Article Structure (You MUST use HTML tags <h2>, <h3>, <p>, <ul>, <li>, <table>):**
1.  **Engaging short Introduction:** A personal, relatable story of at least ≤150 words.
2.  **Why This Recipe is a Must-Try (H2):** A bulleted list of 3-4 key points.
3.  **Key Ingredient Notes (H2):** Discuss 2-3 important ingredients.
4.  **Step-by-Step Guide with Pro Tips (H2):** A descriptive walkthrough of the recipe process.
5.  **Variations & Serving Suggestions (H2):** Creative ideas for adapting the recipe.
6.  **Nutrition Information (H2):** Create a clean HTML table for nutrition facts from the \`recipe_data.nutrition\` object.
7.  **Conclusion:** A short, friendly wrap-up.

**CRITICAL NOTE:** Do NOT include an H1 tag in the HTML \`post_content\`. Do NOT generate an FAQ section in the HTML body; use the \`faqSchema\` object.

**SEO & Linking Rules:**
-   **SEO Title:** The \`seo_title\` field **MUST** differ from the \`post_title\`, start with "${primaryKeyword}", and **MUST contain a number**.
-   **First Sentence:** The article's first sentence **MUST** contain "${primaryKeyword}" naturally.
-   **Slug:** Short, focus keyword only.
-   **Meta Description:** Create a compelling, SEO-optimized meta description (around 155 characters).
-   **Keyword Density:** Use "${primaryKeyword}" about 1.5% of the time (approx. 20-25 times for a 1500-word article).
-   **FAQ Schema:** A valid "FAQPage" JSON-LD object with 3-4 relevant questions and answers.

-   **Linking:**
    ${internalLinksRequirement}
    - **External Links:** ${externalLinksContext}
    - ${linkingInstruction}

**Available Internal Links:** ${internalLinkingContext}

${siteContext}
${categoryContext}
${languageInstruction}`;
    }

    const prompt = `
        ${mainPrompt}

        **TASK: Generate a complete blog post JSON object with the following components:**
        1.  **SEO Metadata:** 
            - \`post_title\`: Catchy, emotional title for H1.
            - \`seo_title\`: Keyword-optimized title for SEO. **Must start with keyword & contain a number**.
            - \`meta_description\`: Compelling description.
            - \`slug\`: Clean URL.
            - \`excerpt\`: A short summary for archive pages.
        2.  **FAQ Schema:** A valid "FAQPage" JSON-LD object with 3-4 relevant questions and answers.
        3.  **Article Content:** A full, engaging blog post in clean HTML format (p, h2, h3, ul, li, table) that includes all required links. **REMINDER: NO FAQ SECTION IN HTML.**
        4.  **Recipe Data:** A complete, structured recipe card object. This **MUST** include a fully populated 'nutrition' object with realistic estimates for all fields and SEO-optimized metadata for a featured image.
            
        ${contentPromptExtension}

        **Knowledge Base:**
        ${knowledgeBase || 'No additional knowledge base provided.'}
        
        **Output Format Rules:**
        CRITICAL: The entire output MUST be a single JSON object.
        1.  The 'recipe_data' object **MUST** be fully generated with all required fields, even when editing. This is not optional.
        2.  The 'faqSchema' field **MUST be a valid JSON object** that strictly follows the schema. It **MUST NOT** be a string and **MUST NOT** contain any WordPress block comments (e.g., '<!-- wp:rank-math/faq-block ... -->').
        3.  The 'post_content' field must be clean HTML and MUST NOT contain any JSON-LD script tags or WordPress block comments.
        4.  Do not include any markdown formatting (like \`\`\`json\`) around the final JSON output.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: orchestratorSchema }
    });
    
    const parsedData = safeJsonParse(response.text, 'agentOrchestrator');
    
    // If we were keeping images, restore them now
    if (imageStrategy === 'keep') {
        let finalContent = parsedData.post_content;
        for (const placeholder in imageMap) {
            const regex = new RegExp(placeholder.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g');
            finalContent = finalContent.replace(regex, imageMap[placeholder]);
        }
        parsedData.post_content = finalContent;
    }
    
    return parsedData;
}


async function generateArticleAndRecipe(
    apiKey: string, 
    primaryKeyword: string, 
    settings: ArticleAgentSettings, 
    adminSettings: AdminSettings,
    existingPosts: { title: string, link: string }[],
    imageStrategy: 'keep' | 'regenerate',
    originalContent?: string,
    mode: 'full' | 'seo-article' = 'full',
    language: string = 'English',
    categoryContext: string = 'Assign the most appropriate category for this recipe.',
    siteContext: string = ''
): Promise<GeneratedPost> {
    
    const orchestratedData = await agentOrchestrator(
        apiKey,
        primaryKeyword,
        settings,
        adminSettings,
        existingPosts,
        imageStrategy,
        originalContent,
        mode,
        language,
        categoryContext,
        siteContext
    );
    
    return orchestratedData;
}



// Internal function to generate just an intro + recipe — matches PHP api.php 'intro' prompt
async function generateRecipeWithIntro(
  apiKey: string,
  source: { type: 'text'; value: string } | { type: 'content'; value: { title: string, content: string }},
  primaryKeyword: string,
  language: string = 'English',
  categoryContext: string = 'Assign the most appropriate category for this recipe.',
  siteContext: string = ''
): Promise<GeneratedPost> {
    const ai = new GoogleGenAI({ apiKey });
    let prompt: string;
    
    const languageInstruction = `You MUST write the entire content and all text fields in ${language}.`;

    switch (source.type) {
        case 'content':
            prompt = `You are an expert food blogger. Analyze the following article (title: "${source.value.title}", content: "${source.value.content}") and generate a complete recipe structure from it.

Write a short, engaging introduction of 2 paragraphs (200-250 words total) for the "post_content". The first sentence MUST contain "${primaryKeyword}".
If no clear recipe is found, create one based on the article's title.

Generate the full SEO package:
- A compelling, SEO-optimized meta description (around 155 characters).
- A short, engaging excerpt (approx 2 sentences).
- A clean, SEO-friendly URL slug (lowercase, hyphenated, focus keyword only).
- An SEO title that starts with "${primaryKeyword}" and includes a number.
- SEO-optimized image_alt, image_title, and image_description. The alt text must include "${primaryKeyword}".
- A complete and realistic nutrition object with estimates for all fields.

${siteContext}
${categoryContext}
${languageInstruction}`;
            break;
        case 'text':
        default:
            const specialInstruction = "**Special Instruction for Ingredients:** If the ingredients list has quantities on separate lines from the descriptions (e.g., a line with '2' followed by a line with 'cups of flour'), you MUST combine them into a single ingredient string like '2 cups of flour'.";
            if (primaryKeyword) {
                 prompt = `You are an expert recipe formatter and food blogger. Analyze this recipe text: "${source.value}". ${specialInstruction}

Structure it perfectly into the recipe schema. If information is missing, use your knowledge to complete the recipe.
Write a short, engaging 2-paragraph introduction (200-250 words total) for the "post_content". The first sentence MUST contain "${primaryKeyword}".

Generate the full SEO package:
- A compelling, SEO-optimized meta description (around 155 characters).
- A short, engaging excerpt (approx 2 sentences).
- A clean, SEO-friendly URL slug based on "${primaryKeyword}".
- An SEO title that starts with "${primaryKeyword}" and includes a number.
- SEO-optimized image_alt (must include "${primaryKeyword}"), image_title, and image_description.
- A complete and realistic nutrition object with estimates for all fields.

${siteContext}
${categoryContext}
${languageInstruction}`;
            } else {
                 prompt = `You are an expert recipe formatter and food blogger. Analyze this recipe text: "${source.value}". ${specialInstruction}

First, determine the correct and SEO-friendly title for this recipe from the text. Then structure it perfectly into the recipe schema.
Write a short, engaging 2-paragraph introduction (200-250 words total) for "post_content". The first sentence MUST contain the recipe title you determined.
Generate a complete SEO package including meta description, excerpt, slug, image metadata, and nutrition estimates.

${siteContext}
${categoryContext}
${languageInstruction}`;
            }
            break;
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: recipeWithIntroSchema }
    });
    return safeJsonParse(response.text, 'generateRecipeWithIntro') as GeneratedPost;
}


// Unified error handler for all generation services
export async function safeGenerate<T>(promise: Promise<T>): Promise<T> {
    try {
        return await promise;
    } catch (error) {
        console.error("Error during Gemini generation:", error);
        if (error instanceof Error) {
            if (error.message.includes('API key not valid')) {
                throw new Error("Your Gemini API key is not valid. Please check it in the settings.");
            }
            if (error.message.includes('429')) {
                throw new Error("API rate limit exceeded. Please wait a moment and try again.");
            }
             if (error.message.includes('response is missing required fields')) {
                 throw new Error("AI response validation failed. It might be incomplete. Please try again.");
             }
        }
        throw new Error("Failed to generate content. The AI model may be temporarily unavailable or there was a network issue.");
    }
}
