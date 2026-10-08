import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { bankStatementApi } from "@/api/bankStatment";

const QUERY_KEY = ["bank-statements"];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          data?: {
            detail?: string;
            message?: string;
            error?: string;
          };
        };
      }
    ).response;

    return (
      response?.data?.detail ||
      response?.data?.message ||
      response?.data?.error ||
      "Something went wrong."
    );
  }

  return "Something went wrong.";
}

export default function ManualBankStatementList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------
  // List
  // --------------------------------

  const { data, isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: bankStatementApi.manualList,
  });

  // --------------------------------
  // Upload + Extraction
  // --------------------------------

  const uploadMutation = useMutation({
    mutationFn: (selectedFile: File) =>
      bankStatementApi.manualExtraction(selectedFile),

    onSuccess: () => {
      toast.success("Bank statement extracted successfully.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      queryClient.invalidateQueries({
        queryKey: QUERY_KEY,
      });
    },

    onError: (error) => {
      console.error("Bank statement processing failed:", error);

      toast.error(getApiErrorMessage(error));
    },
  });

  // --------------------------------
  // File selection
  // --------------------------------

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const fileName = selectedFile.name.toLowerCase();

    const isSupported =
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".csv") ||
      fileName.endsWith(".xlsx");

    if (!isSupported) {
      toast.error("Please select a PDF, CSV, or XLSX file.");
      event.target.value = "";
      return;
    }

    // Automatically upload/extract as soon as file is selected
    uploadMutation.mutate(selectedFile);
  };
  // --------------------------------
  // Data
  // --------------------------------

  const statements = data?.data?.data?.results ?? [];

  return (
    <div>
      <PageMeta
        title="Bank Statements"
        description="Bank statement data extraction"
      />

      <PageBreadcrumb pageTitle="Bank Statements" />

      <div className="space-y-6">
        {/* Upload */}
        <div className="flex justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,.xlsx,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
            disabled={uploadMutation.isPending}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadMutation.isPending ? "Extracting..." : "Upload & Extract"}
          </button>
        </div>

        {/* List */}
        <ComponentCard title="Bank Statements">
          {isLoading ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading bank statements...
              </p>
            </div>
          ) : isError ? (
            <div className="py-10 text-center">
              <p className="text-sm text-red-500">
                {getApiErrorMessage(error)}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="max-w-full overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        ID
                      </th>

                      <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        Business Name
                      </th>

                      <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        Created
                      </th>

                      <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {statements.map((statement) => (
                      <tr
                        key={statement.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                          #{statement.id}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {statement.business_name || "-"}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(statement.created)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/bank-statements/${statement.id}`)
                            }
                            className="text-sm font-medium text-brand-500 transition hover:text-brand-600 hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}

                    {statements.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No bank statements found.
                          </p>

                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Upload a PDF, CSV, or Excel bank statement to get started.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </ComponentCard>
      </div>
    </div>
  );
}
