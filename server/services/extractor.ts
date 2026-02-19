import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export class ExtractionService {
    // Realistic browser headers to maximize successful fetches
    private readonly BROWSER_HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
    };

    async extractFromUrl(url: string): Promise<{ title: string; content: string; textContent: string; excerpt: string; siteName: string; domain: string; length: number }> {
        const domain = this.getDomain(url);

        // Strategy 1: Direct fetch with realistic browser headers
        let html = await this.fetchHtml(url);

        // Strategy 2: If direct fetch failed, try with Google AMP cache for supported sites
        if (!html) {
            html = await this.tryGoogleAmpCache(url);
        }

        // Strategy 3: If still no HTML, try fetching the Wayback Machine's latest snapshot
        if (!html) {
            html = await this.tryArchiveOrg(url);
        }

        if (!html) {
            throw new Error(`Unable to fetch content from ${domain}. The site may be blocking automated access or require a login.`);
        }

        // Try extraction strategies in order
        const result = this.tryReadability(html, url)
            || this.tryJsonLd(html, url)
            || this.tryMetaTags(html, url);

        if (!result || !result.textContent || result.textContent.trim().length < 50) {
            throw new Error(`Unable to extract readable content from ${domain}. The site may be behind a paywall or use heavy JavaScript rendering.`);
        }

        // Reject bot detection / CAPTCHA pages
        if (this.isBotDetectionPage(result.title, result.textContent)) {
            throw new Error(`${domain} blocked automated access (CAPTCHA/bot detection). This site requires a browser with JavaScript to access its content.`);
        }

        return {
            title: result.title || "Untitled Article",
            content: result.content,
            textContent: result.textContent.trim(),
            excerpt: result.excerpt || "",
            siteName: result.siteName || domain,
            domain,
            length: result.textContent.length
        };
    }

    private getDomain(url: string): string {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return "unknown";
        }
    }

    /**
     * Detect CAPTCHA, bot-check, and paywall interstitial pages
     */
    private isBotDetectionPage(title: string, textContent: string): boolean {
        const lowerTitle = (title || "").toLowerCase();
        const lowerText = (textContent || "").toLowerCase();

        const botIndicators = [
            "are you a robot",
            "are you a human",
            "captcha",
            "verify you are human",
            "unusual activity",
            "access denied",
            "please verify",
            "security check",
            "bot detection",
            "blocked your ip",
            "automated access",
        ];

        for (const indicator of botIndicators) {
            if (lowerTitle.includes(indicator) || lowerText.includes(indicator)) {
                return true;
            }
        }

        // Also detect if content is very short and contains subscribe/login prompts
        if (textContent.length < 300) {
            const paywallIndicators = ["subscribe now", "sign in to continue", "create an account", "log in to read"];
            for (const indicator of paywallIndicators) {
                if (lowerText.includes(indicator)) {
                    return true;
                }
            }
        }

        return false;
    }

    private async fetchHtml(url: string): Promise<string | null> {
        try {
            const response = await fetch(url, {
                headers: this.BROWSER_HEADERS,
                redirect: 'follow',
            });

            // Accept any response that returns HTML (even 403, some sites return content with non-200)
            const html = await response.text();

            // Check if we got meaningful HTML (not just a CAPTCHA/empty page)
            if (html && html.length > 500 && (html.includes('<article') || html.includes('<meta') || html.includes('<p'))) {
                return html;
            }

            // If response was OK but content seems too short, still return it
            if (response.ok && html && html.length > 100) {
                return html;
            }

            console.log(`Direct fetch for ${url}: HTTP ${response.status}, HTML length: ${html?.length || 0}`);
            return null;
        } catch (error) {
            console.log(`Direct fetch failed for ${url}:`, error);
            return null;
        }
    }

    private async tryGoogleAmpCache(url: string): Promise<string | null> {
        try {
            // Try fetching the AMP version if available
            const parsedUrl = new URL(url);
            const ampUrl = `https://${parsedUrl.hostname.replace(/\./g, '-')}.cdn.ampproject.org/v/s/${parsedUrl.hostname}${parsedUrl.pathname}`;
            const response = await fetch(ampUrl, {
                headers: { ...this.BROWSER_HEADERS },
                redirect: 'follow',
            });
            if (response.ok) {
                const html = await response.text();
                if (html && html.length > 500) {
                    console.log(`AMP cache hit for ${url}`);
                    return html;
                }
            }
        } catch {
            // AMP cache not available, continue
        }
        return null;
    }

    private async tryArchiveOrg(url: string): Promise<string | null> {
        try {
            // Check Wayback Machine for a cached version
            const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
            const apiRes = await fetch(apiUrl, { headers: { 'User-Agent': this.BROWSER_HEADERS['User-Agent'] } });
            if (apiRes.ok) {
                const data = await apiRes.json() as any;
                const snapshot = data?.archived_snapshots?.closest;
                if (snapshot?.available && snapshot?.url) {
                    console.log(`Archive.org snapshot found for ${url}: ${snapshot.url}`);
                    const archiveRes = await fetch(snapshot.url, {
                        headers: this.BROWSER_HEADERS,
                        redirect: 'follow',
                    });
                    if (archiveRes.ok) {
                        const html = await archiveRes.text();
                        if (html && html.length > 500) {
                            return html;
                        }
                    }
                }
            }
        } catch {
            // Archive not available, continue
        }
        return null;
    }

    /**
     * Strategy 1: Mozilla Readability — the gold standard for article extraction
     */
    private tryReadability(html: string, url: string): ExtractedContent | null {
        try {
            const dom = new JSDOM(html, { url });
            const reader = new Readability(dom.window.document);
            const article = reader.parse();

            if (article && article.textContent && article.textContent.trim().length > 50) {
                return {
                    title: article.title || "",
                    content: article.content || "",
                    textContent: article.textContent,
                    excerpt: article.excerpt || "",
                    siteName: article.siteName || "",
                };
            }
        } catch (error) {
            console.log("Readability extraction failed:", error);
        }
        return null;
    }

    /**
     * Strategy 2: Extract from JSON-LD structured data
     * Many news sites embed article content in <script type="application/ld+json"> tags
     */
    private tryJsonLd(html: string, url: string): ExtractedContent | null {
        try {
            const dom = new JSDOM(html, { url });
            const scripts = dom.window.document.querySelectorAll('script[type="application/ld+json"]');

            for (const script of scripts) {
                try {
                    const data = JSON.parse(script.textContent || "");
                    const items = Array.isArray(data) ? data : [data];

                    for (const item of items) {
                        // Look for Article, NewsArticle, BlogPosting types
                        const type = item["@type"] || "";
                        if (typeof type === "string" && /Article|NewsArticle|BlogPosting|Report|WebPage/i.test(type)) {
                            const body = item.articleBody || item.text || item.description || "";
                            if (body && body.length > 50) {
                                return {
                                    title: item.headline || item.name || "Untitled Article",
                                    content: `<div>${body}</div>`,
                                    textContent: body,
                                    excerpt: (item.description || "").substring(0, 200),
                                    siteName: item.publisher?.name || "",
                                };
                            }
                        }
                    }
                } catch {
                    // Invalid JSON in this script tag, continue
                }
            }
        } catch (error) {
            console.log("JSON-LD extraction failed:", error);
        }
        return null;
    }

    /**
     * Strategy 3: Extract from Open Graph / meta tags as last resort
     * This gets titles and descriptions but usually not the full article body
     */
    private tryMetaTags(html: string, url: string): ExtractedContent | null {
        try {
            const dom = new JSDOM(html, { url });
            const doc = dom.window.document;

            const getMeta = (selectors: string[]): string => {
                for (const sel of selectors) {
                    const el = doc.querySelector(sel);
                    if (el) {
                        const content = el.getAttribute("content") || el.textContent || "";
                        if (content.trim()) return content.trim();
                    }
                }
                return "";
            };

            const title = getMeta([
                'meta[property="og:title"]',
                'meta[name="twitter:title"]',
                'meta[name="title"]',
                'title',
            ]);

            const description = getMeta([
                'meta[property="og:description"]',
                'meta[name="twitter:description"]',
                'meta[name="description"]',
            ]);

            const siteName = getMeta([
                'meta[property="og:site_name"]',
                'meta[name="application-name"]',
            ]);

            // Also try to grab any paragraph content from the page
            const paragraphs = doc.querySelectorAll('article p, .article-body p, .story-body p, [role="article"] p, main p');
            let bodyText = "";
            for (const p of paragraphs) {
                bodyText += (p.textContent || "").trim() + "\n\n";
            }

            const textContent = bodyText.trim() || description;

            if (title && textContent && textContent.length > 30) {
                return {
                    title,
                    content: `<div><p>${textContent}</p></div>`,
                    textContent,
                    excerpt: description || textContent.substring(0, 200),
                    siteName,
                };
            }
        } catch (error) {
            console.log("Meta tag extraction failed:", error);
        }
        return null;
    }
}

interface ExtractedContent {
    title: string;
    content: string;
    textContent: string;
    excerpt: string;
    siteName: string;
}
