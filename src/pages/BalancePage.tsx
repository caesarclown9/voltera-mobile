import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BalanceCard } from "../features/balance/components/BalanceCard";

export const BalancePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate("/profile")}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="ml-4 text-xl font-semibold">Баланс</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          <BalanceCard onTopupClick={() => navigate("/balance/topup")} />

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">История транзакций</h2>
            <p className="text-gray-500">Загрузка истории...</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BalancePage;
