
import type { LogEntry } from '../types';

const LOG_KEY = 'recipepress-logs';
const MAX_LOGS = 50; // Reduced from 100 to save space

function sanitizeLogPayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;

    try {
        // Deep copy to avoid mutating the original object
        const sanitized = JSON.parse(JSON.stringify(payload));

        const traverseAndSanitize = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    // Sanitize keys known to hold base64 data, if they are long strings
                    if ((key === 'image' || key === 'base64' || key === 'data') && typeof obj[key] === 'string' && obj[key].length > 100) {
                        obj[key] = `[Data removed to save space (${(obj[key].length / 1024).toFixed(2)} KB)]`;
                    } 
                    // Sanitize any other large string (over 1KB), which is likely base64 data
                    else if (typeof obj[key] === 'string' && obj[key].length > 1000) { 
                        obj[key] = `[Long string removed to save space (${(obj[key].length / 1024).toFixed(2)} KB)]`;
                    } else if (typeof obj[key] === 'object') {
                        traverseAndSanitize(obj[key]);
                    }
                }
            }
        };

        traverseAndSanitize(sanitized);
        return sanitized;
    } catch (error) {
        console.error("Failed to sanitize log payload:", error);
        return { error: "Payload could not be sanitized." };
    }
}


export function getLogs(): LogEntry[] {
    try {
        const item = window.localStorage.getItem(LOG_KEY);
        return item ? JSON.parse(item) : [];
    } catch (error) {
        console.error("Failed to retrieve logs:", error);
        return [];
    }
}

export function addLog(entryData: Omit<LogEntry, 'id' | 'timestamp'>): void {
    try {
        let logs = getLogs();
        
        const sanitizedEntryData = {
            ...entryData,
            requestPayload: sanitizeLogPayload(entryData.requestPayload),
            response: sanitizeLogPayload(entryData.response),
        };

        const newLog: LogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            ...sanitizedEntryData
        };
        
        // Initial attempt: Add new log and keep strict max logs
        let updatedLogs = [newLog, ...logs].slice(0, MAX_LOGS);
        
        try {
            window.localStorage.setItem(LOG_KEY, JSON.stringify(updatedLogs));
        } catch (e: any) {
            // Handle Quota Exceeded Error
            if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn("LocalStorage quota exceeded. Trimming logs to fit.");
                
                // Retry strategy 1: Keep only the latest 5 logs
                updatedLogs = [newLog, ...logs].slice(0, 5);
                try {
                    window.localStorage.setItem(LOG_KEY, JSON.stringify(updatedLogs));
                } catch (retryError) {
                    console.error("Failed to add log even after trimming:", retryError);
                    // Retry strategy 2: Clear logs and try to save just the newest one, or give up
                    try {
                        window.localStorage.removeItem(LOG_KEY);
                        window.localStorage.setItem(LOG_KEY, JSON.stringify([newLog]));
                    } catch (finalError) {
                        console.error("Critical: Storage full, cannot save logs.", finalError);
                    }
                }
            } else {
                throw e; // Re-throw if it's not a quota error
            }
        }
    } catch (error) {
        console.error("Failed to add log:", error);
    }
}

export function clearLogs(): void {
    try {
        window.localStorage.removeItem(LOG_KEY);
    } catch (error) {
        console.error("Failed to clear logs:", error);
    }
}
