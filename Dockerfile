FROM denoland/deno:1.39.1

WORKDIR /app

# Cache the dependencies
COPY deno.json deno.lock ./
RUN deno cache --lock=deno.lock src/main.ts

# Copy source code
COPY . .

EXPOSE 3030

CMD ["deno", "run", "--allow-net", "--allow-read", "src/main.ts"] 