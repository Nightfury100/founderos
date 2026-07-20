import { DocumentKind } from "@founderos/db";

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  BIO: "Bio",
  COMPANY_DESCRIPTION: "Company description",
  ELEVATOR_PITCH: "Elevator pitch",
  EXEC_SUMMARY: "Executive summary",
  INVESTOR_DECK_INFO: "Investor deck info",
  PRODUCT_DESCRIPTION: "Product description",
  CV: "CV",
  COVER_LETTER: "Cover letter template",
  CASE_STUDY: "Case study",
  SALES_COLLATERAL: "Sales collateral",
  MARKETING_SOP: "Marketing SOP",
  BRAND_GUIDELINES: "Brand guidelines",
  OTHER: "Other",
};

export const DOCUMENT_KIND_ORDER: DocumentKind[] = [
  DocumentKind.BIO,
  DocumentKind.CV,
  DocumentKind.ELEVATOR_PITCH,
  DocumentKind.EXEC_SUMMARY,
  DocumentKind.COMPANY_DESCRIPTION,
  DocumentKind.PRODUCT_DESCRIPTION,
  DocumentKind.INVESTOR_DECK_INFO,
  DocumentKind.COVER_LETTER,
  DocumentKind.CASE_STUDY,
  DocumentKind.SALES_COLLATERAL,
  DocumentKind.MARKETING_SOP,
  DocumentKind.BRAND_GUIDELINES,
  DocumentKind.OTHER,
];
