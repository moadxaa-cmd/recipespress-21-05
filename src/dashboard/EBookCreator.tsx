
import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Icons } from '../constants';
import { Spinner } from '../components/Spinner';
import type { WordPressPost, ToastType, ToastMessage, WordPressSite, RecipeData } from '../types';
import { extractRecipeForEbook, generateEbookCover, generateEbookIntro, generateEbookRecipeImage } from '../services/geminiService';
import { getPostContent } from '../services/wordpressService';

interface EBookCreatorProps {
    sites: WordPressSite[];
    selectedSiteId: string;
    wpPosts: WordPressPost[];
    isDataLoading: boolean;
    showToast: (config: string | ToastMessage, type?: ToastType) => void;
    geminiApiKey: string;
    checkApiKey: () => boolean;
    onBack?: () => void;
}

interface ProcessedRecipe extends RecipeData {
    originalPostId: number;
    sourceUrl: string;
    isReady: boolean;
}

interface EbookConfig {
    title: string;
    author: string;
    introText: string;
    coverImage: string | null; // base64
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
}

function decodeHtmlEntities(text: string): string {
    if (typeof document === 'undefined') return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
}

export const EBookCreator: React.FC<EBookCreatorProps> = ({
    sites,
    selectedSiteId,
    wpPosts,
    isDataLoading,
    showToast,
    geminiApiKey,
    checkApiKey,
    onBack
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedPostIds, setSelectedPostIds] = useState<Set<number>>(new Set());
    const [processedRecipes, setProcessedRecipes] = useState<ProcessedRecipe[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [ebookConfig, setEbookConfig] = useState<EbookConfig>({
        title: 'My Favorite Recipes',
        author: 'Chef Name',
        introText: '',
        coverImage: null,
        primaryColor: '#1f2937', // slate-800
        accentColor: '#0d9488', // teal-600
        backgroundColor: '#ffffff', // white
    });

    const site = sites.find(s => s.id === selectedSiteId);

    const handlePostSelect = (id: number) => {
        const newSet = new Set(selectedPostIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedPostIds(newSet);
    };

    const processSelectedPosts = async () => {
        if (!site) return;
        if (selectedPostIds.size === 0) {
            showToast('Please select at least one recipe.', 'error');
            return;
        }
        if (!checkApiKey()) return;

        setIsProcessing(true);
        setProcessingStatus('Initializing...');
        const recipes: ProcessedRecipe[] = [];

        try {
            const postsToProcess = wpPosts.filter(p => selectedPostIds.has(p.id));
            let processedCount = 0;

            for (const post of postsToProcess) {
                setProcessingStatus(`Processing ${processedCount + 1}/${postsToProcess.length}: ${post.title}`);
                
                let recipeData: Partial<RecipeData>;

                // 1. Fetch content
                const postContentData = await getPostContent(site, post.id);
                
                // 2. Extract Recipe Data using Gemini
                try {
                    recipeData = await extractRecipeForEbook(geminiApiKey, postContentData.title, postContentData.content, post.link);
                } catch (e) {
                    console.error(`Failed to extract recipe for ${post.title}`, e);
                    // Fallback basic data
                    recipeData = {
                        name: post.title,
                        ingredients: [],
                        instructions: [],
                        description: 'Recipe details could not be extracted.',
                        prep_time: 'N/A',
                        cook_time: 'N/A',
                        yield: 'N/A',
                        difficulty: 'N/A'
                    };
                }

                // 3. Check/Generate Image
                // Ensure we have a landscape image (16:9 preferred)
                if (!recipeData.image && post.featured_image_url) {
                    try {
                         const imageBase64 = await generateEbookRecipeImage(geminiApiKey, recipeData.name || post.title);
                         recipeData.image = imageBase64;
                    } catch (e) {
                        console.warn("Failed to generate recipe image", e);
                    }
                } else if (!recipeData.image) {
                     try {
                         const imageBase64 = await generateEbookRecipeImage(geminiApiKey, recipeData.name || post.title);
                         recipeData.image = imageBase64;
                    } catch (e) {
                        console.warn("Failed to generate recipe image", e);
                    }
                }

                recipes.push({
                    ...(recipeData as RecipeData), // Cast assuming extraction filled gaps
                    originalPostId: post.id,
                    sourceUrl: post.link,
                    isReady: true
                });

                processedCount++;
            }
            
            setProcessedRecipes(recipes);
            
            // Generate Intro automatically
            setProcessingStatus('Generating Book Introduction...');
            const intro = await generateEbookIntro(geminiApiKey, recipes.map(r => r.name || 'Unknown Recipe'));
            setEbookConfig(prev => ({ ...prev, introText: intro || "Welcome to this collection of our favorite recipes! \n\nInside, you'll find a handpicked selection of delicious meals designed to inspire your culinary journey. Whether you are a beginner or a seasoned cook, we hope these recipes bring joy and great flavor to your table.\n\nHappy cooking!" }));
            
            setStep(2);

        } catch (error) {
            showToast('Error processing recipes. Please try again.', 'error');
            console.error(error);
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
        }
    };

    const handleGenerateCover = async () => {
        if (!checkApiKey()) return;
        setIsProcessing(true);
        setProcessingStatus('Designing Cover...');
        try {
            const coverBase64 = await generateEbookCover(geminiApiKey, "A beautiful, appetizing cover for a recipe book.", ebookConfig.title, ebookConfig.author);
            setEbookConfig(prev => ({ ...prev, coverImage: coverBase64 }));
        } catch (error) {
            showToast('Failed to generate cover.', 'error');
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
        }
    };

    const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024 * 5) {
                 showToast('Image size too large. Max 5MB.', 'error');
                 return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                // strip prefix for storage state consistency
                const base64 = result.split(',')[1]; 
                setEbookConfig(prev => ({ ...prev, coverImage: base64 }));
            };
            reader.readAsDataURL(file);
        }
        // Reset value to allow re-uploading same file
        e.target.value = '';
    };

    const triggerCoverUpload = () => {
        fileInputRef.current?.click();
    };
    
    const generatePDF = () => {
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 40;
            const contentWidth = pageWidth - (margin * 2);
            
            const colorText = hexToRgb(ebookConfig.primaryColor);
            const colorAccent = hexToRgb(ebookConfig.accentColor);
            const colorBg = hexToRgb(ebookConfig.backgroundColor);
            const colorMetaBg = [243, 244, 246]; // gray-100

            // Helper to apply background color to the current page
            const applyBackground = () => {
                doc.setFillColor(...colorBg);
                doc.rect(0, 0, pageWidth, pageHeight, 'F');
            };
            
            // Helper to check pagination
            const checkPageBreak = (currentY: number, threshold: number = margin) => {
                 if (currentY > pageHeight - threshold) {
                     doc.addPage();
                     applyBackground();
                     return margin;
                 }
                 return currentY;
            };

            // --- COVER PAGE ---
            applyBackground(); // Apply bg to cover as well (if no image or transparent)
            if (ebookConfig.coverImage) {
                try {
                    doc.addImage(`data:image/jpeg;base64,${ebookConfig.coverImage}`, 'JPEG', 0, 0, pageWidth, pageHeight);
                } catch (e) {
                    console.error("Error adding cover image", e);
                }
                
                // Overlay Title & Author
                doc.setFillColor(0, 0, 0);
                // Semi-transparent overlay logic simulation by drawing rect then text? 
                // jsPDF transparency is tricky. Let's just draw a solid dark bar at bottom.
                doc.rect(0, pageHeight * 0.7, pageWidth, pageHeight * 0.3, 'F'); 
                
                doc.setTextColor(255, 255, 255);
                doc.setFont('times', 'bold');
                doc.setFontSize(40);
                const titleLines = doc.splitTextToSize(ebookConfig.title, contentWidth);
                doc.text(titleLines, pageWidth / 2, pageHeight * 0.8, { align: 'center' });
                
                doc.setFontSize(20);
                doc.setFont('times', 'normal');
                doc.text(`By ${ebookConfig.author}`, pageWidth / 2, pageHeight * 0.9, { align: 'center' });
                
                doc.addPage();
            }

            // --- INTRO PAGE ---
            applyBackground();
            doc.setFont('times', 'bold');
            doc.setFontSize(30);
            doc.setTextColor(...colorText);
            doc.text("Introduction", pageWidth / 2, 100, { align: 'center' });
            
            doc.setFont('times', 'normal');
            doc.setFontSize(15);
            doc.setLineHeightFactor(1.5);
            const introLines = doc.splitTextToSize(ebookConfig.introText, contentWidth);
            doc.text(introLines, margin, 160);
            doc.setLineHeightFactor(1.15);

            // --- TABLE OF CONTENTS ---
            doc.addPage();
            applyBackground();
            const tocPageNumber = doc.getNumberOfPages(); 
            doc.setFont('times', 'bold');
            doc.setFontSize(24);
            doc.setTextColor(...colorText);
            doc.text("Table of Contents", pageWidth / 2, 80, { align: 'center' });

            // Track recipe start pages
            const recipePageNumbers: number[] = [];

            // --- RECIPE PAGES ---
            processedRecipes.forEach((recipe) => {
                doc.addPage();
                applyBackground();
                recipePageNumbers.push(doc.getNumberOfPages());

                let y = margin;

                // 1. Recipe Image (16:9)
                if (recipe.image) {
                    try {
                        const imgHeight = contentWidth * (9 / 16);
                        doc.addImage(`data:image/jpeg;base64,${recipe.image}`, 'JPEG', margin, y, contentWidth, imgHeight, undefined, 'FAST');
                        y += imgHeight + 25;
                    } catch (e) {
                        console.error("Error adding recipe image", e);
                        doc.setDrawColor(200, 200, 200);
                        doc.rect(margin, y, contentWidth, 200);
                        doc.text("Image not available", pageWidth/2, y + 100, { align: 'center' });
                        y += 220;
                    }
                }

                // 2. Title
                doc.setFont('times', 'bold');
                doc.setFontSize(18); // Reduced from 22
                doc.setTextColor(...colorAccent); // Use accent color for headers
                const titleLines = doc.splitTextToSize(decodeHtmlEntities(recipe.name), contentWidth);
                doc.text(titleLines, pageWidth/2, y, { align: 'center' });
                y += (titleLines.length * 20) + 15;

                // Metadata
                doc.setFillColor(colorMetaBg[0], colorMetaBg[1], colorMetaBg[2]);
                doc.roundedRect(margin, y, contentWidth, 40, 5, 5, 'F');
                
                doc.setFont('times', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(...colorText);
                
                const metaY = y + 24;
                const quarter = contentWidth / 4;
                const metaItems = [
                    `Prep: ${recipe.prep_time}`,
                    `Cook: ${recipe.cook_time}`,
                    `Serves: ${recipe.yield}`,
                    `Diff: ${recipe.difficulty || 'N/A'}`
                ];
                
                metaItems.forEach((item, idx) => {
                     doc.text(decodeHtmlEntities(item), margin + (quarter * idx) + (quarter/2), metaY, { align: 'center' });
                });

                y += 60;

                // 3. Ingredients (2 columns)
                doc.setFont('times', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(...colorAccent);
                doc.text("Ingredients", margin, y);
                y += 20;

                doc.setFont('times', 'normal');
                doc.setFontSize(11);
                doc.setTextColor(...colorText);

                const ingColWidth = (contentWidth / 2) - 10;
                const ingredients = recipe.ingredients || [];
                for (let i = 0; i < ingredients.length; i+=2) {
                    y = checkPageBreak(y, 30);
                    
                    const ing1 = ingredients[i];
                    const lines1 = doc.splitTextToSize("• " + decodeHtmlEntities(ing1), ingColWidth);
                    doc.text(lines1, margin, y);
                    
                    let rowHeight = lines1.length * 14;

                    if (i + 1 < ingredients.length) {
                        const ing2 = ingredients[i+1];
                        const lines2 = doc.splitTextToSize("• " + decodeHtmlEntities(ing2), ingColWidth);
                        doc.text(lines2, margin + ingColWidth + 20, y);
                        rowHeight = Math.max(rowHeight, lines2.length * 14);
                    }
                    
                    y += rowHeight + 6;
                }
                
                y += 25;

                // 4. Instructions
                y = checkPageBreak(y, 50);

                doc.setFont('times', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(...colorAccent);
                doc.text("Instructions", margin, y);
                y += 20;

                doc.setFont('times', 'normal');
                doc.setFontSize(11);
                doc.setTextColor(...colorText);

                const instructions = recipe.instructions || [];
                instructions.forEach((inst, i) => {
                    const num = `${i + 1}. `;
                    const lines = doc.splitTextToSize(num + decodeHtmlEntities(inst), contentWidth);
                    
                    if (y + (lines.length * 14) > pageHeight - margin) {
                         doc.addPage();
                         applyBackground();
                         y = margin;
                         // Reset font/color after page break
                         doc.setFont('times', 'normal');
                         doc.setFontSize(11);
                         doc.setTextColor(...colorText);
                    }

                    doc.text(lines, margin, y);
                    y += (lines.length * 14) + 8;
                });
                
                // 5. Notes & Nutrition
                if (recipe.notes || recipe.nutrition?.calories) {
                    y += 15;
                    y = checkPageBreak(y, 80);

                    doc.setDrawColor(200, 200, 200);
                    doc.line(margin, y, pageWidth - margin, y);
                    y += 20;
                    
                    // Ensure color reset
                    doc.setTextColor(...colorText); 
                    doc.setFontSize(11);

                    if (recipe.notes) {
                         doc.setFont('times', 'bold');
                         doc.text("Notes:", margin, y);
                         doc.setFont('times', 'normal');
                         const noteLines = doc.splitTextToSize(decodeHtmlEntities(recipe.notes), contentWidth - 50);
                         doc.text(noteLines, margin + 40, y);
                         y += (noteLines.length * 14) + 10;
                    }
                    
                    if (recipe.nutrition?.calories) {
                         doc.setFont('times', 'bold');
                         doc.text("Nutrition:", margin, y);
                         doc.setFont('times', 'normal');
                         doc.text(decodeHtmlEntities(recipe.nutrition.calories), margin + 55, y);
                    }
                }
                
                 doc.setFontSize(9);
                 doc.setTextColor(150,150,150);
                 doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
            });

            // --- FILL TABLE OF CONTENTS ---
            doc.setPage(tocPageNumber);
            doc.setFont('times', 'normal');
            doc.setFontSize(12);
            doc.setTextColor(...colorText);

            let tocY = 130;
            processedRecipes.forEach((recipe, idx) => {
                 const title = `${idx + 1}. ${decodeHtmlEntities(recipe.name)}`;
                 const pageNum = String(recipePageNumbers[idx]);
                 
                 const titleWidth = doc.getTextWidth(title);
                 const pageNumWidth = doc.getTextWidth(pageNum);
                 const dotStart = margin + titleWidth + 5;
                 const dotEnd = pageWidth - margin - pageNumWidth - 5;
                 
                 doc.text(title, margin, tocY);
                 doc.text(pageNum, pageWidth - margin, tocY, { align: 'right' });
                 
                 if (dotEnd > dotStart) {
                     const dotChar = ".";
                     const dotWidth = doc.getTextWidth(dotChar);
                     const numDots = Math.floor((dotEnd - dotStart) / dotWidth);
                     const dots = dotChar.repeat(numDots);
                     doc.text(dots, dotStart, tocY);
                 }

                 tocY += 25;
            });

            doc.save(`${ebookConfig.title.replace(/ /g, '_')}.pdf`);
            showToast('eBook downloaded successfully!', 'success');

        } catch (error) {
            console.error("PDF Generation Error", error);
            showToast('Failed to generate PDF.', 'error');
        }
    };

    if (step === 1) {
        return (
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200/80">
                 <div className="flex items-center justify-between mb-4">
                     <h2 className="text-2xl font-extrabold text-slate-900">Select Recipes for eBook</h2>
                 </div>
                 <p className="text-slate-600 mb-6">Choose which published recipes you want to include in your eBook. We'll extract the details automatically.</p>
                 
                 {isDataLoading ? <div className="py-12 flex justify-center"><Spinner /></div> : (
                     <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-2">
                         {wpPosts.length === 0 ? <p className="text-center py-8 text-slate-500">No posts found on this site.</p> : wpPosts.map(post => (
                             <div key={post.id} onClick={() => handlePostSelect(post.id)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${selectedPostIds.has(post.id) ? 'bg-teal-50 border-teal-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                 <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedPostIds.has(post.id) ? 'bg-teal-600 border-teal-600' : 'border-slate-400'}`}>
                                     {selectedPostIds.has(post.id) && React.cloneElement(Icons.check, {className: "h-3 w-3 text-white"})}
                                 </div>
                                 <div className="flex-grow">
                                     <p className="font-medium text-slate-800">{decodeHtmlEntities(post.title)}</p>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
                 
                 <div className="flex justify-end mt-6">
                     <button 
                        onClick={processSelectedPosts} 
                        disabled={selectedPostIds.size === 0 || isProcessing}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:bg-slate-400 transition-colors"
                     >
                        {isProcessing ? <><Spinner size="h-5 w-5" /> <span>{processingStatus || 'Processing...'}</span></> : `Continue with ${selectedPostIds.size} Recipes`}
                     </button>
                 </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200/80">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-extrabold text-slate-900">Customize & Generate</h2>
                <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-800">Back to Selection</button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="space-y-4">
                     <div>
                         <label className="block text-sm font-medium text-slate-700">eBook Title</label>
                         <input type="text" value={ebookConfig.title} onChange={e => setEbookConfig({...ebookConfig, title: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-700">Author Name</label>
                         <input type="text" value={ebookConfig.author} onChange={e => setEbookConfig({...ebookConfig, author: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-700">Introduction</label>
                         <textarea value={ebookConfig.introText} onChange={e => setEbookConfig({...ebookConfig, introText: e.target.value})} rows={6} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" />
                     </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Primary</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input type="color" value={ebookConfig.primaryColor} onChange={e => setEbookConfig({...ebookConfig, primaryColor: e.target.value})} className="h-8 w-8 border rounded cursor-pointer" />
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700">Accent</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input type="color" value={ebookConfig.accentColor} onChange={e => setEbookConfig({...ebookConfig, accentColor: e.target.value})} className="h-8 w-8 border rounded cursor-pointer" />
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700">Background</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input type="color" value={ebookConfig.backgroundColor} onChange={e => setEbookConfig({...ebookConfig, backgroundColor: e.target.value})} className="h-8 w-8 border rounded cursor-pointer" />
                            </div>
                        </div>
                     </div>
                 </div>

                 <div className="space-y-6">
                     <div className="border rounded-lg p-4 bg-slate-50">
                         <h3 className="font-semibold text-slate-800 mb-3">Cover Image</h3>
                         {ebookConfig.coverImage ? (
                             <div className="relative group">
                                 <img src={`data:image/jpeg;base64,${ebookConfig.coverImage}`} alt="Cover" className="w-full h-64 object-cover rounded-md shadow-md" />
                                 <button onClick={() => setEbookConfig({...ebookConfig, coverImage: null})} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">{React.cloneElement(Icons.trash, {className:"h-5 w-5"})}</button>
                             </div>
                         ) : (
                             <div className="h-64 border-2 border-dashed border-slate-300 rounded-md flex flex-col items-center justify-center text-slate-500 gap-3">
                                 <p className="mb-1">No cover image</p>
                                 <div className="flex gap-2">
                                     <button onClick={handleGenerateCover} disabled={isProcessing} className="px-3 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium shadow-sm">
                                         {isProcessing ? 'Generating...' : 'Generate AI'}
                                     </button>
                                      <button onClick={triggerCoverUpload} className="px-3 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium shadow-sm flex items-center gap-2">
                                         {Icons.upload} Upload
                                     </button>
                                     <input type="file" ref={fileInputRef} onChange={handleCoverUpload} accept="image/jpeg, image/png" className="hidden" />
                                 </div>
                             </div>
                         )}
                     </div>
                     
                     <div className="border rounded-lg p-4">
                         <h3 className="font-semibold text-slate-800 mb-2">Included Recipes ({processedRecipes.length})</h3>
                         <ul className="space-y-1 max-h-48 overflow-y-auto text-sm text-slate-600">
                             {processedRecipes.map((r, i) => (
                                 <li key={i} className="flex items-center gap-2">
                                     <span className="w-5 text-slate-400">{i+1}.</span>
                                     <span className="truncate">{decodeHtmlEntities(r.name)}</span>
                                 </li>
                             ))}
                         </ul>
                     </div>
                 </div>
             </div>

             <div className="flex justify-end mt-8 pt-6 border-t">
                 <button onClick={generatePDF} className="inline-flex items-center gap-2 px-8 py-4 bg-teal-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-teal-700 hover:-translate-y-0.5 transition-all">
                     {Icons.upload} 
                     Download eBook PDF
                 </button>
             </div>
        </div>
    );
};
