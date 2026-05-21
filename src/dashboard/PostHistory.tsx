
import React from 'react';
import type { PostHistoryItem } from '../types';
import { Icons } from '../constants';
import { 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    RotateCw, 
    ExternalLink, 
    ChevronRight,
    FileText,
    Globe
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

const StatusBadge: React.FC<{ status: PostHistoryItem['status'], className?: string }> = ({ status, className = "" }) => {
    const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider";
    switch (status) {
        case 'published':
            return <div className={`${base} bg-teal-50 text-teal-700 border border-teal-200 ${className}`}><CheckCircle2 className="w-3.5 h-3.5" /> Published</div>;
        case 'generating':
        case 'publishing':
            return <div className={`${base} bg-blue-50 text-blue-700 border border-blue-200 ${className}`}><RotateCw className="w-3.5 h-3.5 animate-spin" /> In Progress</div>;
        case 'failed':
            return <div className={`${base} bg-rose-50 text-rose-700 border border-rose-200 ${className}`}><AlertCircle className="w-3.5 h-3.5" /> Failed</div>;
        case 'draft':
            return <div className={`${base} bg-slate-100 text-slate-700 border border-slate-200 ${className}`}><FileText className="w-3.5 h-3.5" /> Draft</div>;
        case 'queued':
            return <div className={`${base} bg-amber-50 text-amber-700 border border-amber-200 ${className}`}><Clock className="w-3.5 h-3.5" /> Queued</div>;
        default:
            return <div className={`${base} bg-slate-100 text-slate-700 border border-slate-200 ${className}`}><FileText className="w-3.5 h-3.5" /> Unknown</div>;
    }
};

function formatRelativeTime(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) {
        return "just now";
    } else if (minutes < 60) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (days === 1) {
        return "Yesterday";
    } else if (days < 7) {
        return `${days} days ago`;
    } else {
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

export const PostHistory: React.FC<{ 
    posts: PostHistoryItem[], 
    onViewDetails: (item: PostHistoryItem) => void,
    isQueuePaused: boolean,
    queueLength: number,
    onResumeQueue: () => void,
}> = ({ posts, onViewDetails, isQueuePaused, queueLength, onResumeQueue }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Activity Log</h2>
          <p className="text-slate-500 mt-1">Track the status of your post generations and updates.</p>
        </div>
      </div>
      
      {isQueuePaused && queueLength > 0 && (
          <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">Queue Paused</p>
                    <p className="text-sm text-amber-700/80 mt-0.5">The generation queue is paused, likely due to an API rate limit.</p>
                  </div>
              </div>
              <button 
                  onClick={onResumeQueue} 
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-amber-900 bg-amber-100/50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors shadow-sm whitespace-nowrap"
              >
                  Resume Queue
              </button>
          </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center">
            <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No recent activity</h3>
            <p className="mt-2 text-slate-500 text-sm max-w-sm">Generate or update a post from the Dashboard to see its progress here.</p>
        </div>
      ) : (
        <div className="relative">
           {/* Timeline line */}
           <div className="absolute left-6 top-8 bottom-8 w-px bg-slate-200/60 hidden sm:block"></div>
           
           <div className="space-y-4 sm:space-y-6">
              {posts.map((post, index) => (
                <div key={post.id} className="relative sm:pl-16 group">
                   
                   {/* Timeline icon indicator (desktop only) */}
                   <div className="absolute left-0 top-6 hidden sm:flex h-12 w-12 items-center justify-center">
                       <div className="h-10 w-10 rounded-full bg-white border-4 border-slate-50 flex items-center justify-center shadow-sm relative z-10">
                           <StatusIcon status={post.status} className="w-5 h-5" />
                       </div>
                   </div>

                   {/* Card */}
                   <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 hover:border-slate-300/60 hover:shadow-md transition-all duration-200 overflow-hidden">
                       <div className="p-5 sm:p-6">
                           <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                               
                               <div className="flex-grow space-y-3 min-w-0">
                                   <div className="flex items-center gap-3 sm:hidden mb-1">
                                    <StatusBadge status={post.status} />
                               </div>

                                   <div>
                                       <div className="flex items-center gap-2 mb-1.5">
                                            <h3 className="text-lg font-bold text-slate-900 leading-tight truncate" title={post.targetPostTitle}>
                                               {post.targetPostTitle || 'Untitled Post'}
                                            </h3>
                                            <div className="hidden sm:block">
                                                 <StatusBadge status={post.status} />
                                            </div>
                                       </div>
                                       
                                       {post.recipe_data?.name && (
                                           <div className="text-sm text-slate-500 flex items-center gap-2 truncate">
                                                <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold text-slate-600">Recipe Model</span>
                                                <span title={post.recipe_data.name}>{post.recipe_data.name}</span>
                                           </div>
                                       )}
                                   </div>

                                   <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 mt-2">
                                        <div className="flex items-center gap-1.5">
                                            <Globe className="w-4 h-4 text-slate-400" />
                                            <span className="font-medium text-slate-700 truncate max-w-[150px]" title={post.siteName}>{post.siteName}</span>
                                        </div>
                                        <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            <span>{formatRelativeTime(post.publishedAt)}</span>
                                        </div>
                                        <div className="sm:hidden mt-2 w-full">
                                             <StatusBadge status={post.status} />
                                        </div>
                                   </div>

                                   {post.status === 'failed' && post.error && (
                                       <div className="mt-4 p-3 bg-rose-50 rounded-lg border border-rose-100 flex items-start gap-3">
                                           <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                                           <p className="text-sm text-rose-800 break-words" title={post.error}>{post.error}</p>
                                       </div>
                                   )}
                                   
                                   {post.status === 'queued' && post.error && (
                                       <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-3">
                                           <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                           <p className="text-sm text-amber-800 break-words" title={post.error}>{post.error}</p>
                                       </div>
                                   )}
                               </div>

                               <div className="pt-4 sm:pt-0 flex sm:flex-col items-center justify-end sm:justify-start gap-2 flex-shrink-0">
                                   <button 
                                       onClick={() => onViewDetails(post)} 
                                       className="w-full text-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                   >
                                       View Details
                                   </button>
                                   
                                   {post.status === 'published' && post.publishedUrl && (
                                     <a 
                                       href={post.publishedUrl} 
                                       target="_blank" 
                                       rel="noopener noreferrer" 
                                       className="w-full text-center px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg shadow-sm hover:bg-teal-100 transition-colors"
                                     >
                                       Open Live
                                       <ExternalLink className="w-3.5 h-3.5" />
                                     </a>
                                   )}
                               </div>

                           </div>
                       </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};
