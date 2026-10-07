import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { bankStatementApi } from "@/api/bankStatment";

type Tab = "overview" | "transactions" | "clusters";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "clusters", label: "Clusters" },
];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatCurrency(value: number | string | null | undefined) {
  return currencyFormatter.format(toNumber(value));
}

function formatNumber(value: number | string | null | undefined) {
  return numberFormatter.format(toNumber(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parts = value.split("-");

  // Supports DD-MM-YYYY from the extracted statement
  if (parts.length === 3 && parts[0].length === 2) {
    const [day, month, year] = parts;

    const date = new Date(Number(year), Number(month) - 1, Number(day));

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    }
  }

  return value;
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Badge({
  children,
  type = "default",
}: {
  children: React.ReactNode;
  type?: "default" | "success" | "danger";
}) {
  const className =
    type === "success"
      ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
      : type === "danger"
        ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
        : "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>

      <p
        className={`mt-1 text-lg font-semibold text-gray-800 dark:text-white ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

export default function ManualBankStatementDetail() {
  const { id } = useParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const statementId = Number(id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["manual-bank-statement", statementId],
    queryFn: () => bankStatementApi.manualDetail(statementId),
    enabled: Number.isInteger(statementId) && statementId > 0,
  });

  const statement = data?.data?.data;


  const transactions = statement?.transactions ?? [];
  const clusters = statement?.clusters ?? [];

  const summary = useMemo(() => {
    const credits = transactions.filter(
      (transaction) => transaction.transaction_type === "CREDIT",
    );

    const debits = transactions.filter(
      (transaction) => transaction.transaction_type === "DEBIT",
    );

    const totalCredit = credits.reduce(
      (sum, transaction) => sum + toNumber(transaction.amount),
      0,
    );

    const totalDebit = debits.reduce(
      (sum, transaction) => sum + toNumber(transaction.amount),
      0,
    );

    const netMovement = totalCredit - totalDebit;

    return {
      creditCount: credits.length,
      debitCount: debits.length,
      totalCredit,
      totalDebit,
      netMovement,
    };
  }, [transactions]);

  if (isLoading) {
    return (
      <div>
        <PageMeta
          title="Bank Statement"
          description="bank statement details"
        />

        <PageBreadcrumb pageTitle="Bank Statement" />

        <div className="py-12 text-center text-sm text-gray-500">
          Loading statement...
        </div>
      </div>
    );
  }

  if (isError || !statement) {
    return (
      <div>
        <PageMeta
          title="Bank Statement"
          description="bank statement details"
        />

        <PageBreadcrumb pageTitle="Bank Statement" />

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
          {error instanceof Error
            ? error.message
            : "Failed to load bank statement."}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageMeta
        title="Bank Statement"
        description="bank statement details"
      />

      <PageBreadcrumb pageTitle=" Bank Statement" />

      <div className="space-y-6">
        {/* HEADER */}
        <ComponentCard title="">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {statement.business_name || "Bank Statement"}
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Account Reference:{" "}
                <span className="font-medium">
                  {statement.account_reference || "—"}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>{formatNumber(transactions.length)} transactions</Badge>

              <Badge>{formatNumber(clusters.length)} clusters</Badge>
            </div>
          </div>
        </ComponentCard>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Opening Balance"
            value={formatCurrency(statement.opening_balance)}
          />

          <Stat
            label="Closing Balance"
            value={formatCurrency(statement.closing_balance)}
          />

          <Stat
            label="Total Received"
            value={formatCurrency(summary.totalCredit)}
            valueClassName="text-green-600 dark:text-green-400"
          />

          <Stat
            label="Total Paid"
            value={formatCurrency(summary.totalDebit)}
            valueClassName="text-red-600 dark:text-red-400"
          />
        </div>

        {/* TABS */}
        <ComponentCard title="">
          <div className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? "border-brand-500 text-brand-500"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6">
            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Stat
                    label="Net Movement"
                    value={formatCurrency(summary.netMovement)}
                    valueClassName={
                      summary.netMovement >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  />

                  <Stat
                    label="Transactions"
                    value={formatNumber(transactions.length)}
                  />

                  <Stat
                    label="Credits"
                    value={formatNumber(summary.creditCount)}
                    valueClassName="text-green-600 dark:text-green-400"
                  />

                  <Stat
                    label="Debits"
                    value={formatNumber(summary.debitCount)}
                    valueClassName="text-red-600 dark:text-red-400"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* ACCOUNT INFORMATION */}
                  <div>
                    <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
                      Account Information
                    </h3>

                    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                      {[
                        [
                          "Business Name",
                          statement.business_name || "Not available",
                        ],
                        [
                          "Account Reference",
                          statement.account_reference || "Not available",
                        ],
                        [
                          "Business Type",
                          statement.business_type || "Not available",
                        ],
                        [
                          "Statement Period",
                          statement.statement_period || "Not available",
                        ],
                        [
                          "Opening Balance",
                          formatCurrency(statement.opening_balance),
                        ],
                        [
                          "Closing Balance",
                          formatCurrency(statement.closing_balance),
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex justify-between gap-4 px-4 py-3"
                        >
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {label}
                          </span>

                          <span className="text-right text-sm font-medium text-gray-800 dark:text-white">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* EXTRACTION INFORMATION */}
                  <div>
                    <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
                      Extraction Information
                    </h3>

                    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                      {[
                        ["Record ID", String(statement.id)],
                        ["Model", statement.model || "—"],
                        ["Prompt Version", statement.prompt_version || "—"],
                        [
                          "Transaction Count",
                          formatNumber(transactions.length),
                        ],
                        ["Cluster Count", formatNumber(clusters.length)],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex justify-between gap-4 px-4 py-3"
                        >
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {label}
                          </span>

                          <span className="text-right text-sm font-medium text-gray-800 dark:text-white">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* BALANCE SUMMARY */}
                <div>
                  <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
                    Balance Summary
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Opening Balance
                      </p>

                      <p className="mt-2 text-xl font-semibold text-gray-800 dark:text-white">
                        {formatCurrency(statement.opening_balance)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Net Movement
                      </p>

                      <p
                        className={`mt-2 text-xl font-semibold ${
                          summary.netMovement >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {formatCurrency(summary.netMovement)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Closing Balance
                      </p>

                      <p className="mt-2 text-xl font-semibold text-gray-800 dark:text-white">
                        {formatCurrency(statement.closing_balance)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TRANSACTIONS */}
            {activeTab === "transactions" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                      All Transactions
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatNumber(transactions.length)} transactions extracted
                      from the statement.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="w-full min-w-[1200px]">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                          Date
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                          Narration
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                          Reference
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                          Value Date
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                          Withdrawal
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                          Deposit
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                          Closing Balance
                        </th>

                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">
                          Type
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                          Amount
                        </th>

                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">
                          Page
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {transactions.map((transaction, index) => {
                        const isCredit =
                          transaction.transaction_type === "CREDIT";

                        return (
                          <tr
                            key={`${transaction.reference}-${index}`}
                            className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                          >
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {formatDate(transaction.date)}
                            </td>

                            <td className="max-w-[280px] px-4 py-3">
                              <p className="text-sm font-medium text-gray-800 dark:text-white">
                                {transaction.narration || "—"}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                {transaction.normalized_narration || "—"}
                              </p>
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-500">
                              {transaction.reference || "—"}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatDate(transaction.value_date)}
                            </td>

                            <td className="px-4 py-3 text-right text-sm text-red-600 dark:text-red-400">
                              {toNumber(transaction.withdrawal) > 0
                                ? formatCurrency(transaction.withdrawal)
                                : "—"}
                            </td>

                            <td className="px-4 py-3 text-right text-sm text-green-600 dark:text-green-400">
                              {toNumber(transaction.deposit) > 0
                                ? formatCurrency(transaction.deposit)
                                : "—"}
                            </td>

                            <td className="px-4 py-3 text-right text-sm font-medium text-gray-800 dark:text-white">
                              {formatCurrency(transaction.closing_balance)}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <Badge type={isCredit ? "success" : "danger"}>
                                {formatLabel(transaction.transaction_type)}
                              </Badge>
                            </td>

                            <td
                              className={`px-4 py-3 text-right text-sm font-semibold ${
                                isCredit
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {formatCurrency(transaction.amount)}
                            </td>

                            <td className="px-4 py-3 text-center text-sm text-gray-500">
                              {transaction.page}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {transactions.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
                    No transactions found.
                  </div>
                )}
              </div>
            )}

            {/* CLUSTERS */}
            {activeTab === "clusters" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                    Transaction Clusters
                  </h3>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Transactions grouped by normalized narration and transaction
                    type.
                  </p>
                </div>

                <div className="space-y-4">
                  {clusters.map((cluster) => {
                    const isCredit = cluster.transaction_type === "CREDIT";

                    return (
                      <div
                        key={cluster.cluster_id}
                        className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
                      >
                        {/* CLUSTER HEADER */}
                        <div className="flex flex-col gap-4 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-white/[0.02]">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-gray-800 dark:text-white">
                                {formatLabel(cluster.cluster_key)}
                              </h4>

                              <Badge type={isCredit ? "success" : "danger"}>
                                {formatLabel(cluster.transaction_type)}
                              </Badge>
                            </div>

                            <p className="mt-1 text-xs text-gray-500">
                              Cluster #{cluster.cluster_id}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">
                                Transactions:
                              </span>{" "}
                              <span className="font-semibold text-gray-800 dark:text-white">
                                {formatNumber(cluster.transaction_count)}
                              </span>
                            </div>

                            <div>
                              <span className="text-gray-500">Total:</span>{" "}
                              <span
                                className={`font-semibold ${
                                  isCredit
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {formatCurrency(cluster.total_amount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* CLUSTER TRANSACTIONS */}
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[1000px]">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-gray-800">
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                  Date
                                </th>

                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                  Narration
                                </th>

                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                  Reference
                                </th>

                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                                  Amount
                                </th>

                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                                  Closing Balance
                                </th>

                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">
                                  Page
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {cluster.transactions.map(
                                (transaction, index) => (
                                  <tr key={`${transaction.reference}-${index}`}>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                      {formatDate(transaction.date)}
                                    </td>

                                    <td className="px-4 py-3">
                                      <p className="text-sm font-medium text-gray-800 dark:text-white">
                                        {transaction.narration}
                                      </p>

                                      <p className="mt-1 text-xs text-gray-400">
                                        {transaction.normalized_narration}
                                      </p>
                                    </td>

                                    <td className="px-4 py-3 text-sm text-gray-500">
                                      {transaction.reference}
                                    </td>

                                    <td
                                      className={`px-4 py-3 text-right text-sm font-semibold ${
                                        isCredit
                                          ? "text-green-600 dark:text-green-400"
                                          : "text-red-600 dark:text-red-400"
                                      }`}
                                    >
                                      {formatCurrency(transaction.amount)}
                                    </td>

                                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-800 dark:text-white">
                                      {formatCurrency(
                                        transaction.closing_balance,
                                      )}
                                    </td>

                                    <td className="px-4 py-3 text-center text-sm text-gray-500">
                                      {transaction.page}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {clusters.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
                    No clusters found.
                  </div>
                )}
              </div>
            )}
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
