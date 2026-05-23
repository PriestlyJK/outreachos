export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
    const { url, anchor, targetUrl } = req.body;
  
    if (!url) return res.status(400).json({ error: 'URL required' });
  
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });
  
      if (!response.ok) {
        return res.json({ status: 'dead', statusCode: response.status });
      }
  
      const html = await response.text();
      const lower = html.toLowerCase();
  
      // Check if target URL/domain is present
      if (targetUrl) {
        const targetDomain = targetUrl.replace(/https?:\/\//, '').split('/')[0].toLowerCase();
        if (!lower.includes(targetDomain)) {
          return res.json({ status: 'dead', reason: 'Target URL not found in page' });
        }
      }
  
      // Check if anchor text is present
      if (anchor && !lower.includes(anchor.toLowerCase())) {
        return res.json({ status: 'dead', reason: 'Anchor text not found in page' });
      }
  
      // Check for nofollow on our specific link
      // Look for our target URL with nofollow nearby
      if (targetUrl) {
        const targetDomain = targetUrl.replace(/https?:\/\//, '').split('/')[0];
        // Find all href occurrences with our domain
        const linkRegex = new RegExp(`<a[^>]*${targetDomain.replace('.', '\\.')}[^>]*>`, 'gi');
        const links = html.match(linkRegex) || [];
        const hasNofollow = links.some(link => link.toLowerCase().includes('nofollow'));
        if (hasNofollow) {
          return res.json({ status: 'nofollow', reason: 'Link is marked as nofollow' });
        }
      }
  
      return res.json({ status: 'alive' });
  
    } catch (error) {
      if (error.name === 'TimeoutError') {
        return res.json({ status: 'no_response', reason: 'Request timed out' });
      }
      return res.json({ status: 'no_response', reason: error.message });
    }
  }