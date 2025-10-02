import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { ExportService } from '../services/exportService';
import type { ChargingHistoryItem, TransactionHistoryItem } from '../types';

interface ExportButtonProps {
  data: ChargingHistoryItem[] | TransactionHistoryItem[];
  type: 'charging' | 'transaction';
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  type,
  className = ''
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    setShowMenu(false);

    try {
      if (type === 'charging') {
        ExportService.exportChargingHistoryToPDF(data as ChargingHistoryItem[]);
      } else {
        ExportService.exportTransactionHistoryToPDF(data as TransactionHistoryItem[]);
      }
    } catch (error) {
      console.error('Export to PDF failed:', error);
      alert('Не удалось экспортировать в PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    setShowMenu(false);

    try {
      if (type === 'charging') {
        ExportService.exportChargingHistoryToCSV(data as ChargingHistoryItem[]);
      } else {
        ExportService.exportTransactionHistoryToCSV(data as TransactionHistoryItem[]);
      }
    } catch (error) {
      console.error('Export to CSV failed:', error);
      alert('Не удалось экспортировать в CSV');
    } finally {
      setIsExporting(false);
    }
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className={`
          flex items-center gap-2 px-4 py-2
          bg-blue-500 text-white rounded-lg
          hover:bg-blue-600 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isExporting ? 'animate-pulse' : ''}
        `}
      >
        <Download size={18} />
        <span>Экспорт</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <button
            onClick={handleExportPDF}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors rounded-t-lg"
          >
            <FileText size={18} className="text-red-500" />
            <span>Экспорт в PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors rounded-b-lg border-t border-gray-100"
          >
            <FileSpreadsheet size={18} className="text-green-500" />
            <span>Экспорт в CSV</span>
          </button>
        </div>
      )}

      {/* Клик вне меню закрывает его */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};