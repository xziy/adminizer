import React from 'react';
import {
    Plus,
    Minus,
    Edit,
    ArrowRight,
    Eye,
} from 'lucide-react';

interface Change {
    field: string;
    oldValue: any;
    newValue: any;
    type: string;
}

interface DiffViewerProps {
    changes: Change[];
    title?: string;
    className?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = (
    {
        changes,
        title = 'Changes',
        className = ''
    }) => {
    if (!changes || changes.length === 0) {
        return (
            <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
                <div className="flex items-center text-green-600">
                    <Eye className="w-5 h-5 mr-2"/>
                    <span>Changes not found</span>
                </div>
            </div>
        );
    }

    const formatValue = (value: any): string => {
        if (value === null) return 'null';
        if (value === undefined) return '—';
        if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const getChangeType = (change: Change): 'added' | 'removed' | 'modified' => {
        if (change.oldValue === undefined) return 'added';
        if (change.newValue === undefined) return 'removed';
        return 'modified';
    };

    return (
        <div className={`bg-white border border-gray-200 rounded-lg shadow-sm pr-4 ${className}`}>
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Edit className="w-5 h-5 mr-2"/>
                    {title} ({changes.length})
                </h3>
            </div>

            <div className="divide-y divide-gray-200">
                {changes.map((change, index) => {
                    const changeType = getChangeType(change);
                    const icon = changeType === 'added' ? Plus : changeType === 'removed' ? Minus : Edit;
                    const color = changeType === 'added' ? 'text-green-600' :
                        changeType === 'removed' ? 'text-red-600' : 'text-blue-600';

                    return (
                        <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                    {React.createElement(icon, {className: `w-4 h-4 mr-2 ${color}`})}
                                    <span className="font-medium text-gray-900">{change.field}</span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${color} bg-opacity-10 ${
                                    changeType === 'added' ? 'bg-green-100' :
                                        changeType === 'removed' ? 'bg-red-100' :
                                            'bg-blue-100'
                                }`}>
                  {changeType === 'added' ? 'Added' :
                      changeType === 'removed' ? 'Removed' : 'Updated'}
                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {changeType !== 'added' && (
                                    <div className="p-2 bg-red-50 border border-red-100 rounded">
                                        <div className="text-xs text-red-600 font-medium mb-1">Old:</div>
                                        <div className="text-red-800 font-mono break-words">
                                            {formatValue(change.oldValue)}
                                        </div>
                                    </div>
                                )}

                                {changeType !== 'removed' && (
                                    <div className="p-2 bg-green-50 border border-green-100 rounded">
                                        <div className="text-xs text-green-600 font-medium mb-1">New:</div>
                                        <div className="text-green-800 font-mono break-words">
                                            {formatValue(change.newValue)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {changeType === 'modified' && (
                                <div className="mt-2 flex items-center text-xs text-gray-500">
                                    <ArrowRight className="w-3 h-3 mr-1"/>
                                    changed type: {change.type}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};