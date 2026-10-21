import fs from 'fs';
import readline from 'readline';

async function extract() {
  const fileStream = fs.createReadStream('C:\\Users\\NaphierNODE\\.gemini\\antigravity\\brain\\65dd3b29-697e-485b-bd2e-af1aae93ce7c\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('"step_index":794') || line.includes('"step_index":814') || line.includes('"step_index":540')) {
      try {
        const parsed = JSON.parse(line);
        for (const tc of (parsed.tool_calls || [])) {
          if (tc.args && tc.args.Path && tc.args.Path.includes('page.tsx')) {
            fs.writeFileSync(`C:\\Users\\NaphierNODE\\.gemini\\antigravity\\brain\\65dd3b29-697e-485b-bd2e-af1aae93ce7c\\saved_step_${parsed.step_index}_page.tsx`, tc.args.Content, 'utf8');
            console.log(`Saved step ${parsed.step_index}`);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }
}
extract();
