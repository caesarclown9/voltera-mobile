/**
 * Страница управления клиентами для администраторов
 *
 * Доступ: только admin и superadmin.
 * Позволяет просматривать клиентов, управлять балансом и статусом.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  User,
  Wallet,
  Ban,
  ChevronRight,
  UserX,
  DollarSign,
  Plus,
  Minus,
  X,
} from "lucide-react";
import { AdminBottomNavigation } from "../components/AdminBottomNavigation";
import { adminApi, type AdminClient } from "@/services/adminApi";
import { useUserType } from "@/features/auth/hooks/useUserType";
import { logger } from "@/shared/utils/logger";

type StatusFilter = "all" | "active" | "blocked";

/**
 * Карточка клиента
 */
function ClientCard({
  client,
  onClick,
  onBalanceClick,
  onStatusClick,
}: {
  client: AdminClient;
  onClick: () => void;
  onBalanceClick: (e: React.MouseEvent) => void;
  onStatusClick: (e: React.MouseEvent) => void;
}) {
  const isBlocked = client.status === "blocked";

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isBlocked ? "bg-error-50" : "bg-primary-50"}`}>
            {isBlocked ? (
              <UserX size={20} className="text-error-500" />
            ) : (
              <User size={20} className="text-primary-500" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {client.name || client.email || client.phone || "Неизвестный"}
            </h3>
            <p className="text-sm text-gray-500">
              {client.email || client.phone || "Нет контактов"}
            </p>
          </div>
        </div>
        <ChevronRight size={20} className="text-gray-400" />
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{client.balance.toFixed(0)}</p>
          <p className="text-xs text-gray-400">сом</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{client.sessions_count}</p>
          <p className="text-xs text-gray-400">сессий</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">
            {client.total_energy_kwh.toFixed(1)}
          </p>
          <p className="text-xs text-gray-400">кВт·ч</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={onBalanceClick}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary-50 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
        >
          <Wallet size={16} />
          Баланс
        </button>
        <button
          onClick={onStatusClick}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            isBlocked
              ? "bg-success-50 text-success-600 hover:bg-success-100"
              : "bg-error-50 text-error-600 hover:bg-error-100"
          }`}
        >
          {isBlocked ? <CheckCircle size={16} /> : <Ban size={16} />}
          {isBlocked ? "Разблокировать" : "Заблокировать"}
        </button>
      </div>
    </button>
  );
}

/**
 * Модалка корректировки баланса
 */
function BalanceModal({
  client,
  onClose,
  onSuccess,
}: {
  client: AdminClient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isPositive, setIsPositive] = useState(true);

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.adjustClientBalance(client.id, {
        amount: isPositive ? Number(amount) : -Number(amount),
        reason,
      }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error) => {
      logger.error("[AdminClients] Balance adjustment error:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reason) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Корректировка баланса</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Клиент: {client.name || client.email || client.phone}
          <br />
          Текущий баланс: <span className="font-semibold">{client.balance.toFixed(0)} сом</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип операции
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPositive(true)}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                  isPositive
                    ? "bg-success-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Plus size={16} />
                Пополнение
              </button>
              <button
                type="button"
                onClick={() => setIsPositive(false)}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                  !isPositive
                    ? "bg-error-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Minus size={16} />
                Списание
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сумма (сом)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="1"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Причина
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Укажите причину корректировки..."
              required
              minLength={3}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {mutation.isError && (
            <div className="p-3 bg-error-50 border border-error-200 rounded-lg">
              <p className="text-sm text-error-700">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Ошибка корректировки"}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !amount || !reason}
              className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <DollarSign size={18} />
              )}
              Применить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminClientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useUserType();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<AdminClient | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  // Проверка доступа (только admin+)
  const isAdmin = role === "admin" || role === "superadmin";

  // Получаем клиентов
  const {
    data: clientsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["adminClients", statusFilter, searchQuery],
    queryFn: () => {
      const params: Parameters<typeof adminApi.getClients>[0] = {
        limit: 100,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      return adminApi.getClients(params);
    },
    enabled: isAdmin,
    staleTime: 30 * 1000,
    retry: 2,
  });

  // Мутация для изменения статуса
  const statusMutation = useMutation({
    mutationFn: ({ clientId, status }: { clientId: string; status: "active" | "blocked" }) =>
      adminApi.updateClientStatus(clientId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminClients"] });
    },
    onError: (error) => {
      logger.error("[AdminClients] Status update error:", error);
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  const handleClientClick = (clientId: string) => {
    navigate(`/admin/clients/${clientId}`);
  };

  const handleBalanceClick = (e: React.MouseEvent, client: AdminClient) => {
    e.stopPropagation();
    setSelectedClient(client);
    setShowBalanceModal(true);
  };

  const handleStatusClick = (e: React.MouseEvent, client: AdminClient) => {
    e.stopPropagation();
    const newStatus = client.status === "blocked" ? "active" : "blocked";
    if (
      confirm(
        `${newStatus === "blocked" ? "Заблокировать" : "Разблокировать"} клиента ${
          client.name || client.email || client.phone
        }?`
      )
    ) {
      statusMutation.mutate({ clientId: client.id, status: newStatus });
    }
  };

  const handleBalanceSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["adminClients"] });
  };

  // Нет доступа
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm max-w-sm w-full text-center">
          <Ban size={48} className="text-error-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Доступ запрещен
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Управление клиентами доступно только администраторам
          </p>
          <button
            onClick={() => navigate("/admin")}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  // Ошибка загрузки
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm max-w-sm w-full text-center">
          <AlertTriangle size={48} className="text-error-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Ошибка загрузки
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {error instanceof Error ? error.message : "Не удалось загрузить клиентов"}
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-dark text-white">
        <div className="p-4 pt-safe">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Клиенты</h1>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={isFetching ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Поиск по email, телефону, имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {(
            [
              { key: "all", label: "Все" },
              { key: "active", label: "Активные" },
              { key: "blocked", label: "Заблокированные" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === key
                  ? "bg-primary-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Clients List */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          // Skeleton loader
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div>
                    <div className="w-32 h-5 bg-gray-200 rounded mb-1" />
                    <div className="w-24 h-4 bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="w-16 h-8 bg-gray-100 rounded mx-auto" />
                <div className="w-16 h-8 bg-gray-100 rounded mx-auto" />
                <div className="w-16 h-8 bg-gray-100 rounded mx-auto" />
              </div>
            </div>
          ))
        ) : clientsData && clientsData.data.length > 0 ? (
          clientsData.data.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => handleClientClick(client.id)}
              onBalanceClick={(e) => handleBalanceClick(e, client)}
              onStatusClick={(e) => handleStatusClick(e, client)}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <User size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? "Клиенты не найдены" : "Нет клиентов"}
            </p>
          </div>
        )}
      </div>

      {/* Balance Modal */}
      {showBalanceModal && selectedClient && (
        <BalanceModal
          client={selectedClient}
          onClose={() => {
            setShowBalanceModal(false);
            setSelectedClient(null);
          }}
          onSuccess={handleBalanceSuccess}
        />
      )}

      {/* Admin Navigation */}
      <AdminBottomNavigation />
    </div>
  );
}
