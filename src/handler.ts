import { Client } from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse'
import rehypeEasytex from 'rehype-easytex';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { Options } from 'remark-rehype';

const s3 = new S3Client({});

export const handler = async (event: { articleId: string }) => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        const { rows } = await client.query(
            'SELECT "texSource" FROM "Article" WHERE id = $1',
            [event.articleId]
        );
        if (rows.length === 0) throw new Error(`Article ${event.articleId} not found`);

        const html = String(
            await unified()
                .use(rehypeParse, { fragment: true })
                .use(rehypeEasytex)
                .use(rehypeKatex, { output: 'mathml' })
                // .use(rehypeDocument, {
                //     css: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css'
                // })
                .use(rehypeStringify, { fragment: true } as Options)
                .process(rows[0].texSource)
        );

        const key = `articles/${event.articleId}.html`;
        await s3.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: html,
            ContentType: 'text/html',
        }));

        const url = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
        await client.query(
            'UPDATE "Article" SET status = $1, "s3Url" = $2, "updatedAt" = now() WHERE id = $3',
            ['rendered', url, event.articleId]
        );
    } catch (err) {
        await client.query(
            'UPDATE "Article" SET status = $1 WHERE id = $2',
            ['failed', event.articleId]
        );
        throw err;
    } finally {
        await client.end();
    }
};
