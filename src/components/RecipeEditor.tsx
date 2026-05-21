
import React, { useState, useEffect, useRef } from 'react';
// FIX: Import `RecipeData` to resolve type errors.
import type { GeneratedPost, WordPressPost, RecipeData } from '../types';
import { Icons } from '../constants';
import { Spinner } from './Spinner';

interface RecipeEditorProps {
  post: GeneratedPost;
  targetPost: WordPressPost | null;
  onSave: (post: GeneratedPost, targetPost: WordPressPost | null, status: 'publish' | 'draft') => void;
  onCancel: () => void;
  isSaving: boolean;
  onRegenerateImage: () => Promise<void>;
  isRegeneratingImage: boolean;
}

const InputField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string; }> = ({ label, value, onChange, name }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700">{label}</label>
        <input type="text" name={name} id={name} value={value} onChange={onChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
    </div>
);

const TextareaField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; name: string; rows?: number }> = ({ label, value, onChange, name, rows = 3 }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700">{label}</label>
        <textarea name={name} id={name} value={value} onChange={onChange} rows={rows} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
    </div>
);

export const RecipeEditor: React.FC<RecipeEditorProps> = ({ post, targetPost, onSave, onCancel, isSaving, onRegenerateImage, isRegeneratingImage }) => {
  const [editedPost, setEditedPost] = useState<GeneratedPost>(post);

  const ingredientsRef = useRef<HTMLDivElement>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure the entire recipe_data structure and its nested arrays are always defined to prevent runtime errors.
    // FIX: Add explicit type to handle cases where post.recipe_data might be missing.
    const incomingRecipeData: Partial<RecipeData> = post.recipe_data || {};
    setEditedPost({
      ...post,
      seo_title: post.seo_title || '',
      excerpt: post.excerpt || '',
      meta_description: post.meta_description || '',
      slug: post.slug || '',
      recipe_data: {
        // Provide defaults for all properties, especially arrays and objects.
        name: '',
        description: '',
        prep_time: '',
        cook_time: '',
        total_time: '',
        yield: '',
        cuisine: '',
        category: '',
        notes: '',
        method: '',
        diet: '',
        video_url: '',
        image: undefined,
        instruction_image: undefined,
        image_alt: '',
        image_title: '',
        image_description: '',
        nutrition: {},
        aggregateRating: undefined,
        // Spread incoming data which might have missing or undefined properties.
        ...incomingRecipeData,
        // Explicitly ensure array properties are arrays, falling back to an empty array
        // if they were missing, null, or undefined in the incoming data.
        keywords: Array.isArray(incomingRecipeData.keywords) ? incomingRecipeData.keywords : [],
        ingredients: Array.isArray(incomingRecipeData.ingredients) ? incomingRecipeData.ingredients : [],
        instructions: Array.isArray(incomingRecipeData.instructions) ? incomingRecipeData.instructions : [],
      },
    });
  }, [post]);

  const handlePublishClick = () => {
      onSave(editedPost, targetPost, 'publish');
  };

  const handleDraftClick = () => {
      onSave(editedPost, targetPost, 'draft');
  };

  const handlePostChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditedPost(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRecipeDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditedPost(prev => ({
      ...prev,
      recipe_data: {
        ...prev.recipe_data,
        [e.target.name]: e.target.value,
      },
    }));
  };

  const handleKeywordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keywords = e.target.value.split(',').map(k => k.trim());
    setEditedPost(prev => ({ ...prev, recipe_data: { ...prev.recipe_data, keywords }}));
  };
  
  const handleNutritionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditedPost(prev => ({
          ...prev,
          recipe_data: {
              ...prev.recipe_data,
              nutrition: {
                  ...prev.recipe_data.nutrition,
                  [e.target.name]: e.target.value
              }
          }
      }));
  };
  
  const handleListChange = (listName: 'ingredients' | 'instructions', index: number, value: string) => {
     setEditedPost(prev => {
        const newList = [...prev.recipe_data[listName]];
        newList[index] = value;
        return { ...prev, recipe_data: { ...prev.recipe_data, [listName]: newList } }
     });
  }

  const addListItem = (listName: 'ingredients' | 'instructions') => {
    const wasLength = editedPost.recipe_data[listName].length;
    setEditedPost(prev => ({ ...prev, recipe_data: { ...prev.recipe_data, [listName]: [...prev.recipe_data[listName], ''] } }));
    setTimeout(() => {
        const container = listName === 'ingredients' ? ingredientsRef.current : instructionsRef.current;
        if(container){
            const inputs = container.querySelectorAll('input, textarea');
            if(inputs.length > wasLength) (inputs[inputs.length - 1] as HTMLElement).focus();
        }
    }, 0);
  };

  const removeListItem = (listName: 'ingredients' | 'instructions', index: number) => {
     setEditedPost(prev => ({ ...prev, recipe_data: { ...prev.recipe_data, [listName]: prev.recipe_data[listName].filter((_, i) => i !== index) } }));
  };

  const handleReorder = (listName: 'ingredients' | 'instructions', index: number, direction: 'up' | 'down') => {
    setEditedPost(prev => {
        const list = [...prev.recipe_data[listName]];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= list.length) return prev;
        const [movedItem] = list.splice(index, 1);
        list.splice(newIndex, 0, movedItem);
        return { ...prev, recipe_data: { ...prev.recipe_data, [listName]: list } };
    });
  };

  const dietOptions = ['N/A', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Paleo', 'Keto'];

  return (
    <div className="bg-white p-4 sm:p-6 animate-fade-in">
      <div className="space-y-6">
        <div className="p-4 border rounded-md">
            <h3 className="text-lg font-semibold text-teal-700 mb-4">Post Images</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Featured Image */}
                <div className="flex flex-col items-center justify-center gap-4">
                    <h4 className="font-medium text-slate-700">Featured Image</h4>
                    {editedPost.recipe_data.image ? (
                        <img 
                            src={`data:image/jpeg;base64,${editedPost.recipe_data.image}`} 
                            alt={editedPost.recipe_data.image_alt || 'Generated recipe image'}
                            className="w-full h-auto rounded-lg shadow-md object-cover aspect-video"
                        />
                    ) : (
                        <div className="w-full aspect-video bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                            <p>No featured image.</p>
                        </div>
                    )}
                    <button 
                        onClick={onRegenerateImage}
                        disabled={isRegeneratingImage}
                        className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 transition shadow-sm flex items-center justify-center gap-2"
                    >
                        {isRegeneratingImage ? <Spinner size="h-5 w-5" /> : <>{Icons.sparkles} Regenerate Image</>}
                    </button>
                </div>
                {/* Instruction Image */}
                <div className="flex flex-col items-center justify-center gap-4">
                     <h4 className="font-medium text-slate-700">Instruction Image</h4>
                    {editedPost.recipe_data.instruction_image ? (
                         <img 
                            src={`data:image/jpeg;base64,${editedPost.recipe_data.instruction_image}`} 
                            alt={editedPost.recipe_data.image_alt || 'Generated instruction image'}
                            className="w-full h-auto rounded-lg shadow-md object-cover aspect-video"
                        />
                    ) : (
                        <div className="w-full aspect-video bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                            <p>No instruction image.</p>
                        </div>
                    )}
                    <p className="text-xs text-slate-500 text-center">This optional second image will be inserted near the instructions in the article body.</p>
                </div>
            </div>
        </div>

        <div className="p-4 border rounded-md grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                 <h3 className="text-lg font-semibold text-teal-700 mb-4">Post Details</h3>
                <div className="space-y-4">
                    <InputField label="Post Title" name="post_title" value={editedPost.post_title} onChange={handlePostChange} />
                    <InputField label="Focus Keyword" name="focus_keyword" value={editedPost.focus_keyword || ''} onChange={handlePostChange} />
                    <InputField label="SEO Title" name="seo_title" value={editedPost.seo_title || ''} onChange={handlePostChange} />
                    <TextareaField label="Meta Description" name="meta_description" value={editedPost.meta_description || ''} onChange={handlePostChange} />
                    <InputField label="URL Slug" name="slug" value={editedPost.slug || ''} onChange={handlePostChange} />
                    <TextareaField label="Excerpt" name="excerpt" value={editedPost.excerpt || ''} onChange={handlePostChange} />
                </div>
            </div>
            <div>
                 <h3 className="text-lg font-semibold text-teal-700 mb-4">Article Body (HTML)</h3>
                <TextareaField label="" name="post_content" value={editedPost.post_content} onChange={handlePostChange} rows={18} />
            </div>
        </div>
        
        <div className="p-4 border rounded-md">
            <h3 className="text-lg font-semibold text-teal-700 mb-4">Recipe Card Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InputField label="Recipe Name" name="name" value={editedPost.recipe_data.name} onChange={handleRecipeDataChange} />
                <InputField label="Prep Time" name="prep_time" value={editedPost.recipe_data.prep_time} onChange={handleRecipeDataChange} />
                <InputField label="Cook Time" name="cook_time" value={editedPost.recipe_data.cook_time} onChange={handleRecipeDataChange} />
                <InputField label="Total Time" name="total_time" value={editedPost.recipe_data.total_time} onChange={handleRecipeDataChange} />
                <InputField label="Yield" name="yield" value={editedPost.recipe_data.yield} onChange={handleRecipeDataChange} />
                <InputField label="Cuisine" name="cuisine" value={editedPost.recipe_data.cuisine} onChange={handleRecipeDataChange} />
                <InputField label="Category" name="category" value={editedPost.recipe_data.category} onChange={handleRecipeDataChange} />
                 <InputField label="Method" name="method" value={editedPost.recipe_data.method || ''} onChange={handleRecipeDataChange} />
                 <div>
                    <label htmlFor="diet" className="block text-sm font-medium text-slate-700">Diet</label>
                    <select name="diet" id="diet" value={editedPost.recipe_data.diet || ''} onChange={handleRecipeDataChange} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm">
                        {dietOptions.map(opt => <option key={opt} value={opt === 'N/A' ? '' : opt}>{opt}</option>)}
                    </select>
                </div>
                 <InputField label="Video URL" name="video_url" value={editedPost.recipe_data.video_url || ''} onChange={handleRecipeDataChange} />
                 <div className="md:col-span-3">
                    <TextareaField label="Description" name="description" value={editedPost.recipe_data.description} onChange={handleRecipeDataChange} rows={2} />
                 </div>
                 <div className="md:col-span-3">
                    <InputField label="Keywords (comma-separated)" name="keywords" value={editedPost.recipe_data.keywords.join(', ')} onChange={handleKeywordsChange} />
                </div>
            </div>
        </div>

        <div className="p-4 border rounded-md grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div ref={ingredientsRef}>
                <h3 className="text-lg font-semibold text-teal-700 mb-4">Ingredients</h3>
                <div className="space-y-2">
                    {editedPost.recipe_data.ingredients.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input type="text" value={item} onChange={(e) => handleListChange('ingredients', index, e.target.value)} className="flex-grow px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm sm:text-sm" />
                            <button onClick={() => removeListItem('ingredients', index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md">{Icons.trash}</button>
                            <div className="flex flex-col"><button onClick={() => handleReorder('ingredients', index, 'up')} disabled={index === 0}>{Icons.arrowUp}</button><button onClick={() => handleReorder('ingredients', index, 'down')} disabled={index === editedPost.recipe_data.ingredients.length - 1}>{Icons.arrowDown}</button></div>
                        </div>
                    ))}
                    <button onClick={() => addListItem('ingredients')} className="mt-2 text-sm text-teal-600 font-semibold flex items-center gap-1">{Icons.add} Add Ingredient</button>
                </div>
            </div>
             <div ref={instructionsRef}>
                <h3 className="text-lg font-semibold text-teal-700 mb-4">Instructions</h3>
                <div className="space-y-2">
                    {editedPost.recipe_data.instructions.map((item, index) => (
                         <div key={index} className="flex items-start gap-2">
                            <textarea value={item} onChange={(e) => handleListChange('instructions', index, e.target.value)} rows={3} className="flex-grow px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm sm:text-sm" />
                            <div className="flex flex-col gap-1">
                                <button onClick={() => removeListItem('instructions', index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md">{Icons.trash}</button>
                                <div className="flex flex-col"><button onClick={() => handleReorder('instructions', index, 'up')} disabled={index === 0}>{Icons.arrowUp}</button><button onClick={() => handleReorder('instructions', index, 'down')} disabled={index === editedPost.recipe_data.instructions.length - 1}>{Icons.arrowDown}</button></div>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => addListItem('instructions')} className="mt-2 text-sm text-teal-600 font-semibold flex items-center gap-1">{Icons.add} Add Step</button>
                </div>
            </div>
             <div className="lg:col-span-2">
                 <h3 className="text-lg font-semibold text-teal-700 mb-4">Nutrition (per serving)</h3>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <InputField label="Serving Size" name="servingSize" value={editedPost.recipe_data.nutrition?.servingSize || ''} onChange={handleNutritionChange} />
                    <InputField label="Calories" name="calories" value={editedPost.recipe_data.nutrition?.calories || ''} onChange={handleNutritionChange} />
                    <InputField label="Protein" name="proteinContent" value={editedPost.recipe_data.nutrition?.proteinContent || ''} onChange={handleNutritionChange} />
                    <InputField label="Carbohydrates" name="carbohydrateContent" value={editedPost.recipe_data.nutrition?.carbohydrateContent || ''} onChange={handleNutritionChange} />
                    <InputField label="Fat" name="fatContent" value={editedPost.recipe_data.nutrition?.fatContent || ''} onChange={handleNutritionChange} />
                    <InputField label="Saturated Fat" name="saturatedFatContent" value={editedPost.recipe_data.nutrition?.saturatedFatContent || ''} onChange={handleNutritionChange} />
                    <InputField label="Sugar" name="sugarContent" value={editedPost.recipe_data.nutrition?.sugarContent || ''} onChange={handleNutritionChange} />
                    <InputField label="Sodium" name="sodiumContent" value={editedPost.recipe_data.nutrition?.sodiumContent || ''} onChange={handleNutritionChange} />
                 </div>
             </div>
             <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-teal-700 mb-4">Notes</h3>
                <TextareaField label="" name="notes" value={editedPost.recipe_data.notes || ''} onChange={handleRecipeDataChange} rows={3} />
             </div>
        </div>

      </div>
       <div className="p-4 mt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:items-center bg-white sm:bg-transparent sticky bottom-0 border-t sm:border-none">
          <button type="button" onClick={onCancel} className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="button" onClick={handleDraftClick} disabled={isSaving} className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-teal-700 bg-teal-100 border border-transparent rounded-lg hover:bg-teal-200 disabled:opacity-50 transition-colors">{isSaving ? <Spinner size="h-5 w-5"/> : 'Save as Draft'}</button>
          <button type="button" onClick={handlePublishClick} disabled={isSaving} className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">{isSaving ? <Spinner size="h-5 w-5"/> : 'Save & Publish'}</button>
      </div>
    </div>
  );
};
