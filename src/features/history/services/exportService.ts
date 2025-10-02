/**
 * Сервис для экспорта истории в различные форматы
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import type { ChargingHistoryItem, TransactionHistoryItem } from '../types';

// Расширяем интерфейс jsPDF для автотаблицы
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

interface ExportOptions {
  filename?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeStats?: boolean;
}

export class ExportService {
  /**
   * Экспортирует историю зарядок в PDF
   */
  static exportChargingHistoryToPDF(
    data: ChargingHistoryItem[],
    options: ExportOptions = {}
  ): void {
    const {
      filename = `charging_history_${new Date().toISOString().split('T')[0]}.pdf`,
      includeStats = true
    } = options;

    // Создаем новый PDF документ
    const doc = new jsPDF();

    // Добавляем заголовок
    doc.setFontSize(20);
    doc.text('История зарядок EvPower', 14, 20);

    // Добавляем дату генерации
    doc.setFontSize(10);
    doc.text(`Дата создания: ${new Date().toLocaleDateString('ru-RU')}`, 14, 30);

    // Если есть фильтр по датам
    if (options.dateRange) {
      doc.text(
        `Период: ${options.dateRange.start.toLocaleDateString('ru-RU')} - ${options.dateRange.end.toLocaleDateString('ru-RU')}`,
        14,
        36
      );
    }

    // Подготавливаем данные для таблицы
    const tableData = data.map(item => [
      new Date(item.startTime).toLocaleDateString('ru-RU'),
      new Date(item.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      item.stationName,
      item.connectorType,
      `${Math.floor(item.duration / 60)} мин`,
      `${item.energyConsumed.toFixed(2)} кВт⋅ч`,
      `${item.totalCost.toFixed(2)} сом`
    ]);

    // Создаем таблицу
    autoTable(doc, {
      startY: 45,
      head: [['Дата', 'Время', 'Станция', 'Тип', 'Длительность', 'Энергия', 'Стоимость']],
      body: tableData,
      theme: 'striped',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [33, 150, 243], // Material Blue
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Дата
        1: { cellWidth: 20 }, // Время
        2: { cellWidth: 55 }, // Станция
        3: { cellWidth: 25 }, // Тип
        4: { cellWidth: 25 }, // Длительность
        5: { cellWidth: 25 }, // Энергия
        6: { cellWidth: 25, halign: 'right' } // Стоимость
      }
    });

    // Добавляем статистику, если нужно
    if (includeStats && data.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 45;

      const totalEnergy = data.reduce((sum, item) => sum + item.energyConsumed, 0);
      const totalCost = data.reduce((sum, item) => sum + item.totalCost, 0);
      const totalDuration = data.reduce((sum, item) => sum + item.duration, 0);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Итого:', 14, finalY + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Всего сессий: ${data.length}`, 14, finalY + 22);
      doc.text(`Общая энергия: ${totalEnergy.toFixed(2)} кВт⋅ч`, 14, finalY + 28);
      doc.text(`Общее время: ${Math.floor(totalDuration / 60)} мин`, 14, finalY + 34);
      doc.text(`Общая стоимость: ${totalCost.toFixed(2)} сом`, 14, finalY + 40);
    }

    // Сохраняем PDF
    doc.save(filename);
  }

  /**
   * Экспортирует историю зарядок в CSV
   */
  static exportChargingHistoryToCSV(
    data: ChargingHistoryItem[],
    options: ExportOptions = {}
  ): void {
    const {
      filename = `charging_history_${new Date().toISOString().split('T')[0]}.csv`
    } = options;

    // Подготавливаем данные для CSV
    const csvData = data.map(item => ({
      'Дата': new Date(item.startTime).toLocaleDateString('ru-RU'),
      'Время начала': new Date(item.startTime).toLocaleTimeString('ru-RU'),
      'Время окончания': item.endTime
        ? new Date(item.endTime).toLocaleTimeString('ru-RU')
        : '',
      'Станция': item.stationName,
      'Адрес': item.stationAddress,
      'Коннектор': item.connectorType,
      'ID коннектора': item.connectorId,
      'Длительность (мин)': Math.floor(item.duration / 60),
      'Энергия (кВт⋅ч)': item.energyConsumed,
      'Стоимость (сом)': item.totalCost,
      'Средняя мощность (кВт)': item.averagePower,
      'Максимальная мощность (кВт)': item.maxPower,
      'Статус': item.status === 'completed' ? 'Завершено' : item.status
    }));

    // Конвертируем в CSV
    const csv = Papa.unparse(csvData, {
      delimiter: ',',
      header: true,
      newline: '\r\n',
      skipEmptyLines: true
    });

    // Добавляем BOM для корректного отображения кириллицы в Excel
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    // Создаем и скачиваем файл
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * Экспортирует историю транзакций в PDF
   */
  static exportTransactionHistoryToPDF(
    data: TransactionHistoryItem[],
    options: ExportOptions = {}
  ): void {
    const {
      filename = `transactions_${new Date().toISOString().split('T')[0]}.pdf`
    } = options;

    const doc = new jsPDF();

    // Заголовок
    doc.setFontSize(20);
    doc.text('История транзакций EvPower', 14, 20);

    // Дата генерации
    doc.setFontSize(10);
    doc.text(`Дата создания: ${new Date().toLocaleDateString('ru-RU')}`, 14, 30);

    // Подготавливаем данные для таблицы
    const tableData = data.map(item => {
      const typeLabel = item.type === 'topup' ? 'Пополнение' :
                       item.type === 'charge' ? 'Зарядка' :
                       item.type === 'refund' ? 'Возврат' : item.type;

      const statusLabel = item.status === 'success' ? 'Успешно' :
                         item.status === 'pending' ? 'В обработке' :
                         item.status === 'failed' ? 'Ошибка' : item.status;

      return [
        new Date(item.timestamp).toLocaleDateString('ru-RU'),
        new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        typeLabel,
        item.description,
        item.amount > 0 ? `+${item.amount.toFixed(2)}` : item.amount.toFixed(2),
        item.balance_after.toFixed(2),
        statusLabel
      ];
    });

    // Создаем таблицу
    autoTable(doc, {
      startY: 40,
      head: [['Дата', 'Время', 'Тип', 'Описание', 'Сумма (сом)', 'Баланс', 'Статус']],
      body: tableData,
      theme: 'striped',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [76, 175, 80], // Material Green
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 25 },
        3: { cellWidth: 55 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 20 }
      }
    });

    // Добавляем итоговую информацию
    const finalY = (doc as any).lastAutoTable.finalY || 40;

    const totalTopup = data
      .filter(t => t.type === 'topup' && t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCharge = data
      .filter(t => t.type === 'charge' && t.status === 'success')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Итого:', 14, finalY + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Всего транзакций: ${data.length}`, 14, finalY + 22);
    doc.text(`Пополнения: +${totalTopup.toFixed(2)} сом`, 14, finalY + 28);
    doc.text(`Списания: -${totalCharge.toFixed(2)} сом`, 14, finalY + 34);

    doc.save(filename);
  }

  /**
   * Экспортирует историю транзакций в CSV
   */
  static exportTransactionHistoryToCSV(
    data: TransactionHistoryItem[],
    options: ExportOptions = {}
  ): void {
    const {
      filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`
    } = options;

    // Подготавливаем данные для CSV
    const csvData = data.map(item => ({
      'Дата': new Date(item.timestamp).toLocaleDateString('ru-RU'),
      'Время': new Date(item.timestamp).toLocaleTimeString('ru-RU'),
      'Тип': item.type === 'topup' ? 'Пополнение' :
             item.type === 'charge' ? 'Зарядка' :
             item.type === 'refund' ? 'Возврат' : item.type,
      'Описание': item.description,
      'Сумма (сом)': item.amount,
      'Баланс до': item.balance_before,
      'Баланс после': item.balance_after,
      'Статус': item.status === 'success' ? 'Успешно' :
                item.status === 'pending' ? 'В обработке' :
                item.status === 'failed' ? 'Ошибка' : item.status,
      'ID сессии': item.sessionId || '',
      'Способ оплаты': item.paymentMethod || ''
    }));

    // Конвертируем в CSV
    const csv = Papa.unparse(csvData, {
      delimiter: ',',
      header: true,
      newline: '\r\n'
    });

    // Добавляем BOM для корректного отображения кириллицы
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    // Создаем и скачиваем файл
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * Определяет поддерживаемые форматы экспорта
   */
  static getSupportedFormats(): string[] {
    return ['PDF', 'CSV'];
  }

  /**
   * Проверяет, поддерживается ли формат
   */
  static isFormatSupported(format: string): boolean {
    return ['pdf', 'csv'].includes(format.toLowerCase());
  }
}