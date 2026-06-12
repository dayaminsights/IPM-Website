function renderSitemap(collections, productGroups, siteBaseUrl) {
  const urls = [
    `${siteBaseUrl}/`,
    `${siteBaseUrl}/collections.html`,
    `${siteBaseUrl}/about.html`,
    `${siteBaseUrl}/contact.html`,
  ];

  for (const collection of collections) {
    urls.push(`${siteBaseUrl}/collections/${collection.slug}/`);
  }
  for (const group of productGroups) {
    urls.push(`${siteBaseUrl}/collections/${group.collectionSlug}/${group.groupSlug}/`);
  }

  const entries = urls.map(u => `  <url>\n    <loc>${u}</loc>\n  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

function renderRobots(siteBaseUrl) {
  return `User-agent: *
Allow: /

Sitemap: ${siteBaseUrl}/sitemap.xml
`;
}

module.exports = { renderSitemap, renderRobots };
