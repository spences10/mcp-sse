FROM denoland/deno:1.39.1

# Install Node.js
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app

# Install MCP tools globally
RUN npm install -g \
    mcp-tavily-search \
    # Add other MCP tools here

# Cache the Deno dependencies
COPY deno.json deno.lock ./
RUN deno cache --lock=deno.lock src/main.ts

# Copy source code
COPY . .

EXPOSE 3030

# Add permissions for process spawning
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-run", "--allow-env", "src/main.ts"] 