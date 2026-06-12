# Estágio 1: Dependências e compilação de módulos nativos
FROM node:18-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ gcc
COPY package*.json ./
RUN npm install --omit=dev

# Estágio 2: Imagem final leve para execução
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
