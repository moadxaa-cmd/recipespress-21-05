import React, { useState, useRef } from 'react';
import type { WordPressSite, WordPressPost, WordPressCategory, ToastMessage, ToastType } from '../types';
import { updatePostCategory } from '../services/wordpressService';
import { Spinner } from '../components/Spinner';
import { Icons } from '../constants';

interface BulkCategoryUpdaterProps {
  sites: WordPressSite[];
  selectedSiteId: string;
  wpPosts: WordPressPost[];
  categories: WordPressCategory[];
  showToast: (config: string | ToastMessage, type?: ToastType) => void;
  isDataLoading: boolean;
  onBack?: () => void;
}

interface CsvRow {
  url: string;
  categoryName: string;
}

/**
 * Decodes HTML entities from a string (e.g., '&amp;' becomes '&').
 * This is crucial for matching category names that might be encoded differently
 * between the CSV file and the data received from WordPress.
 */
function decodeHtmlEntities(text: string): string {
    if (typeof document === 'undefined') {
        return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
    }
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

export const BulkCategoryUpdater: React.FC<BulkCategoryUpdaterProps> = ({ sites, selectedSiteId, wpPosts, categories, showToast, isDataLoading, onBack }) => {
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [fileName, setFileName] = useState('');
  const [failedRows, setFailedRows] = useState<CsvRow[]>([]);
  
  // Use ref to instantly track changes amidst rapid timeouts
  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFailedRows([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCsv(text);
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  const parseCsv = (text: string) => {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        showToast('CSV file must have a header row and at least one data row.', 'error');
        return;
      }
      
      const headerLine = lines[0].trim();
      const cleanHeaderLine = headerLine.charCodeAt(0) === 0xFEFF ? headerLine.substring(1) : headerLine;
      const header = cleanHeaderLine.split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const urlIndex = header.indexOf('url');
      const categoryIndex = header.indexOf('category');

      if (urlIndex === -1 || categoryIndex === -1) {
        showToast("CSV must contain 'URL' and 'CATEGORY' columns.", 'error');
        return;
      }

      // Format CSV strings into an accurate Javascript Object Array
      const data = lines.slice(1).map(line => {
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        return {
          url: values[urlIndex]?.trim().replace(/"/g, ''),
          categoryName: values[categoryIndex]?.trim().replace(/"/g, ''),
        };
      }).filter(row => row.url && row.categoryName);

      setCsvData(data);
      setProgress({ current: 0, total: data.length });
      setLogs([`Parsed ${data.length} rows from ${fileName}. Ready to process.`]);
      showToast({ message: `Loaded ${data.length} rows from CSV.`, type: 'success' });
    } catch (error) {
      showToast('Failed to parse CSV file. Please ensure it is valid.', 'error');
    }
  };

  const addLog = (message: string) => {
    if (isProcessingRef.current) {
      setLogs(prev => [message, ...prev]);
    }
  };

  const startUpdateProcess = async (dataToProcess: CsvRow[]) => {
    const site = sites.find(s => s.id === selectedSiteId);
    if (!site) { showToast('No site selected.', 'error'); return; }
    if (dataToProcess.length === 0) { showToast('No data to process.', 'error'); return; }
    if (categories.length === 0 || wpPosts.length === 0) { showToast('Site posts or categories not loaded. Please re-select the site.', 'error'); return; }
    
    setIsProcessing(true);
    addLog('--- Starting bulk update process ---');
    
    const localFailedRows: CsvRow[] = [];

    // Pre-normalize category names from WordPress for faster, more reliable lookups
    const categoryMap = new Map<string, WordPressCategory>();
    categories.forEach(cat => {
        const normalizedName = decodeHtmlEntities(cat.name.trim().toLowerCase());
        if (!categoryMap.has(normalizedName)) {
            categoryMap.set(normalizedName, cat);
        }
    });

    for (let i = 0; i < dataToProcess.length; i++) {
      const row = dataToProcess[i];
      setProgress({ current: i + 1, total: dataToProcess.length });
      
      const normalizeUrl = (url: string) => url ? url.trim().replace(/\/$/, '') : '';
      const post = wpPosts.find(p => normalizeUrl(p.link) === normalizeUrl(row.url));
      
      if (!post) {
        addLog(`[ERROR] Post not found for URL: ${row.url}`);
        localFailedRows.push(row);
        continue;
      }
      
      const normalizedCategoryNameFromCsv = decodeHtmlEntities(row.categoryName.trim().toLowerCase());
      const category = categoryMap.get(normalizedCategoryNameFromCsv);

      if (!category) {
        addLog(`[ERROR] Category '${row.categoryName}' not found for post '${post.title}'. Please check spelling and special characters (like '&').`);
        localFailedRows.push(row);
        continue;
      }

      try {
        await updatePostCategory(site, post.id, category.id); // Send instruction via authenticated wordpress service
        addLog(`[SUCCESS] Updated '${post.title}' to category '${category.name}'.`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addLog(`[FAIL] Failed to update '${post.title}': ${errorMessage}`);
        localFailedRows.push(row);
      }
      
      // Delay (300ms throttle) limits API flooding toward remote WordPress sites
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setFailedRows(localFailedRows);
    addLog(`--- Bulk update finished. ${dataToProcess.length - localFailedRows.length} successful, ${localFailedRows.length} failed. ---`);
    setIsProcessing(false);
    showToast({ message: 'Bulk update process finished! Check the logs for details.', type: 'success' });
  };

  const handleRetryFailed = () => {
    if (failedRows.length === 0) { showToast('No failed items to retry.', 'success'); return; }
    setLogs([]);
    startUpdateProcess(failedRows);
  };

  const downloadExampleCsv = () => {
    const csvContent = "URL,CATEGORY\nhttps://example.com/my-post,Desserts\nhttps://example.com/another-post,Main Course\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'example_categories.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isDataLoading) {
    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200/80 max-w-4xl mx-auto">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Bulk Category Updater</h2>
                    <p className="text-slate-500 mt-2">Update categories for posts in bulk by uploading a CSV file.</p>
                </div>
            </div>
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Spinner size="h-10 w-10" />
                <p className="mt-4 text-slate-600 font-semibold">Loading posts and categories...</p>
                <p className="text-sm text-slate-500">This may take a moment for sites with many posts.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200/80 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Bulk Category Updater</h2>
          <p className="text-slate-500 mt-2">Update categories for posts in bulk by uploading a CSV file.</p>
        </div>
      </div>

      <div className="space-y-4 p-4 border border-dashed rounded-lg bg-slate-50">
        <h3 className="font-semibold text-slate-700">Instructions</h3>
        <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1">
            <li>Save your Excel file as a CSV (Comma-Separated Values).</li>
            <li>Make sure your file has a header row with columns named <code className="bg-slate-200 px-1 rounded">URL</code> and <code className="bg-slate-200 px-1 rounded">CATEGORY</code>.</li>
            <li>Ensure category names in your file exactly match those in WordPress (case-insensitive).</li>
            <li>Upload the file, then click "Start Update".</li>
        </ol>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <label htmlFor="csv-upload" className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
          {Icons.upload}
          <span className="ml-2">Upload CSV File</span>
        </label>
        <button type="button" onClick={downloadExampleCsv} className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="ml-2">Download Example CSV</span>
        </button>
        <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        {fileName && <p className="text-sm text-slate-500 flex-grow">{fileName}</p>}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => startUpdateProcess(csvData)}
          disabled={isProcessing || csvData.length === 0}
          className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? <Spinner size="h-5 w-5" /> : 'Start Update'}
        </button>
      </div>
      
      {progress.total > 0 && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-base font-medium text-teal-700">{isProcessing ? 'Processing...' : (failedRows.length > 0 ? 'Finished with errors' : 'Ready')}</span>
            <span className="text-sm font-medium text-teal-700">{progress.current} of {progress.total}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div className="bg-teal-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}></div>
          </div>
        </div>
      )}
      
      {!isProcessing && failedRows.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-semibold text-yellow-800">{failedRows.length} items failed to update. Check the logs for details.</p>
          <button onClick={handleRetryFailed} className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 shadow-sm">
            Retry Failed Items
          </button>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-2">
            <h3 className="font-semibold text-slate-700">Logs</h3>
            <div className="w-full h-64 bg-slate-800 text-white font-mono text-xs p-4 rounded-lg overflow-y-auto flex flex-col-reverse">
              <div className="space-y-1">
                {logs.map((log, index) => (
                    <p key={index} className={log.startsWith('[ERROR]') || log.startsWith('[FAIL]') ? 'text-red-400' : (log.startsWith('[SUCCESS]') ? 'text-green-400' : 'text-slate-300')}>{log}</p>
                ))}
              </div>
            </div>
        </div>
      )}
    </div>
  );
};
