


import React, { useState } from 'react';
import type { ArticleAgentSettings as ArticleAgentSettingsType, KnowledgeFile, ToastType, AffiliateLink } from '../types';
import { Icons } from '../constants';

interface ArticleAgentSettingsProps {
  settings: ArticleAgentSettingsType;
  setSettings: (settings: ArticleAgentSettingsType) => void;
  showToast: (message: string, type?: ToastType) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ArticleAgentSettings: React.FC<ArticleAgentSettingsProps> = ({ settings, setSettings, showToast }) => {
  const [formState, setFormState] = useState(settings);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: name === 'internalLinks' || name === 'externalLinks' ? Number(value) : value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const allowedTypes = ['text/plain', 'text/markdown', 'application/json'];
      
      // FIX: Explicitly type `file` as `File` to resolve properties not existing on `unknown`.
      files.forEach((file: File) => {
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md')) {
          showToast(`File type not supported for ${file.name}. Please use .txt, .md, or .json files.`, 'error');
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
            showToast(`File "${file.name}" is too large (max 5MB).`, 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            let content = event.target.result as string;
            // If it's a JSON file, we stringify it to ensure it's treated as a block of text knowledge
            if (file.type === 'application/json') {
                try {
                    const parsed = JSON.parse(content);
                    content = JSON.stringify(parsed, null, 2);
                } catch {
                    showToast(`Could not parse JSON file: ${file.name}`, 'error');
                    return;
                }
            }
            const newFile: KnowledgeFile = { name: file.name, content };
            setFormState(prev => ({
              ...prev,
              knowledgeFiles: [...prev.knowledgeFiles.filter(f => f.name !== newFile.name), newFile]
            }));
          }
        };
        reader.readAsText(file);
      });
      // Reset file input
      e.target.value = '';
    }
  };

  const removeKnowledgeFile = (fileName: string) => {
    setFormState(prev => ({ ...prev, knowledgeFiles: prev.knowledgeFiles.filter(f => f.name !== fileName) }));
  };

  const handleAddLink = () => {
    setFormState(prev => ({
      ...prev,
      affiliateLinks: [...(prev.affiliateLinks || []), { productName: '', url: '' }]
    }));
  };

  const handleLinkChange = (index: number, field: keyof AffiliateLink, value: string) => {
    setFormState(prev => {
        const newLinks = [...(prev.affiliateLinks || [])];
        newLinks[index] = { ...newLinks[index], [field]: value };
        return { ...prev, affiliateLinks: newLinks };
    });
  };

  const handleRemoveLink = (index: number) => {
    setFormState(prev => ({
        ...prev,
        affiliateLinks: (prev.affiliateLinks || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(formState);
    showToast('Article Agent settings saved successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Article Agent Configuration</h2>
        <p className="text-slate-500 mt-1">
          Customize the AI's persona, knowledge base, and writing rules for full article generation.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="mt-6 space-y-8">
        <div className="p-6 bg-white rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Agent Persona</h3>
            <p className="text-sm text-slate-500 mb-4">Define the AI's writing style and tone.</p>
            <textarea
              name="mainPrompt"
              value={formState.mainPrompt}
              onChange={handleInputChange}
              rows={5}
              className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:text-sm"
              placeholder="e.g., You are an expert food blogger..."
            />
        </div>

        <div className="p-6 bg-white rounded-lg border border-slate-200">
             <h3 className="text-lg font-semibold text-slate-800">Linking Strategy</h3>
             <p className="text-sm text-slate-500 mb-4">Instruct the AI on how to include links in the generated content.</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="internalLinks" className="block text-sm font-medium text-slate-700">Internal Links per Article</label>
                    <input type="number" name="internalLinks" id="internalLinks" min="0" value={formState.internalLinks} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:text-sm" />
                </div>
                 <div>
                    <label htmlFor="externalLinks" className="block text-sm font-medium text-slate-700">External Links per Article</label>
                    <input type="number" name="externalLinks" id="externalLinks" min="0" value={formState.externalLinks} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:text-sm" />
                </div>
             </div>
        </div>

        <div className="p-6 bg-white rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Content Language</h3>
            <p className="text-sm text-slate-500 mb-4">Choose the language in which the AI will write all article content and recipe fields.</p>
            <div>
                <label htmlFor="language" className="block text-sm font-medium text-slate-700">Article Language</label>
                <select
                    name="language"
                    id="language"
                    value={formState.language || 'English'}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:text-sm"
                >
                    <option value="English">🇬🇧 English</option>
                    <option value="French">🇫🇷 French (Français)</option>
                    <option value="Spanish">🇪🇸 Spanish (Español)</option>
                    <option value="German">🇩🇪 German (Deutsch)</option>
                </select>
                <p className="mt-2 text-xs text-slate-400">The AI will generate the full article, recipe card, meta description, and all other fields in the selected language.</p>
            </div>
        </div>

        <div className="p-6 bg-white rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Affiliate Link Manager</h3>
            <p className="text-sm text-slate-500 mb-4">Provide a list of products and their links. The AI will intelligently insert them where relevant.</p>
            
            <div className="space-y-3">
                {formState.affiliateLinks && formState.affiliateLinks.length > 0 ? (
                    formState.affiliateLinks.map((link, index) => (
                        <div key={index} className="flex gap-3 items-start">
                            <input 
                                type="text" 
                                placeholder="Product Name (e.g. 'Air Fryer')" 
                                value={link.productName} 
                                onChange={(e) => handleLinkChange(index, 'productName', e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            <input 
                                type="url" 
                                placeholder="Affiliate URL (e.g. https://amazon...)" 
                                value={link.url} 
                                onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            <button type="button" onClick={() => handleRemoveLink(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Remove Link">
                                {Icons.trash}
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-4 border-2 border-dashed border-slate-200 rounded-md">
                        <p className="text-slate-400 text-sm">No affiliate links added yet.</p>
                    </div>
                )}
            </div>
            <button type="button" onClick={handleAddLink} className="mt-4 text-sm text-teal-600 font-semibold flex items-center gap-1 hover:text-teal-800 transition-colors">
                {Icons.add} Add Product Link
            </button>
        </div>

        <div className="p-6 bg-white rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Knowledge Base</h3>
            <p className="text-sm text-slate-500 mb-4">Upload files containing custom information or data for the AI to use. Max 5MB per file.</p>
             <input
                type="file"
                multiple
                accept=".txt,.md,.json,text/plain,text/markdown,application/json"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-colors"
            />
            {formState.knowledgeFiles.length > 0 && (
                <div className="mt-6 space-y-2">
                    <h4 className="font-medium text-sm text-slate-600">Uploaded Files:</h4>
                    <ul className="divide-y divide-slate-200/80 border border-slate-200/80 rounded-lg">
                        {formState.knowledgeFiles.map(file => (
                            <li key={file.name} className="px-3 py-2 flex justify-between items-center text-sm">
                                <span className="text-slate-700 font-medium truncate pr-4">{file.name}</span>
                                <button type="button" onClick={() => removeKnowledgeFile(file.name)} className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 transition-colors">{Icons.trash}</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button type="submit" className="inline-flex justify-center py-2 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors">
            Save Agent Settings
          </button>
        </div>
      </form>
    </div>
  );
};