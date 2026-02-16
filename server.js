const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('public')); // ඔයාගේ index.html එක 'public' කියන folder එක ඇතුලේ තියෙන්න ඕනේ.

// --- 🎯 SCRAPER CLASS ---
class PastPapersScraper {
    constructor() {
        this.baseUrl = 'https://pastpapers.wiki';
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
        });
    }

    async search(query) {
        try {
            const res = await this.client.get(`/?s=${encodeURIComponent(query)}`);
            const $ = cheerio.load(res.data);
            const papers = [];
            $('.post-item, article').each((i, el) => {
                const title = $(el).find('h2 a, .post-title a').first().text().trim();
                const url = $(el).find('h2 a, .post-title a').first().attr('href');
                const img = $(el).find('img').first().attr('src');
                if (title && url) papers.push({ title, url, image: img });
            });
            return papers;
        } catch (e) { return []; }
    }

    async getDetails(url) {
        try {
            const res = await this.client.get(url);
            const $ = cheerio.load(res.data);
            const title = $('h1').first().text().trim();
            const links = [];
            $('a[href*=".pdf"], a[href*="download"]').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim() || 'Download PDF';
                if (href) links.push({ text, url: href, type: 'pdf' });
            });
            return { title, downloadLinks: links };
        } catch (e) { return null; }
    }

    async getRecent() {
        try {
            const res = await this.client.get('/');
            const $ = cheerio.load(res.data);
            const papers = [];
            $('.post-item, article').slice(0, 12).each((i, el) => {
                const title = $(el).find('h2 a').first().text().trim();
                const url = $(el).find('h2 a').first().attr('href');
                const img = $(el).find('img').first().attr('src');
                if (title && url) papers.push({ title, url, image: img });
            });
            return papers;
        } catch (e) { return []; }
    }
}

const scraper = new PastPapersScraper();

// --- 🌐 API ROUTES ---

// 1. අලුත්ම පේපර්ස් ලබාගැනීමට
app.get('/api/recent', async (req, res) => {
    const data = await scraper.getRecent();
    res.json(data);
});

// 2. සර්ච් කිරීමට
app.get('/api/search', async (req, res) => {
    const data = await scraper.search(req.query.q);
    res.json(data);
});

// 3. පේපර් එකේ විස්තර සහ ලින්ක් ලබාගැනීමට
app.get('/api/details', async (req, res) => {
    const data = await scraper.getDetails(req.query.url);
    res.json(data);
});

// 4. සැබෑ බාගත කිරීමේ පද්ධතිය (Download System)
app.get('/api/download', async (req, res) => {
    const { url, name } = req.query;
    try {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream'
        });
        const fileName = name ? `${name.replace(/\s+/g, '_')}.pdf` : 'paper.pdf';
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        response.data.pipe(res);
    } catch (e) {
        res.status(500).send('බාගත කිරීමට නොහැකි විය.');
    }
});

app.listen(PORT, () => {
    console.log(`
    ===========================================
    🚀 RAVIYA PAPER HUB IS LIVE!
    🌎 URL: http://localhost:${PORT}
    ===========================================
    `);
});