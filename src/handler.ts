
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { renderArticle } from './render.js';

const s3 = new S3Client({});

export const handler = async (event: { articleId: string }) => {
    await renderArticle(event.articleId, {
        databaseUrl: process.env.DATABASE_URL!,
        writeOutput: async (html) => {
            const key = `articles/${event.articleId}.html`;
            await s3.send(new PutObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: key,
                Body: html,
                ContentType: 'text/html',
            }));
            return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
        },
    });
};
