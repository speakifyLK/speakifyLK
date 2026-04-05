import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

async function test() {
  const { retrieveContext } = await import('../lib/vertex-rag');
  console.log("Searching RAG Corpus...");
  const chunks = await retrieveContext('පොත');
  console.log("Found Chunks:");
  chunks.forEach((c: any, i: number) => {
    console.log(`\n--- Result ${i + 1} (Score: ${c.score.toFixed(2)}) ---`);
    console.log(`Source: ${c.source}`);
    console.log(`Text: ${c.text}`);
  });
}

test().catch(console.error);
