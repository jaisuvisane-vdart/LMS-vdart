/**
 * Enterprise File & Report Download Utility
 * Provides resilient, RFC-compliant binary and CSV file streaming for web clients
 */

/**
 * Download a binary or text Blob safely in all modern desktop/mobile browsers.
 * Uses delayed URL revocation to prevent premature stream truncation in Chromium/Edge.
 * 
 * @param {Blob|ArrayBuffer|string} data - Raw Blob, ArrayBuffer, or string payload
 * @param {string} filename - Target file name with extension
 * @param {string} [defaultMimeType='application/octet-stream'] - Fallback MIME type
 */
export const downloadBlobFile = (data, filename, defaultMimeType = 'application/octet-stream') => {
  if (!data) {
    throw new Error('Download aborted: No data payload received.');
  }

  // Normalize data to a valid Blob instance
  let blob;
  if (data instanceof Blob) {
    // If the existing blob has the default/empty type, preserve or re-wrap with explicit type
    if (!data.type && defaultMimeType) {
      blob = new Blob([data], { type: defaultMimeType });
    } else {
      blob = data;
    }
  } else if (data?.data instanceof Blob) {
    // Handle raw unintercepted Axios response object
    blob = data.data;
  } else {
    blob = new Blob([data], { type: defaultMimeType });
  }

  // Create temporary object URL
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = blobUrl;
  link.setAttribute('download', filename);

  // Append to DOM, dispatch click event, and clean up asynchronously
  document.body.appendChild(link);
  link.click();

  // Asynchronous cleanup: allows browser download manager to begin writing before revocation
  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // Ignored cleanup errors
    }
  }, 1000);
};

/**
 * Escape an individual CSV cell according to RFC 4180 specification.
 * Handles nulls, numbers, strings containing commas, double quotes, and newlines.
 * 
 * @param {*} value - Value to escape
 * @returns {string} - Escaped CSV cell value
 */
export const escapeCsvCell = (value) => {
  if (value === null || value === undefined) {
    return '""';
  }

  const str = String(value);

  // If cell contains commas, double quotes, or line breaks, enclose in quotes and double internal quotes
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return `"${str}"`;
};

/**
 * Export tabular data directly to a clean, UTF-8 BOM formatted CSV file.
 * Automatically compatible with Microsoft Excel, LibreOffice, and Google Sheets.
 * 
 * @param {string} filename - Target filename (e.g. 'course_report.csv')
 * @param {string[]} headers - Array of column header strings
 * @param {Array<Array<*>>} rows - Array of row arrays containing cell values
 */
export const exportToCsv = (filename, headers, rows) => {
  if (!headers || !Array.isArray(headers)) {
    throw new Error('Export CSV error: Invalid headers array.');
  }

  const sanitizedFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  // Format header row
  const headerLine = headers.map(escapeCsvCell).join(',');

  // Format all data rows
  const dataLines = (rows || []).map((row) => {
    return row.map(escapeCsvCell).join(',');
  });

  // Combine with RFC 4180 CRLF line terminators and prepend UTF-8 BOM (\uFEFF)
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlobFile(blob, sanitizedFilename, 'text/csv;charset=utf-8;');
};

export default {
  downloadBlobFile,
  escapeCsvCell,
  exportToCsv,
};
