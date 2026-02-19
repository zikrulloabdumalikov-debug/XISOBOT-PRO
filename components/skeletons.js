
import React from 'react';
import htm from 'htm';

const html = htm.bind(React.createElement);

// --- KPI CARD SKELETON ---
export const KPISkeleton = () => html`
    <div class="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between animate-pulse">
        <div class="space-y-3">
            <!-- Label Placeholder -->
            <div class="h-2.5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            <!-- Number Placeholder -->
            <div class="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        </div>
        <!-- Icon Placeholder -->
        <div class="h-12 w-12 bg-slate-100 dark:bg-slate-700 rounded-2xl"></div>
    </div>
`;

// --- TABLE ROW SKELETON ---
export const TableRowSkeleton = () => html`
    <tr class="animate-pulse border-b border-slate-50 dark:border-slate-700/50">
        <td class="px-4 py-4 border-r border-slate-50 dark:border-slate-700">
            <div class="h-3 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </td>
        <td class="px-4 py-4 border-r border-slate-50 dark:border-slate-700">
            <div class="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </td>
        <td class="px-4 py-4 border-r border-slate-50 dark:border-slate-700">
            <div class="space-y-2">
                <div class="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div class="h-2 w-1/2 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </div>
        </td>
        <td class="px-4 py-4 border-r border-slate-50 dark:border-slate-700">
            <div class="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </td>
        <td class="px-4 py-4 border-r border-slate-50 dark:border-slate-700">
             <div class="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </td>
        <td class="px-4 py-4 border-r border-slate-50 dark:border-slate-700">
            <div class="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        </td>
        <td class="px-4 py-4 border-r border-slate-50 dark:border-slate-700">
            <div class="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </td>
        <td class="px-4 py-4 border-r border-slate-50 dark:border-slate-700">
            <div class="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </td>
        <td class="px-4 py-4 border-r border-slate-50 dark:border-slate-700">
            <div class="flex items-center gap-2">
                <div class="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                <div class="h-3 w-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
        </td>
        <td class="px-4 py-4 text-right">
             <div class="flex justify-end gap-2">
                <div class="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                <div class="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
             </div>
        </td>
    </tr>
`;
