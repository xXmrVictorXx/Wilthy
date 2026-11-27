// 没有 MinerU 时在本机读 PDF 的文字层：不联网、不做 OCR，表格与公式只剩文字。
// pdfjs 在 Node 里没有 Web Worker，预先载入 worker 模块走它的同线程模式，打包后也不用按路径找文件。

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ]);
  (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
  const task = pdfjs.getDocument({
    data: bytes,
    useSystemFonts: false,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
  });
  try {
    const document = await task.promise;
    const pages: string[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const { items } = await page.getTextContent();
      const text = items
        .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : '') : ''))
        .join('')
        .trim();
      pages.push(`--- 第 ${number} 页 ---\n${text}`);
      page.cleanup();
    }
    return pages.join('\n\n');
  } finally {
    await task.destroy();
  }
}
