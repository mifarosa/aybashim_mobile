// Entry point of the pdf.js worker. Imports are evaluated in order, so the polyfills are
// installed before the worker code runs.
import './polyfills.js';
import 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';
