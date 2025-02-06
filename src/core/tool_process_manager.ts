import { Tool, ToolConfig } from "@/types/types.ts";

interface ToolProcess {
	id: string;
	tool: Tool;
	process: Deno.ChildProcess;
	stdin: WritableStreamDefaultWriter<Uint8Array>;
	stdout: ReadableStreamDefaultReader<Uint8Array>;
	stderr: ReadableStreamDefaultReader<Uint8Array>;
}

export class ToolProcessManager {
	private processes: Map<string, ToolProcess> = new Map();
	private decoder = new TextDecoder();
	private encoder = new TextEncoder();

	async startToolProcess(
		tool: Tool,
		config?: ToolConfig
	): Promise<ToolProcess> {
		const processId = `${tool.id}-${Date.now()}`;

		// Merge environment variables with runtime API keys
		const env = { ...tool.env };
		if (config?.apiKeys) {
			for (const [key, value] of Object.entries(config.apiKeys)) {
				env[key] = value;
			}
		}

		// Start the process
		const process = new Deno.Command(tool.command, {
			args: tool.args,
			stdin: "piped",
			stdout: "piped",
			stderr: "piped",
			env,
		}).spawn();

		const toolProcess: ToolProcess = {
			id: processId,
			tool,
			process,
			stdin: process.stdin.getWriter(),
			stdout: process.stdout.getReader(),
			stderr: process.stderr.getReader(),
		};

		// Start reading stdout
		this.handleStdout(toolProcess);
		// Start reading stderr
		this.handleStderr(toolProcess);

		this.processes.set(processId, toolProcess);
		return toolProcess;
	}

	private async handleStdout(toolProcess: ToolProcess) {
		try {
			while (true) {
				const { value, done } = await toolProcess.stdout.read();
				if (done) break;

				const text = this.decoder.decode(value);
				// Here you would send the output to the appropriate SSE connection
				console.log(`[${toolProcess.tool.id}] stdout:`, text);
			}
		} catch (error) {
			console.error(`Error reading stdout for ${toolProcess.tool.id}:`, error);
		}
	}

	private async handleStderr(toolProcess: ToolProcess) {
		try {
			while (true) {
				const { value, done } = await toolProcess.stderr.read();
				if (done) break;

				const text = this.decoder.decode(value);
				console.error(`[${toolProcess.tool.id}] stderr:`, text);
			}
		} catch (error) {
			console.error(`Error reading stderr for ${toolProcess.tool.id}:`, error);
		}
	}

	async sendInput(processId: string, input: string): Promise<void> {
		const toolProcess = this.processes.get(processId);
		if (!toolProcess) {
			throw new Error(`Process ${processId} not found`);
		}

		try {
			await toolProcess.stdin.write(this.encoder.encode(input + "\n"));
		} catch (error) {
			console.error(`Error sending input to ${processId}:`, error);
			throw error;
		}
	}

	async stopProcess(processId: string): Promise<void> {
		const toolProcess = this.processes.get(processId);
		if (!toolProcess) return;

		try {
			toolProcess.process.kill();
			this.processes.delete(processId);
		} catch (error) {
			console.error(`Error stopping process ${processId}:`, error);
		}
	}

	async stopAllProcesses(): Promise<void> {
		const promises = Array.from(this.processes.keys()).map((id) =>
			this.stopProcess(id)
		);
		await Promise.all(promises);
	}
}
