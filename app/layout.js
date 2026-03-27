import "./globals.css";

export const metadata = {
  title: "FormBharo — AI Form-Filling Agent",
  description: "Upload your documents and let AI automatically fill government, scholarship, and admission forms. Aadhaar, PAN, marksheets, caste certificates — all extracted and filled intelligently.",
  keywords: "form fill, government form, scholarship form, document OCR, Aadhaar, PAN, auto fill form, AI form filler",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
