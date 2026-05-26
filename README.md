# FAQ Schema Auditor

A browser console script designed to crawl a website's sitemaps, identify pages related to FAQs, and verify the presence of JSON-LD `FAQPage` structured data. 

## Features

- **Sitemap Discovery**: Automatically fetches and parses `/sitemap.xml` (including nested sitemaps) to compile a full list of website URLs.
- **Slug Identification**: Identifies pages that have `/faq/`, `/faqs/`, or `/frequently-asked-questions/` in their URL paths.
- **Structured Data Audit**: Scans pages for `application/ld+json` scripts containing `@type: "FAQPage"`.
- **CSV Export**: Optionally exports the audit results to a CSV file for further analysis and reporting.

## Usage

1. Navigate to the target website (e.g., the homepage).
2. Open your browser's Developer Tools (Right-click -> **Inspect**, or press `F12` / `Ctrl+Shift+I` / `Cmd+Option+I`).
3. Go to the **Console** tab.
4. Copy the entire contents of `faq-schema-auditor.js` and paste it into the console.
5. Press **Enter** to run the script.
6. The script will ask you if you want to scan ALL pages or ONLY pages with 'faq' or 'frequently-asked-questions' in the slug. Make your selection and wait for the audit to complete.
7. Upon completion, you will be prompted to download the results as a CSV file.

## Requirements

- A modern web browser (Chrome, Firefox, Safari, Edge).
- The target website must have a standard XML sitemap located at `/sitemap.xml`.

## Output

The script outputs progress logs to the console and generates a CSV file with the following columns:
- **URL**: The web page URL.
- **Has FAQ Slug**: `Yes` if the URL contains `/faq/`, `/faqs/`, or `/frequently-asked-questions/`.
- **Has FAQ JSON-LD**: `Yes` if the page contains valid `FAQPage` JSON-LD structured data.

## Important Note

Scanning thousands of pages directly from the browser console can take time and consume browser memory. For very large websites, it is recommended to select the option to scan ONLY the URLs containing "faq" or "frequently-asked-questions" in their slugs to avoid performance issues.
