export type PrintLayout = "portrait" | "landscape";

export function printElement(elementId: string, title: string, layout: PrintLayout = "portrait") {
  if (typeof window === "undefined") return;
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) return;

  const cssLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    .map((link) => `<link rel="stylesheet" href="${link.href}">`)
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        ${cssLinks}
        <style>
          @page { size: A4 ${layout}; margin: 12mm; }
          * { box-sizing: border-box; }
          html, body { width: 100%; margin: 0; padding: 0; overflow: visible; }
          body { background: #fff; font-family: "DM Sans", Arial, sans-serif; color: #0A1628; }
          .print-document, .print-report-shell { width: 100%; max-width: 100%; margin: 0; overflow: visible; }
          .no-print, button { display: none !important; }
          .print-document { display: block !important; }
        </style>
      </head>
      <body>${element.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
