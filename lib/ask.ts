import * as dotenv from 'dotenv';
import { AIProvider } from 'hasyx/lib/ai/ai';
import { OllamaProvider } from 'hasyx/lib/ai/providers/ollama';
import { OpenRouterProvider } from 'hasyx/lib/ai/providers/openrouter';
import { generateTerminalHandler } from 'hasyx/lib/ai/terminal';
import { ExecJSTool } from 'hasyx/lib/ai/tools/exec-js-tool';
import { TerminalTool } from 'hasyx/lib/ai/tools/terminal-tool';
import * as path from 'path';

// Load .env file from the root of the project
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const getSystemPrompt = () => `You are a powerful AI assistant in a terminal. Your goal is to help users by executing commands or answering their questions.

**RESPONSE MODES**

1.  **Tool Execution**: If the user's request requires an action (e.g., running code, getting file info), respond *only* with the tool execution syntax.
2.  **Direct Answer**: If the user is chatting or asking a question that doesn't need a tool, respond in plain text.

**TOOL EXECUTION FORMAT**
> 😈<uuid>/<tool_name>/<command>
\`\`\`<language>
# Your code or command here
\`\`\`

**EXAMPLE: Listing files**
> 😈ls-123/terminal/exec
\`\`\`bash
ls -la
\`\`\`

**EXAMPLE: Simple greeting**
Hello! How can I help you today?

**RULES**
- When using a tool, the response must ONLY be the execution block. No extra text.
- For a direct answer, just write the text.
- Execute commands directly if you are confident. Don't ask for permission.
- \`<uuid>\` must be a unique ID for each command.
`;

const tools = [new ExecJSTool(), new TerminalTool()];
const systemPrompt = getSystemPrompt();

let using = '';
function getProviderFromArgs(): AIProvider {
  const args = process.argv.slice(2);
  const providerArgIndex = args.findIndex(arg => arg === '--provider');
  const modelArgIndex = args.findIndex(arg => arg === '--model');

  const providerName = providerArgIndex !== -1 ? args[providerArgIndex + 1] : 'openrouter';
  const modelName = modelArgIndex !== -1 ? args[modelArgIndex + 1] : undefined;

  if (providerName === 'ollama') {
    using = `Using Ollama provider with model: ${modelName || 'default'}`;
    return new OllamaProvider({ model: modelName });
  }

  // Default to OpenRouter
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set for OpenRouterProvider.');
  }
  const model = modelName || 'sarvamai/sarvam-m:free';
  console.log(`Using OpenRouter provider with model: ${model}`);
  return new OpenRouterProvider({
    token: process.env.OPENROUTER_API_KEY,
    model: model
  });
}

const provider = getProviderFromArgs();

export const ask = generateTerminalHandler({
  provider,
  tools,
  systemPrompt
});

async function main() {
  await ask();
}

// Check if the script is being run directly
if (require.main === module) {
  main().catch(console.error);
}
