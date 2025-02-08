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

	getProcessCount(): number {
		return this.processes.size;
	}

	async startToolProcess(
		tool: Tool,
		config?: ToolConfig
	): Promise<ToolProcess> {
		// Check if process already exists
		const existingProcess = Array.from(this.processes.values()).find(
			(p) => p.tool.id === tool.id
		);
		if (existingProcess) {
			return existingProcess;
		}

		const processId = `${tool.id}-${Date.now()}`;

		// Merge environment variables with runtime API keys
		const env = { ...tool.env };
		if (config?.apiKeys) {
			for (const [key, value] of Object.entries(config.apiKeys)) {
				env[key] = value;
			}
		}

		console.log(`Starting tool process: ${tool.id}`);
		console.log(`Command: ${tool.command} ${tool.args.join(" ")}`);

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

		// Start reading stdout and stderr
		this.handleStdout(toolProcess);
		this.handleStderr(toolProcess);

		this.processes.set(processId, toolProcess);

		// Wait a moment to ensure process starts
		await new Promise((resolve) => setTimeout(resolve, 1000));

		return toolProcess;
	}

	private async handleStdout(toolProcess: ToolProcess) {
		try {
			while (true) {
				const { value, done } = await toolProcess.stdout.read();
				if (done) break;

				const text = this.decoder.decode(value);
				console.log(`[${toolProcess.tool.id}] stdout: ${text.trim()}`);
			}
		} catch (error) {
			console.error(`Error reading stdout for ${toolProcess.tool.id}:`, error);
			// Try to restart the process
			await this.restartProcess(toolProcess.id);
		}
	}

	private async handleStderr(toolProcess: ToolProcess) {
		try {
			while (true) {
				const { value, done } = await toolProcess.stderr.read();
				if (done) break;

				const text = this.decoder.decode(value);
				console.error(`[${toolProcess.tool.id}] stderr: ${text.trim()}`);
			}
		} catch (error) {
			console.error(`Error reading stderr for ${toolProcess.tool.id}:`, error);
			// Try to restart the process
			await this.restartProcess(toolProcess.id);
		}
	}

	private async restartProcess(processId: string): Promise<void> {
		const toolProcess = this.processes.get(processId);
		if (!toolProcess) return;

		console.log(`Restarting process: ${toolProcess.tool.id}`);

		try {
			await this.stopProcess(processId);
			await this.startToolProcess(toolProcess.tool);
		} catch (error) {
			console.error(`Failed to restart process ${processId}:`, error);
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
			// Try to restart the process
			await this.restartProcess(processId);
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
