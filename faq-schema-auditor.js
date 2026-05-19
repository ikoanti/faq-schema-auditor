/**
 * FAQ & JSON-LD Auditor
 * 
 * This script is designed to be run in the browser console of any website.
 * It will:
 * 1. Parse the site's /sitemap.xml (including nested sitemaps) to find all URLs.
 * 2. Identify all URLs that contain /faq/ or /faqs/ in their slug.
 * 3. Give you the option to scan those URLs (or all URLs) for FAQPage JSON-LD structured data.
 * 4. Export the findings to a CSV file.
 */

(async function() {
  console.clear();
  console.log("%cStarting FAQ & JSON-LD Audit...", "color: #007bff; font-size: 16px; font-weight: bold;");
  
  // 1. Fetch Sitemap to get all URLs
  async function extractUrlsFromSitemap(sitemapUrl) {
    try {
      const response = await fetch(sitemapUrl);
      if (!response.ok) return [];
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      
      const urls = Array.from(xmlDoc.querySelectorAll("url > loc")).map(loc => loc.textContent.trim());
      const sitemaps = Array.from(xmlDoc.querySelectorAll("sitemap > loc")).map(loc => loc.textContent.trim());
      
      let allUrls = [...urls];
      for (const sm of sitemaps) {
         console.log(`Fetching sub-sitemap: ${sm}`);
         const subUrls = await extractUrlsFromSitemap(sm);
         allUrls = allUrls.concat(subUrls);
      }
      return allUrls;
    } catch (e) {
      console.warn(`Error fetching sitemap ${sitemapUrl}:`, e);
      return [];
    }
  }

  let sitemapUrl = window.location.origin + '/sitemap.xml';
  console.log(`Fetching sitemaps starting from ${sitemapUrl}...`);
  let urls = await extractUrlsFromSitemap(sitemapUrl);
  
  // Remove duplicates
  urls = [...new Set(urls)];
  console.log(`%cFound ${urls.length} unique URLs in sitemaps.`, "color: green;");

  // Identify pages with /faq/ or /faqs/ in the slug
  const exactFaqSlugUrls = urls.filter(url => {
    try {
        const urlObj = new URL(url, window.location.origin);
        const path = urlObj.pathname;
        return path.includes('/faq/') || path.includes('/faqs/') || path.endsWith('/faq') || path.endsWith('/faqs');
    } catch(e) {
        return false; // ignore invalid URLs
    }
  });

  console.log(`%cFound ${exactFaqSlugUrls.length} pages with /faq/ or /faqs/ in the slug:`, "color: #ff9900;", exactFaqSlugUrls);

  if (urls.length === 0) {
    console.error("No URLs found in sitemap. Ensure the site has a standard /sitemap.xml file.");
    return;
  }

  // 2. Check pages for JSON-LD FAQ structured data
  const checkLimit = confirm(`Found ${urls.length} total URLs.\n\nDo you want to scan ALL ${urls.length} pages for FAQ JSON-LD?\n\n[OK] = Scan ALL pages (may take a while depending on site size).\n[Cancel] = Scan ONLY the ${exactFaqSlugUrls.length} pages with 'faq' in the slug.`);
  
  const urlsToScan = checkLimit ? urls : exactFaqSlugUrls;
  
  if (urlsToScan.length === 0) {
    console.log("No URLs to scan for JSON-LD. Exiting.");
    return;
  }

  console.log(`%cScanning ${urlsToScan.length} pages for FAQ JSON-LD... Please wait.`, "color: #007bff;");
  
  const pagesWithFaqJsonLd = [];
  const concurrency = 10;
  let active = 0;
  let index = 0;
  let scannedCount = 0;
  
  await new Promise((resolve) => {
    function next() {
      if (index >= urlsToScan.length && active === 0) {
        resolve();
        return;
      }
      while (active < concurrency && index < urlsToScan.length) {
        const url = urlsToScan[index++];
        active++;
        checkPage(url).finally(() => {
          active--;
          scannedCount++;
          if (scannedCount % 10 === 0 || scannedCount === urlsToScan.length) {
            console.log(`Progress: Scanned ${scannedCount} / ${urlsToScan.length} pages...`);
          }
          next();
        });
      }
    }
    
    async function checkPage(url) {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
        let hasFaq = false;
        
        scripts.forEach(script => {
          try {
            const json = JSON.parse(script.textContent);
            const checkGraph = (obj) => {
              if (!obj) return;
              if (obj['@type'] === 'FAQPage' || (Array.isArray(obj['@type']) && obj['@type'].includes('FAQPage'))) hasFaq = true;
              if (obj['@graph'] && Array.isArray(obj['@graph'])) {
                 obj['@graph'].forEach(g => { 
                    if (g['@type'] === 'FAQPage' || (Array.isArray(g['@type']) && g['@type'].includes('FAQPage'))) hasFaq = true; 
                 });
              }
            };
            if (Array.isArray(json)) {
              json.forEach(checkGraph);
            } else {
              checkGraph(json);
            }
          } catch(e) {
            // malformed json
          }
        });
        if (hasFaq) {
           console.log(`%c[FOUND] FAQ JSON-LD on: ${url}`, "color: green;");
           pagesWithFaqJsonLd.push(url);
        }
      } catch (e) {
        // ignore errors on individual pages (e.g. CORS or network errors)
      }
    }
    
    next();
  });
  
  console.log("%c=== AUDIT COMPLETE ===", "font-weight: bold; font-size: 16px; color: green;");
  
  if (exactFaqSlugUrls.length > 0) {
    console.log(`%c[YES] FAQ pages were found (${exactFaqSlugUrls.length}):\n`, "color: green; font-weight: bold;", exactFaqSlugUrls.join('\n'));
  } else {
    console.log("%c[NO] No FAQ pages were found.", "color: red; font-weight: bold;");
  }

  if (pagesWithFaqJsonLd.length > 0) {
    console.log(`%c[YES] Pages with FAQ codes (JSON-LD) were found (${pagesWithFaqJsonLd.length}):\n`, "color: green; font-weight: bold;", pagesWithFaqJsonLd.join('\n'));
  } else {
    console.log("%c[NO] No pages with FAQ codes (JSON-LD) were found.", "color: red; font-weight: bold;");
  }
  
  // Optional CSV Export
  if (confirm("Audit complete! Would you like to export the results to a CSV file?")) {
      const csvRows = [
        ["URL", "Has FAQ Slug", "Has FAQ JSON-LD"]
      ];
      
      const allResultUrls = [...new Set([...exactFaqSlugUrls, ...pagesWithFaqJsonLd])];
      allResultUrls.forEach(url => {
          const hasSlug = exactFaqSlugUrls.includes(url) ? "Yes" : "No";
          const hasJson = pagesWithFaqJsonLd.includes(url) ? "Yes" : "No";
          csvRows.push([url, hasSlug, hasJson]);
      });
      
      const csvContent = csvRows.map(row => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.setAttribute("href", urlBlob);
      link.setAttribute("download", "faq_audit_results.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }
})();
