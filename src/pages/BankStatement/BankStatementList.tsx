import { useRef, useState } from "react";
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

function getFileName(url: string) {
  return decodeURIComponent(url.split("/").pop() || "Bank Statement");
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

export default function BankStatementList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);

  // --------------------------------
  // List
  // --------------------------------

  const { data, isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: bankStatementApi.list,
  });

  // --------------------------------
  // Upload + Extract
  // --------------------------------

  const uploadMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      // Step 1:
      // Upload the PDF
      const uploadResponse = await bankStatementApi.upload(selectedFile);

      //@ts-ignore
      const documentId = uploadResponse.data.data.id;

      if (!documentId) {
        throw new Error("File uploaded, but no document ID was returned.");
      }

      // Step 2:
      // Send the uploaded document ID for extraction
      const extractResponse = await bankStatementApi.extract(documentId);

      return {
        uploadResponse,
        extractResponse,
        documentId,
      };
    },

    onSuccess: ({ documentId }) => {
      toast.success(`Bank statement #${documentId} extracted successfully.`);

      setFile(null);

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

    if (selectedFile.type !== "application/pdf") {
      toast.error("Please select a PDF file.");

      event.target.value = "";

      return;
    }

    setFile(selectedFile);
  };

  // --------------------------------
  // Upload
  // --------------------------------

  const handleUpload = () => {
    if (!file) {
      toast.error("Please select a bank statement.");
      return;
    }

    uploadMutation.mutate(file);
  };

  // --------------------------------
  // Data
  // --------------------------------

  const statements = data?.data?.data?.results ?? [];

  return (
    <div>
      <PageMeta
        title="Bank Statement"
        description="Bank statement data extraction"
      />

      <PageBreadcrumb pageTitle="Bank Statement" />

      <div className="space-y-6">
        {/* Upload */}
        <div className="flex items-center justify-end gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={uploadMutation.isPending}
            className="hidden"
          />

          {/* Selected file */}
          {file && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {file.name}
            </span>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-lg leading-none">+</span>

            {uploadMutation.isPending ? "Extracting..." : "Extract Data"}
          </button>

          {/* Upload button */}
          {file && !uploadMutation.isPending && (
            <button
              type="button"
              onClick={handleUpload}
              className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
            >
              Upload
            </button>
          )}
        </div>

        {/* List */}
        <ComponentCard title="List">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Loading bank statements...
            </div>
          ) : isError ? (
            <div className="py-10 text-center text-sm text-red-500">
              {getApiErrorMessage(error)}
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
                        File
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
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          #{statement.id}
                        </td>

                        <td className="px-6 py-4">
                          <a
                            href={statement.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-brand-500 hover:underline"
                          >
                            {getFileName(statement.file)}
                          </a>
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
                            className="text-sm font-medium text-brand-500 hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}

                    {statements.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-10 text-center text-sm text-gray-500"
                        >
                          No bank statements found.
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
