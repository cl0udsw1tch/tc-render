import 'dotenv/config';
import Fastify from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { renderArticle } from './render.js';

const app = Fastify({ logger: true });

const OUTPUT_DIR = path.resolve('local-output');

app.post('/', async (req) => {
    return 'go to the render route'
})
app.post('/render', async (req, res) => {
    const { articleId } = req.body as { articleId: string };

    await renderArticle(articleId, {
        databaseUrl: process.env.DEV_DATABASE_URL!,
        writeOutput: async (html) => {
            await fs.mkdir(OUTPUT_DIR, { recursive: true });
            const filePath = path.join(OUTPUT_DIR, `${articleId}.html`);
            await fs.writeFile(filePath, html);
            return `file://${filePath}`;
        },
    });

    return { ok: true };
});

app.listen({ host: '0.0.0.0', port: 4000 }, (err) => {
    if (err) {
        console.log("EXITING")
        app.log.error(err); process.exit(1);
    }
});
