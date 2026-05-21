import React, { useState, useMemo } from 'react';
import type { WordPressSite, WordPressCategory, ToastMessage, ToastType, NewCategoryData } from '../types';
import { createCategory } from '../services/wordpressService';
import { generateCategoryDetails } from '../services/geminiService';
import { Spinner } from '../components/Spinner';

interface CreateCategoryProps {
  sites: WordPressSite[];
  selectedSiteId: string;
  categories: WordPressCategory[];
  isFetchingCategories: boolean;
  showToast: (config: string | ToastMessage, type?: ToastType) => void;
  onCategoryCreated: () => void;
  geminiApiKey: string;
  checkApiKey: () => boolean;
  onBack?: () => void;
}

export const CreateCategory: React.FC<CreateCategoryProps> = ({ sites, selectedSiteId, categories, isFetchingCategories, showToast, onCategoryCreated, geminiApiKey, checkApiKey, onBack }) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const selectedSite = sites.find(s => s.id === selectedSiteId);

  // Builds a visual tree of categories so child categories are indented properly inside the dropdown
  const categoryOptions = useMemo(() => {
    const buildCategoryTree = (
      cats: WordPressCategory[],
      parent: number = 0,
      depth: number = 0
    ): Array<WordPressCategory & { depth: number }> => {
      const children = cats.filter(c => c.parent === parent);
      let options: Array<WordPressCategory & { depth: number }> = [];
      children.forEach(child => {
        options.push({ ...child, depth });
        options = options.concat(buildCategoryTree(cats, child.id, depth + 1));
      });
      return options;
    };
    return buildCategoryTree(categories);
  }, [categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Category name is required.', 'error');
      return;
    }
    if (!selectedSite) {
      showToast('Please select a site first.', 'error');
      return;
    }
    if (!checkApiKey()) {
        return;
    }
    setIsSaving(true);
    try {
      // 1. Ask Gemini to generate a slug and description for this new category
      const { slug, description } = await generateCategoryDetails(geminiApiKey, name);

      const categoryData: NewCategoryData = {
        name,
        slug,
        description,
        parent: parentId || 0,
      };
      
      // 2. Create the category in WordPress via the API
      await createCategory(selectedSite, categoryData);
      onCategoryCreated();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create category.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200/80 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create New Category</h2>
            <p className="text-slate-500 mt-2">Add a new category to your selected WordPress site. The AI will automatically generate an SEO-friendly slug and description.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="category-name" className="block text-sm font-semibold text-slate-700">Name</label>
            <input id="category-name" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Desserts" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:text-sm" />
          </div>

          <div>
            <label htmlFor="parent-category" className="block text-sm font-semibold text-slate-700">Parent Category</label>
            <select
              id="parent-category"
              value={parentId || ''}
              onChange={e => setParentId(Number(e.target.value) || undefined)}
              disabled={!selectedSiteId || isFetchingCategories}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:text-sm disabled:bg-slate-100"
            >
              <option value="">{isFetchingCategories ? 'Loading...' : 'None'}</option>
              {categoryOptions.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {'--'.repeat(cat.depth)} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-slate-200">
          <button type="submit" disabled={isSaving || !selectedSiteId} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors">
            {isSaving ? <><Spinner size="h-5 w-5" /><span className="ml-2">Generating &amp; Saving...</span></> : 'Create Category'}
          </button>
        </div>
      </form>
    </div>
  );
};
