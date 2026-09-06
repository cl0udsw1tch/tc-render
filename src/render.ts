import { Client } from 'pg';
import { unified } from 'unified';
import rehypeStringify from 'rehype-stringify';
import rehypeEasytex from 'rehype-easytex';
import rehypeKatex from 'rehype-katex';
import rehypeParse from 'rehype-parse';

export async function renderArticle(articleId: string, opts: {
    databaseUrl: string;
    writeOutput: (html: string) => Promise<string>; // returns the final URL/path
}) {
    const client = new Client({ connectionString: opts.databaseUrl });
    await client.connect();

    try {
        const { rows } = await client.query(
            'SELECT "texSource" FROM "Article" WHERE id = $1',
            [articleId]
        );
        if (rows.length === 0) throw new Error(`Article ${articleId} not found`);

        const bodyHtml = String(
            await unified()
                .use(rehypeParse, { fragment: true })
                .use(rehypeEasytex)
                .use(rehypeKatex, { output: 'mathml' })
                .use(rehypeStringify)
                .process(rows[0].texSource)
        );

        const url = await opts.writeOutput(bodyHtml);

        await client.query(
            'UPDATE "Article" SET status = $1, "s3Url" = $2, "updatedAt" = now() WHERE id = $3',
            ['rendered', url, articleId]
        );
    } catch (err) {
        await client.query('UPDATE "Article" SET status = $1 WHERE id = $2', ['failed', articleId]);
        throw err;
    } finally {
        await client.end();
    }
}
