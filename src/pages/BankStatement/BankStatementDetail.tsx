import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { bankStatementApi } from "@/api/bankStatment";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "received", label: "Money Received" },
  { id: "paid", label: "Money Paid" },
  { id: "counterparties", label: "Counterparties" },
  { id: "categories", label: "Categories" },
  { id: "trends", label: "Monthly Trends" },
  { id: "review", label: "Review Queue" },
  { id: "clusters", label: "Clusters" },
] as const;

type Tab = (typeof tabs)[number]["id"];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatusBadge({
  value,
  danger = false,
}: {
  value: string;
  danger?: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        danger
          ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
          : "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300"
      }`}
    >
      {formatLabel(value)}
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

export default function BankStatementDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const statementId = Number(id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["bank-statement", statementId],
    queryFn: () => bankStatementApi.detail(statementId),
    enabled: Number.isInteger(statementId),
  });

  console.log("data, error", data, error);

  console.log("URL id:", id);
  console.log("statementId:", statementId);
  console.log("isInteger:", Number.isInteger(statementId));

  const query = useQuery({
    queryKey: ["bank-statement", statementId],
    queryFn: async () => {
      console.log("🔥 API CALL:", statementId);

      const response = await bankStatementApi.detail(statementId);

      console.log("🔥 API RESPONSE:", response);

      return response;
    },
    enabled: Number.isInteger(statementId) && statementId > 0,
  });

  console.log("QUERY:", {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    status: query.status,
  });

  if (isLoading) {
    return (
      <div>
        <PageMeta
          title="Bank Statement Detail"
          description="Bank statement analysis"
        />

        <PageBreadcrumb pageTitle="Bank Statement Detail" />

        <div className="py-12 text-center text-sm text-gray-500">
          Loading statement...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    toast.error(
      error instanceof Error ? error.message : "Failed to load bank statement.",
    );

    return (
      <div>
        <PageMeta
          title="Bank Statement Detail"
          description="Bank statement analysis"
        />

        <PageBreadcrumb pageTitle="Bank Statement Detail" />

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
          Failed to load bank statement.
        </div>
      </div>
    );
  }
  console.log("data,", data);
  const statement = data.data?.data;

  return (
    <div>
      <PageMeta
        title="Bank Statement Detail"
        description="Bank statement analysis"
      />

      <PageBreadcrumb pageTitle="Bank Statement Detail" />

      <div className="space-y-6">
        {/* Header */}
        <ComponentCard title="">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {statement.account_holder_name}
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Account: {statement.account_number}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge
                value={statement.validations.validation_status}
                danger={statement.validations.validation_status !== "OK"}
              />

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
                {statement.transaction_count} transactions
              </span>
            </div>
          </div>
        </ComponentCard>

        {/* Summary */}
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
            value={formatCurrency(statement.total_credit)}
            valueClassName="text-green-600 dark:text-green-400"
          />

          <Stat
            label="Total Paid"
            value={formatCurrency(statement.total_debit)}
            valueClassName="text-red-600 dark:text-red-400"
          />
        </div>

        {/* Tabs */}
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
                    value={formatCurrency(statement.net_movement)}
                  />

                  <Stat
                    label="Transactions"
                    value={formatNumber(statement.transaction_count)}
                  />

                  <Stat
                    label="Balance Consistency"
                    value={`${statement.validations.balance_consistency_percentage}%`}
                  />

                  <Stat
                    label="Directions Corrected"
                    value={formatNumber(
                      statement.validations.directions_corrected,
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
                      Statement Information
                    </h3>

                    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                      {[
                        ["Bank", statement.bank_name ?? "Not available"],
                        ["Account Holder", statement.account_holder_name],
                        ["Account Number", statement.account_number],
                        ["IFSC", statement.ifsc ?? "Not available"],
                        [
                          "Period",
                          `${formatDate(
                            statement.statement_period_start,
                          )} - ${formatDate(statement.statement_period_end)}`,
                        ],
                        ["Model", statement.model],
                        ["Prompt Version", statement.prompt_version],
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

                  <div>
                    <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
                      Validation
                    </h3>

                    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Status</span>

                        <StatusBadge
                          value={statement.validations.validation_status}
                          danger={
                            statement.validations.validation_status !== "OK"
                          }
                        />
                      </div>

                      <div className="space-y-3">
                        {statement.validations.issues.length === 0 ? (
                          <p className="text-sm text-green-600">
                            No validation issues found.
                          </p>
                        ) : (
                          statement.validations.issues.map((issue) => (
                            <div
                              key={issue}
                              className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400"
                            >
                              {issue}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MONEY RECEIVED */}
            {activeTab === "received" && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Counterparty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        First Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Last Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        Confidence
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Flags
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {statement.money_received.map((item) => (
                      <tr key={item.cluster_id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white">
                          {item.counterparty}
                        </td>

                        <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                          {formatCurrency(item.total)}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(item.first_date)}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(item.last_date)}
                        </td>

                        <td className="px-4 py-3 text-right text-sm">
                          {(item.confidence * 100).toFixed(0)}%
                        </td>

                        <td className="px-4 py-3">
                          {item.review_flags.length ? (
                            <div className="flex flex-wrap gap-1">
                              {item.review_flags.map((flag) => (
                                <StatusBadge key={flag} value={flag} danger />
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* MONEY PAID */}
            {activeTab === "paid" && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Counterparty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        First Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Last Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        Transactions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Flags
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {statement.money_paid.map((item) => (
                      <tr key={item.transaction_ids.join("-")}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white">
                          {item.counterparty}
                        </td>

                        <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                          {formatCurrency(item.total)}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(item.first_date)}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(item.last_date)}
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                          {item.transaction_count}
                        </td>

                        <td className="px-4 py-3">
                          {item.review_flags.length ? (
                            <div className="flex flex-wrap gap-1">
                              {item.review_flags.map((flag) => (
                                <StatusBadge key={flag} value={flag} danger />
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* COUNTERPARTIES */}
            {activeTab === "counterparties" && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {[
                        "Name",
                        "Type",
                        "Net Amount",
                        "Credit",
                        "Debit",
                        "Transactions",
                        "First Date",
                        "Last Date",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {statement.counterparties.map((item) => (
                      <tr key={item.counterparty_id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white">
                          {item.name}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge value={item.counterparty_type} />
                        </td>

                        <td
                          className={`px-4 py-3 text-sm font-medium ${
                            item.net_amount >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(item.net_amount)}
                        </td>

                        <td className="px-4 py-3 text-sm text-green-600">
                          {formatCurrency(item.total_credit)}
                        </td>

                        <td className="px-4 py-3 text-sm text-red-600">
                          {formatCurrency(item.total_debit)}
                        </td>

                        <td className="px-4 py-3 text-sm">
                          {item.transaction_count}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(item.first_transaction_date)}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(item.last_transaction_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* CATEGORIES */}
            {activeTab === "categories" && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">
                    Categories
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Category
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                            Count
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                            Debit
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                            Credit
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {Object.entries(statement.categories).map(
                          ([name, item]) => (
                            <tr
                              key={name}
                              className="border-b border-gray-100 dark:border-gray-800"
                            >
                              <td className="px-4 py-3 text-sm font-medium">
                                {formatLabel(name)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                {item.count}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-red-600">
                                {formatCurrency(item.debit)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-green-600">
                                {formatCurrency(item.credit)}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">
                    Payment Modes
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Mode
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                            Count
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                            Net
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {Object.entries(statement.payment_modes).map(
                          ([name, item]) => (
                            <tr
                              key={name}
                              className="border-b border-gray-100 dark:border-gray-800"
                            >
                              <td className="px-4 py-3 text-sm font-medium">
                                {formatLabel(name)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                {item.count}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium">
                                {formatCurrency(item.net)}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* MONTHLY TRENDS */}
            {activeTab === "trends" && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Month
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        Transactions
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        Credit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        Debit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        Net
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {Object.entries(statement.monthly_trends).map(
                      ([month, item]) => (
                        <tr
                          key={month}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <td className="px-4 py-3 text-sm font-medium">
                            {month}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {item.count}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-green-600">
                            {formatCurrency(item.credit)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-red-600">
                            {formatCurrency(item.debit)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right text-sm font-medium ${
                              item.net >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatCurrency(item.net)}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* REVIEW QUEUE */}
            {activeTab === "review" && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Severity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Issue
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Transaction
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Reason
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {statement.review_queue.map((item) => (
                      <tr key={item.transaction_id}>
                        <td className="px-4 py-3">
                          <StatusBadge
                            value={item.severity}
                            danger={item.severity === "HIGH"}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge value={item.issue_type} />
                        </td>

                        <td className="px-4 py-3 text-sm font-medium">
                          {item.transaction_id}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-500">
                          {item.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* CLUSTERS */}
            {activeTab === "clusters" && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Cluster
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        Net
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        Transactions
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        Confidence
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Match
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Review
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {statement.clusters.map((item) => (
                      <tr key={item.cluster_id}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white">
                              {item.cluster_name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {item.cluster_id}
                            </p>
                          </div>
                        </td>

                        <td
                          className={`px-4 py-3 text-right text-sm font-medium ${
                            item.net_amount >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(item.net_amount)}
                        </td>

                        <td className="px-4 py-3 text-right text-sm">
                          {item.transaction_count}
                        </td>

                        <td className="px-4 py-3 text-right text-sm">
                          {(item.cluster_confidence * 100).toFixed(0)}%
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge value={item.evidence[0] ?? "UNKNOWN"} />
                        </td>

                        <td className="px-4 py-3">
                          {item.requires_review ? (
                            <StatusBadge value="Requires Review" danger />
                          ) : (
                            <span className="text-sm text-green-600">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
