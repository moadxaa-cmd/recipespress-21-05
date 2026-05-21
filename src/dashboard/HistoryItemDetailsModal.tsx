

import React from 'react';
import type { PostHistoryItem } from '../types';
import { 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    RotateCw, 
    FileText,
    Globe,
    Calendar,
    X,
    Repeat
} from 'lucide-react';

const StatusIcon: React.FC<{ status: PostHistoryItem['status'], className?: string }> = ({ status, className = "" }) => {
    switch (status) {
        case 'published':
            return <CheckCircle2 className={`w-5 h-5 text-teal-500 ${className}`} />;
        case 'generating':
        case 'publishing':
            return <RotateCw className={`w-5 h-5 text-blue-500 animate-spin ${className}`} />;
        case 'failed':
            return <AlertCircle className={`w-5 h-5 text-rose-500 ${className}`} />;
        case 'draft':
            return <FileText className={`w-5 h-5 text-slate-400 ${className}`} />;
        case 'queued':
            return <Clock className={`w-5 h-5 text-amber-500 ${className}`} />;
        default:
            return <FileText className={`w-5 h-5 text-slate-400 ${className}`} />;
    }
};

const StatusText: React.FC<{ status: PostHistoryItem['status'] }> = ({ status }) => {
    const statusMap = {
        published: "Published Successfully",
        generating: "Generating AI Content...",
        publishing: "Publishing to WordPress...",
        failed: "Process Failed",
        draft: "Saved as Draft",
        queued: "Waiting in Queue",
    };
    return <span>{statusMap[status] || status}</span>;
};

interface HistoryItemDetailsModalProps {
    item: PostHistoryItem;
    onClose: () => void;
    onRetry: (item: PostHistoryItem) => void;
}

export const HistoryItemDetailsModal: React.FC<HistoryItemDetailsModalProps> = ({ item, onClose, onRetry }) => {
    
    const handleRetry = () => {
        onRetry(item);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 animate-in fade-in duration-200" aria-labelledby="modal-title" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
                    <h2 id="modal-title" className="text-lg font-bold text-slate-900">Operation Details</h2>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-grow space-y-6">
                    
                    {/* Status Banner */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-xl">
                        <StatusIcon status={item.status} className="w-6 h-6" />
                        <div>
                            <p className="font-semibold text-slate-900">
                                <StatusText status={item.status} />
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <FileText className="w-4 h-4" />
                                <h3 className="text-sm font-medium">Recipe Name</h3>
                            </div>
                            <p className="font-semibold text-slate-900">{item.recipe_data?.name || 'N/A'}</p>
                        </div>
                        
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <FileText className="w-4 h-4" />
                                <h3 className="text-sm font-medium">Target Post</h3>
                            </div>
                            <p className="font-medium text-slate-700">{item.targetPostTitle || 'Untitled Post'}</p>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <Globe className="w-4 h-4" />
                                <h3 className="text-sm font-medium">Target Site</h3>
                            </div>
                            <p className="font-medium text-slate-700">{item.siteName}</p>
                        </div>
                        
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <Calendar className="w-4 h-4" />
                                <h3 className="text-sm font-medium">Timestamp</h3>
                            </div>
                            <p className="font-medium text-slate-700">{new Date(item.publishedAt).toLocaleString()}</p>
                        </div>
                    </div>

                    {item.status === 'failed' && item.error && (
                         <div className="space-y-2">
                            <h3 className="text-sm font-medium text-rose-600 px-1">Error Details</h3>
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl overflow-x-auto">
                                <pre className="text-rose-800 whitespace-pre-wrap text-sm font-mono leading-relaxed">
                                    {item.error}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Close
                    </button>
                    {item.status === 'failed' && (
                        <button 
                            type="button" 
                            onClick={handleRetry} 
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                        >
                            <Repeat className="w-4 h-4" />
                            Retry Save
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
