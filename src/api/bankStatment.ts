import api from "./axios";

export interface BankStatement {
  id: number;
  file: string;
  created: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiResponse<T> {
  data: T;
  status: string;
  status_code: number;
  action_code: string;
}

export type BankStatementListResponse = ApiResponse<
  PaginatedResponse<BankStatement>
>;

export interface BankStatementUploadResponse {
  id: number;
  file: string;
}

export interface ExtractDocumentRequest {
  document: number;
}

export interface ExtractDocumentResponse {
  [key: string]: unknown;
}

export interface BankStatementDetailResponse {
  data: {
    bank_name: string | null;
    account_holder_name: string;
    account_number: string;
    ifsc: string | null;
    statement_period_start: string;
    statement_period_end: string;
    opening_balance: number;
    closing_balance: number;
    transaction_count: number;
    total_credit: number;
    total_debit: number;
    net_movement: number;

    validations: {
      issues: string[];
      debit_total: number;
      credit_total: number;
      transaction_count: number;
      validation_status: string;
      directions_corrected: number;
      balance_break_transaction_ids: string[];
      balance_consistency_percentage: number;
    };

    money_received: Array<{
      total: number;
      last_date: string;
      cluster_id: string;
      confidence: number;
      first_date: string;
      counterparty: string;
      review_flags: string[];
      payment_modes: string[];
      counterparty_id: string;
      transaction_ids: string[];
      transaction_count: number;
    }>;

    money_paid: Array<{
      total: number;
      last_date: string;
      cluster_id: string | null;
      confidence: number;
      first_date: string;
      counterparty: string;
      review_flags: string[];
      payment_modes: string[];
      counterparty_id: string | null;
      transaction_ids: string[];
      transaction_count: number;
    }>;

    category_breakdown: {
      paid: Record<string, number>;
      received: Record<string, number>;
    };

    counterparties: Array<{
      name: string;
      aliases: string[];
      cluster_id: string;
      net_amount: number;
      identifiers: string[];
      total_debit: number;
      total_credit: number;
      counterparty_id: string;
      counterparty_type: string;
      transaction_count: number;
      last_transaction_date: string;
      first_transaction_date: string;
    }>;

    clusters: Array<{
      evidence: string[];
      recurring: boolean;
      cluster_id: string;
      net_amount: number;
      total_debit: number;
      cluster_name: string;
      cluster_type: string;
      total_credit: number;
      counterparty_id: string;
      requires_review: boolean;
      transaction_ids: string[];
      transaction_count: number;
      cluster_confidence: number;
      last_transaction_date: string;
      first_transaction_date: string;
      possible_related_cluster_ids: string[];
    }>;

    categories: Record<
      string,
      {
        net: number;
        count: number;
        debit: number;
        credit: number;
      }
    >;

    payment_modes: Record<
      string,
      {
        net: number;
        count: number;
        debit: number;
        credit: number;
      }
    >;

    monthly_trends: Record<
      string,
      {
        net: number;
        count: number;
        debit: number;
        credit: number;
      }
    >;

    unknown_transaction_ids: string[];

    review_queue: Array<{
      reason: string;
      severity: string;
      issue_type: string;
      transaction_id: string;
    }>;

    warnings: string[];
    model: string;
    prompt_version: string;
    transactions: null;
  };

  status: string;
  status_code: number;
  action_code: string;
}

export const bankStatementApi = {
  list: () => api.get<BankStatementListResponse>("/api/bank/file/list/"),

  upload: (file: File) => {
    const formData = new FormData();

    formData.append("file", file);

    return api.post<ApiResponse<BankStatementUploadResponse>, FormData>(
      "/api/bank/file/upload/",
      formData,
    );
  },

  extract: (documentId: number) =>
    api.post<ExtractDocumentResponse>("/api/bank/v2/cluster/docs/", {
      document: documentId,
    }),

  detail: (id: number) =>
    api.get<BankStatementDetailResponse>(`/api/bank/statement/detail/${id}`),
};
